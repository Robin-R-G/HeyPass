import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--hp-radius-md)] border px-3 py-2.5",
          "bg-[var(--hp-surface)] text-[var(--hp-text)] text-sm",
          "placeholder:text-[var(--hp-text-muted)]",
          "border-[var(--hp-border)]",
          "transition-all duration-[var(--hp-duration-fast)] ease-[var(--hp-ease)]",
          "hover:border-[var(--hp-border-hover)]",
          "focus:outline-none focus:border-[var(--hp-border-focus)] focus:ring-2 focus:ring-[var(--hp-primary-glow)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-y",
          error && "border-[var(--hp-error)] focus:border-[var(--hp-error)] focus:ring-[var(--hp-error-bg)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
