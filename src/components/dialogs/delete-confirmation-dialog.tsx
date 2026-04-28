
'use client';

import { ResponsiveAlertDialog } from '../ui/responsive-alert-dialog';
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
    <ResponsiveAlertDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title={dialogTitle || `Are you sure you want to delete this ${itemType}?`}
      onAction={onConfirm}
      onCancel={handleCancel}
      actionText={isDeleting ? 'Deleting...' : confirmButtonText}
      actionClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
    >
      {dialogDescription ? (
        <span dangerouslySetInnerHTML={{ __html: dialogDescription }} />
      ) : (
        <span>This action will permanently delete <strong>&quot;{itemName}&quot;</strong>. This cannot be undone.</span>
      )}
    </ResponsiveAlertDialog>
  );
}
