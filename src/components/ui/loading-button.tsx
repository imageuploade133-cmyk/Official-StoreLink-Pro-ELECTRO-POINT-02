import * as React from "react"
import { Button, ButtonProps } from "./button"

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, disabled, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        loading={isLoading}
        disabled={disabled}
        {...props}
      >
        {isLoading && loadingText ? loadingText : children}
      </Button>
    )
  }
)
LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
