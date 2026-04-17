'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z flex flex-col items-center justify-center bg-background p-6 text-center animate-in fade-in duration-500">
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative rounded-full bg-primary/10 p-8 ring-8 ring-primary/5">
          <WifiOff className="h-16 w-16 text-primary animate-bounce" />
        </div>
      </div>
      <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground uppercase">Connection Lost</h1>
      <p className="mb-10 max-w-xs text-muted-foreground font-medium leading-relaxed">
        It looks like you're offline or have run out of data. Please check your connection and try again.
      </p>
      <Button 
        onClick={() => window.location.reload()} 
        size="lg"
        className="h-14 px-8 rounded-2xl text-base font-bold   active:scale-95 transition-all flex items-center gap-3"
      >
        <RefreshCw className="h-5 w-5" />
        RETRY CONNECTION
      </Button>
      <p className="mt-6 text-sm font-bold text-primary animate-pulse tracking-widest uppercase">
        Waiting for internet...
      </p>
    </div>
  );
}
