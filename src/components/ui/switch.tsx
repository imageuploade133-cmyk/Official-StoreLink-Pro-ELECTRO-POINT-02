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
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Light theme - OFF state (gray), ON state (emerald green)
      "data-[state=unchecked]:bg-gray-300 hover:data-[state=unchecked]:bg-gray-400",
      "data-[state=checked]:bg-emerald-500 hover:data-[state=checked]:bg-emerald-600",
      // Dark theme - OFF state (grey), ON state (green)
      "dark:data-[state=unchecked]:bg-[#39393d] dark:hover:data-[state=unchecked]:bg-[#48484a]",
      "dark:data-[state=checked]:bg-[#34c759] dark:hover:data-[state=checked]:bg-[#30d158]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full ring-0 transition-all duration-300 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // Light theme - thumb colors
        "bg-white data-[state=unchecked]:ring-gray-400/30",
        "data-[state=checked]:ring-emerald-400/40",
        // Dark theme - thumb colors
        "dark:bg-white"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

