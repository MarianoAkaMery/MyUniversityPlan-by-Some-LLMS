import * as React from "react";
import { cn } from "../../lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "muted";
};

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
      variant === "default"
        ? "bg-slate-900 text-white"
        : "bg-slate-100 text-slate-600",
      className
    )}
    {...props}
  />
);
