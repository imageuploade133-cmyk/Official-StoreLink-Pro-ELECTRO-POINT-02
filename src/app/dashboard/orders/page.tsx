
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  where,
  getCountFromServer,
  addDoc,
  getDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { Order, Product, OrderStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingBasket, 
  Search, 
  Eye, 
  Loader2, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  XCircle,
  ArchiveX,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
  History,
  ClipboardList,
  Phone,
  Store
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { cn, convertToDateSafely } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderAuditTab } from '@/components/orders/OrderAuditTab';

const ITEMS_PER_PAGE = 15;

export default function WebsiteOrdersPage() {
  const { permissions, isLoading: isAuthLoading, user, store, staffMember } = useAuth();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [activeMainTab, setActiveMainTab] = useState('registry');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [showSecondaryStats, setShowSecondaryStats] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalIncome: 0,
    todayIncome: 0,
    totalCancelled: 0,
    todayCancelled: 0,
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Pagination Cursors
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingAnalytics(true);
    try {
      const ordersCol = collection(firestore, 'orders');
      const storeOrdersQuery = query(ordersCol, where('store_id', '==', currentStoreId));
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const [totalCountSnap, cancelledCountSnap] = await Promise.all([
        getCountFromServer(storeOrdersQuery),
        getCountFromServer(query(storeOrdersQuery, where('status', '==', 'cancelled')))
      ]);

      const [todaySnap, allActiveSnap] = await Promise.all([
        getDocs(query(storeOrdersQuery, where('createdAt', '>=', todayStart), where('createdAt', '<=', todayEnd))),
        getDocs(query(storeOrdersQuery, where('status', '!=', 'cancelled'), limit(500)))
      ]);

      let todayInc = 0;
      let todayCanc = 0;
      let totalInc = 0;

      todaySnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.status === 'cancelled') todayCanc++;
        else todayInc += (d.totalAmount || 0);
      });

      allActiveSnap.docs.forEach(doc => {
        totalInc += (doc.data().totalAmount || 0);
      });

      setAnalytics({
        totalOrders: totalCountSnap.data().count,
        todayOrders: todaySnap.size,
        totalIncome: totalInc,
        todayIncome: todayInc,
        totalCancelled: cancelledCountSnap.data().count,
        todayCancelled: todayCanc,
      });
    } catch (error) {
      console.error("Analytics fetch failed:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [firestore, currentStoreId]);

  const fetchOrders = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingOrders(true);

    try {
      let q = query(collection(firestore, 'orders'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'));

      if (statusFilter !== 'all') {
        q = query(q, where('status', '==', statusFilter));
      }

      if (direction === 'next' && lastDoc) {
        q = query(q, startAfter(lastDoc), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDoc) {
        q = query(q, endBefore(firstDoc), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        setFirstDoc(docs[0]);
        setLastDoc(docs[docs.length - 1]);
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const ordersData = docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Order));

        setOrders(ordersData);
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setOrders([]);
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({ variant: 'destructive', title: "Fetch Error", description: "Could not load orders." });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [firestore, currentStoreId, statusFilter, firstDoc, lastDoc, toast]);

  useEffect(() => {
    if (!isAuthLoading && permissions.manage_orders && currentStoreId) {
      fetchOrders('initial');
      fetchAnalytics();
    }
  }, [isAuthLoading, permissions.manage_orders, statusFilter, currentStoreId, fetchOrders, fetchAnalytics]);

  const productsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(collection(firestore, 'products'), where('store_id', '==', currentStoreId));
  }, [firestore, currentStoreId]);
  const { data: products } = useCollection<Product>(productsQuery);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return orders;
    
    return orders.filter(order => {
      const orderId = order.id.toLowerCase();
      const customerName = (order.guestInfo?.name || 'Registered User').toLowerCase();
      return orderId.includes(term) || customerName.includes(term);
    });
  }, [orders, searchTerm]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !user || !currentStoreId) return;
    try {
      const orderRef = doc(firestore, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      const oldStatus = orderSnap.exists() ? orderSnap.data().status : 'unknown';

      await updateDoc(orderRef, { status: newStatus });

      // Create Audit Log
      await addDoc(collection(firestore, 'orderAudit'), {
        orderId,
        oldStatus,
        newStatus,
        timestamp: serverTimestamp(),
        staffId: user.uid,
        staffName: user.displayName || 'Authorized Agent',
        staffEmail: user.email || 'N/A',
        store_id: currentStoreId
      });

      toast({ title: "Status Updated", description: `Order #${orderId.substring(0, 8)} is now ${newStatus}.` });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      fetchAnalytics();
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: error.message });
    }
  };

  const getStatusBadge = (order: Order) => {
    const isAwaitingPayment = order.status === 'pending' && (
        order.paymentMethod === 'Bank Transfer' || 
        order.paymentMethod === 'manual-bank-transfer' ||
        order.paymentMethod === 'Pay on Delivery'
    );
    if (isAwaitingPayment) {
        const isPOD = order.paymentMethod === 'Pay on Delivery';
        return (
            <Badge variant="outline" className={cn(
                "animate-pulse",
                isPOD ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-orange-100 text-orange-700 border-orange-200"
            )}>
                {isPOD ? <Truck className="mr-1.5 h-3 w-3" /> : <Clock className="mr-1.5 h-3 w-3" />}
                {isPOD ? 'POD Waiting' : 'Pay Waiting'}
            </Badge>
        );
    }
    switch (order.status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="mr-1 h-3 w-3" /> Pending</Badge>;
      case 'processing': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Package className="mr-1 h-3 w-3" /> Processing</Badge>;
      case 'shipped': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Truck className="mr-1 h-3 w-3" /> Shipped</Badge>;
      case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Delivered</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><DollarSign className="mr-1 h-3 w-3" /> Paid</Badge>;
      case 'failed': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="mr-1 h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge variant="secondary">{order.status}</Badge>;
    }
  };

  if (isAuthLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions.manage_orders) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={ShoppingBasket}
          title="Website Orders"
          description="Direct telemetry from your public storefront. Unified fulfillment control."
        />
        <Button variant="outline" onClick={() => { fetchOrders('initial'); fetchAnalytics(); }} disabled={isLoadingOrders}>
          <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingOrders && "animate-spin")} />
          Sync Portal
        </Button>
      </div>

      {/* Analytics Command Center */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title="Total Order Registry"
                value={isLoadingAnalytics ? '...' : analytics.totalOrders.toLocaleString()}
                icon={BarChart3}
                description="Cumulative volume from storefront."
                className="bg-primary/5 border-primary/10"
                valueClassName="text-primary font-black"
            />
            <StatCard
                title="Today's Velocity"
                value={isLoadingAnalytics ? '...' : analytics.todayOrders.toLocaleString()}
                icon={ShoppingBag}
                description="Volume in latest 24H cycle."
                className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100"
                valueClassName="text-emerald-600 font-black"
            />
            <StatCard
                title="Gross Web Income"
                value={isLoadingAnalytics ? '...' : formatCurrency(analytics.totalIncome, currencySymbol)}
                icon={TrendingUp}
                description="Total value of successful sales."
                className="bg-blue-50 dark:bg-blue-950/20 border-blue-100"
                valueClassName="text-blue-600 font-black"
            />
            <StatCard
                title="Today's Web Revenue"
                value={isLoadingAnalytics ? '...' : formatCurrency(analytics.todayIncome, currencySymbol)}
                icon={DollarSign}
                description="Net earnings for the current day."
                className="bg-amber-50 dark:bg-amber-950/20 border-amber-100"
                valueClassName="text-amber-600 font-black"
            />
        </div>

        <div className="flex justify-center">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSecondaryStats(!showSecondaryStats)}
                className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground gap-2 hover:bg-transparent hover:text-primary border border-muted-foreground/20 rounded-full px-6 py-4 h-auto shadow-sm"
            >
                {showSecondaryStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showSecondaryStats ? 'Hide Detailed Attrition' : 'See Attrition Insights'}
            </Button>
        </div>

        {showSecondaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <StatCard
                    title="Total Cancelled"
                    value={isLoadingAnalytics ? '...' : analytics.totalCancelled.toLocaleString()}
                    icon={XCircle}
                    description="Total failed conversions."
                    className="bg-rose-50 dark:bg-rose-950/20 border-rose-100"
                    valueClassName="text-rose-600 font-black"
                />
                <StatCard
                    title="Today's Cancellations"
                    value={isLoadingAnalytics ? '...' : analytics.todayCancelled.toLocaleString()}
                    icon={TrendingDown}
                    description="Orders voided in current cycle."
                    className="bg-orange-50 dark:bg-orange-950/20 border-orange-100"
                    valueClassName="text-orange-600 font-black"
                />
            </div>
        )}
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-muted/50 rounded-2xl border">
          <TabsTrigger value="registry" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
            <ShoppingBag className="h-3.5 w-3.5" /> Active Registry
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
            <ClipboardList className="h-3.5 w-3.5" /> Fulfillment Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="pb-4 bg-muted/10 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" /> Fulfilment Pipeline
                </CardTitle>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-grow md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="ID or Customer name..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 h-10" 
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[160px] h-10">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[140px] pl-6">Order ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Fulfillment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingOrders ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={8} className="py-4"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                        ))
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <ShoppingBasket className="h-12 w-12 opacity-10" />
                              <p className="font-bold">No orders found.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => {
                          const createdAt = convertToDateSafely(order.createdAt);
                          const hasUnavailableItems = order.items.some(item => !productMap.has(item.productId));
                          return (
                            <TableRow key={order.id} className={cn("group transition-colors hover:bg-muted/30", hasUnavailableItems && "bg-red-50/30")}>
                              <TableCell className="pl-6">
                                <div className="flex items-center gap-2">
                                    {hasUnavailableItems && <ArchiveX className="h-4 w-4 text-red-600 flex-shrink-0" />}
                                    <span className="font-mono text-xs font-bold text-primary">#{order.id.substring(0, 8).toUpperCase()}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-medium">{createdAt ? format(createdAt, 'PP') : 'N/A'}</div>
                                <div className="text-muted-foreground">{createdAt ? format(createdAt, 'p') : ''}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-sm truncate max-w-[150px]">{order.guestInfo?.name || 'Registered User'}</div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{order.guestInfo?.email || 'Authenticated'}</div>
                                  {order.guestInfo?.phone && (
                                    <div className="text-[10px] font-bold text-primary flex items-center gap-1">
                                      <Phone className="h-2.5 w-2.5" /> {order.guestInfo.phone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-black">
                                {formatCurrency(order.totalAmount, currencySymbol)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">{order.paymentMethod}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  "font-bold uppercase text-[10px] tracking-tight",
                                  order.fulfillmentType === 'delivery'
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-orange-50 text-orange-700 border-orange-200"
                                )}>
                                  {order.fulfillmentType === 'delivery' ? (
                                    <><Truck className="mr-1 h-3 w-3" /> Delivery</>
                                  ) : (
                                    <><Store className="mr-1 h-3 w-3" /> Pickup</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>{getStatusBadge(order)}</TableCell>
                              <TableCell className="text-right pr-6">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true); }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            </CardContent>
            <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    Page {currentPage} <span className="mx-2">|</span> {analytics.totalOrders} Registry Entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchOrders('prev')} disabled={currentPage === 1 || isLoadingOrders} className="font-bold">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchOrders('next')} disabled={isLastPage || isLoadingOrders} className="font-bold">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <OrderAuditTab storeId={currentStoreId} />
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          order={selectedOrder}
          currencySymbol={currencySymbol}
          productMap={productMap}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
