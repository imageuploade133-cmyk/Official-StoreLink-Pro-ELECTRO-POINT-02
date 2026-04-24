"use client"

import { useToast } from "@/hooks/use-toast"
import { useSettings } from "@/contexts/settings-context"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Info, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()
  const { settings } = useSettings()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIconColor = () => {
          if (settings?.toastBackgroundColor) {
            switch (variant) {
              case "destructive": return settings.toastErrorColor || "#ef4444"
              case "success": return settings.toastSuccessColor || "#10b981"
              case "warning": return settings.toastWarningColor || "#f59e0b"
              case "info": return settings.toastInfoColor || "#3b82f6"
              default: return settings.toastInfoColor || "#3b82f6"
            }
          }

          switch (variant) {
            case "destructive": return undefined
            case "success": return undefined
            case "warning": return undefined
            case "info": return undefined
            default: return undefined
          }
        }

        const getIcon = () => {
          const color = getIconColor()
          const iconProps = { className: "h-5 w-5", style: color ? { color } : undefined }

          switch (variant) {
            case "destructive":
              return <AlertCircle {...iconProps} className={cn(iconProps.className, !color && "text-red-600 dark:text-red-400")} />
            case "success":
              return <CheckCircle2 {...iconProps} className={cn(iconProps.className, !color && "text-green-600 dark:text-green-400")} />
            case "warning":
              return <AlertTriangle {...iconProps} className={cn(iconProps.className, !color && "text-amber-600 dark:text-amber-400")} />
            case "info":
              return <Info {...iconProps} className={cn(iconProps.className, !color && "text-blue-600 dark:text-blue-400")} />
            case "default":
            default:
              if (typeof title === 'string' && title.toLowerCase().includes('success')) {
                return <CheckCircle2 {...iconProps} className={cn(iconProps.className, !color && "text-green-600 dark:text-green-400")} />
              }
              return <Info {...iconProps} className={cn(iconProps.className, !color && "text-blue-600 dark:text-blue-400")} />
          }
        }

        const getIconBg = () => {
          if (settings?.toastBackgroundColor) {
            const color = getIconColor()
            return { backgroundColor: `${color}20` }
          }
          return {}
        }

        const effectiveVariant = variant || (typeof title === 'string' && title.toLowerCase().includes('success') ? 'success' : 'default');

        const customStyles: any = settings?.toastBackgroundColor ? {
          background: settings.toastUseGradient 
            ? `linear-gradient(${settings.toastGradientAngle ?? 135}deg, ${settings.toastGradientStartColor ?? '#ffffff'}, ${settings.toastGradientEndColor ?? '#f8fafc'})`
            : settings.toastBackgroundColor,
          color: settings.toastTextColor,
          borderColor: settings.toastBorderColor,
          borderRadius: settings.toastBorderRadius === 'none' ? '0' : 
                        settings.toastBorderRadius === 'sm' ? '0.125rem' :
                        settings.toastBorderRadius === 'md' ? '0.375rem' :
                        settings.toastBorderRadius === 'lg' ? '0.5rem' :
                        settings.toastBorderRadius === 'xl' ? '0.75rem' :
                        settings.toastBorderRadius === '2xl' ? '1rem' :
                        settings.toastBorderRadius === 'full' ? '9999px' : '1rem',
          '--progress-bg': effectiveVariant === 'destructive' ? settings.toastErrorColor :
                           effectiveVariant === 'success' ? settings.toastSuccessColor :
                           effectiveVariant === 'warning' ? settings.toastWarningColor :
                           effectiveVariant === 'info' ? settings.toastInfoColor :
                           settings.toastInfoColor || settings.toastTextColor
        } : undefined;

        return (
          <Toast 
            key={id} 
            variant={effectiveVariant as any} 
            customStyles={customStyles}
            animation={settings?.toastAnimation as any}
            {...props}
          >
            <div className="flex items-center gap-4">
              <div 
                className={cn(
                  "p-2 rounded-xl shadow-sm animate-in zoom-in-75 duration-500", 
                  !settings?.toastBackgroundColor && (
                    variant === "destructive" ? "bg-red-100 dark:bg-red-900/40" :
                    variant === "success" ? "bg-green-100 dark:bg-green-900/40" :
                    variant === "warning" ? "bg-amber-100 dark:bg-amber-900/40" :
                    variant === "info" ? "bg-blue-100 dark:bg-blue-900/40" :
                    (typeof title === 'string' && title.toLowerCase().includes('success') ? "bg-green-100 dark:bg-green-900/40" : "bg-blue-100 dark:bg-blue-900/40")
                  )
                )}
                style={getIconBg()}
              >
                {getIcon()}
              </div>
              <div className="grid gap-0.5">
                {title && <ToastTitle className="text-sm font-bold tracking-tight">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs font-medium opacity-80">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport position={settings?.toastPosition} />
    </ToastProvider>
  )
}
