"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { CategoryForm, type CategoryFormValues } from "@/components/inventory/CategoryForm";
import { FolderPlus, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AccessDenied from "@/components/staff-management/AccessDenied";

export default function AddCategoryPage() {
  const firestore = useFirestore();
  const { user, permissions, isLoading: authLoading, staffMember, store } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCategory = async (values: CategoryFormValues) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    const trimmedName = values.name.trim();
    const currentStoreId = staffMember?.store_id || store?.id || user.uid;

    try {
      const q = query(
        collection(firestore, "categories"), 
        where("name", "==", trimmedName),
        where("store_id", "==", currentStoreId)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        toast({ 
          variant: "destructive", 
          title: "Duplicate Category", 
          description: `A category named "${trimmedName}" already exists in your store.` 
        });
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(firestore, 'categories'), {
        ...values,
        name: trimmedName,
        store_id: currentStoreId,
        createdAt: Timestamp.now(),
      });

      toast({ title: 'Success', description: `Category "${trimmedName}" created.` });
      router.push('/dashboard/categories');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create category.' });
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.add_categories) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={FolderPlus}
          title="Add New Category"
          description="Create a new classification for your inventory and storefront."
        />
        <Button variant="ghost" asChild className="gap-2 btn-back">
          <Link href="/dashboard/categories">
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Link>
        </Button>
      </div>

      <CategoryForm 
        onSubmit={handleAddCategory}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
