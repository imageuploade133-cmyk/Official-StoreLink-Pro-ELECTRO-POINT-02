
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  deleteDoc, 
  updateDoc, 
  writeBatch,
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  where,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { SlideShow } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  GalleryHorizontal, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Video, 
  ArrowUp, 
  ArrowDown,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import Image from 'next/image';

const ITEMS_PER_PAGE = 25;

export default function ManageSlideShowPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  // Pagination State
  const [slides, setSlides] = useState<SlideShow[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Cursors for efficient reading
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Interaction State
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isTogglingButton, setIsTogglingButton] = useState<string | null>(null);
  const [isTogglingOverlay, setIsTogglingOverlay] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<string | null>(null);
  const [slideToDelete, setSlideToDelete] = useState<SlideShow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSlides = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingSlides(true);

    try {
      // Fetch only Homepage slides here (Flash Hub has its own manager)
      let q = query(
        collection(firestore, 'slideShows'), 
        where('store_id', '==', currentStoreId),
        where('placement', '==', 'homepage'),
        orderBy('order', 'asc')
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

        const slidesData = docs.map(d => ({ id: d.id, ...d.data() } as SlideShow));
        setSlides(slidesData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setSlides([]);
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching slides:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load carousel registry." });
    } finally {
      setIsLoadingSlides(false);
    }
  }, [firestore, toast, currentStoreId]);

  useEffect(() => {
    if (!isAuthLoading && permissions.manage_website_content && currentStoreId) {
      fetchSlides('initial');
    }
  }, [isAuthLoading, permissions.manage_website_content, fetchSlides, currentStoreId]);

  const handleTogglePublished = async (slide: SlideShow) => {
    if (!firestore) return;
    setIsToggling(slide.id);
    try {
      const slideRef = doc(firestore, 'slideShows', slide.id);
      await updateDoc(slideRef, { published: !slide.published });
      toast({
        title: 'Status Updated',
        description: `Slide "${slide.title || 'Untitled'}" is now ${!slide.published ? 'published' : 'a draft'}.`,
      });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, published: !s.published } : s));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update slide status.' });
    } finally {
      setIsToggling(null);
    }
  };
  
  const handleToggleActionButton = async (slide: SlideShow) => {
    if (!firestore) return;
    setIsTogglingButton(slide.id);
    try {
      const slideRef = doc(firestore, 'slideShows', slide.id);
      const currentButtonState = slide.showActionButton ?? true;
      await updateDoc(slideRef, { showActionButton: !currentButtonState });
      toast({
        title: 'Action Button Updated',
        description: `Action button for "${slide.title || 'Untitled'}" is now ${!currentButtonState ? 'visible' : 'hidden'}.`,
      });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, showActionButton: !currentButtonState } : s));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update action button status.' });
    } finally {
      setIsTogglingButton(null);
    }
  };
  
  const handleToggleOverlay = async (slide: SlideShow) => {
    if (!firestore) return;
    setIsTogglingOverlay(slide.id);
    try {
      const slideRef = doc(firestore, 'slideShows', slide.id);
      const currentOverlayState = slide.showOverlay === true;
      await updateDoc(slideRef, { showOverlay: !currentOverlayState });
      toast({
        title: 'Overlay Updated',
        description: `Overlay for "${slide.title || 'Untitled'}" is now ${!currentOverlayState ? 'visible' : 'hidden'}.`,
      });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, showOverlay: !currentOverlayState } : s));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update overlay status.' });
    } finally {
      setIsTogglingOverlay(null);
    }
  };

  const handleMoveSlide = async (slide: SlideShow, direction: 'up' | 'down') => {
    if (!firestore || !slides) return;
    
    const index = slides.findIndex(s => s.id === slide.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    setIsReordering(slide.id);
    const neighbor = direction === 'up' ? slides[index - 1] : slides[index + 1];
    
    const batch = writeBatch(firestore);
    const slideRef = doc(firestore, 'slideShows', slide.id);
    const neighborRef = doc(firestore, 'slideShows', neighbor.id);

    batch.update(slideRef, { order: neighbor.order });
    batch.update(neighborRef, { order: slide.order });

    try {
      await batch.commit();
      toast({ title: 'Sequence Updated', description: 'Slide order has been rearranged.' });
      fetchSlides('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reorder Failed', description: 'Could not update slide sequence.' });
    } finally {
      setIsReordering(null);
    }
  };

  const handleDeleteSlide = async () => {
    if (!slideToDelete || !firestore) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'slideShows', slideToDelete.id));
      toast({ title: 'Slide Deleted', description: `"${slideToDelete.title || 'Untitled'}" has been permanently deleted.` });
      setSlideToDelete(null);
      fetchSlides('initial');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the slide.' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const isLoading = isAuthLoading || isLoadingSlides;

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions?.manage_website_content) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader icon={GalleryHorizontal} title="Homepage Slideshow" description="Manage slides for the main homepage carousel." />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchSlides('initial')} disabled={isLoading}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Sync
            </Button>
            <Button asChild>
                <Link href="/dashboard/web-slide-show/create?placement=homepage"><PlusCircle className="mr-2 h-4 w-4"/> Create New Slide</Link>
            </Button>
        </div>
      </div>

      <Card className=" border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Carousel Registry (Homepage)</CardTitle>
          <CardDescription>Incremental fetching active. Use reorder arrows to swap positions within current view.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16 text-center">Order</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && slides.length === 0 ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={7} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ))
                ) : slides.length > 0 ? (
                  slides.map((slide, index) => (
                    <TableRow key={slide.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveSlide(slide, 'up')} disabled={index === 0 || isReordering === slide.id || isLoading}><ArrowUp className="h-4 w-4" /></Button>
                            <span className="text-xs font-black text-primary">{slide.order}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveSlide(slide, 'down')} disabled={index === slides.length - 1 || isReordering === slide.id || isLoading}><ArrowDown className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                          <div className="w-[80px] h-[45px] rounded-lg bg-muted overflow-hidden relative border ">
                          {slide.mediaType === 'image' && slide.imageUrl ? (
                                    <Image src={slide.imageUrl} alt="" fill className="object-cover" unoptimized />
                                ) : slide.mediaType === 'video' && slide.videoPosterUrl ? (
                                    <Image src={slide.videoPosterUrl} alt="" fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                        <Video className="h-4 w-4 text-white/50" />
                                    </div>
                                )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-sm">
                        {slide.title || <span className="text-muted-foreground italic font-normal">Untitled</span>}
                      </TableCell>
                      <TableCell>
                          <Badge variant="outline" className="capitalize text-[9px] h-5 font-black bg-background">
                            {slide.mediaType === 'image' ? <ImageIcon className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                            {slide.mediaType}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          <Badge variant="secondary" className="capitalize text-[9px] h-5 font-black flex items-center gap-1.5 px-2">
                            {slide.placement === 'flash-hub' ? <Zap className="h-3 w-3 text-rose-500" /> : <LayoutGrid className="h-3 w-3" />}
                            {slide.placement || 'homepage'}
                          </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Switch checked={slide.published} onCheckedChange={() => handleTogglePublished(slide)} disabled={isToggling === slide.id}/>
                            {isToggling === slide.id ? <Loader2 className="h-4 w-4 animate-spin text-primary"/> : (
                                <Badge variant={slide.published ? 'default' : 'secondary'} className={cn("text-[9px] font-black h-5 uppercase", slide.published ? 'bg-green-100 text-green-800' : '')}>
                                    {slide.published ? 'Live' : 'Draft'}
                                </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg">
                                <Link href={`/dashboard/web-slide-show/edit/${slide.id}`} title="Edit Slide"><Edit className="h-4 w-4"/></Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg" onClick={() => setSlideToDelete(slide)} title="Delete Slide"><Trash2 className="h-4 w-4"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground bg-muted/5 italic">No homepage slides configured.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">Page {currentPage} <span className="mx-2">|</span> {totalCount} Total Slides</div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchSlides('prev')} disabled={currentPage === 1 || isLoading} className="font-bold"><ChevronLeft className="h-4 w-4 mr-1" /> Prev</Button>
                <Button variant="outline" size="sm" onClick={() => fetchSlides('next')} disabled={isLastPage || isLoading} className="font-bold">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
        </CardFooter>
      </Card>

      {slideToDelete && (
        <DeleteConfirmationDialog isOpen={!!slideToDelete} onOpenChange={() => setSlideToDelete(null)} onConfirm={handleDeleteSlide} itemName={slideToDelete.title || 'Untitled'} itemType="slide" isDeleting={isDeleting} />
      )}
    </div>
  );
}
