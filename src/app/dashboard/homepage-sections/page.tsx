'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import type { HomepageSection } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/settings-context';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { Loader2, Columns, PlusCircle, Edit, Trash2, Zap, Clock, Info } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { convertToDateSafely } from '@/lib/utils';

export default function ManageHomepageSectionsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [sectionToDelete, setSectionToDelete] = useState<HomepageSection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sectionsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'homepageSections'), where('store_id', '==', currentStoreId), orderBy('order', 'asc'));
  }, [firestore, currentStoreId]);

  const { data: sections, isLoading: isLoadingSections } = useCollection<HomepageSection>(sectionsQuery);
  
  const isLoading = isAuthLoading || isLoadingSections;

  const handleDelete = async () => {
    if (!sectionToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'homepageSections', sectionToDelete.id));
      toast({ title: 'Success', description: 'Homepage section has been deleted.' });
      setSectionToDelete(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete section.' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader icon={Columns} title="Manage Homepage Sections" description="Organize and manage products, banners, and video sections on your storefront." />
        <div className="flex items-center gap-2">
            <Button asChild>
                <Link href="/dashboard/homepage-sections/create"><PlusCircle className="mr-2 h-4 w-4"/> Create Homepage Section</Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>All Sections</CardTitle>
            <CardDescription>A list of all configured homepage sections. Drag and drop to reorder is coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-16">Order</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Layout</TableHead>
                            <TableHead>Promotion</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections && sections.length > 0 ? (
                            sections.map(section => {
                                const startDate = convertToDateSafely(section.flashSaleStartDate);
                                const endDate = convertToDateSafely(section.flashSaleEndDate);
                                const now = new Date();
                                
                                const isPromoActive = section.isFlashSale && 
                                    (!startDate || now >= startDate) && 
                                    (!endDate || now <= endDate);
                                
                                const isScheduled = section.isFlashSale && startDate && now < startDate;

                                return (
                                    <TableRow key={section.id}>
                                        <TableCell className="font-medium">{section.order}</TableCell>
                                        <TableCell className="font-bold">{section.title}</TableCell>
                                        <TableCell><Badge variant="secondary" className="capitalize">{section.selectionType === 'custom-ui' ? section.uiType : section.selectionType}</Badge></TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{section.selectionType === 'custom-ui' ? 'Full Width' : (section.layout || 'N/A')}</Badge></TableCell>
                                        <TableCell>
                                            {isPromoActive ? (
                                                <Badge className="bg-rose-500 text-white font-black gap-1.5 h-6 px-2 border-none shadow-sm animate-pulse">
                                                    <Zap className="h-3 w-3 fill-current" />
                                                    {section.flashSaleDiscountType === 'percentage' 
                                                        ? `${section.flashSaleDiscountValue}%` 
                                                        : `${currencySymbol}${section.flashSaleDiscountValue}`}
                                                </Badge>
                                            ) : isScheduled ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 gap-1.5 h-6 px-2">
                                                    <Clock className="h-3 w-3" /> Scheduled
                                                </Badge>
                                            ) : section.isFlashSale && endDate && now > endDate ? (
                                                <span className="text-muted-foreground text-[10px] uppercase font-black opacity-40">Expired</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={section.published ? 'default' : 'secondary'} className={section.published ? 'bg-green-100 text-green-800' : ''}>
                                                {section.published ? 'Published' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/dashboard/homepage-sections/edit/${section.id}`}>
                                                    <Edit className="mr-2 h-4 w-4"/>Edit
                                                </Link>
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => setSectionToDelete(section)}>
                                                <Trash2 className="mr-2 h-4 w-4"/>Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                No sections have been created yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      {sectionToDelete && (
        <DeleteConfirmationDialog
            isOpen={!!sectionToDelete}
            onOpenChange={() => setSectionToDelete(null)}
            onConfirm={handleDelete}
            itemName={sectionToDelete.title}
            itemType="homepage section"
            isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
