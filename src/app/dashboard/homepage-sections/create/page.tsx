
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from '@/components/PageHeader';
import { HomepageSectionForm } from '@/components/homepage-sections/HomepageSectionForm';
import { Loader2, Columns, ArrowLeft } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Button } from '@/components/ui/button';

export default function CreateHomepageSectionPage() {
    const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

    const handleCreateSubmit = async (values: any) => {
        if (!firestore || !currentStoreId) return;
        setIsSaving(true);
        try {
            await addDoc(collection(firestore, 'homepageSections'), {
                ...values,
                store_id: currentStoreId,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            toast({ title: "Success", description: "Homepage section created successfully." });
            router.push('/dashboard/homepage-sections');
        } catch (e: any) {
            console.error("Error creating homepage section:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create section.' });
            setIsSaving(false);
        }
    };
    
    if (isAuthLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }
    
    if (!permissions.manage_website_content) {
        return <AccessDenied />;
    }

    return (
        <div className="space-y-6">
             <PageHeader
                icon={Columns}
                title="Create Homepage Section"
                description="Build a new section to feature products on your homepage."
            >
             <div className="mt-4">
                    <Button variant="ghost" asChild className="btn-back">
                        <Link href="/dashboard/homepage-sections"><ArrowLeft className="h-4 w-4" /> Back to All Sections</Link>
                    </Button>
                </div>
            </PageHeader>
            <HomepageSectionForm onSubmit={handleCreateSubmit} isSaving={isSaving} />
        </div>
    )
}
