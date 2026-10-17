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
import { Trash2, AlertTriangle, Loader2, X, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/use-mobile';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  itemName?: string;
  itemType?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  variant?: 'destructive' | 'warning' | 'default';
}

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  isDeleting = false,
  onConfirm,
  itemType = 'item',
  itemName,
  dialogTitle,
  dialogDescription,
  confirmButtonText = 'Delete Permanently',
  cancelButtonText = 'Keep / Cancel',
  variant = 'destructive',
}: DeleteConfirmationDialogProps) {
  const isMobile = useIsMobile();

  const handleCancel = () => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  };

  const titleText =
    dialogTitle || `Are you sure you want to delete this ${itemType}?`;

  const DialogInnerContent = () => (
    <div className="relative overflow-hidden p-1">
      {/* Background Ambient Glow Gradients */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-br from-red-600/30 via-rose-500/20 to-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-tl from-red-600/20 via-pink-500/15 to-purple-500/10 blur-3xl" />

      {/* Close button for desktop */}
      {!isMobile && (
        <button
          onClick={handleCancel}
          disabled={isDeleting}
          className="absolute right-0 top-0 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-muted-foreground hover:text-foreground transition-all duration-200 hover:rotate-90 hover:scale-110 disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header Icon Badge with Dual Ring Gradient */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-6 flex items-center justify-center">
          {/* Pulsing Backlight */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 blur-xl opacity-50 animate-pulse" />

          {/* Main Icon Badge */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 p-0.5 shadow-2xl shadow-red-600/40 ring-4 ring-red-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-gradient-to-br from-red-500 via-rose-600 to-red-700 text-white">
              {variant === 'warning' ? (
                <AlertTriangle className="h-10 w-10 text-white drop-shadow-md animate-bounce" />
              ) : (
                <Trash2 className="h-10 w-10 text-white drop-shadow-md" />
              )}
            </div>
          </div>

          {/* Mini Danger Badge */}
          <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-950 text-red-400 border-2 border-background shadow-lg">
            <ShieldAlert className="h-4 w-4" />
          </div>
        </div>

        {/* Title */}
        <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          {titleText}
        </AlertDialogTitle>

        {/* Description & Item Highlight */}
        <AlertDialogDescription className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground px-2">
          {dialogDescription ? (
            <span
              className="block"
              dangerouslySetInnerHTML={{ __html: dialogDescription }}
            />
          ) : (
            <span>
              This action will permanently delete{' '}
              {itemName ? (
                <span className="inline-block rounded-lg bg-red-500/10 dark:bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20 my-1">
                  &quot;{itemName}&quot;
                </span>
              ) : (
                'this item'
              )}
              . This step cannot be undone.
            </span>
          )}
        </AlertDialogDescription>

        {/* Warning Callout Box */}
        <div className="mt-5 w-full rounded-2xl bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent p-3.5 border border-red-500/20 text-left flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700 dark:text-red-300 leading-snug">
            Data recovery will not be possible after confirmation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={handleCancel}
            className="h-13 flex-1 rounded-2xl border-2 border-border/80 bg-background/80 font-bold text-foreground hover:bg-muted/80 hover:border-muted-foreground/30 transition-all active:scale-95 text-xs uppercase tracking-wider"
          >
            {cancelButtonText}
          </Button>

          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className={cn(
              'h-13 flex-1 rounded-2xl font-extrabold text-white shadow-xl transition-all active:scale-95 text-xs uppercase tracking-wider',
              'bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-700 hover:via-rose-700 hover:to-pink-700 shadow-red-600/30 border border-red-400/30'
            )}
          >
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Deleting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" />
                {confirmButtonText}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[2.5rem] border-t-2 border-red-500/20 bg-background/95 backdrop-blur-2xl p-6 pb-10">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <DrawerTitle className="sr-only">{titleText}</DrawerTitle>
          <DrawerDescription className="sr-only">
            Delete confirmation modal
          </DrawerDescription>
          <DialogInnerContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[460px] rounded-[2.5rem] border-2 border-red-500/20 bg-background/95 p-8 shadow-2xl backdrop-blur-2xl outline-none">
        <DialogInnerContent />
      </AlertDialogContent>
    </AlertDialog>
  );
}
