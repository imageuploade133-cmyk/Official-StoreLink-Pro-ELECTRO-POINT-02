'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminAuthDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: (password: string, email: string) => Promise<void>;
  isProcessing: boolean;
  title?: string;
  description?: string;
  confirmButtonText?: string;
}

export function AdminAuthDialog({ isOpen, onOpenChange, userEmail, onConfirm, isProcessing, title, description, confirmButtonText }: AdminAuthDialogProps) {
  const [password, setPassword] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (emailConfirmation.toLowerCase() !== userEmail.toLowerCase()) {
      toast({ variant: 'destructive', title: 'Confirmation Failed', description: 'The email address you entered does not match.' });
      return;
    }
    if (!password) {
        toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter your password to confirm.' });
        return;
    }
    onConfirm(password, emailConfirmation);
  };

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setEmailConfirmation('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || 'Admin Authentication Required'}</DialogTitle>
          <DialogDescription>{description || 'This is a sensitive action. Please re-authenticate to proceed.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-confirmation">Type your email to confirm: <span className="font-bold">{userEmail}</span></Label>
            <Input
              id="email-confirmation"
              value={emailConfirmation}
              onChange={(e) => setEmailConfirmation(e.target.value)}
              placeholder="Enter your email"
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-auth">Password</Label>
            <Input
              id="password-auth"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isProcessing}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmButtonText || 'Confirm Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
