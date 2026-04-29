import React from "react";
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Skeleton }
