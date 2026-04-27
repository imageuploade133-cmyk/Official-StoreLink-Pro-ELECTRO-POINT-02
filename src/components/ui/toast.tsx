"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & { position?: string }
>(({ className, position, ...props }, ref) => {
  const getPositionClasses = (pos?: string) => {
    switch (pos) {
      case 'top-left': return "top-0 left-0 flex-col";
      case 'top-center': return "top-0 left-1/2 -translate-x-1/2 flex-col";
      case 'top-right': return "top-0 right-0 flex-col text-right";
      case 'bottom-left': return "bottom-0 left-0 flex-col-reverse";
      case 'bottom-center': return "bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse";
      case 'bottom-right': return "bottom-0 right-0 flex-col-reverse text-right";
      default: return "top-4 left-1/2 -translate-x-1/2 flex-col";
    }
  };

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed z-[100] flex gap-2 w-full max-w-[420px] p-4",
        getPositionClasses(position),
        className
      )}
      suppressHydrationWarning
      {...props}
    />
  );
})
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border p-4 pr-8 transition-all data-[swipe=cancel]:translate-y-0 data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-top-full",
  {
    variants: {
      variant: {
        default: "bg-white/95 dark:bg-zinc-950/90 border-zinc-200 dark:border-zinc-800 text-foreground backdrop-blur-xl",
        destructive: "bg-red-50/90 dark:bg-red-950/50 border-red-100 dark:border-red-900/30 text-red-900 dark:text-red-200 backdrop-blur-xl",
        success: "bg-green-50/90 dark:bg-green-950/50 border-green-100 dark:border-green-900/30 text-green-900 dark:text-green-200 backdrop-blur-xl",
        info: "bg-blue-50/90 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/30 text-blue-900 dark:text-blue-200 backdrop-blur-xl",
        warning: "bg-amber-50/90 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 backdrop-blur-xl",
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
    VariantProps<typeof toastVariants> & { 
      customStyles?: React.CSSProperties;
      animation?: 'slide' | 'fade' | 'zoom';
    }
>(({ className, variant, customStyles, animation, ...props }, ref) => {
  // Extract duration and onOpenChange to manage auto-dismiss via CSS animation
  const { onOpenChange, duration: propsDuration, ...restProps } = props;
  const duration = typeof propsDuration === 'number' ? propsDuration : 5000;

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    // Only trigger if the width animation actually finishes
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const animationClasses = cn(
    animation === 'fade' && "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    animation === 'zoom' && "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    // Default is slide (already in toastVariants)
  );

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        toastVariants({ variant }), 
        animationClasses,
        className, 
        'overflow-hidden cursor-default'
      )}
      style={customStyles}
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
            "h-full countdown-bar animate-shrink group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]",
            !customStyles && (
              variant === "destructive" ? "bg-red-500" : 
              variant === "success" ? "bg-green-500" : 
              variant === "warning" ? "bg-amber-500" : 
              variant === "info" ? "bg-blue-500" :
              "bg-primary"
            )
          )}
          style={{
            animationDuration: `${duration}ms`,
            backgroundColor: customStyles ? (customStyles as any)['--progress-bg'] : undefined
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
>(({ className, children, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-full p-1 text-foreground/40 opacity-0 transition-all hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 focus:opacity-100 focus:outline-none group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    {children || <X className="h-3.5 w-3.5" />}
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
