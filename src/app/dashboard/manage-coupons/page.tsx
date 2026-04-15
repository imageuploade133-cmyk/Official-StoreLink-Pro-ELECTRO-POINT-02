
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where,
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
import type { Coupon, Order } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { 
  Ticket, 
  PlusCircle, 
  Trash2, 
  Loader2, 
  Check, 
  X, 
  Calendar as CalendarIcon,
  Tag,
  Percent,
  DollarSign,
  Save,
  Edit,
  TrendingUp,
  Copy,
  Activity,
  CalendarCheck,
  CalendarX,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isToday } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { cn, convertToDateSafely } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

export default function ManageCouponsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const currencySymbol = settings?.currency || '$';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Pagination State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCouponCount, setTotalCouponCount] = useState(0);

  // Refs for stable cursors
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 0,
    isActive: true,
    startDate: null,
    endDate: null,
  });

  // Fetch Coupons Logic
  const fetchCoupons = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingCoupons(true);

    try {
      let q = query(collection(firestore, 'coupons'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'));

      // 1. Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCouponCount(countSnap.data().count);
      }

      // 2. Apply cursors from refs
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

        const couponData = docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
        setCoupons(couponData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setCoupons([]);
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching coupons:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load coupons." });
    } finally {
      setIsLoadingCoupons(false);
    }
  }, [firestore, toast, currentStoreId]);

  useEffect(() => {
    if (firestore && !isAuthLoading && permissions.manage_coupons && currentStoreId) {
      fetchCoupons('initial');
    }
  }, [firestore, isAuthLoading, permissions.manage_coupons, fetchCoupons, currentStoreId]);

  // Order fetch for stats (limited to save reads)
  const ordersQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'orders'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'), limit(100));
  }, [firestore, currentStoreId]);

  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
    // Stats are based on the currently fetched batch for efficiency
    if (!coupons) return { total: 0, active: 0, expired: 0, totalUsage: 0, todayUsage: 0 };
    
    const now = new Date();
    let active = 0;
    let expired = 0;
    let totalUsage = 0;
    let todayUsage = 0;

    coupons.forEach(c => {
        totalUsage += (c.usageCount || 0);
        
        const start = convertToDateSafely(c.startDate);
        const end = convertToDateSafely(c.endDate);
        
        const isExpired = end && now > end;
        const isStarted = !start || now >= start;

        if (c.isActive && isStarted && !isExpired) {
            active++;
        }
        
        if (isExpired) {
            expired++;
        }
    });

    if (orders) {
        orders.forEach(order => {
            const createdAt = convertToDateSafely(order.createdAt);
            if (createdAt && isToday(createdAt) && order.couponCode) {
                todayUsage++;
            }
        });
    }

    return {
        total: totalCouponCount,
        active,
        expired,
        totalUsage,
        todayUsage
    };
  }, [coupons, orders, totalCouponCount]);

  const handleToggleStatus = async (coupon: Coupon) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'coupons', coupon.id), {
        isActive: !coupon.isActive,
      });
      toast({ title: "Status Updated", description: `Coupon ${coupon.code} is now ${!coupon.isActive ? 'active' : 'inactive'}.` });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied to Clipboard",
      description: `Promo code "${code}" is ready to be shared.`,
    });
  };

  const handleOpenAddModal = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      type: 'percentage',
      value: 0,
      isActive: true,
      startDate: null,
      endDate: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      isActive: coupon.isActive,
      startDate: convertToDateSafely(coupon.startDate) as any,
      endDate: convertToDateSafely(coupon.endDate) as any,
    });
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async () => {
    if (!firestore || !couponForm.code || !currentStoreId) return;
    setIsSaving(true);
    try {
      const codeUpper = couponForm.code.toUpperCase().trim();
      const payload = {
        ...couponForm,
        code: codeUpper,
        startDate: couponForm.startDate ? Timestamp.fromDate(new Date(couponForm.startDate as any)) : null,
        endDate: couponForm.endDate ? Timestamp.fromDate(new Date(couponForm.endDate as any)) : null,
        store_id: currentStoreId
      };

      if (editingCoupon) {
        await updateDoc(doc(firestore, 'coupons', editingCoupon.id), payload);
        toast({ title: "Coupon Updated", description: `Promo code ${codeUpper} has been updated.` });
      } else {
        await addDoc(collection(firestore, 'coupons'), {
          ...payload,
          usageCount: 0,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Coupon Created", description: `Promo code ${codeUpper} is now live.` });
      }
      
      setIsModalOpen(false);
      setEditingCoupon(null);
      fetchCoupons('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Save Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!firestore || !couponToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'coupons', couponToDelete.id));
      toast({ title: "Coupon Deleted", description: "The promo code was successfully removed." });
      setCouponToDelete(null);
      fetchCoupons('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.manage_coupons) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={Ticket} 
          title="Storefront Promo Codes" 
          description="Create and manage discount codes for your public website customers."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchCoupons('initial')} disabled={isLoadingCoupons}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingCoupons && "animate-spin")} />
                Sync
            </Button>
            <Button onClick={handleOpenAddModal} className="gap-2 h-11 font-bold shadow-lg shadow-primary/20">
                <PlusCircle className="h-4 w-4" /> Generate New Code
            </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                Total Codes <Ticket className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCoupons ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black">{stats.total}</div>}
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center justify-between">
                Active in Batch <CalendarCheck className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCoupons ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-green-600">{stats.active}</div>}
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center justify-between">
                Expired in Batch <CalendarX className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCoupons ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-red-600">{stats.expired}</div>}
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center justify-between">
                Batch Usage <Activity className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCoupons ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-indigo-600">{stats.totalUsage}</div>}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center justify-between">
                Latest Usage <MousePointerClick className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-black text-amber-600">{stats.todayUsage}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Catalog of Promo Codes</CardTitle>
          <CardDescription>Live promo codes currently available for use during checkout. Incremental fetching active.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <TooltipProvider>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-center">Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCoupons && coupons.length === 0 ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ))
                  ) : coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Tag className="h-12 w-12 opacity-10" />
                          <p className="font-medium">No promo codes created yet.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => {
                      const start = convertToDateSafely(coupon.startDate);
                      const end = convertToDateSafely(coupon.endDate);
                      
                      return (
                        <TableRow key={coupon.id} className="group transition-colors hover:bg-muted/30">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <code className="bg-primary/10 text-primary font-black px-2 py-1 rounded text-sm tracking-widest uppercase">
                                {coupon.code}
                              </code>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => handleCopyCode(coupon.code)}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Code</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[10px] font-bold">
                              {coupon.type === 'percentage' ? <Percent className="h-3 w-3 mr-1" /> : <DollarSign className="h-3 w-3 mr-1" />}
                              {coupon.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">
                            {coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value, currencySymbol)}
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground font-medium uppercase">
                            {start || end ? (
                              <div className="space-y-0.5">
                                  {start && <p>From: {format(start, 'PP p')}</p>}
                                  {end && <p>To: {format(end, 'PP p')}</p>}
                              </div>
                            ) : 'No limit'}
                          </TableCell>
                          <TableCell className="text-center">
                              <div className="flex flex-col items-center">
                                  <span className="font-black text-lg leading-none">{coupon.usageCount || 0}</span>
                                  <span className="text-[10px] uppercase text-muted-foreground tracking-tighter mt-1">Orders</span>
                              </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Switch 
                                checked={coupon.isActive} 
                                onCheckedChange={() => handleToggleStatus(coupon)}
                              />
                              <Badge variant={coupon.isActive ? 'default' : 'secondary'} className="text-[10px] h-5 uppercase font-black">
                                {coupon.isActive ? 'Live' : 'Paused'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleOpenEditModal(coupon)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setCouponToDelete(coupon)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> {totalCouponCount} Total Codes
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchCoupons('prev')} disabled={currentPage === 1 || isLoadingCoupons} className="font-bold">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchCoupons('next')} disabled={isLastPage || isLoadingCoupons} className="font-bold">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      {/* Form Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Promo Code' : 'Generate Promo Code'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Modify the existing code settings and schedule.' : 'Create a unique discount code for your customers.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Promo Code (Uppercase)</Label>
              <Input 
                id="code" 
                placeholder="e.g., SUMMER50" 
                value={couponForm.code} 
                onChange={e => setCouponForm(prev => ({...prev, code: e.target.value.toUpperCase()}))} 
              />
            </div>
            
            <div className="space-y-3">
              <Label>Discount Type</Label>
              <RadioGroup 
                value={couponForm.type} 
                onValueChange={(v: any) => setCouponForm(prev => ({...prev, type: v}))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="perc" />
                  <Label htmlFor="perc" className="cursor-pointer">Percentage (%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fix" />
                  <Label htmlFor="fix" className="cursor-pointer">Fixed Amount</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Value ({couponForm.type === 'percentage' ? '%' : currencySymbol})</Label>
              <Input 
                type="number" 
                value={couponForm.value} 
                onChange={e => setCouponForm(prev => ({...prev, value: Number(e.target.value)}))} 
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time (Optional)</Label>
                <Input 
                  type="datetime-local" 
                  value={couponForm.startDate ? format(new Date(couponForm.startDate as any), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={e => setCouponForm(prev => ({...prev, startDate: e.target.value as any}))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date & Time (Optional)</Label>
                <Input 
                  type="datetime-local" 
                  value={couponForm.endDate ? format(new Date(couponForm.endDate as any), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={e => setCouponForm(prev => ({...prev, endDate: e.target.value as any}))} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveCoupon} disabled={isSaving || !couponForm.code}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingCoupon ? 'Update Coupon' : 'Publish Coupon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog 
        isOpen={!!couponToDelete} 
        onOpenChange={() => setCouponToDelete(null)} 
        onConfirm={handleDeleteCoupon} 
        isDeleting={isDeleting} 
        itemName={couponToDelete?.code || ''} 
        itemType="promo code" 
      />
    </div>
  );
}
