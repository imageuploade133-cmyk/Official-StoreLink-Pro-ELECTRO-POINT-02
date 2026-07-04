'use client';

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-card/70 dark:border-border dark:text-foreground/95 dark:hover:bg-accent/20 dark:hover:border-primary/50 dark:hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:text-foreground dark:hover:bg-popover",
        link: "text-primary underline-offset-4 hover:underline",
        store: "store-btn-primary",
        storeSecondary: "store-btn-secondary",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 px-3",
        lg: "h-12 rounded-2xl px-10 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading: externalLoading, children, disabled, onClick, ...props }, ref) => {
    const [internalLoading, setInternalLoading] = React.useState(false)
    const loading = externalLoading || internalLoading
    const Comp = asChild ? Slot : "button"

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        const result = onClick(event)
        if (result instanceof Promise) {
          setInternalLoading(true)
          try {
            await result
          } finally {
            setInternalLoading(false)
          }
        }
      }
    }

    // Heuristic for back button: check children for "Back" text
    const getText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(getText).join('');
      if (React.isValidElement(node)) return getText(node.props.children);
      return '';
    };
    
    // Auto-apply special styles for Save buttons (submit type or "Save"/"Pay"/"Confirm" text)
    // Back buttons (containing "Back" text)
    // and Add buttons (containing "Add" text)
    const textContent = getText(children);
    const isSave = props.type === "submit" || (/\b(save|pay|confirm|update|create)\b/i.test(textContent) && !/wishlist/i.test(textContent));

    const isBack = /\b(back|cancel|close)\b/i.test(textContent) || (typeof className === 'string' && className.includes("btn-back"));

    const isAdd = /\badd\b/i.test(textContent) || (typeof className === 'string' && className.includes("btn-add"));

    const isDelete = /\b(delete|remove|clear)\b/i.test(textContent) || variant === 'destructive';

    const specialClass = isSave ? "btn-save" : (isBack ? "btn-back" : (isAdd ? "btn-add" : (isDelete ? "btn-destructive-action" : "")));

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), specialClass)}
        ref={ref}
        disabled={loading || disabled}
        onClick={handleClick}
        {...props}
      >
        {asChild ? children : (
          <>
            {loading && <Spinner size="sm" className="mr-2" />}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

