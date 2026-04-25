'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
} from '../ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { Trash2, AlertTriangle, X } from 'lucide-react';
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
}

export function ConfirmationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'destructive'
}: ConfirmationModalProps) {
  const isMobile = useIsMobile();

  const Content = () => (
    <div className="relative">
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20",
        variant === 'destructive' ? "bg-destructive" : "bg-primary"
      )} />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className={cn(
          "h-20 w-20 rounded-[2rem] flex items-center justify-center mb-2 rotate-3 transition-transform hover:rotate-0 shadow-inner",
          variant === 'destructive' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          {variant === 'destructive' ? <Trash2 className="h-10 w-10" /> : <AlertTriangle className="h-10 w-10" />}
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">
                {title}
            </h2>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-tight px-4">
                {description}
            </p>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 mt-10 w-full">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] hover:bg-muted"
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
          className={cn(
              "flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 text-white",
              variant === 'destructive' ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
          )}
        >
          {confirmText}
        </Button>
      </div>

      <button 
        onClick={() => onOpenChange(false)}
        className="absolute -top-4 -right-4 p-2 rounded-full hover:bg-muted transition-colors z-20"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="p-8 pt-2 pb-12 rounded-t-[3rem] border-none outline-none">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/20 mb-8" />
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[440px] rounded-[3rem] p-12 border-none shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden outline-none">
        <Content />
      </AlertDialogContent>
    </AlertDialog>
  );
}
