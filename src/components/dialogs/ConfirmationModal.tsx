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
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 animate-pulse",
        variant === 'destructive' ? "bg-destructive" : "bg-primary"
      )} />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className={cn(
          "h-24 w-24 rounded-[2.5rem] flex items-center justify-center mb-2 rotate-3 transition-all hover:rotate-0 hover:scale-110 shadow-2xl duration-500",
          variant === 'destructive' ? "bg-destructive text-white shadow-destructive/20" : "bg-primary text-white shadow-primary/20"
        )}>
          {variant === 'destructive' ? <Trash2 className="h-12 w-12" strokeWidth={2.5} /> : <AlertTriangle className="h-12 w-12" strokeWidth={2.5} />}
        </div>
        <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground leading-none">
                {title}
            </h2>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-tight px-6 leading-relaxed opacity-80">
                {description}
            </p>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row gap-4 mt-12 w-full">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="flex-1 rounded-2xl h-16 font-black uppercase tracking-widest text-[11px] hover:bg-muted transition-all active:scale-95"
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
              "flex-1 rounded-2xl h-16 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 text-white",
              variant === 'destructive' ? "bg-destructive hover:bg-destructive/90 shadow-destructive/40" : "bg-primary hover:bg-primary/90 shadow-primary/40"
          )}
        >
          {confirmText}
        </Button>
      </div>

      {!isMobile && (
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute -top-6 -right-6 p-3 rounded-full hover:bg-muted transition-all z-20 group"
        >
          <X className="h-5 w-5 text-muted-foreground group-hover:rotate-90 transition-transform" />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="p-8 pt-2 pb-16 rounded-t-[3rem] border-none outline-none bg-background/95 backdrop-blur-xl">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/20 mb-10" />
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
