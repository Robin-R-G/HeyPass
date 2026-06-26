"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const variantClass = {
      default: "hp-btn-primary",
      destructive: "hp-btn-danger",
      outline: "hp-btn-secondary",
      secondary: "hp-btn-secondary",
      ghost: "hp-btn-ghost",
      link: "hp-btn-ghost",
    }[variant];

    const sizeClass = {
      default: "h-10 px-4 py-2 min-h-[44px]",
      sm: "h-9 rounded-md px-3 text-xs min-h-[36px]",
      lg: "h-12 rounded-md px-8 min-h-[48px]",
      icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
    }[size];

    return (
      <Comp
        className={cn("hp-btn", variantClass, sizeClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
