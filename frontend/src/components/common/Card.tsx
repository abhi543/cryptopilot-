import React from "react";
import { clsx } from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        "bg-crypto-card border border-crypto-border rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
