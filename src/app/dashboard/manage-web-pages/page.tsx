
'use client';
import React, { useMemo, useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import type { PublicPage } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { BookCopy, Edit, PlusCircle, Trash2, Loader2, Globe, EyeOff, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { convertToDateSafely } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';

export default function ManageWebPages() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const pagesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'publicPages'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'));
  }, [firestore, currentStoreId]);

  const { data: pages, isLoading: isLoadingPages, error } = useCollection<PublicPage>(pagesQuery);

  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<PublicPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTogglePublished = async (page: PublicPage) => {
    if (!firestore) return;
    setIsToggling(page.id);
    try {
      const pageRef = doc(firestore, 'publicPages', page.id);
      await updateDoc(pageRef, { published: !page.published });
      toast({
        title: 'Status Updated',
        description: `Page "${page.title}" is now ${!page.published ? 'published' : 'a draft'}.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update page status.' });
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeletePage = async () => {
    if (!pageToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'publicPages', pageToDelete.id));
      toast({ title: 'Page Deleted', description: `"${pageToDelete.title}" has been permanently deleted.` });
      setPageToDelete(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the page.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingPages;

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions?.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader icon={BookCopy} title="Manage Web Pages" description="Edit, delete, and manage visibility of your public pages." />
        <Button asChild>
            <Link href="/dashboard/create-web-page"><PlusCircle className="mr-2 h-4 w-4"/> Create New Page</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Pages</CardTitle>
          <CardDescription>A list of all custom pages you have created.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages && pages.length > 0 ? (
                  pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="font-mono text-xs">/store/pages/{page.slug}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Switch
                                checked={page.published}
                                onCheckedChange={() => handleTogglePublished(page)}
                                disabled={isToggling === page.id}
                                aria-label={`Toggle visibility for ${page.title}`}
                            />
                            {isToggling === page.id ? <Loader2 className="h-4 w-4 animate-spin"/> : (
                                <Badge variant={page.published ? 'default' : 'secondary'} className={page.published ? 'bg-green-100 text-green-800' : ''}>
                                    {page.published ? <Eye className="mr-1.5 h-3.5 w-3.5"/> : <EyeOff className="mr-1.5 h-3.5 w-3.5"/>}
                                    {page.published ? 'Published' : 'Draft'}
                                </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{page.updatedAt ? format(convertToDateSafely(page.updatedAt)!, 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/manage-web-pages/edit/${page.id}`}><Edit className="mr-2 h-4 w-4"/>Edit</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setPageToDelete(page)}>
                          <Trash2 className="mr-2 h-4 w-4"/>Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No custom pages have been created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pageToDelete && (
        <DeleteConfirmationDialog
            isOpen={!!pageToDelete}
            onOpenChange={() => setPageToDelete(null)}
            onConfirm={handleDeletePage}
            itemName={pageToDelete.title}
            itemType="page"
            isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
