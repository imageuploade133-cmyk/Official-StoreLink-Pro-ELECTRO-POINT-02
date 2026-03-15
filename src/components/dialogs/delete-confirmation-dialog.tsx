
'use client';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName: string;
  itemType: string;
  dialogTitle?: string;
  dialogDescription?: string;
  confirmButtonText?: string;
}

export function DeleteConfirmationDialog({
  isOpen,
  onOpenChange,
  isDeleting,
  onConfirm,
  itemType,
  itemName,
  dialogTitle,
  dialogDescription,
  confirmButtonText = "Delete"
}: DeleteConfirmationDialogProps) {

  const handleCancel = () => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialogTitle || `Are you sure you want to delete this ${itemType}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {dialogDescription ? (
              <span dangerouslySetInnerHTML={{ __html: dialogDescription }} />
            ) : (
              <span>This action will permanently delete <strong>`&quot;`{itemName}`&quot;`</strong>. This cannot be undone.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : confirmButtonText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
