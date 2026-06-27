"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "success" | "link";
  size?: "xs" | "sm" | "default" | "lg" | "icon";
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles = {
      default:
        "bg-[var(--hp-primary)] text-white shadow-sm hover:bg-[var(--hp-primary-hover)] active:bg-[var(--hp-primary-dark)]",
      secondary:
        "bg-[var(--hp-surface)] text-[var(--hp-text)] border border-[var(--hp-border)] hover:bg-[var(--hp-surface-hover)] hover:border-[var(--hp-border-hover)] active:bg-[var(--hp-surface-active)]",
      outline:
        "bg-transparent text-[var(--hp-text-secondary)] border border-[var(--hp-border)] hover:bg-[var(--hp-surface)] hover:text-[var(--hp-text)] hover:border-[var(--hp-border-hover)] active:bg-[var(--hp-surface-active)]",
      ghost:
        "bg-transparent text-[var(--hp-text-secondary)] hover:bg-[var(--hp-surface)] hover:text-[var(--hp-text)] active:bg-[var(--hp-surface-active)]",
      danger:
        "bg-[var(--hp-error)] text-white shadow-sm hover:bg-[#E11D48] active:bg-[#BE123C]",
      success:
        "bg-[var(--hp-success)] text-white shadow-sm hover:bg-[#059669] active:bg-[#047857]",
      link:
        "bg-transparent text-[var(--hp-primary)] underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeStyles = {
      xs: "h-7 rounded-[var(--hp-radius-sm)] px-2.5 text-xs gap-1",
      sm: "h-8 rounded-[var(--hp-radius-sm)] px-3 text-xs gap-1.5",
      default: "h-10 rounded-[var(--hp-radius-md)] px-4 text-sm gap-2",
      lg: "h-11 rounded-[var(--hp-radius-md)] px-6 text-sm gap-2",
      icon: "h-10 w-10 rounded-[var(--hp-radius-md)] p-0 justify-center",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-[var(--hp-duration-fast)] ease-[var(--hp-ease)]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hp-primary)]",
          "disabled:opacity-50 disabled:pointer-events-none",
          "active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-[hp-spin_1s_linear_infinite] shrink-0"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
