'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp, writeBatch, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/data-table';
import { AdvancedPagination } from '@/components/pagination/AdvancedPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  CreditCard, 
  Loader2, 
  Search, 
  Filter, 
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, isAfter, isBefore, parseISO } from 'date-fns';
import type { InstallmentOrder, InstallmentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusConfig: Record<InstallmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: XCircle },
};

interface InstallmentOrderWithProgress extends InstallmentOrder {
  progressPercent: number;
  nextPaymentAmount: number;
}

export default function InstallmentOrdersPage() {
  const firestore = useFirestore();
  const { staffMember, store, user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InstallmentStatus | 'all'>('all');
  const [orders, setOrders] = useState<InstallmentOrderWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isLastPage, setIsLastPage] = useState(false);
  
  // View/Edit dialog
  const [selectedOrder, setSelectedOrder] = useState<InstallmentOrderWithProgress | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Payment dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchOrders = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      let q = query(
        collection(firestore, 'installmentOrders'),
        where('store_id', '==', currentStoreId),
        orderBy('createdAt', 'desc')
      );

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCount(countSnap.data().count);
      }

      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data() as InstallmentOrder;
        const totalPayments = data.paymentSchedule?.filter(p => p.status === 'paid').length || 0;
        const progressPercent = data.paymentSchedule?.length > 0 
          ? (totalPayments / data.paymentSchedule.length) * 100 
          : 0;
        const nextPayment = data.paymentSchedule?.find(p => p.status === 'pending');
        return {
          ...data,
          id: doc.id,
          progressPercent,
          nextPaymentAmount: nextPayment?.amount || 0,
        } as InstallmentOrderWithProgress;
      });

      // Apply filters
      let filtered = ordersData;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(o => 
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.includes(term) ||
          o.productName.toLowerCase().includes(term) ||
          o.id.toLowerCase().includes(term)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === statusFilter);
      }

      setOrders(filtered);
      setIsLastPage(filtered.length < itemsPerPage);
      if (direction === 'next') setCurrentPage(p => p + 1);
      else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
      else setCurrentPage(1);
    } catch (error: any) {
      console.error("Error fetching installment orders:", error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to load installment orders." });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId, searchTerm, statusFilter, itemsPerPage, toast]);

  useEffect(() => {
    if (firestore && currentStoreId) {
      fetchOrders('initial');
    }
  }, [firestore, currentStoreId, fetchOrders]);

  const handleRecordPayment = async () => {
    if (!selectedOrder || !firestore || !user || !currentStoreId) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter a valid payment amount." });
      return;
    }

    setIsUpdating(true);
    try {
      const batch = writeBatch(firestore);
      const orderRef = doc(firestore, 'installmentOrders', selectedOrder.id);
      
      // Find next pending payment
      const pendingIndex = selectedOrder.paymentSchedule.findIndex(p => p.status === 'pending');
      if (pendingIndex === -1) {
        toast({ variant: 'destructive', title: "No Pending Payments", description: "All payments have been completed." });
        return;
      }

      // Update payment schedule
      const updatedSchedule = [...selectedOrder.paymentSchedule];
      updatedSchedule[pendingIndex] = {
        ...updatedSchedule[pendingIndex],
        status: 'paid',
        paidDate: new Date(),
        paidAmount: amount,
        paymentMethod: paymentMethod,
      };

      // Calculate new totals
      const installmentsPaid = selectedOrder.installmentsPaid + 1;
      const remainingBalance = selectedOrder.totalAmount - 
        (selectedOrder.firstPayment + 
         updatedSchedule.reduce((acc, p) => acc + (p.paidAmount || 0), 0));
      
      // Find next due date
      const nextPendingIndex = updatedSchedule.findIndex(p => p.status === 'pending');
      const nextDueDate = nextPendingIndex !== -1 
        ? updatedSchedule[nextPendingIndex].dueDate 
        : new Date();

      // Determine new status
      let newStatus: InstallmentStatus = 'active';
      if (nextPendingIndex === -1) {
        newStatus = 'completed';
      } else if (isAfter(new Date(), nextDueDate)) {
        newStatus = 'overdue';
      }

      batch.update(orderRef, {
        paymentSchedule: updatedSchedule,
        installmentsPaid,
        installmentsRemaining: updatedSchedule.filter(p => p.status === 'pending').length,
        remainingBalance,
        nextDueDate,
        lastPaymentDate: new Date(),
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // Create payment record
      const paymentRecordRef = doc(collection(firestore, 'installmentPayments'));
      batch.set(paymentRecordRef, {
        installmentOrderId: selectedOrder.id,
        store_id: currentStoreId,
        amount,
        installmentNumber: pendingIndex + 1,
        paymentDate: Timestamp.now(),
        paymentMethod,
        staffId: user.uid,
        staffName: user.displayName || user.email || 'Staff',
        notes: paymentNotes,
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      toast({ title: "Payment Recorded", description: `Payment of ${currencySymbol}${amount.toLocaleString()} has been recorded.` });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchOrders('initial');
      setSelectedOrder(null);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: InstallmentStatus) => {
    if (!firestore) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(firestore, 'installmentOrders', orderId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Status Updated", description: `Order status changed to ${newStatus}.` });
      fetchOrders('initial');
    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error", description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Phone', 'Product', 'Total', 'First Payment', 'Remaining', 'Paid', 'Remaining', 'Status', 'Next Due Date', 'Created'];
    const rows = orders.map(o => [
      o.id,
      o.customerName,
      o.customerPhone,
      o.productName,
      o.totalAmount,
      o.firstPayment,
      o.remainingBalance,
      o.installmentsPaid,
      o.installmentsRemaining,
      o.status,
      format(o.nextDueDate, 'yyyy-MM-dd'),
      format(o.createdAt.toDate(), 'yyyy-MM-dd'),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installment-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => o.status === 'active').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const overdue = orders.filter(o => o.status === 'overdue').length;
    const totalRevenue = orders.reduce((acc, o) => acc + o.firstPayment + (o.totalAmount - o.remainingBalance - o.firstPayment), 0);
    const totalOutstanding = orders.reduce((acc, o) => acc + o.remainingBalance, 0);
    return { active, completed, overdue, totalRevenue, totalOutstanding };
  }, [orders]);

  const openPaymentDialog = (order: InstallmentOrderWithProgress) => {
    setSelectedOrder(order);
    const nextPayment = order.paymentSchedule.find(p => p.status === 'pending');
    setPaymentAmount(nextPayment?.amount.toString() || '');
    setIsPaymentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          icon={CreditCard}
          title="Installment Orders"
          description="Track and manage Pay Small Small / Installment orders"
        />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => fetchOrders('initial')} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground font-medium">Active Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground font-medium">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground font-medium">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currencySymbol}{stats.totalOutstanding.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground font-medium">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, product, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && orders.length === 0 ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">No Installment Orders Found</h3>
              <p className="text-sm text-muted-foreground">Enable installment plans on products to start receiving orders</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customerName}</span>
                          <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.productImageUrl && (
                            <div className="relative h-8 w-8 rounded-md overflow-hidden bg-muted">
                              <Image src={order.productImageUrl} alt="" fill className="object-cover" unoptimized />
                            </div>
                          )}
                          <span className="font-medium text-sm truncate max-w-[150px]">{order.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{currencySymbol}{order.totalAmount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">First: {currencySymbol}{order.firstPayment.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{currencySymbol}{(order.totalAmount - order.remainingBalance).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="w-[100px]">
                          <Progress value={order.progressPercent} className="h-2" />
                          <span className="text-xs text-muted-foreground mt-1">
                            {order.installmentsPaid}/{order.paymentSchedule?.length || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{currencySymbol}{order.nextPaymentAmount.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(order.nextDueDate, 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusConfig[order.status].color)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedOrder(order); setIsViewDialogOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {order.status === 'active' && (
                              <DropdownMenuItem onClick={() => openPaymentDialog(order)}>
                                <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                              </DropdownMenuItem>
                            )}
                            {order.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'cancelled')}>
                                <XCircle className="h-4 w-4 mr-2" /> Cancel Order
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="py-4 px-6 border-t">
          <AdvancedPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage) || 1}
            itemsPerPage={itemsPerPage}
            totalItems={totalCount}
            onPageChange={(page) => {
              if (page > currentPage) fetchOrders('next');
              else if (page < currentPage) fetchOrders('prev');
              setCurrentPage(page);
            }}
            onItemsPerPageChange={(val) => setItemsPerPage(val)}
            isLoading={isLoading}
          />
        </div>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Installment Order Details</DialogTitle>
            <DialogDescription>Order ID: {selectedOrder?.id}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
                  <p className="font-semibold">{selectedOrder.customerName}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" /> {selectedOrder.customerPhone}
                  </div>
                  {selectedOrder.customerEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" /> {selectedOrder.customerEmail}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Product</h4>
                  <div className="flex items-center gap-3">
                    {selectedOrder.productImageUrl && (
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted">
                        <Image src={selectedOrder.productImageUrl} alt="" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <p className="font-semibold">{selectedOrder.productName}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                <h4 className="font-medium">Payment Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold">{currencySymbol}{selectedOrder.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">First Payment</p>
                    <p className="text-xl font-bold text-green-600">{currencySymbol}{selectedOrder.firstPayment.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining Balance</p>
                    <p className="text-xl font-bold text-red-600">{currencySymbol}{selectedOrder.remainingBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Payment Progress</span>
                    <span className="font-medium">{selectedOrder.installmentsPaid}/{selectedOrder.paymentSchedule?.length || 0}</span>
                  </div>
                  <Progress value={selectedOrder.progressPercent} className="h-3" />
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="space-y-3">
                <h4 className="font-medium">Payment Schedule</h4>
                <div className="space-y-2">
                  {selectedOrder.paymentSchedule?.map((payment, idx) => {
                    const isPaid = payment.status === 'paid';
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          isPaid ? "bg-green-500/5 border-green-500/20" : 
                          payment.status === 'overdue' ? "bg-red-500/5 border-red-500/20" : 
                          "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            isPaid ? "bg-green-500/20 text-green-600" :
                            payment.status === 'overdue' ? "bg-red-500/20 text-red-600" :
                            "bg-muted"
                          )}>
                            {isPaid ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                          </div>
                          <div>
                            <p className="font-medium">Installment #{idx + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(payment.dueDate, 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{currencySymbol}{payment.amount.toLocaleString()}</p>
                          {isPaid && payment.paidDate && (
                            <p className="text-xs text-muted-foreground">
                              Paid on {format(payment.paidDate, 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Badge className={cn("gap-1", statusConfig[selectedOrder.status].color)}>
                    {React.createElement(statusConfig[selectedOrder.status].icon, { className: "h-3 w-3" })}
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                  {selectedOrder.status === 'active' && (
                    <span className="text-sm text-muted-foreground">
                      Next payment: {format(selectedOrder.nextDueDate, 'MMMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedOrder.status === 'active' && (
                    <Button onClick={() => { setIsViewDialogOpen(false); openPaymentDialog(selectedOrder); }}>
                      <DollarSign className="h-4 w-4 mr-2" /> Record Payment
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Recording payment for {selectedOrder?.customerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">{currencySymbol}{selectedOrder?.remainingBalance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <Input 
                type="number" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}