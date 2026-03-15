'use client';

import { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from '@/components/PageHeader';
import { HomepageSectionForm } from '@/components/homepage-sections/HomepageSectionForm';
import { Loader2, Columns, ArrowLeft } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { HomepageSection } from '@/lib/types';


export default function EditHomepageSectionPage() {
    const { permissions, isLoading: isAuthLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const sectionId = params.sectionId as string;
    const sectionRef = useMemo(() => firestore && sectionId ? doc(firestore, 'homepageSections', sectionId) : null, [firestore, sectionId]);
    const { data: sectionData, isLoading: isLoadingSection } = useDoc<HomepageSection>(sectionRef);
    
    const [isSaving, setIsSaving] = useState(false);

    const handleEditSubmit = async (values: any) => {
        if (!firestore || !sectionId) return;
        setIsSaving(true);
        try {
            const sectionRef = doc(firestore, 'homepageSections', sectionId);
            await updateDoc(sectionRef, {
                ...values,
                updatedAt: Timestamp.now(),
            });
            toast({ title: "Success", description: "Homepage section updated successfully." });
            router.push('/dashboard/homepage-sections');
        } catch (e: any) {
            console.error("Error updating homepage section:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update section.' });
            setIsSaving(false);
        }
    };
    
    const isLoading = isAuthLoading || isLoadingSection;

    if (isLoading) {
       return (
        <div className="space-y-6">
            <PageHeader
                icon={Columns}
                title="Edit Homepage Section"
                description="Modify an existing product section on your homepage."
            />
            <Skeleton className="h-[600px] w-full" />
        </div>
       )
    }
    
    if (!permissions.manage_website_content) {
        return <AccessDenied />;
    }
    
    if (!sectionData && !isLoadingSection) {
        return (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Section Not Found</h1>
            <p>The section you are trying to edit does not exist.</p>
            <Button asChild className="mt-4"><Link href="/dashboard/homepage-sections">Go Back</Link></Button>
          </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Columns}
                title={`Edit Section: ${sectionData?.title || '...'}`}
                description="Modify an existing product section on your homepage."
            >
                 <div className="mt-4">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/homepage-sections"><ArrowLeft className="mr-2" />Back to All Sections</Link>
                    </Button>
                </div>
            </PageHeader>
            <HomepageSectionForm defaultValues={sectionData!} onSubmit={handleEditSubmit} isSaving={isSaving} />
        </div>
    )
}
