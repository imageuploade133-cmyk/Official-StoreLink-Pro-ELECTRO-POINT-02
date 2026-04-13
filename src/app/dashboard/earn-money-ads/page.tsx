
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast, 
  getDocs, 
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { AdLink } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  Loader2, 
  Edit, 
  ExternalLink,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Monitor,
  Smartphone,
  CheckCircle2,
  XCircle,
  Layout,
  Clock,
  Settings2,
  Gift
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 10;

export default function EarnMoneyAdsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdLink | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adToDelete, setAdToDelete] = useState<AdLink | null>(null);

  // Pagination State
  const [ads, setAds] = useState<AdLink[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalAdsCount, setTotalAdsCount] = useState(0);

  // Refs for stable cursors
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [adForm, setAdForm] = useState<Partial<AdLink>>({
    adLink: '',
    adScript: '',
    bannerLocation: 'none',
    adType: 'background',
    status: 'active',
    placement: 'page_visit',
    frequency: 'once_per_session',
    frequencyTime: 7,
    deviceTargeting: 'all',
    rewardDiscountType: 'percentage',
    rewardDiscountValue: 10,
  });

  // Fetch Ads Logic
  const fetchAds = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore) return;
    setIsLoadingAds(true);

    try {
      let q = query(collection(firestore, 'adLinks'), orderBy('createdAt', 'desc'));

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalAdsCount(countSnap.data().count);
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

        const adData = docs.map(d => ({ id: d.id, ...d.data() } as AdLink));
        setAds(adData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setAds([]);
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching ads:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load ad links." });
    } finally {
      setIsLoadingAds(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    if (firestore && !isAuthLoading && permissions.manage_ads) {
      fetchAds('initial');
    }
  }, [firestore, isAuthLoading, permissions.manage_ads, fetchAds]);

  const handleToggleStatus = async (ad: AdLink) => {
    if (!firestore) return;
    try {
      const newStatus = ad.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(firestore, 'adLinks', ad.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Status Updated", description: `Ad is now ${newStatus}.` });
      setAds(prev => prev.map(a => a.id === ad.id ? { ...a, status: newStatus } : a));
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    }
  };

  const handleOpenAddModal = () => {
    setEditingAd(null);
    setAdForm({
      adLink: '',
      adScript: '',
      bannerLocation: 'none',
      adType: 'background',
      status: 'active',
      placement: 'page_visit',
      frequency: 'once_per_session',
      frequencyTime: 7,
      deviceTargeting: 'all',
      rewardDiscountType: 'percentage',
      rewardDiscountValue: 10,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: AdLink) => {
    setEditingAd(ad);
    setAdForm({
      adLink: ad.adLink || '',
      adScript: ad.adScript || '',
      bannerLocation: ad.bannerLocation || 'none',
      adType: ad.adType,
      status: ad.status,
      placement: ad.placement,
      frequency: ad.frequency,
      frequencyTime: ad.frequencyTime || 7,
      deviceTargeting: ad.deviceTargeting,
      rewardDiscountType: ad.rewardDiscountType || 'percentage',
      rewardDiscountValue: ad.rewardDiscountValue || 10,
    });
    setIsModalOpen(true);
  };

  const handleSaveAd = async () => {
    if (!firestore || (!adForm.adLink && !adForm.adScript)) return;
    setIsSaving(true);
    try {
      const payload = {
        ...adForm,
        updatedAt: serverTimestamp(),
      };

      if (editingAd) {
        await updateDoc(doc(firestore, 'adLinks', editingAd.id), payload);
        toast({ title: "Ad Link Updated", description: "The ad configuration has been updated." });
      } else {
        await addDoc(collection(firestore, 'adLinks'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Ad Link Created", description: "The ad is now active based on your settings." });
      }
      
      setIsModalOpen(false);
      setEditingAd(null);
      fetchAds('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Save Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!firestore || !adToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'adLinks', adToDelete.id));
      toast({ title: "Ad Link Deleted", description: "The ad link was successfully removed." });
      setAdToDelete(null);
      fetchAds('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.manage_ads) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={DollarSign} 
          title="Earn Money – Ads System" 
          description="Monetize your store traffic by adding background or reward-based ads."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchAds('initial')} disabled={isLoadingAds}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingAds && "animate-spin")} />
                Sync
            </Button>
            <Button onClick={handleOpenAddModal} className="gap-2 h-11 font-bold shadow-lg shadow-primary/20">
                <PlusCircle className="h-4 w-4" /> Add New Ad Link
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                Total Ads <Layout className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAds ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black">{totalAdsCount}</div>}
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center justify-between">
                Active Ads <CheckCircle2 className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAds ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-green-600">{ads.filter(a => a.status === 'active').length}</div>}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center justify-between">
                Reward Ads <Gift className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAds ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-amber-600">{ads.filter(a => a.adType === 'reward').length}</div>}
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center justify-between">
                Background Ads <Settings2 className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAds ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-indigo-600">{ads.filter(a => a.adType === 'background').length}</div>}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center justify-between">
                Banner Ads <Monitor className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAds ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-blue-600">{ads.filter(a => a.adType === 'banner').length}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Ad Configurations</CardTitle>
          <CardDescription>Manage your monetization links and how they appear to customers.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Ad Link / Type</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Targeting</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAds && ads.length === 0 ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                ))
              ) : ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ExternalLink className="h-12 w-12 opacity-10" />
                      <p className="font-medium">No ad links configured yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.id} className="group transition-colors hover:bg-muted/30">
                    <TableCell className="pl-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {ad.adType === 'banner' ? (
                            <code className="text-[10px] text-muted-foreground truncate max-w-[200px]">Script Embedded</code>
                          ) : (
                            <>
                              <code className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.adLink}</code>
                              <a href={ad.adLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-3 w-3" /></a>
                            </>
                          )}
                        </div>
                        <Badge variant={ad.adType === 'reward' ? 'outline' : ad.adType === 'banner' ? 'default' : 'secondary'} className="w-fit text-[10px] font-bold uppercase">
                          {ad.adType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium capitalize">
                        <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                        {ad.adType === 'banner' ? ad.bannerLocation?.replace(/_/g, ' ') : ad.placement.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-medium capitalize">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {ad.frequency.replace(/_/g, ' ')}
                        </div>
                        {ad.adType === 'background' && ad.frequencyTime && (
                          <span className="text-[10px] text-muted-foreground ml-5">Every {ad.frequencyTime}s</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium capitalize">
                        {ad.deviceTargeting === 'mobile_only' ? <Smartphone className="h-3 w-3" /> : ad.deviceTargeting === 'desktop_only' ? <Monitor className="h-3 w-3" /> : <Layout className="h-3 w-3" />}
                        {ad.deviceTargeting.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={ad.status === 'active'} 
                          onCheckedChange={() => handleToggleStatus(ad)}
                        />
                        <Badge variant={ad.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-5 uppercase font-black">
                          {ad.status === 'active' ? 'Live' : 'Paused'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditModal(ad)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setAdToDelete(ad)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> {totalAdsCount} Total Links
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchAds('prev')} disabled={currentPage === 1 || isLoadingAds} className="font-bold">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchAds('next')} disabled={isLastPage || isLoadingAds} className="font-bold">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {editingAd ? (
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Edit className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="bg-primary/10 p-2 rounded-lg">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
              )}
              {editingAd ? 'Edit Ad Configuration' : 'Add New Ad Link'}
            </DialogTitle>
            <DialogDescription>
              Set up your monetization strategy by configuring how ads appear to your store visitors.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-8 py-6">
              {/* Ad Format Section */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layout className="h-4 w-4" /> Ad Format & Type
                </Label>
                <RadioGroup 
                  value={adForm.adType} 
                  onValueChange={(v: any) => {
                    const updates: Partial<AdLink> = { adType: v };
                    if (v === 'banner') {
                      updates.placement = 'banner';
                    } else if (adForm.placement === 'banner') {
                      updates.placement = 'page_visit';
                    }
                    setAdForm(prev => ({...prev, ...updates}));
                  }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <Label
                    htmlFor="bg"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                      adForm.adType === "background" && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value="background" id="bg" className="sr-only" />
                    <Settings2 className={cn("mb-2 h-6 w-6", adForm.adType === "background" ? "text-primary" : "text-indigo-600")} />
                    <span className="text-xs font-bold uppercase">Background</span>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center">Automated Click</span>
                  </Label>

                  <Label
                    htmlFor="rew"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                      adForm.adType === "reward" && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value="reward" id="rew" className="sr-only" />
                    <Gift className={cn("mb-2 h-6 w-6", adForm.adType === "reward" ? "text-primary" : "text-amber-600")} />
                    <span className="text-xs font-bold uppercase">Reward</span>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center">Discount Incentive</span>
                  </Label>

                  <Label
                    htmlFor="banner"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-all",
                      adForm.adType === "banner" && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value="banner" id="banner" className="sr-only" />
                    <Monitor className={cn("mb-2 h-6 w-6", adForm.adType === "banner" ? "text-primary" : "text-blue-600")} />
                    <span className="text-xs font-bold uppercase">Banner</span>
                    <span className="text-[10px] text-muted-foreground mt-1 text-center">Custom Script</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Ad Source Section */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Ad Source
                </Label>
                {adForm.adType === 'banner' ? (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adScript" className="text-xs">Ad Script Code</Label>
                      <Textarea 
                        id="adScript" 
                        placeholder="Paste your ad script code here..." 
                        value={adForm.adScript} 
                        onChange={e => setAdForm(prev => ({...prev, adScript: e.target.value}))} 
                        className="font-mono text-xs h-32 bg-muted/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bannerLocation" className="text-xs">Display Location</Label>
                      <Select value={adForm.bannerLocation} onValueChange={(v: any) => setAdForm(prev => ({...prev, bannerLocation: v}))}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select where to show the banner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top_of_page">Top of Page</SelectItem>
                          <SelectItem value="bottom_of_page">Bottom of Page</SelectItem>
                          <SelectItem value="sidebar">Sidebar</SelectItem>
                          <SelectItem value="product_details">Product Details Page</SelectItem>
                          <SelectItem value="after_first_row">After First Row of Products</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="adLink" className="text-xs">Target Destination (URL)</Label>
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input 
                        id="adLink" 
                        className="pl-10 h-11"
                        placeholder="https://your-ad-network.com/link" 
                        value={adForm.adLink} 
                        onChange={e => setAdForm(prev => ({...prev, adLink: e.target.value}))} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Reward Settings (Conditional) */}
              {adForm.adType === 'reward' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
                    <Gift className="h-4 w-4" /> Reward Configuration
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Discount Type</Label>
                      <Select value={adForm.rewardDiscountType} onValueChange={(v: any) => setAdForm(prev => ({...prev, rewardDiscountType: v}))}>
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Reward Value</Label>
                      <Input 
                        type="number" 
                        className="bg-background"
                        value={adForm.rewardDiscountValue} 
                        onChange={e => setAdForm(prev => ({...prev, rewardDiscountValue: Number(e.target.value)}))} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Rules Section */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Delivery & Targeting
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs">Device Targeting</Label>
                    <Select value={adForm.deviceTargeting} onValueChange={(v: any) => setAdForm(prev => ({...prev, deviceTargeting: v}))}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Devices</SelectItem>
                        <SelectItem value="mobile_only">Mobile Only</SelectItem>
                        <SelectItem value="desktop_only">Desktop Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Trigger Placement</Label>
                    <Select value={adForm.placement} onValueChange={(v: any) => setAdForm(prev => ({...prev, placement: v}))}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page_visit" disabled={adForm.adType === 'reward' || adForm.adType === 'banner'}>Page Visit</SelectItem>
                        <SelectItem value="click_anywhere" disabled={adForm.adType === 'reward' || adForm.adType === 'banner'}>Click Anywhere</SelectItem>
                        <SelectItem value="add_to_cart" disabled={adForm.adType === 'reward' || adForm.adType === 'banner'}>Add to Cart</SelectItem>
                        <SelectItem value="checkout_start" disabled={adForm.adType === 'reward' || adForm.adType === 'banner'}>Checkout Start</SelectItem>
                        <SelectItem value="reward_button" disabled={adForm.adType === 'banner'}>Reward Button Only</SelectItem>
                        <SelectItem value="banner" disabled={adForm.adType !== 'banner'}>Banner Slot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Frequency Strategy</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={adForm.frequency} onValueChange={(v: any) => setAdForm(prev => ({...prev, frequency: v}))}>
                      <SelectTrigger className="flex-1 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once_per_session">Once Per Session</SelectItem>
                        <SelectItem value="every_time">Every Time</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {adForm.adType === 'background' && (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-32">
                          <Input 
                            type="number" 
                            className="h-11 pr-10"
                            placeholder="7" 
                            value={adForm.frequencyTime} 
                            onChange={e => setAdForm(prev => ({...prev, frequencyTime: Number(e.target.value)}))} 
                            min={1}
                          />
                          <span className="absolute right-3 top-3 text-[10px] font-bold text-muted-foreground">SEC</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {adForm.adType === 'background' && (
                    <p className="text-[10px] text-primary font-medium flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" /> Auto-click will trigger every {adForm.frequencyTime}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/10 flex flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="font-bold order-2 sm:order-1">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveAd} 
              disabled={isSaving || (adForm.adType === 'banner' ? !adForm.adScript : !adForm.adLink)}
              className="px-8 font-black shadow-lg shadow-primary/20 gap-2 h-11 order-1 sm:order-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {editingAd ? 'Update Ad Configuration' : 'Activate & Save Ad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog 
        isOpen={!!adToDelete} 
        onOpenChange={() => setAdToDelete(null)} 
        onConfirm={handleDeleteAd} 
        isDeleting={isDeleting} 
        itemName="Ad Link" 
        itemType="configuration" 
      />
    </div>
  );
}
