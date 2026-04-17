"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent  transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Light theme - OFF state (gray), ON state (emerald green)
      "data-[state=unchecked]:bg-gray-300 data-[state=unchecked]: hover:data-[state=unchecked]:bg-gray-400 hover:data-[state=unchecked]:",
      "data-[state=checked]:bg-emerald-500 data-[state=checked]: hover:data-[state=checked]:bg-emerald-600 hover:data-[state=checked]:-500/50",
      // Dark theme - OFF state (blue), ON state (green)
      "dark:data-[state=unchecked]:bg-blue-500 dark:data-[state=unchecked]: dark:hover:data-[state=unchecked]:bg-blue-600 dark:hover:data-[state=unchecked]:-500/50",
      "dark:data-[state=checked]:bg-green-500 dark:data-[state=checked]: dark:hover:data-[state=checked]:bg-green-400 dark:hover:data-[state=checked]:-500/50",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full  ring-0 transition-all duration-300 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 hover:",
        // Light theme - thumb colors
        "bg-white data-[state=unchecked]:ring-gray-400/30",
        "data-[state=checked]:ring-emerald-400/40",
        // Dark theme - thumb colors
        "dark:bg-white dark:data-[state=unchecked]:ring-blue-400/40",
        "dark:data-[state=checked]:ring-green-300/50"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

