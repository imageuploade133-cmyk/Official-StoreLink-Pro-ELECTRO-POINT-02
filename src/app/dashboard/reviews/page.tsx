'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
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
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  CheckCheck,
  Mic,
  Phone,
  MessageSquare,
  CalendarDays
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
import { VoiceReviewPlayer } from '@/components/store/VoiceReviewPlayer';
import { VoiceRecorder } from '@/components/store/VoiceRecorder';
import { VoiceReplyPlayer } from '@/components/store/VoiceReplyPlayer';
import { Separator } from '@/components/ui/separator';

const ITEMS_PER_PAGE = 10;

export default function ReviewsPage() {
  const { permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [reviewStats, setReviewStats] = useState({
    totalComments: 0,
    todayComments: 0,
    totalReplies: 0,
    hiddenReviews: 0,
    bannedCustomers: 0,
    totalHideOrBan: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAudioDataUri, setReplyAudioDataUri] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyMode, setReplyMode] = useState<'text' | 'voice' | 'both'>('text');

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
      
      const topLevelRef = doc(firestore, 'store_reviews', review.id);
      await updateDoc(topLevelRef, { isRead: true }).catch(err => console.warn('Top level review doc might not exist yet', err));

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
        collection(firestore, 'store_reviews'),
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
            
            if (data.productId) {
              const nestedRef = doc(firestore, 'products', data.productId, 'reviews', docSnap.id);
              batch.update(nestedRef, { isRead: true });
            }
            
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

  const getSafeCount = useCallback(async (countQuery: ReturnType<typeof query>, fallbackValue = 0) => {
    try {
      const countSnap = await getCountFromServer(countQuery);
      return countSnap.data().count;
    } catch (error) {
      console.warn('Count query failed:', error);
      return fallbackValue;
    }
  }, []);

  const fetchReviews = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingReviews(true);
    if (direction === 'initial') {
      setIsLoadingStats(true);
    }

    try {
      let q = query(
        collection(firestore, 'store_reviews'), 
        where('store_id', '==', currentStoreId), 
        orderBy('createdAt', 'desc')
      );

      if (direction === 'initial') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);

        const storeReviewsRef = collection(firestore, 'store_reviews');
        const totalReviewsQuery = query(storeReviewsRef, where('store_id', '==', currentStoreId));
        const totalCommentsQuery = query(storeReviewsRef, where('store_id', '==', currentStoreId), where('comment', '>', ''));
        const todayCommentsQuery = query(
          storeReviewsRef,
          where('store_id', '==', currentStoreId),
          where('createdAt', '>=', todayStart),
          where('createdAt', '<', tomorrowStart)
        );
        const totalRepliesQuery = query(storeReviewsRef, where('store_id', '==', currentStoreId), where('repliedAt', '!=', null));
        const hiddenReviewsQuery = query(storeReviewsRef, where('store_id', '==', currentStoreId), where('isHidden', '==', true));
        const bannedCustomersQuery = query(
          collection(firestore, 'customers'),
          where('store_id', '==', currentStoreId),
          where('status', '==', 'banned')
        );

        const [
          totalReviews,
          totalComments,
          todayComments,
          totalReplies,
          hiddenReviews,
          bannedCustomers,
        ] = await Promise.all([
          getSafeCount(totalReviewsQuery),
          getSafeCount(totalCommentsQuery),
          getSafeCount(todayCommentsQuery),
          getSafeCount(totalRepliesQuery),
          getSafeCount(hiddenReviewsQuery),
          getSafeCount(bannedCustomersQuery),
        ]);

        setTotalCount(totalReviews);
        setReviewStats({
          totalComments,
          todayComments,
          totalReplies,
          hiddenReviews,
          bannedCustomers,
          totalHideOrBan: hiddenReviews + bannedCustomers,
        });
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
      if (direction === 'initial') {
        setIsLoadingStats(false);
      }
    }
  }, [firestore, currentStoreId, getSafeCount, toast]);

  useEffect(() => {
    if (firestore && !authLoading && currentStoreId) {
      fetchReviews('initial');
    }
  }, [firestore, authLoading, currentStoreId, fetchReviews]);

  const handleReply = async () => {
    if (!selectedReview || !firestore) return;
    if (!selectedReview.productId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot reply: Product ID missing on review.' });
        return;
    }
    
    const hasTextReply = replyText.trim().length > 0;
    const hasVoiceReply = replyAudioDataUri !== null;
    
    if (!hasTextReply && !hasVoiceReply) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide either a text or voice reply.' });
      return;
    }

    setIsSubmittingReply(true);
    try {
      const updateData: Record<string, any> = {
        repliedAt: serverTimestamp(),
        isRead: true
      };
      
      if (hasTextReply) {
        updateData.reply = replyText.trim();
      }
      
      if (hasVoiceReply) {
        updateData.replyAudioDataUri = replyAudioDataUri;
        updateData.replyAudioCreatedAt = serverTimestamp();
      }
      
      if (!hasTextReply && selectedReview.reply) {
        updateData.reply = selectedReview.reply;
      }
      
      const reviewRef = doc(firestore, 'products', selectedReview.productId, 'reviews', selectedReview.id);
      await updateDoc(reviewRef, updateData);
      
      const topLevelRef = doc(firestore, 'store_reviews', selectedReview.id);
      await updateDoc(topLevelRef, updateData).catch(err => console.warn('Top level review doc might not exist yet', err));

      const replyType = hasVoiceReply && hasTextReply ? 'text and voice' : hasVoiceReply ? 'voice' : 'text';
      toast({ title: 'Reply posted', description: `Your ${replyType} response is now visible.` });
      setReplyText('');
      setReplyAudioDataUri(null);
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
      const updateData = {
        isHidden: !review.isHidden
      };

      const reviewRef = doc(firestore, 'products', review.productId, 'reviews', review.id);
      await updateDoc(reviewRef, updateData);
      
      const topLevelRef = doc(firestore, 'store_reviews', review.id);
      await updateDoc(topLevelRef, updateData).catch(err => console.warn('Top level review doc might not exist yet', err));

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
      
      const topLevelRef = doc(firestore, 'store_reviews', reviewToDelete.id);
      await deleteDoc(topLevelRef).catch(err => console.warn('Top level review doc might not exist yet', err));

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
      fetchReviews('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message || 'Failed to suspend customer.' });
    } finally {
      setIsSuspending(false);
    }
  };

  const openReviewModal = (review: ProductReview) => {
    setSelectedReview(review);
    setReplyText(review.reply || '');
    setReplyAudioDataUri(review.replyAudioDataUri || null);
    setIsActionModalOpen(true);
    if (!review.isRead) markAsRead(review);
  };

  const hasExistingReply = selectedReview?.reply || selectedReview?.replyAudioDataUri;
  const canSubmitReply = (replyText.trim().length > 0 || replyAudioDataUri !== null);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
              Total
              <Star className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-black text-primary">{totalCount.toLocaleString()}</div>}
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300 flex items-center justify-between">
              Comment
              <MessageSquare className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-black text-indigo-600 dark:text-indigo-300">{reviewStats.totalComments.toLocaleString()}</div>}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300 flex items-center justify-between">
              Today Comment
              <CalendarDays className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-black text-amber-600 dark:text-amber-300">{reviewStats.todayComments.toLocaleString()}</div>}
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300 flex items-center justify-between">
              Total Replay
              <ReplyIcon className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{reviewStats.totalReplies.toLocaleString()}</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center justify-between">
              Total Hide/Band
              <Ban className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-200">{reviewStats.totalHideOrBan.toLocaleString()}</div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Hidden {reviewStats.hiddenReviews.toLocaleString()} • Banned {reviewStats.bannedCustomers.toLocaleString()}
                </p>
              </>
            )}
          </CardContent>
        </Card>
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
                    <TableRow key={review.id} className={cn("group transition-colors", review.isHidden && "bg-muted/30 opacity-60", !review.isRead && !review.reply && !review.replyAudioDataUri && "bg-primary/[0.03] dark:bg-primary/[0.05]")}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                              <AvatarImage src={review.userPhotoURL || ''} />
                              <AvatarFallback className="font-bold text-[10px] bg-primary/10 text-primary">
                                  {review.userName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {!review.isRead && !review.reply && !review.replyAudioDataUri && (
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
                        <div className="space-y-2">
                            <p className="text-sm leading-snug line-clamp-2 font-medium italic" title={review.comment}>&quot;{review.comment}&quot;</p>
                            <div className="flex flex-wrap items-center gap-2">
                                {review.audioDataUri && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-600">
                                        <Mic className="h-2.5 w-2.5" /> Voice
                                    </div>
                                )}
                                {review.replyAudioDataUri && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                        <Phone className="h-2.5 w-2.5" /> Voice Reply
                                    </div>
                                )}
                                {review.reply ? (
                                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-widest text-primary">
                                        <ReplyIcon className="h-3 w-3" /> Replied
                                    </div>
                                ) : (!review.replyAudioDataUri && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Response Yet</span>
                                ))}
                            </div>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => openReviewModal(review)}>
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
              {selectedReview.audioDataUri && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <VoiceReviewPlayer dataUri={selectedReview.audioDataUri} />
                </div>
              )}
            </div>

            {hasExistingReply && (selectedReview.reply || selectedReview.replyAudioDataUri) && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <ReplyIcon className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-sm font-black text-emerald-600 uppercase tracking-widest">Your Response</span>
                </div>
                {selectedReview.reply && (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">&quot;{selectedReview.reply}&quot;</p>
                )}
                {selectedReview.replyAudioDataUri && (
                  <VoiceReplyPlayer 
                    dataUri={selectedReview.replyAudioDataUri} 
                    accentColor={settings?.productReviewVoiceBtnColor || '#10b981'}
                  />
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ReplyIcon className="h-3 w-3" />
                Reply to Customer
              </Label>
              
              <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReplyMode('text')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    replyMode === 'text' 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Text Reply
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMode('voice')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    replyMode === 'voice' 
                      ? "bg-emerald-500 text-white shadow-md" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Voice Reply
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMode('both')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                    replyMode === 'both' 
                      ? "bg-amber-500 text-white shadow-md" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Both
                </button>
              </div>

              {(replyMode === 'text' || replyMode === 'both') && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your reply message to the customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[100px] rounded-2xl resize-none bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-primary shadow-inner"
                  />
                </div>
              )}

              {(replyMode === 'voice' || replyMode === 'both') && (
                <div className="space-y-3">
                  <VoiceRecorder
                    onRecordingComplete={setReplyAudioDataUri}
                    existingAudio={replyAudioDataUri}
                    accentColor={settings?.productReviewVoiceBtnColor || '#10b981'}
                    disabled={isSubmittingReply}
                  />
                  {replyAudioDataUri && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>Voice message recorded and ready to send</span>
                    </div>
                  )}
                </div>
              )}

              <Button 
                className={cn(
                  "w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg",
                  replyMode === 'voice' 
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" 
                    : replyMode === 'both'
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                    : "shadow-lg shadow-primary/20"
                )} 
                onClick={handleReply} 
                disabled={isSubmittingReply || !canSubmitReply}
              >
                {isSubmittingReply ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {replyMode === 'voice' ? (
                      <><Phone className="h-4 w-4 mr-2" /> Send Voice Reply</>
                    ) : replyMode === 'both' ? (
                      <><ReplyIcon className="h-4 w-4 mr-2" /> Send Text & Voice Reply</>
                    ) : (
                      <><ReplyIcon className="h-4 w-4 mr-2" /> Post Text Reply</>
                    )}
                  </>
                )}
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