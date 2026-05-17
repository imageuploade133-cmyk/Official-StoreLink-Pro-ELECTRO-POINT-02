'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  collectionGroup,
  deleteDoc,
  doc,
  query,
  updateDoc,
  serverTimestamp,
  getDocs,
  limit,
  orderBy,
  startAfter,
  endBefore,
  limitToLast,
  where,
  getCountFromServer,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
  collection
} from 'firebase/firestore';
import type { ProductReview } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  MoreHorizontal, 
  Star, 
  Reply as ReplyIcon, 
  Trash2, 
  EyeOff, 
  Eye,
  Ban, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from "@/contexts/settings-context";
import { useAuth } from '@/contexts/auth-context';
import { useFirestore } from '@/firebase';
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from '@/components/PageHeader';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE = 10;

export default function ReviewsPage() {
  const { user: authUser, permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ProductReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSuspending, setIsSuspending] = useState(false);

  const { toast } = useToast();
  
  const markAsRead = useCallback(async (review: ProductReview) => {
    if (!firestore || !review.productId || review.isRead) return;
    try {
      const reviewRef = doc(firestore, 'products', review.productId, 'reviews', review.id);
      await updateDoc(reviewRef, { isRead: true });
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, isRead: true } : r));
    } catch (e) {
      console.error("Error marking review as read:", e);
    }
  }, [firestore]);

  const markAllAsRead = async () => {
    if (!firestore || !currentStoreId || reviews.length === 0) return;
    setIsLoadingReviews(true);
    try {
      const q = query(
        collectionGroup(firestore, 'reviews'),
        where('store_id', '==', currentStoreId)
      );
      const snapshot = await getDocs(q);
      let count = 0;
      
      const batchSize = 500;
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = docs.slice(i, i + batchSize);
        let chunkCount = 0;
        
        chunk.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.isRead) {
            batch.update(docSnap.ref, { isRead: true });
            chunkCount++;
          }
        });
        
        if (chunkCount > 0) {
          await batch.commit();
          count += chunkCount;
        }
      }
      
      if (count > 0) {
        toast({ title: 'Success', description: `Marked ${count} reviews as read.` });
        fetchReviews('initial');
      } else {
        toast({ title: 'Info', description: 'All reviews are already marked as read.' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to mark reviews as read.' });
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchReviews = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingReviews(true);

    try {
      // Use collectionGroup to find all 'reviews' subcollections
      // Note: This requires a composite index in Firestore for collectionGroup 'reviews'
      // with fields store_id ASC, createdAt DESC
      let q = query(
        collectionGroup(firestore, 'reviews'), 
        where('store_id', '==', currentStoreId), 
        orderBy('createdAt', 'desc')
      );

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCount(countSnap.data().count);
      }

      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const data = docs.map(d => ({ id: d.id, ...d.data() } as ProductReview));
        setReviews(data);

        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setReviews([]);
          setTotalCount(0);
          setIsLastPage(true);
        } else if (direction === 'next') {
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      // Handle the case where the index is missing
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        toast({ 
            variant: 'destructive', 
            title: "Index Required", 
            description: "A Firestore index is being created. Please try again in a few minutes." 
        });
      } else {
        toast({ variant: 'destructive', title: "Sync Error", description: "Could not load reviews." });
      }
    } finally {
      setIsLoadingReviews(false);
    }
  }, [firestore, currentStoreId, toast]);

  useEffect(() => {
    if (firestore && !authLoading && currentStoreId) {
      fetchReviews('initial');
    }
  }, [firestore, authLoading, currentStoreId, fetchReviews]);

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim() || !firestore) return;
    if (!selectedReview.productId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot reply: Product ID missing on review.' });
        return;
    }

    setIsSubmittingReply(true);
    try {
      const reviewRef = doc(firestore, 'products', selectedReview.productId, 'reviews', selectedReview.id);
      await updateDoc(reviewRef, {
        reply: replyText.trim(),
        repliedAt: serverTimestamp(),
        isRead: true
      });
      toast({ title: 'Reply posted', description: 'Your response is now visible.' });
      setReplyText('');
      setIsActionModalOpen(false);
      fetchReviews('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to post reply.' });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const toggleHideReview = async (review: ProductReview) => {
    if (!firestore || !review.productId) return;
    try {
      const reviewRef = doc(firestore, 'products', review.productId, 'reviews', review.id);
      await updateDoc(reviewRef, {
        isHidden: !review.isHidden
      });
      toast({ title: review.isHidden ? 'Review is now visible' : 'Review is now hidden' });
      setIsActionModalOpen(false);
      fetchReviews('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to update review status.' });
    }
  };

  const deleteReview = async () => {
    if (!reviewToDelete || !firestore || !reviewToDelete.productId) return;
    setIsDeleting(true);
    try {
      const reviewRef = doc(firestore, 'products', reviewToDelete.productId, 'reviews', reviewToDelete.id);
      await deleteDoc(reviewRef);
      toast({ title: 'Review permanently deleted' });
      setIsDeleteDialogOpen(false);
      setReviewToDelete(null);
      fetchReviews('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to delete review.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const suspendUser = async (userId: string) => {
    if (!firestore || !currentStoreId) return;
    setIsSuspending(true);
    try {
      const customersRef = collection(firestore, 'customers');
      const q = query(customersRef, where('store_id', '==', currentStoreId), where('uid', '==', userId));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: 'destructive', title: 'Customer Not Found', description: 'No matching customer registry entry found.' });
        return;
      }
      
      const customerDoc = snap.docs[0];
      await updateDoc(doc(firestore, 'customers', customerDoc.id), {
        status: 'banned',
        updatedAt: serverTimestamp()
      });
      
      toast({ title: 'Customer Suspended', description: 'This user has been banned from store interactions.' });
      setIsActionModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message || 'Failed to suspend customer.' });
    } finally {
      setIsSuspending(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.manage_website_content) {
    return <div className="p-8 text-center font-bold">Access Denied: Insufficient Permissions</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            icon={Star}
            title="Product Reviews"
            description="Moderate customer feedback, reply to reviews, and manage visibility."
          />
          <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={markAllAsRead} disabled={isLoadingReviews || reviews.length === 0}>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all as read
              </Button>
              <Button variant="outline" onClick={() => fetchReviews('initial')} disabled={isLoadingReviews}>
                  <Loader2 className={cn("mr-2 h-4 w-4", isLoadingReviews && "animate-spin")} />
                  Refresh Reviews
              </Button>
          </div>
      </div>

      <Card className="shadow-lg border-none ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-tight">Customer Feedback</CardTitle>
          <CardDescription>
            {isLoadingReviews ? "Fetching latest ratings..." : `${totalCount} reviews recorded for your store.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="min-w-[300px]">Review & Response</TableHead>
                  <TableHead>Posted On</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingReviews && reviews.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6"><Skeleton className="h-10 w-32 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-full max-w-[400px] rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24 rounded" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right pr-6"><Skeleton className="h-10 w-10 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      No customer reviews have been posted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((review) => (
                    <TableRow key={review.id} className={cn("group transition-colors", review.isHidden && "bg-muted/30 opacity-60", !review.isRead && !review.reply && "bg-primary/[0.03] dark:bg-primary/[0.05]")}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                              <AvatarImage src={review.userPhotoURL || ''} />
                              <AvatarFallback className="font-bold text-[10px] bg-primary/10 text-primary">
                                  {review.userName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {!review.isRead && !review.reply && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{review.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "text-amber-400 fill-current" : "text-slate-200 dark:text-slate-800")} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                            <p className="text-sm leading-snug line-clamp-2 font-medium italic" title={review.comment}>&quot;{review.comment}&quot;</p>
                            {review.reply ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-widest text-primary">
                                    <ReplyIcon className="h-3 w-3" /> Replied
                                </div>
                            ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Response Yet</span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {review.createdAt ? format(review.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                      </TableCell>
                      <TableCell>
                        {review.isHidden ? (
                          <Badge variant="outline" className="h-5 px-2 text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700">
                            Hidden
                          </Badge>
                        ) : (
                          <Badge variant="default" className="h-5 px-2 text-[10px] font-black uppercase tracking-tighter bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none shadow-none">
                            Public
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { 
                          setSelectedReview(review); 
                          setReplyText(review.reply || ''); 
                          setIsActionModalOpen(true); 
                          if (!review.isRead) markAsRead(review);
                        }}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-4 border-t bg-muted/5">
          <div className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
            Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE) || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchReviews('prev')} disabled={currentPage === 1 || isLoadingReviews} className="font-bold h-8">
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchReviews('next')} disabled={isLastPage || isLoadingReviews} className="font-bold h-8">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ActionModal
        isOpen={isActionModalOpen}
        onOpenChange={setIsActionModalOpen}
        title="Moderate Feedback"
        description={`Manage the public review and your response to ${selectedReview?.userName}`}
      >
        {selectedReview && (
          <div className="space-y-6">
            <div className="p-4 bg-muted/30 border rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedReview.userPhotoURL || ''} />
                        <AvatarFallback className="text-[8px]">{selectedReview.userName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-black tracking-tight">{selectedReview.userName}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("h-3 w-3", i < selectedReview.rating ? "text-amber-400 fill-current" : "text-muted")} />
                  ))}
                </div>
              </div>
              <p className="text-sm italic leading-relaxed text-slate-600 dark:text-slate-400">&quot;{selectedReview.comment}&quot;</p>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Merchant Reply</Label>
              <Textarea
                placeholder="Address the customer's feedback. This will be visible on the product page."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[120px] rounded-2xl resize-none bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-primary shadow-inner"
              />
              <Button 
                className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" 
                onClick={handleReply} 
                disabled={isSubmittingReply || !replyText.trim() || replyText === selectedReview.reply}
              >
                {isSubmittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReplyIcon className="h-4 w-4 mr-2" />}
                {selectedReview.reply ? 'Update My Reply' : 'Post Official Reply'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-2xl h-11 font-bold text-sm" onClick={() => toggleHideReview(selectedReview)}>
                {selectedReview.isHidden ? <Eye className="h-4 w-4 mr-2 text-green-500" /> : <EyeOff className="h-4 w-4 mr-2 text-orange-500" />}
                {selectedReview.isHidden ? 'Unhide' : 'Hide Publicly'}
              </Button>
              <Button variant="outline" className="rounded-2xl h-11 font-bold text-sm text-destructive hover:bg-destructive/5 border-destructive/20" onClick={() => { setReviewToDelete(selectedReview); setIsDeleteDialogOpen(true); setIsActionModalOpen(false); }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
              </Button>
            </div>

            <Button variant="destructive" className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20" onClick={() => suspendUser(selectedReview.userId)} disabled={isSuspending}>
              {isSuspending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Suspend/Ban This Customer
            </Button>
          </div>
        )}
      </ActionModal>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl p-8 border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">Erase Feedback Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You are about to permanently delete this customer review. This action is irreversible and will remove all associated ratings and replies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl h-12 px-8 font-bold border-none bg-slate-100 hover:bg-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteReview} disabled={isDeleting} className="rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">
              {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : "Erase Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
