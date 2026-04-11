'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CategoryForm, type CategoryFormValues } from '@/components/inventory/CategoryForm';
import { FolderPlus, Loader2, GripHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';

interface CategorySheetProps {
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export function CategorySheet({ children, trigger }: CategorySheetProps) {
  const firestore = useFirestore();
  const { user, permissions, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const trimmedName = values.name.trim();

    try {
      const q = query(collection(firestore, "categories"), where("name", "==", trimmedName));
      const existing = await getDocs(q);
      if (!existing.empty) {
        toast({ 
          variant: 'destructive', 
          title: 'Duplicate Category', 
          description: `A category named "${trimmedName}" already exists.` 
        });
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(firestore, 'categories'), {
        ...values,
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
      <DrawerContent className="flex flex-col h-[90vh] max-h-[90vh] rounded-t-[20px] border-t overflow-hidden">
        {/* Drag Handle Bar - Prominent and Draggable */}
        <div 
          className="w-full flex flex-col items-center pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none select-none hover:bg-muted/30 transition-colors shrink-0"
          data-vaul-drag-handle
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40 mb-2" />
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">
              Drag down to close
            </span>
          </div>
        </div>
        
        <DrawerHeader className="px-6 py-3 border-b bg-muted/30 shrink-0 relative">
          {/* Close Button */}
          <DrawerClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
          
          <DrawerTitle className="flex items-center gap-2 pr-10">
            <FolderPlus className="h-5 w-5" />
            New Product Category
          </DrawerTitle>
          <DrawerDescription>
            Create a new classification for your inventory and storefront.
          </DrawerDescription>
        </DrawerHeader>
        
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
