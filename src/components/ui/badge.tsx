import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--hp-radius-full)] border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--hp-border)] bg-[var(--hp-surface)] text-[var(--hp-text-secondary)]",
        primary:
          "border-[var(--hp-primary)]/20 bg-[var(--hp-primary)]/10 text-[var(--hp-primary-light)]",
        secondary:
          "border-[var(--hp-accent)]/20 bg-[var(--hp-accent)]/10 text-[var(--hp-accent-light)]",
        success:
          "border-[var(--hp-success)]/20 bg-[var(--hp-success-bg)] text-[var(--hp-success)]",
        warning:
          "border-[var(--hp-warning)]/20 bg-[var(--hp-warning-bg)] text-[var(--hp-warning)]",
        danger:
          "border-[var(--hp-error)]/20 bg-[var(--hp-error-bg)] text-[var(--hp-error)]",
        info:
          "border-[var(--hp-info)]/20 bg-[var(--hp-info-bg)] text-[var(--hp-info)]",
        outline:
          "border-[var(--hp-border-hover)] bg-transparent text-[var(--hp-text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        "focus:outline-none focus:ring-2 focus:ring-[var(--hp-primary)] focus:ring-offset-2",
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
