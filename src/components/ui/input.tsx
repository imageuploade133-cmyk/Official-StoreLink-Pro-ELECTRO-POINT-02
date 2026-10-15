import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl border-2 border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 [background-clip:padding-box,_border-box] [background-origin:border-box] bg-[#f5f5f7] dark:bg-[#1d1d1f] px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/30 focus-visible:bg-white dark:focus-visible:bg-black disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 shadow-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
