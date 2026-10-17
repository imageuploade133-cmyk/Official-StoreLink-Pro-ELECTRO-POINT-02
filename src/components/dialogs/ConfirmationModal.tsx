'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/use-mobile';

interface ConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default' | 'warning';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false,
}: ConfirmationModalProps) {
  const isMobile = useIsMobile();

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const Content = () => (
    <div className="relative overflow-hidden p-1">
      {/* Background Ambient Glows */}
      <div
        className={cn(
          'pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full blur-3xl opacity-30',
          variant === 'destructive'
            ? 'bg-gradient-to-br from-red-600 via-rose-500 to-orange-500'
            : 'bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500'
        )}
      />

      {/* Desktop Close Button */}
      {!isMobile && (
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="absolute right-0 top-0 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-200 hover:rotate-90 hover:scale-110 disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header Badge */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div
            className={cn(
              'absolute inset-0 rounded-3xl blur-xl opacity-50 animate-pulse',
              variant === 'destructive'
                ? 'bg-gradient-to-tr from-red-600 to-rose-500'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
            )}
          />

          <div
            className={cn(
              'relative flex h-20 w-20 items-center justify-center rounded-3xl p-0.5 shadow-2xl ring-4',
              variant === 'destructive'
                ? 'bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 ring-red-500/20 shadow-red-600/30'
                : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 ring-blue-500/20 shadow-blue-600/30'
            )}
          >
            <div
              className={cn(
                'flex h-full w-full items-center justify-center rounded-[22px] text-white',
                variant === 'destructive'
                  ? 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700'
                  : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700'
              )}
            >
              {variant === 'destructive' ? (
                <Trash2 className="h-10 w-10 text-white drop-shadow-md" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-white drop-shadow-md" />
              )}
            </div>
          </div>

          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border shadow-lg text-primary">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>

        {/* Title & Description */}
        <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground px-2">
          {description}
        </AlertDialogDescription>

        {/* Buttons */}
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={handleCancel}
            className="h-13 flex-1 rounded-2xl border-2 border-border/80 bg-background/80 font-bold text-foreground hover:bg-muted/80 hover:border-muted-foreground/30 transition-all active:scale-95 text-xs uppercase tracking-wider"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            disabled={isLoading}
            onClick={() => {
              onConfirm();
              if (!isLoading) onOpenChange(false);
            }}
            className={cn(
              'h-13 flex-1 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider',
              variant === 'destructive'
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-700 hover:via-rose-700 hover:to-pink-700 shadow-red-600/30 border border-red-400/30'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 shadow-blue-600/30 border border-blue-400/30'
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[2.5rem] border-t-2 border-primary/20 bg-background/95 backdrop-blur-2xl p-6 pb-10">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[460px] rounded-[2.5rem] border-2 border-primary/20 bg-background/95 p-8 shadow-2xl backdrop-blur-2xl outline-none">
        <Content />
      </AlertDialogContent>
    </AlertDialog>
  );
}
