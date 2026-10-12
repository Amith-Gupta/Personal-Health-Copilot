import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-700 shadow-sm",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 text-slate-600",
        link: "text-emerald-600 underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md hover:from-emerald-700 hover:to-cyan-700 hover:shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
