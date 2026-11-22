import pytest

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["trading_mode"] == "paper"

@pytest.mark.asyncio
async def test_strategy_crud(client):
    # 1. Fetch templates
    t_res = await client.get("/api/v1/strategies/templates")
    assert t_res.status_code == 200
    templates = t_res.json()
    assert len(templates) == 3

    # 2. Create strategy
    payload = {
        "name": "Test Grid 1",
        "strategy_type": "grid",
        "symbol": "BTC/USDT",
        "parameters": {
            "lower_price": 80000.0,
            "upper_price": 100000.0,
            "grid_levels": 10,
            "investment_per_grid": 100.0
        },
        "allocated_capital": 1000.0
    }
    c_res = await client.post("/api/v1/strategies/", json=payload)
    assert c_res.status_code == 201
    created = c_res.json()
    assert created["name"] == "Test Grid 1"
    assert created["status"] == "draft"
    strat_id = created["id"]

    # 3. Activate strategy
    act_res = await client.patch(f"/api/v1/strategies/{strat_id}/status?action=activate")
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "active"

    # 4. List strategies
    list_res = await client.get("/api/v1/strategies/")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

@pytest.mark.asyncio
async def test_market_endpoints(client):
    res = await client.get("/api/v1/market/tickers")
    assert res.status_code == 200
    tickers = res.json()
    assert len(tickers) >= 1

    candles_res = await client.get("/api/v1/market/ohlcv?symbol=BTC/USDT&limit=10")
    assert candles_res.status_code == 200
    candles = candles_res.json()
    assert len(candles) == 10

@pytest.mark.asyncio
async def test_portfolio_summary(client):
    res = await client.get("/api/v1/performance/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "total_allocated_capital" in summary
    assert "paper_balances" in summary
