'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CreditCard, PlusCircle, Edit, Trash2, Upload, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';

const paymentMethodSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  iconUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof paymentMethodSchema>;

interface PaymentMethodsSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function PaymentMethodsSettings({ settingsData, isLoading, storeId }: PaymentMethodsSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const paymentMethods = settingsData?.paymentMethods || [];

  const handleAddNew = () => {
    setEditingMethod(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setIsFormModalOpen(true);
  };

  const handleDelete = (method: PaymentMethod) => {
    setMethodToDelete(method);
  };

  const confirmDelete = async () => {
    if (!firestore || !methodToDelete) return;
    setIsSaving(true);
    const updatedMethods = paymentMethods.filter(pm => pm.id !== methodToDelete.id);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { paymentMethods: updatedMethods });
      } else {
        await saveGlobalSettings(firestore, { paymentMethods: updatedMethods });
      }
      toast({ title: 'Success', description: `Payment method "${methodToDelete.name}" has been deleted.` });
      setMethodToDelete(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete payment method.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);

    let updatedMethods: PaymentMethod[];

    if (editingMethod) { // Editing existing method
      updatedMethods = paymentMethods.map(pm => 
        pm.id === editingMethod.id ? { ...editingMethod, ...values } : pm
      );
    } else { // Adding new method
      const newMethod: PaymentMethod = {
        id: new Date().getTime().toString(),
        name: values.name,
        iconUrl: values.iconUrl,
      };
      updatedMethods = [...paymentMethods, newMethod];
    }
    
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { paymentMethods: updatedMethods });
      } else {
        await saveGlobalSettings(firestore, { paymentMethods: updatedMethods });
      }
      toast({ title: 'Success', description: 'Payment methods have been updated.' });
      setIsFormModalOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save payment methods.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> Payment Methods</CardTitle>
          <CardDescription>Manage the payment options available at checkout.</CardDescription>
        </div>
        <Button onClick={handleAddNew} size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add New</Button>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
            <Info className="mx-auto h-8 w-8 mb-2" />
            No payment methods configured. Click 'Add New' to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {paymentMethods.map(method => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {method.iconUrl ? (
                    <Image src={method.iconUrl} alt={method.name} width={32} height={32} className="rounded-md object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium">{method.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(method)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(method)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <PaymentMethodFormDialog 
        isOpen={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSubmit={handleFormSubmit}
        isSaving={isSaving}
        defaultValues={editingMethod}
        storeId={storeId}
      />
      <DeleteConfirmationDialog
        isOpen={!!methodToDelete}
        onOpenChange={() => setMethodToDelete(null)}
        onConfirm={confirmDelete}
        isDeleting={isSaving}
        itemName={methodToDelete?.name || ''}
        itemType="payment method"
      />
    </Card>
  );
}

// --- Sub-component for the form dialog ---

interface PaymentMethodFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: FormValues) => Promise<void>;
    isSaving: boolean;
    defaultValues: PaymentMethod | null;
    storeId?: string | null;
}

function PaymentMethodFormDialog({ isOpen, onOpenChange, onSubmit, isSaving, defaultValues, storeId }: PaymentMethodFormDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: { name: '', iconUrl: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || '',
        iconUrl: defaultValues?.iconUrl || '',
      });
    }
  }, [isOpen, defaultValues, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB limit for icons
      toast({ variant: "destructive", title: "File too large", description: "Icon image should be smaller than 1MB." });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        form.setValue('iconUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Icon Uploaded", description: "New icon is set. Remember to save changes." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload icon." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit' : 'Add'} Payment Method</DialogTitle>
          <DialogDescription>
            {defaultValues ? 'Update the details for this payment option.' : 'Configure a new payment method for your store.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Method Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cash or Bank Transfer" {...field}  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="iconUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon URL (Optional)</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="https://example.com/icon.png" {...field}  />
                    </FormControl>
                    <Button asChild variant="outline" loading={isSaving || isUploading}>
                      <label htmlFor="icon-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <Input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload}  />
                      </label>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" loading={isSaving || isUploading}>Cancel</Button></DialogClose>
              <Button type="submit" loading={isSaving || isUploading}>

                Save Method
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
