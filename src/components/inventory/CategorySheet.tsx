"use client";
import React from "react";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CategoryForm, type CategoryFormValues } from '@/components/inventory/CategoryForm';
import { FolderPlus, Loader2, X as CloseIcon, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface CategorySheetProps {
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export function CategorySheet({ children, trigger }: CategorySheetProps) {
  const firestore = useFirestore();
  const { user, staffMember, store, permissions, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const currentStoreId = staffMember?.store_id || store?.id || user?.uid;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const trimmedName = values.name.trim();

    try {
      const q = query(collection(firestore, "categories"), where("name", "==", trimmedName), where("store_id", "==", currentStoreId));
      const existing = await getDocs(q);
      if (!existing.empty) {
        toast({ 
          variant: 'destructive', 
          title: 'Duplicate Category', 
          description: `A category named "${trimmedName}" already exists in this store.` 
        });
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(firestore, 'categories'), {
        ...values,
        store_id: currentStoreId,
        name: trimmedName,
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success', description: `Category "${trimmedName}" created.` });
      setIsOpen(false);
      router.refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create category.' });
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!permissions.add_categories) {
    return <>{children}</>;
  }

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={setIsOpen}
      dismissible={true}
    >
      <DrawerTrigger asChild>
        {trigger || (
          <Button>
            <FolderPlus className="mr-2 h-4 w-4" /> Add New Category
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent className="flex flex-col h-screen w-screen overflow-hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Create New Category</DrawerTitle>
          <DrawerDescription>Add a new collection to organize your products.</DrawerDescription>
        </DrawerHeader>
        <div 
          className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/20 transition-colors shrink-0"
          data-vaul-drag-handle
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex justify-end px-6 py-2 shrink-0">
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <CloseIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <CategoryForm 
            onSubmit={handleAddCategory}
            isSubmitting={isSubmitting}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default CategorySheet;
