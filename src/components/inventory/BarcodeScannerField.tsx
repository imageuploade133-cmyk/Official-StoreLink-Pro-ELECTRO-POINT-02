'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Barcode, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BarcodeScannerFieldProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function BarcodeScannerField({ 
  onScan, 
  placeholder = "Scan barcode or type SKU...", 
  className,
  autoFocus = true
}: BarcodeScannerFieldProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (value.trim()) {
        onScan(value.trim());
        setValue('');
      }
    }
  };

  return (
    <div className={cn("relative group w-full max-w-md", className)}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
        <Barcode className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        data-barcode-input="true"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-10 h-11 bg-muted/30 border-dashed focus:border-primary focus:ring-primary/20 rounded-xl transition-all font-medium"
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-1">
        {value && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setValue('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 mr-1 rounded-lg hover:bg-primary/10 hover:text-primary"
          onClick={() => {
            if (value.trim()) {
              onScan(value.trim());
              setValue('');
            }
            inputRef.current?.focus();
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
