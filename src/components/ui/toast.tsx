"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 w-full max-w-[420px] p-4",
      className
    )}
    suppressHydrationWarning
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border p-4 pr-8 shadow-2xl transition-all data-[swipe=cancel]:translate-y-0 data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-top-full",
  {
    variants: {
      variant: {
        default: "apple-glass text-foreground",
        destructive: "apple-glass border-red-500/50 text-foreground",
        success: "apple-glass border-green-500/50 text-foreground",
        info: "apple-glass border-blue-500/50 text-foreground",
        warning: "apple-glass border-yellow-500/50 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  // Extract duration and onOpenChange to manage auto-dismiss via CSS animation
  const { onOpenChange, duration: propsDuration, ...restProps } = props;
  const duration = typeof propsDuration === 'number' ? propsDuration : 5000;

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    // Only trigger if the width animation actually finishes
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        toastVariants({ variant }), 
        className, 
        'overflow-hidden hover:[&_.countdown-bar]:[animation-play-state:paused] cursor-default'
      )}
      onOpenChange={onOpenChange}
      // Critical: Set duration to Infinity so Radix doesn't close it with its own timer.
      // The closing is now exclusively driven by handleAnimationEnd which respects the hover-pause.
      duration={Infinity}
      {...restProps}
    >
      {props.children}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-foreground/5 pointer-events-none">
        <div
          className={cn(
            "h-full countdown-bar animate-shrink",
            variant === "destructive" ? "bg-red-500/50" : 
            variant === "success" ? "bg-green-500/50" : 
            variant === "warning" ? "bg-yellow-500/50" : 
            "bg-blue-500/50"
          )}
          style={{
            animationDuration: `${duration}ms`,
          }}
          onAnimationEnd={handleAnimationEnd}
        />
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-full border bg-transparent px-4 text-xs font-semibold transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-full p-1 text-foreground/40 opacity-0 transition-all hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 focus:opacity-100 focus:outline-none group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold tracking-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs leading-relaxed opacity-70 font-medium", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
