import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-card/70 dark:border-border dark:text-foreground/95 font-semibold dark:hover:bg-accent/20 dark:hover:border-primary/50 dark:hover:shadow-primary/10 dark:hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:text-foreground dark:hover:bg-popover",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Heuristic for back button: check children for "Back" text
    const getText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(getText).join('');
      if (React.isValidElement(node)) return getText(node.props.children);
      return '';
    };
    
    // Auto-apply special styles for Save buttons (submit type or "Save" text)
    // Back buttons (containing "Back" text)
    // and Add buttons (containing "Add" text)
    const textContent = getText(children);
    const isSave = props.type === "submit" || (/\bsave\b/i.test(textContent) && !/wishlist/i.test(textContent));

    const isBack = /\bback\b/i.test(textContent) || (typeof className === 'string' && className.includes("btn-back"));

    const isAdd = /\badd\b/i.test(textContent) || (typeof className === 'string' && className.includes("btn-add"));

    const specialClass = isSave ? "btn-save" : (isBack ? "btn-back" : (isAdd ? "btn-add" : ""));

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), specialClass)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

