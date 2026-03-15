
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings, BankAccount } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Landmark, Info, PlusCircle, Trash2, Edit, X, Upload } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { uploadImage } from '@/ai/flows/image-upload-flow';

const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required.'),
  accountNumber: z.string().min(5, 'Valid account number is required.'),
  accountName: z.string().min(2, 'Account holder name is required.'),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const instructionsSchema = z.object({
  bankTransferInstructions: z.string().min(10, 'Please provide clear instructions for customers.'),
});

type AccountFormValues = z.infer<typeof bankAccountSchema>;
type InstructionsFormValues = z.infer<typeof instructionsSchema>;

export default function WebsitePaymentSettings() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const bankAccounts = settingsData?.bankAccounts || [];

  const instructionsForm = useForm<InstructionsFormValues>({
    resolver: zodResolver(instructionsSchema),
    defaultValues: {
      bankTransferInstructions: 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
    },
  });

  useEffect(() => {
    if (settingsData) {
      instructionsForm.reset({
        bankTransferInstructions: settingsData.bankTransferInstructions || 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
      });
    }
  }, [settingsData, instructionsForm]);

  const onSaveInstructions = async (data: InstructionsFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Transfer instructions updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update instructions.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const onAccountFormSubmit = async (values: AccountFormValues) => {
    if (!firestore) return;
    setIsSaving(true);

    let updatedAccounts: BankAccount[];
    if (editingAccount) {
      updatedAccounts = bankAccounts.map(acc => 
        acc.id === editingAccount.id ? { ...acc, ...values } : acc
      );
    } else {
      updatedAccounts = [...bankAccounts, { id: Date.now().toString(), ...values }];
    }

    try {
      await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      toast({ title: 'Success', description: 'Bank account saved.' });
      setIsAccountModalOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save bank account.' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!firestore || !accountToDelete) return;
    setIsSaving(true);
    const updatedAccounts = bankAccounts.filter(acc => acc.id !== accountToDelete.id);
    try {
      await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      toast({ title: 'Success', description: 'Bank account removed.' });
      setAccountToDelete(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove account.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Landmark} title="Website Payment Method" description="Configure manual payment options for your public store." />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Website Payment Method"
        description="Set up multiple bank accounts for manual transfers from online customers."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bank Accounts</CardTitle>
                <CardDescription>Add the accounts where customers should send payments.</CardDescription>
              </div>
              <Button onClick={handleAddAccount} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                  <Landmark className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No bank accounts added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                      <div className="flex items-center gap-4">
                        {acc.logoUrl ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border bg-white">
                            <Image src={acc.logoUrl} alt={acc.bankName} fill className="object-contain p-1" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                            <Landmark className="h-6 w-6" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="font-bold text-lg leading-tight">{acc.bankName}</p>
                          <p className="text-sm font-medium">{acc.accountName}</p>
                          <p className="text-sm font-mono tracking-wider">{acc.accountNumber}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditAccount(acc)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setAccountToDelete(acc)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Form {...instructionsForm}>
            <form onSubmit={instructionsForm.handleSubmit(onSaveInstructions)}>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Instructions</CardTitle>
                  <CardDescription>Tell customers what to do after choosing bank transfer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={instructionsForm.control}
                    name="bankTransferInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Textarea rows={4} placeholder="e.g., Please transfer the exact amount..." {...field} /></FormControl>
                        <FormDescription>These instructions are shown during checkout.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Instructions
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Info className="h-4 w-4" /> Professional Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>When a customer chooses <strong>Bank Transfer</strong>:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>They see your list of accounts and pick one.</li>
                <li>The system generates a unique <strong>5-digit tracking code</strong>.</li>
                <li>Customers are told to use this code as their reference.</li>
                <li>This allows you to match payments to orders instantly.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Account Dialog */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
          </DialogHeader>
          <AccountForm onSubmit={onAccountFormSubmit} isSaving={isSaving} defaultValues={editingAccount || undefined} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog 
        isOpen={!!accountToDelete} 
        onOpenChange={() => setAccountToDelete(null)} 
        onConfirm={confirmDeleteAccount} 
        isDeleting={isSaving} 
        itemName={accountToDelete?.bankName || ''} 
        itemType="bank account" 
      />
    </div>
  );
}

function AccountForm({ onSubmit, isSaving, defaultValues }: { onSubmit: (values: AccountFormValues) => Promise<void>, isSaving: boolean, defaultValues?: AccountFormValues }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: defaultValues || { bankName: '', accountNumber: '', accountName: '', logoUrl: '' }
  });

  const logoUrl = form.watch('logoUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Logo image should be smaller than 1MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('logoUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Logo Uploaded", description: "Bank logo has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload logo." });
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="logoUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Logo (Optional)</FormLabel>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" /> : <Landmark className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex-grow space-y-2">
                <div className="flex items-center gap-2">
                  <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} /></FormControl>
                  <Button asChild variant="outline" size="icon" disabled={isSaving || isUploading}>
                    <label htmlFor="bank-logo-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                    </label>
                  </Button>
                  <Input id="bank-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                </div>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="bankName" render={({ field }) => (
          <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., First National Bank" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountName" render={({ field }) => (
          <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., StoreLink Pro Ltd" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountNumber" render={({ field }) => (
          <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 1234567890" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button variant="outline" disabled={isSaving || isUploading}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSaving || isUploading}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Account</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
