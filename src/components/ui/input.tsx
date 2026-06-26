import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("hp-input", className)}
        ref={ref}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
        autoComplete={props.autoComplete}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
