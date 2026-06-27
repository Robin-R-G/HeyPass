import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--hp-radius-md)] border px-3 py-2",
          "bg-[var(--hp-surface)] text-[var(--hp-text)] text-sm",
          "placeholder:text-[var(--hp-text-muted)]",
          "border-[var(--hp-border)]",
          "transition-all duration-[var(--hp-duration-fast)] ease-[var(--hp-ease)]",
          "hover:border-[var(--hp-border-hover)]",
          "focus:outline-none focus:border-[var(--hp-border-focus)] focus:ring-2 focus:ring-[var(--hp-primary-glow)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--hp-error)] focus:border-[var(--hp-error)] focus:ring-[var(--hp-error-bg)]",
          className
        )}
        ref={ref}
        aria-invalid={error || props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        autoComplete={props.autoComplete}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
