"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFirestore, useDoc } from "@/firebase";
import { useAuth } from "@/contexts/auth-context";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { CategoryForm, type CategoryFormValues } from "@/components/inventory/CategoryForm";
import { Edit, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AccessDenied from "@/components/staff-management/AccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/lib/types";

export default function EditCategoryPage() {
  const firestore = useFirestore();
  const { user, permissions, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryRef = useMemo(() => 
    firestore && categoryId ? doc(firestore, 'categories', categoryId) : null, 
  [firestore, categoryId]);

  const { data: category, isLoading: isLoadingCategory } = useDoc<Category>(categoryRef);

  const handleEditCategory = async (values: CategoryFormValues) => {
    if (!user || !firestore || !categoryId) return;
    setIsSubmitting(true);
    const trimmedName = values.name.trim();

    try {
      const ref = doc(firestore, 'categories', categoryId);
      await updateDoc(ref, {
        ...values,
        name: trimmedName,
        updatedAt: Timestamp.now(),
      });

      toast({ title: 'Success', description: 'Category updated.' });
      router.push('/dashboard/categories');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update category.' });
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingCategory) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.edit_categories) {
    return <AccessDenied />;
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-2xl font-bold">Category not found</h2>
        <Button asChild className="mt-4"><Link href="/dashboard/categories">Back to Categories</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={Edit}
          title={`Edit Category: ${category.name}`}
          description="Update classification details and flash sale settings."
        />
        <Button variant="ghost" asChild className="gap-2 btn-back">
          <Link href="/dashboard/categories">
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Link>
        </Button>
      </div>

      <CategoryForm 
        onSubmit={handleEditCategory}
        isSubmitting={isSubmitting}
        defaultValues={category}
        isEditMode={true}
      />
    </div>
  );
}
