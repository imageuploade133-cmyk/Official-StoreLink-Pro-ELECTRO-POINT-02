
'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { 
  UsersRound, 
  Search, 
  Eye, 
  Loader2, 
  Mail, 
  Phone, 
  UserCircle,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  PlusCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  ShoppingBag,
  MapPin,
  CalendarDays,
  X,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import AccessDenied from '@/components/staff-management/AccessDenied';
import type { Customer, Order, CreditPaymentReceiptInfo } from '@/lib/types';
import Link from 'next/link';
import { CustomerFormDialog } from '@/components/dialogs/CustomerFormDialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { Separator } from '@/components/ui/separator';
import { BulkPaymentDialog } from '@/components/dialogs/BulkPaymentDialog';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';
import { RecordDepositDialog } from '@/components/dialogs/RecordDepositDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from '@/components/ui/tabs';

const ITEMS_PER_PAGE = 15;

interface CustomerWithOrders extends Customer {
  orderCount: number;
}

export default function OnlineCustomersPage() {
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // CRUD States
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Payment State
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [isRecordDepositOpen, setIsRecordDepositOpen] = useState(false);
  const [customerForBulkPayment, setCustomerForBulkPayment] = useState<CustomerWithOrders | null>(null);
  const [customerForDeposit, setCustomerForDeposit] = useState<CustomerWithOrders | null>(null);
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  // Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedCustomerForActions, setSelectedCustomerForActions] = useState<CustomerWithOrders | null>(null);

  // Pagination & List State
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalRegistryCount, setTotalRegistryCount] = useState(0);

  // Use refs for cursors to avoid infinite loops
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchCustomers = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      // 1. Base Query: Only customers who registered via web (have a UID)
      let q = query(
        collection(firestore, 'customers'), 
        where('store_id', '==', currentStoreId),
        where('uid', '!=', null),
        orderBy('uid'), 
        orderBy('createdAt', 'desc')
      );

      // 2. Initial Count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalRegistryCount(countSnap.data().count);
      }

      // 3. Apply cursors from refs
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

        const customerDocs = docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        const uids = customerDocs.map(c => c.uid).filter(Boolean) as string[];

        // 4. Fetch orders ONLY for these customers (Batch Query)
        let orderCounts: Record<string, number> = {};
        if (uids.length > 0) {
            const ordersQuery = query(collection(firestore, 'orders'), where('store_id', '==', currentStoreId), where('user_id', 'in', uids));
            const ordersSnapshot = await getDocs(ordersQuery);
            ordersSnapshot.forEach(orderDoc => {
                const order = orderDoc.data();
                orderCounts[order.user_id] = (orderCounts[order.user_id] || 0) + 1;
            });
        }

        const enriched = customerDocs.map(c => ({
            ...c,
            orderCount: orderCounts[c.uid!] || 0
        }));

        setCustomers(enriched);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
            setCustomers([]);
            setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching online customers:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load customer registry. Please check indexes." });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast, currentStoreId]);

  useEffect(() => {
    if (!isAuthLoading && permissions.view_online_customers && currentStoreId) {
      fetchCustomers('initial');
    }
  }, [isAuthLoading, permissions.view_online_customers, fetchCustomers, currentStoreId]);

  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return customers;
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    return customers.filter(customer => {
      const createdAt = convertToDateSafely(customer.createdAt);
      if (!createdAt) return activeTab === 'old'; // Treat as old if date is missing
      
      if (activeTab === 'new') {
        return createdAt >= thirtyDaysAgo;
      } else {
        return createdAt < thirtyDaysAgo;
      }
    });
  }, [customers, activeTab]);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return filteredByTab;
    return filteredByTab.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(term)
    );
  }, [filteredByTab, searchTerm]);

  const handleNextPage = () => fetchCustomers('next');
  const handlePrevPage = () => fetchCustomers('prev');

  const handleViewDetails = (customer: CustomerWithOrders) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsEditFormOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleBulkPayment = (customer: CustomerWithOrders) => {
    setCustomerForBulkPayment(customer);
    setIsBulkPaymentOpen(true);
    setIsActionModalOpen(false);
  };
  
  const handleRecordDeposit = (customer: CustomerWithOrders) => {
    setCustomerForDeposit(customer);
    setIsRecordDepositOpen(true);
    setIsActionModalOpen(false);
  };

  const onBulkPaymentRecorded = (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => {
    if (args.success && args.receiptInfo) {
        setPaymentReceiptInfo(args.receiptInfo);
        setIsPaymentReceiptOpen(true);
    }
    fetchCustomers('initial');
  };

  const handleOpenActions = (customer: CustomerWithOrders) => {
    setSelectedCustomerForActions(customer);
    setIsActionModalOpen(true);
  };

  const onSaveEdit = async (values: any) => {
    if (!firestore || !customerToEdit) return;
    setIsSaving(true);
    try {
      const customerRef = doc(firestore, 'customers', customerToEdit.id);
      await updateDoc(customerRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Customer Updated", description: `Profile for ${values.name} has been saved.` });
      setIsEditFormOpen(false);
      fetchCustomers('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Update Failed", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!firestore || !customerToDelete) return;
    setIsDeleting(true);
    try {
      const customerRef = doc(firestore, 'customers', customerToDelete.id);
      await deleteDoc(customerRef);
      toast({ title: "Customer Deleted", description: "The online customer record was successfully removed." });
      setIsDeleteDialogOpen(false);
      fetchCustomers('initial');
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.view_online_customers) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={UsersRound}
            title="Online Customers"
            description="Manage and review all customers registered via your public website."
        />
        <Button variant="outline" onClick={() => fetchCustomers('initial')} disabled={isLoading}>
            <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Sync Registry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Total Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalRegistryCount.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Users with active web accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Volume In View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">
              {customers.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Customers on current page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Revenue Focus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">
              {formatCurrency(customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0), currencySymbol)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Gross sales from customers in view</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-bold">Member Directory</CardTitle>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-3 md:w-72">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="new">New</TabsTrigger>
                        <TabsTrigger value="old">Old</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search in page..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 h-10" 
                    />
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Credit Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <UsersRound className="h-12 w-12 opacity-10" />
                        <p className="font-medium">No results found.</p>
                        <p className="text-xs">Adjust your search or sync the registry.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="group transition-colors hover:bg-muted/30">
                      <TableCell>
                        <div className="font-bold text-sm text-gray-900">{customer.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">UID: {customer.uid?.substring(0, 12)}...</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" /> {customer.email}</div>
                        {customer.phone && <div className="flex items-center gap-1.5 mt-1"><Phone className="h-3 w-3 text-muted-foreground" /> {customer.phone}</div>}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <Badge variant="secondary" className="px-2 py-0">{customer.orderCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(customer.totalSpent || 0, currencySymbol)}
                      </TableCell>
                      <TableCell className="text-right font-black text-destructive">
                        {formatCurrency(customer.outstandingCredit || 0, currencySymbol)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'active' ? 'default' : 'destructive'} className="capitalize text-[10px] h-5">
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenActions(customer)}>
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
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Online Registry
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="font-bold">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoading} className="font-bold">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      {/* Action Modal */}
      <ActionModal
        isOpen={isActionModalOpen}
        onOpenChange={setIsActionModalOpen}
        title={selectedCustomerForActions?.name || 'Customer Actions'}
        description={selectedCustomerForActions?.email}
      >
        {selectedCustomerForActions && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Button variant="default" className="justify-start bg-blue-600 hover:bg-blue-700 h-11" onClick={() => handleRecordDeposit(selectedCustomerForActions)}>
                <Wallet className="mr-2 h-4 w-4" /> Grant Wallet Bonus
              </Button>
              <Button variant="default" className="justify-start bg-green-600 hover:bg-green-700 h-11" onClick={() => handleBulkPayment(selectedCustomerForActions)} disabled={(selectedCustomerForActions.outstandingCredit || 0) <= 0.01}>
                <DollarSign className="mr-2 h-4 w-4" /> Record Bulk Payment
              </Button>
              <Button variant="outline" className="justify-start h-11" asChild>
                <Link href={`/dashboard/online-customers/${selectedCustomerForActions.id}/statement`}>
                  <FileText className="mr-2 h-4 w-4" /> View Statement
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-11" onClick={() => { handleEditCustomer(selectedCustomerForActions); setIsActionModalOpen(false); }} disabled={!permissions.canEditCustomers}>
                <Edit className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </div>
            <Separator />
            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-xs h-8" onClick={() => { handleDeleteCustomer(selectedCustomerForActions); setIsActionModalOpen(false); }} disabled={!permissions.canDeleteCustomers}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Account
            </Button>
          </div>
        )}
      </ActionModal>

      {/* CRUD Modals */}
      <CustomerFormDialog
        open={isEditFormOpen}
        onOpenChange={setIsEditFormOpen}
        onSubmit={onSaveEdit}
        defaultValues={customerToEdit}
        isSaving={isSaving}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={onConfirmDelete}
        itemName={customerToDelete?.name || ''}
        itemType="online customer"
        isDeleting={isDeleting}
        dialogDescription="This will permanently delete the customer's profile. They will still have their login account, but their customer record and financial history will be removed. This action cannot be undone."
      />

      <BulkPaymentDialog
        isOpen={isBulkPaymentOpen}
        onOpenChange={setIsBulkPaymentOpen}
        customer={customerForBulkPayment}
        currencySymbol={currencySymbol}
        onPaymentRecorded={onBulkPaymentRecorded}
      />

      <RecordDepositDialog
        isOpen={isRecordDepositOpen}
        onOpenChange={setIsRecordDepositOpen}
        customer={customerForDeposit}
        currencySymbol={currencySymbol}
        onSuccess={onBulkPaymentRecorded}
      />

      {paymentReceiptInfo && (
        <CreditPaymentReceiptModal
            isOpen={isPaymentReceiptOpen}
            onClose={() => { setIsPaymentReceiptOpen(false); setPaymentReceiptInfo(null); }}
            paymentInfo={paymentReceiptInfo}
            currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
