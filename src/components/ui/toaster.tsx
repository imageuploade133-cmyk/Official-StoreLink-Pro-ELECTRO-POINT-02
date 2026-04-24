"use client"

import { useToast } from "@/hooks/use-toast"
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

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIcon = () => {
          switch (variant) {
            case "destructive":
              return <AlertCircle className="h-5 w-5 text-red-500" />
            case "success":
              return <CheckCircle2 className="h-5 w-5 text-green-500" />
            case "warning":
              return <AlertTriangle className="h-5 w-5 text-yellow-500" />
            case "info":
              return <Info className="h-5 w-5 text-blue-500" />
            case "default":
            default:
              // If title includes "Success", use success icon, otherwise info
              if (typeof title === 'string' && title.toLowerCase().includes('success')) {
                return <CheckCircle2 className="h-5 w-5 text-green-500" />
              }
              return <Info className="h-5 w-5 text-blue-500" />
          }
        }

        const getIconBg = () => {
          switch (variant) {
            case "destructive":
              return "bg-red-500/10"
            case "success":
              return "bg-green-500/10"
            case "warning":
              return "bg-yellow-500/10"
            case "info":
              return "bg-blue-500/10"
            case "default":
            default:
              if (typeof title === 'string' && title.toLowerCase().includes('success')) {
                return "bg-green-500/10"
              }
              return "bg-blue-500/10"
          }
        }

        const effectiveVariant = variant || (typeof title === 'string' && title.toLowerCase().includes('success') ? 'success' : 'default');

        return (
          <Toast key={id} variant={effectiveVariant as any} {...props}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2 rounded-xl shadow-sm animate-in zoom-in-75 duration-500", 
                getIconBg()
              )}>
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
      <ToastViewport />
    </ToastProvider>
  )
}
