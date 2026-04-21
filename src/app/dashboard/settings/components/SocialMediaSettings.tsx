'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, SocialMediaLink } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Share2, PlusCircle, Edit, Trash2, Upload, Info, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';

const socialMediaLinkSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  url: z.string().url('Please enter a valid URL.'),
  iconUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof socialMediaLinkSchema>;

interface SocialMediaSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function SocialMediaSettings({ settingsData, isLoading, storeId }: SocialMediaSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialMediaLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<SocialMediaLink | null>(null);

  const socialMediaLinks = settingsData?.socialMediaLinks || [];

  const handleAddNew = () => {
    setEditingLink(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (link: SocialMediaLink) => {
    setEditingLink(link);
    setIsFormModalOpen(true);
  };

  const handleDelete = (link: SocialMediaLink) => {
    setLinkToDelete(link);
  };

  const confirmDelete = async () => {
    if (!firestore || !linkToDelete) return;
    setIsSaving(true);
    const updatedLinks = socialMediaLinks.filter(pm => pm.id !== linkToDelete.id);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { socialMediaLinks: updatedLinks });
      } else {
        await saveGlobalSettings(firestore, { socialMediaLinks: updatedLinks });
      }
      toast({ title: 'Success', description: `Social link "${linkToDelete.name}" has been deleted.` });
      setLinkToDelete(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete social link.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);

    let updatedLinks: SocialMediaLink[];

    if (editingLink) {
      updatedLinks = socialMediaLinks.map(pm => 
        pm.id === editingLink.id ? { ...editingLink, ...values } : pm
      );
    } else {
      const newLink: SocialMediaLink = {
        id: new Date().getTime().toString(),
        name: values.name,
        url: values.url,
        iconUrl: values.iconUrl || '',
      };
      updatedLinks = [...socialMediaLinks, newLink];
    }
    
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { socialMediaLinks: updatedLinks });
      } else {
        await saveGlobalSettings(firestore, { socialMediaLinks: updatedLinks });
      }
      toast({ title: 'Success', description: 'Social media links have been updated.' });
      setIsFormModalOpen(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save social media links.' });
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
          <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5"/> Social Media Links</CardTitle>
          <CardDescription>Manage the social media links displayed in your website footer.</CardDescription>
        </div>
        <Button onClick={handleAddNew} size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add New</Button>
      </CardHeader>
      <CardContent>
        {socialMediaLinks.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
            <Info className="mx-auto h-8 w-8 mb-2" />
            No social media links configured. Click 'Add New' to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {socialMediaLinks.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {link.iconUrl ? (
                    <Image src={link.iconUrl} alt={link.name} width={32} height={32} className="rounded-md object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{link.name}</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground block hover:underline truncate max-w-xs">{link.url}</a>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(link)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(link)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <SocialMediaFormDialog 
        isOpen={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSubmit={handleFormSubmit}
        isSaving={isSaving}
        defaultValues={editingLink}
      />
      <DeleteConfirmationDialog
        isOpen={!!linkToDelete}
        onOpenChange={() => setLinkToDelete(null)}
        onConfirm={confirmDelete}
        isDeleting={isSaving}
        itemName={linkToDelete?.name || ''}
        itemType="social media link"
      />
    </Card>
  );
}

// --- Sub-component for the form dialog ---

interface SocialMediaFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: FormValues) => Promise<void>;
    isSaving: boolean;
    defaultValues: SocialMediaLink | null;
}

function SocialMediaFormDialog({ isOpen, onOpenChange, onSubmit, isSaving, defaultValues }: SocialMediaFormDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(socialMediaLinkSchema),
    defaultValues: { name: '', url: '', iconUrl: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: defaultValues?.name || '',
        url: defaultValues?.url || '',
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
          <DialogTitle>{defaultValues ? 'Edit' : 'Add'} Social Media Link</DialogTitle>
          <DialogDescription>
            {defaultValues ? 'Update the details for this social media profile.' : 'Add a new social media link to your website.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Facebook" {...field} disabled={isSaving || isUploading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://facebook.com/your-page" {...field} disabled={isSaving || isUploading} />
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
                      <Input placeholder="https://example.com/icon.png" {...field} disabled={isSaving || isUploading} />
                    </FormControl>
                    <Button asChild variant="outline" disabled={isSaving || isUploading}>
                      <label htmlFor="icon-upload" className="cursor-pointer">
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                        <span className="sr-only">Upload Icon</span>
                      </label>
                    </Button>
                    <Input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving || isUploading}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSaving || isUploading}>
                {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Link
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
