"use client";
import React from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface ActionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ActionModal({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
}: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} dismissible={true}>
      <DrawerContent className="flex flex-col h-screen w-screen max-w-full sm:max-w-md mx-auto overflow-hidden">
        {/* Drag Handle Indicator */}
        <div 
          className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/20 transition-colors shrink-0"
          data-vaul-drag-handle
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <DrawerHeader className="px-6 py-4 border-b shrink-0">
          <DrawerTitle className="flex items-center gap-2">
            {title}
          </DrawerTitle>
          {description && <DrawerDescription>{description}</DrawerDescription>}
        </DrawerHeader>
        
        <div className="flex justify-end px-6 py-2 shrink-0">
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </div>

        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col space-y-2 px-6 py-4">
            {children}
          </div>
        </ScrollArea>
        
        <DrawerFooter className="shrink-0">
          <DrawerClose asChild>
            <Button type="button" variant="secondary" className="w-full">
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
