'use client';

import * as React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { PackageX, AlertCircle, Database } from 'lucide-react';

interface OutOfDataDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  type?: 'stock' | 'data' | 'error';
}

export function OutOfDataDrawer({
  isOpen,
  onOpenChange,
  title = "Out of Data",
  description = "The requested information is currently unavailable or out of stock.",
  type = 'data',
}: OutOfDataDrawerProps) {
  const Icon = React.useMemo(() => {
    switch (type) {
      case 'stock':
        return PackageX;
      case 'error':
        return AlertCircle;
      case 'data':
      default:
        return Database;
    }
  }, [type]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[2rem] border-t-2">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="flex flex-col items-center pt-8">
            <div className="mb-6 rounded-full bg-primary/10 p-6 ring-8 ring-primary/5">
              <Icon className="h-12 w-12 text-primary" />
            </div>
            <DrawerTitle className="text-3xl font-black tracking-tight text-center">{title}</DrawerTitle>
            <DrawerDescription className="text-center mt-4 text-base font-medium text-muted-foreground leading-relaxed px-4">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pb-10 pt-6 px-6">
            <DrawerClose asChild>
              <Button size="lg" className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform">
                Got it, Thanks
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
