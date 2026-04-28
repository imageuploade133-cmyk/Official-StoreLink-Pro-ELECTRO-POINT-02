"use client"

import * as React from "react"
import { useIsMobile } from "../../hooks/use-mobile"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog"
import {
  Drawer,
  DrawerAction,
  DrawerCancel,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer"
import { cn } from "../../lib/utils"

interface ResponsiveAlertDialogProps {
  children?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  cancelText?: string
  actionText?: string
  onAction: () => void
  onCancel?: () => void
  actionClassName?: string
}

export function ResponsiveAlertDialog({
  children,
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  actionText = "Continue",
  onAction,
  onCancel,
  actionClassName,
}: ResponsiveAlertDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          {children && <div className="px-4 py-2">{children}</div>}
          <DrawerFooter>
            <DrawerAction onClick={onAction} className={actionClassName}>
              {actionText}
            </DrawerAction>
            <DrawerCancel onClick={onCancel || (() => onOpenChange(false))}>
              {cancelText}
            </DrawerCancel>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel || (() => onOpenChange(false))}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAction} className={actionClassName}>
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
