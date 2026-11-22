from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.strategy import Strategy
from backend.app.schemas.strategy import StrategyCreate, StrategyUpdate, StrategyResponse
from backend.app.strategies.registry import strategy_manager, STRATEGY_CLASSES
from backend.app.core.logging import logger

router = APIRouter()

@router.get("/templates", response_model=List[dict])
def get_strategy_templates() -> Any:
    """Return available strategy types and their default parameter templates."""
    return [
        {
            "strategy_type": "grid",
            "name": "Standard Grid Trading",
            "description": "Places automated buy and sell orders at fixed intervals within a price range.",
            "default_parameters": {
                "lower_price": 85000.0,
                "upper_price": 98000.0,
                "grid_levels": 10,
                "investment_per_grid": 100.0
            }
        },
        {
            "strategy_type": "trend",
            "name": "Trend Following (Dual MA)",
            "description": "Follows the prevailing market trend using moving average crossovers.",
            "default_parameters": {
                "fast_period": 9,
                "slow_period": 21
            }
        },
        {
            "strategy_type": "breakout",
            "name": "Donchian Breakout Trading",
            "description": "Capitalizes on sharp volatility expansion when price breaches support or resistance.",
            "default_parameters": {
                "lookback_period": 20,
                "volume_threshold_factor": 1.2
            }
        }
    ]

@router.get("", response_model=List[StrategyResponse])
@router.get("/", response_model=List[StrategyResponse], include_in_schema=False)
async def list_strategies(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieve all configured strategies."""
    stmt = select(Strategy).offset(skip).limit(limit).order_by(Strategy.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
async def create_strategy(
    strategy_in: StrategyCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Create a new trading strategy."""
    if strategy_in.strategy_type not in STRATEGY_CLASSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported strategy type. Must be one of: {list(STRATEGY_CLASSES.keys())}"
        )

    # Validate parameters against strategy definition
    try:
        temp_cls = STRATEGY_CLASSES[strategy_in.strategy_type]
        # Instantiate test to validate parameters
        temp_cls("temp", strategy_in.symbol, strategy_in.parameters)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid strategy parameters: {str(e)}"
        )

    db_obj = Strategy(
        name=strategy_in.name,
        strategy_type=strategy_in.strategy_type,
        symbol=strategy_in.symbol,
        parameters=strategy_in.parameters,
        allocated_capital=strategy_in.allocated_capital,
        current_capital=strategy_in.allocated_capital,
        status="draft"
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    logger.info(f"Created strategy {db_obj.id} ({db_obj.name})")
    return db_obj

@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get a strategy by ID."""
    stmt = select(Strategy).where(Strategy.id == strategy_id)
    result = await db.execute(stmt)
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy

@router.patch("/{strategy_id}/status", response_model=StrategyResponse)
async def update_strategy_status(
    strategy_id: str,
    action: str, # 'activate', 'pause', 'stop'
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Change strategy execution state ('activate', 'pause', 'stop')."""
    stmt = select(Strategy).where(Strategy.id == strategy_id)
    result = await db.execute(stmt)
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    action = action.lower()
    if action == "activate":
        strategy.status = "active"
        # Register in-memory instance
        strategy_manager.create(
            strategy_type=strategy.strategy_type,
            strategy_id=strategy.id,
            symbol=strategy.symbol,
            parameters=strategy.parameters
        )
    elif action == "pause":
        strategy.status = "paused"
        strategy_manager.remove(strategy.id)
    elif action == "stop":
        strategy.status = "stopped"
        strategy_manager.remove(strategy.id)
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'activate', 'pause', or 'stop'")

    await db.commit()
    await db.refresh(strategy)
    logger.info(f"Strategy {strategy.id} state updated to '{strategy.status}'")
    return strategy
