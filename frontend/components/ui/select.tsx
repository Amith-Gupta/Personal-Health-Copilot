"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, icon, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        {icon && (
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-9 text-sm text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
            icon ? "pl-9" : "pl-3",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
      </div>
    );
  }
);
Select.displayName = "Select";
