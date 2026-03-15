'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PauseCircle, Loader2, Save, X } from 'lucide-react';

interface ConfirmHoldSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string, customerIdentifier?: string) => void;
  isSubmitting?: boolean;
}

export function ConfirmHoldSaleDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  isSubmitting = false
}: ConfirmHoldSaleDialogProps) {
  const [notes, setNotes] = useState('');
  const [customerIdentifier, setCustomerIdentifier] = useState('');

  const handleSubmit = () => {
    onConfirm(notes, customerIdentifier);
  };

  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
      setCustomerIdentifier('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PauseCircle className="h-6 w-6 text-primary" /> Hold Current Sale
          </DialogTitle>
          <DialogDescription>
            Add optional notes or a customer identifier for this held sale.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holdCustomerIdentifier">Customer Identifier (Optional)</Label>
            <Input 
              id="holdCustomerIdentifier" 
              placeholder="e.g., John D. / 555-1234" 
              value={customerIdentifier}
              onChange={(e) => setCustomerIdentifier(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holdNotes">Notes (Optional)</Label>
            <Textarea 
              id="holdNotes" 
              placeholder="e.g., Customer will return in 1 hour." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4"/> Close
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Save className="mr-2 h-4 w-4" />
            )}
            Confirm Hold Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
