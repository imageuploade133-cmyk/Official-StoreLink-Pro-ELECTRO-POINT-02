'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Trash2, ExternalLink, Copy, Check, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function MediaLibraryPage() {
    const [uploads, setUploads] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copyingId, setCopyingId] = useState<string | null>(null);
    const { toast } = useToast();
    const firestore = useFirestore();
    const { permissions, isLoading: authLoading, store, staffMember } = useAuth();

    const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

    const fetchUploads = useCallback(async () => {
        if (!firestore || !currentStoreId) return;
        setIsLoading(true);
        try {
            const uploadsRef = collection(firestore, 'stores', currentStoreId, 'uploads');
            const q = query(uploadsRef, orderBy('uploadedAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            setUploads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching uploads:", e);
            toast({ variant: 'destructive', title: "Error", description: "Could not load media library." });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, currentStoreId, toast]);

    useEffect(() => {
        if (firestore && currentStoreId) {
            fetchUploads();
        }
    }, [firestore, currentStoreId, fetchUploads]);

    const handleDelete = async (uploadId: string) => {
        if (!firestore || !currentStoreId) return;
        if (!window.confirm("Are you sure you want to remove this image from your library? The image will still exist on ImgBB but won't be visible here.")) return;
        
        try {
            await deleteDoc(doc(firestore, 'stores', currentStoreId, 'uploads', uploadId));
            setUploads(prev => prev.filter(u => u.id !== uploadId));
            toast({ title: "Deleted", description: "Image record removed from your library." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete image record." });
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyingId(id);
        toast({ title: "Copied!", description: "Image URL copied to clipboard." });
        setTimeout(() => setCopyingId(null), 2000);
    };

    if (authLoading || (isLoading && uploads.length === 0)) {
        return <div className="flex h-[50vh] w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (!permissions.view_inventory) {
        return <div className="p-8 text-center font-black uppercase tracking-widest text-destructive">Access Denied</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <PageHeader
                    icon={ImageIcon}
                    title="Media Library"
                    description="View and manage all images uploaded by your store."
                />
                <Button variant="outline" size="sm" onClick={fetchUploads} disabled={isLoading} className="font-bold uppercase tracking-widest text-[10px]">
                    <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Sync Library
                </Button>
            </div>

            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {uploads.length === 0 ? (
                    <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/5 border-muted-foreground/20">
                        <div className="h-20 w-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
                            <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest text-primary">Library Empty</h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">All images you upload for products or storefront settings will automatically appear here for reuse.</p>
                    </div>
                ) : (
                    uploads.map((upload) => (
                        <Card key={upload.id} className="overflow-hidden group border-none ring-1 ring-border shadow-sm hover:shadow-xl transition-all duration-300 rounded-[1.5rem]">
                            <div className="relative aspect-square bg-muted">
                                <Image 
                                    src={upload.imageUrl} 
                                    alt={upload.storeName} 
                                    fill 
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <Button 
                                        size="icon" 
                                        variant="secondary" 
                                        className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white" 
                                        onClick={() => copyToClipboard(upload.imageUrl, upload.id)}
                                        title="Copy Link"
                                    >
                                        {copyingId === upload.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                    <a 
                                        href={upload.imageUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-black hover:bg-white transition-colors"
                                        title="Open Original"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                    <Button 
                                        size="icon" 
                                        variant="destructive" 
                                        className="h-9 w-9 rounded-full shadow-lg" 
                                        onClick={() => handleDelete(upload.id)}
                                        title="Delete Record"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Badge className="absolute top-2 left-2 text-[8px] font-black uppercase tracking-widest bg-black/50 text-white backdrop-blur-md border-none">
                                    {upload.storeId}
                                </Badge>
                            </div>
                            <div className="p-3 bg-card border-t dark:border-border/50">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest truncate text-primary">{upload.storeName}</p>
                                    <p className="text-[8px] text-muted-foreground font-bold">
                                        {upload.uploadedAt?.toDate ? format(upload.uploadedAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
