'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator as CalculatorIcon, X, Percent, Divide, Plus, Minus, X as Times, Trash2, Delete, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface CalculatorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalculatorDialog({ isOpen, onOpenChange }: CalculatorDialogProps) {
  const [input, setInput] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      const { key } = event;
      if (key !== 'Tab' && key !== 'Shift') {
        event.preventDefault();
      }
      
      if (/[0-9]/.test(key)) handleButtonClick(key);
      else if (key === '.') handleButtonClick('.');
      else if (key === '+') handleButtonClick('+');
      else if (key === '-') handleButtonClick('-');
      else if (key === '*') handleButtonClick('*');
      else if (key === '/') handleButtonClick('/');
      else if (key === '%') handleButtonClick('%');
      else if (key === 'Enter' || key === '=') handleButtonClick('=');
      else if (key === 'Backspace') handleButtonClick('DEL');
      else if (key.toLowerCase() === 'c') handleButtonClick('AC');
      else if (key === 'Escape') onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, input, onOpenChange]);

  const handleButtonClick = (value: string) => {
    switch (value) {
      case 'AC':
        setInput('0');
        setHistory([]);
        break;
      case 'DEL':
        setInput(input.length > 1 ? input.slice(0, -1) : '0');
        break;
      case '=':
        try {
          const expression = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/--/g, '+');
          // eslint-disable-next-line no-eval
          const result = eval(expression);
          if (isNaN(result) || !isFinite(result)) {
              throw new Error("Invalid calculation");
          }
          const formattedResult = String(Number(result.toFixed(10)));
          setHistory(prev => [...prev, `${input} = ${formattedResult}`]);
          setInput(formattedResult);
        } catch (error) {
          setInput('Error');
        }
        break;
      case '.':
        const parts = input.split(/[\+\-\*\/]/);
        if (!parts[parts.length - 1].includes('.')) {
          setInput(input + value);
        }
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        const lastChar = input.trim().slice(-1);
        if (['+', '*', '/'].includes(lastChar)) {
          setInput(input.slice(0, -1) + value);
        } else if (lastChar === '-' && value === '-') {
            // Do nothing if trying to add another minus after a minus
        } else {
          setInput(input + value);
        }
        break;
      default:
        if (input === '0' || input === 'Error') {
          setInput(value);
        } else {
          setInput(input + value);
        }
        break;
    }
  };

  const calculatorButtons = [
    { label: 'AC', action: () => handleButtonClick('AC'), className: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' },
    { label: <Delete />, action: () => handleButtonClick('DEL'), className: 'bg-primary/80 hover:bg-primary' },
    { label: <History />, action: () => setShowHistory(!showHistory), className: 'bg-primary/80 hover:bg-primary' },
    { label: '÷', action: () => handleButtonClick('/'), className: 'bg-primary/80 hover:bg-primary' },
    { label: '7', action: () => handleButtonClick('7') },
    { label: '8', action: () => handleButtonClick('8') },
    { label: '9', action: () => handleButtonClick('9') },
    { label: '×', action: () => handleButtonClick('*'), className: 'bg-primary/80 hover:bg-primary' },
    { label: '4', action: () => handleButtonClick('4') },
    { label: '5', action: () => handleButtonClick('5') },
    { label: '6', action: () => handleButtonClick('6') },
    { label: '-', action: () => handleButtonClick('-'), className: 'bg-primary/80 hover:bg-primary' },
    { label: '1', action: () => handleButtonClick('1') },
    { label: '2', action: () => handleButtonClick('2') },
    { label: '3', action: () => handleButtonClick('3') },
    { label: '+', action: () => handleButtonClick('+'), className: 'bg-primary/80 hover:bg-primary' },
    { label: '0', action: () => handleButtonClick('0'), className: 'col-span-2' },
    { label: '.', action: () => handleButtonClick('.') },
    { label: '=', action: () => handleButtonClick('='), className: 'bg-green-600 hover:bg-green-700 text-white' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs p-0 flex flex-col h-auto max-h-[90vh]">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalculatorIcon className="h-5 w-5 text-primary" /> Calculator
          </DialogTitle>
          <DialogDescription className="sr-only">
            Perform basic arithmetic calculations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-4 space-y-3 flex-grow flex flex-col">
            <div className='relative flex-grow h-24 mb-2'>
                <Input 
                    type="text"
                    readOnly
                    value={input}
                    className="h-full text-3xl text-right font-mono bg-muted focus-visible:ring-0 focus-visible:ring-offset-0 border-muted-foreground/30 pr-4 break-all"
                    aria-label="Calculator display"
                />
                 {showHistory && (
                    <Card className="absolute inset-0 bg-background/95 backdrop-blur-sm p-2 flex flex-col">
                        <CardHeader className="p-2">
                            <CardTitle className='text-sm flex justify-between items-center'>
                                History
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}><X className="h-4 w-4"/></Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className='p-2 flex-grow overflow-hidden'>
                        <ScrollArea className="h-full">
                            {history.length > 0 ? (
                                <ul className="text-right space-y-1 text-sm text-muted-foreground">
                                    {history.slice().reverse().map((entry, index) => (
                                        <li key={index} className="border-b pb-1 break-all">{entry}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-xs text-muted-foreground pt-10">No history yet.</p>
                            )}
                        </ScrollArea>
                        </CardContent>
                    </Card>
                 )}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {calculatorButtons.map((btn, index) => (
                    <Button
                        key={index}
                        variant={btn.className?.includes('bg-') ? 'default' : 'outline'}
                        className={cn('h-14 text-xl font-medium', btn.className)}
                        onClick={btn.action}
                    >
                        {btn.label}
                    </Button>
                ))}
            </div>
        </div>
        
        <DialogFooter className="p-4 pt-2 border-t">
          <DialogClose asChild>
            <Button variant="outline" className="w-full">
               <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
