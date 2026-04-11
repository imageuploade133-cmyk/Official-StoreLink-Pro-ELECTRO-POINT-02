'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CategoryForm, type CategoryFormValues } from '@/components/inventory/CategoryForm';
import { FolderPlus, Loader2, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import AccessDenied from '@/components/staff-management/AccessDenied';

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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button>
            <FolderPlus className="mr-2 h-4 w-4" /> Add New Category
          </Button>
        )}
      </SheetTrigger>
      <SheetContent 
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-w-[95vw] flex flex-col p-0 overflow-hidden"
        side="right"
      >
        {/* Drag Handle Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 p-1 cursor-grab active:cursor-grabbing touch-none select-none z-10">
          <GripHorizontal className="h-5 w-5 text-muted-foreground/50" />
        </div>
        
        <SheetHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-2 pt-2">
            <FolderPlus className="h-5 w-5" />
            New Product Category
          </SheetTitle>
          <SheetDescription>
            Create a new classification for your inventory and storefront.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <CategoryForm 
            onSubmit={handleAddCategory}
            isSubmitting={isSubmitting}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CategorySheet;
