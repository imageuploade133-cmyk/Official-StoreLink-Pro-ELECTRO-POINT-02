
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  collection,
  deleteDoc,
  doc,
  query,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  limit,
  orderBy,
  startAfter,
  endBefore,
  limitToLast,
  where,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { Customer, CustomerStatus, CreditPaymentReceiptInfo } from '@/lib/types';
import { CustomerFormDialog } from '@/components/dialogs/CustomerFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PlusCircle, 
  Users as UsersIcon, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Ban, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  MessageSquare, 
  Phone, 
  DollarSign, 
  Check, 
  PiggyBank, 
  FileText,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/contexts/settings-context";
import CustomerHistoryTab from '@/components/tabs/CustomerHistoryTab';
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
import { formatCurrency } from '@/lib/formatUtils';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { logCustomerActivity } from '@/lib/logger';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/PageHeader';
import { BulkPaymentDialog } from '@/components/dialogs/BulkPaymentDialog';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { Separator } from '@/components/ui/separator';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const { user: authUser, permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);
  const [customerForBulkPayment, setCustomerForBulkPayment] = useState<Customer | null>(null);
  
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedCustomerForActions, setSelectedCustomerForActions] = useState<Customer | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatingCustomerId, setUpdatingCustomerId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('customers');

  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';
  const defaultProfileImageUrl = settings?.defaultProfileImageUrl || 'https://placehold.co/400x400.png';

  // Pagination State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);

  // Stable cursors using refs to avoid infinite loops in useEffect
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchCustomers = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingCustomers(true);

    try {
      let q = query(collection(firestore, 'customers'), where('store_id', '==', currentStoreId), orderBy('name', 'asc'));

      // Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCustomerCount(countSnap.data().count);
      }

      // Apply Cursors from refs
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
        // Update refs for next call
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const customerData = docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            allowSms: d.data().allowSms !== false,
            allowWhatsapp: d.data().allowWhatsapp !== false,
        } as Customer));
        setCustomers(customerData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setCustomers([]);
          setIsLastPage(true);
        } else if (direction === 'next') {
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load customer registry." });
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [firestore, currentStoreId, toast]);

  useEffect(() => {
    if (firestore && !authLoading && currentStoreId) {
      fetchCustomers('initial');
    }
  }, [firestore, authLoading, currentStoreId, fetchCustomers]);

  const handleSaveCustomer = async (values: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent' | 'outstandingCredit' | 'status' | 'branchId'>) => {
    if (!authUser?.uid || !authUser.email || !firestore || !currentStoreId) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to save customers." });
        return;
    }
    
    setIsSaving(true);
    try {
        if (editingCustomer) { // UPDATE
            const customerRef = doc(firestore, 'customers', editingCustomer.id);
            const oldCustomerSnap = await getDoc(customerRef);
            const oldCustomerData = oldCustomerSnap.exists() ? (oldCustomerSnap.data() as Customer) : null;
            
            const updatedCustomerData = { ...values, updatedAt: serverTimestamp() };
            
            updateDoc(customerRef, updatedCustomerData)
              .then(async () => {
                await logCustomerActivity(firestore, {
                    action: "UPDATE", entityId: editingCustomer.id, entityDescription: values.name,
                    userId: authUser.uid, userName: authUser.email!, beforeData: oldCustomerData, afterData: { ...oldCustomerData, ...values } as any,
                });
                toast({ title: 'Customer Updated', description: `"${values.name}" has been successfully updated.` });
                setIsFormOpen(false);
                setEditingCustomer(null);
                fetchCustomers('initial');
              })
              .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: customerRef.path,
                  operation: 'update',
                  requestResourceData: updatedCustomerData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
              })
              .finally(() => setIsSaving(false));

        } else { // CREATE
            const newCustomerData = {
                ...values,
                store_id: currentStoreId,
                branchId: null,
                totalSpent: 0, outstandingCredit: 0, creditBalance: 0,
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                status: 'active' as const,
            };
            const customersCol = collection(firestore, 'customers');
            
            addDoc(customersCol, newCustomerData)
              .then(async (docRef) => {
                await logCustomerActivity(firestore, {
                    action: "CREATE", entityId: docRef.id, entityDescription: values.name,
                    userId: authUser.uid, userName: authUser.email!, afterData: { id: docRef.id, ...newCustomerData } as any,
                });
                toast({ title: 'Customer Added', description: `"${values.name}" has been successfully added.` });
                setIsFormOpen(false);
                setEditingCustomer(null);
                fetchCustomers('initial');
              })
              .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: customersCol.path,
                  operation: 'create',
                  requestResourceData: newCustomerData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
              })
              .finally(() => setIsSaving(false));
        }
    } catch (e: any) {
        console.error("handleSaveCustomer: Error saving customer: ", e);
        toast({ variant: 'destructive', title: 'Save Error', description: e.message || 'Could not save customer.' });
        setIsSaving(false);
    }
  };

  const deleteCustomer = async (customerId: string, customerName: string) => {
    if (!authUser?.uid || !authUser.email || !firestore) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to delete customers." });
        return;
    }
    setIsDeleting(true);
    const customerRef = doc(firestore, 'customers', customerId);
    const customerToDeleteData = customers.find(c => c.id === customerId);

    deleteDoc(customerRef)
      .then(async () => {
        await logCustomerActivity(firestore, {
            action: "DELETE", entityId: customerId, entityDescription: customerName,
            userId: authUser.uid, userName: authUser.email!, beforeData: customerToDeleteData,
        });
        toast({ title: 'Customer Deleted', description: `"${customerName}" has been successfully deleted.` });
        setIsDeleteDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers('initial');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: customerRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsDeleting(false));
  };

  const setCustomerStatus = async (customerId: string, newStatus: CustomerStatus, customerName: string) => {
    if (!authUser?.uid || !authUser.email || !firestore) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to change status." });
        return;
    }
    setUpdatingCustomerId(customerId);
    setIsUpdatingStatus(true);
    
    const customerRef = doc(firestore, 'customers', customerId);
    const customerToUpdate = customers.find(c => c.id === customerId);
    const updateData = { status: newStatus, updatedAt: serverTimestamp() };

    updateDoc(customerRef, updateData)
      .then(async () => {
        await logCustomerActivity(firestore, {
            action: "STATUS_UPDATE", entityId: customerId, entityDescription: customerName,
            userId: authUser.uid, userName: authUser.email!, beforeData: customerToUpdate, afterData: { ...customerToUpdate, status: newStatus } as any,
        });
        toast({ title: 'Status Updated', description: `"${customerName}" status has been updated to "${newStatus}".` });
        setIsActionModalOpen(false);
        fetchCustomers('initial');
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: customerRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUpdatingStatus(false);
        setUpdatingCustomerId(null);
      });
  };

  const toggleCommunicationPreference = async (customerId: string, pref: 'allowSms' | 'allowWhatsapp', currentValue: boolean) => {
    if (!firestore) return;
    setUpdatingCustomerId(customerId);
    
    const customerRef = doc(firestore, 'customers', customerId);
    const updateData = { [pref]: !currentValue, updatedAt: serverTimestamp() };

    updateDoc(customerRef, updateData)
      .then(() => {
        toast({ title: "Preference Updated", description: `${pref === 'allowSms' ? 'SMS' : 'WhatsApp'} preference changed.` });
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, [pref]: !currentValue } : c));
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: customerRef.path,
          operation: 'update',
          requestResourceData: updateData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setUpdatingCustomerId(null);
      });
  }
    
  const handleContactViaWhatsApp = (customer: Customer) => {
    if (!customer.phone) {
      toast({ variant: "destructive", title: "Phone Number Missing", description: "Customer phone number is not available." });
      return;
    }
    const formattedPhone = formatPhoneNumberForWhatsapp(customer.phone, settings?.countryCode);
    if (!formattedPhone) {
        toast({ variant: "destructive", title: "Invalid Phone Number", description: "Could not format the phone number for WhatsApp." });
        return;
    }
    const initialText = `Hello ${customer.name},`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(initialText)}`;
    window.open(whatsappUrl, '_blank');
    setIsActionModalOpen(false);
  };

  const handleBulkPayment = (customer: Customer) => {
    setCustomerForBulkPayment(customer);
    setIsBulkPaymentOpen(true);
    setIsActionModalOpen(false);
  };

  const onBulkPaymentRecorded = (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => {
    if (args.success && args.receiptInfo) {
        setPaymentReceiptInfo(args.receiptInfo);
        setIsPaymentReceiptOpen(true);
    }
    fetchCustomers('initial');
  };

  const handleOpenActions = (customer: Customer) => {
    setSelectedCustomerForActions(customer);
    setIsActionModalOpen(true);
  };

  const filteredCustomers = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase().trim();
    if (!searchTermLower) return customers;
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTermLower) ||
      customer.email?.toLowerCase().includes(searchTermLower) ||
      customer.phone?.includes(searchTermLower)
    );
  }, [customers, searchTerm]);

  const handlePrevPage = () => fetchCustomers('prev');
  const handleNextPage = () => fetchCustomers('next');

  const handleAddCustomer = () => { setEditingCustomer(null); setIsFormOpen(true); };
  const handleEditCustomer = (customer: Customer) => { setEditingCustomer(customer); setIsFormOpen(true); setIsActionModalOpen(false); };
  const handleDeleteCustomer = (customer: Customer) => { setCustomerToDelete(customer); setIsDeleteDialogOpen(true); setIsActionModalOpen(false); };
  
  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions.canViewCustomers) {
      return <AccessDenied />;
  }

  return (
    <>
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <PageHeader
                icon={UsersIcon}
                title="Customer Registry"
                description="View and manage all registered customers with incremental fetching."
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => fetchCustomers('initial')} disabled={isLoadingCustomers}>
                    <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingCustomers && "animate-spin")} />
                    Sync Registry
                </Button>
                <Button onClick={handleAddCustomer} size="sm" disabled={isLoadingCustomers || !permissions.canAddCustomers}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
                </Button>
              </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      {isLoadingCustomers && customers.length === 0 ? <Skeleton className="h-8 w-1/2 rounded-md"/> : <div className="text-2xl font-bold">{totalCustomerCount.toLocaleString()}</div>}
                      <p className="text-xs text-muted-foreground">Across entire business registry</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Registry View</CardTitle>
                      <PiggyBank className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold text-green-600">{customers.length} Items</div>
                      <p className="text-xs text-muted-foreground">Showing current batch</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Indebtedness</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatCurrency(customers.reduce((acc, c) => acc + (c.outstandingCredit || 0), 0), currencySymbol)}
                      </div>
                      <p className="text-xs text-muted-foreground">Calculated for current view only</p>
                  </CardContent>
              </Card>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="customers" disabled={isLoadingCustomers && customers.length === 0}>Customer Directory</TabsTrigger>
                  <TabsTrigger value="history" disabled={isLoadingCustomers && customers.length === 0}>Activity Log</TabsTrigger>
              </TabsList>

              <TabsContent value="customers">
                  <Card className="mb-6">
                      <CardHeader className="pb-4">
                          <CardTitle className="font-headline text-lg">Local Search</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                  type="search"
                                  placeholder="Search by Name, Email, Phone within current batch..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="pl-10 h-10"
                                  disabled={isLoadingCustomers && customers.length === 0}
                              />
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
                      <CardHeader>
                          <CardTitle className="font-headline text-xl">Directory</CardTitle>
                          <CardDescription>
                              {isLoadingCustomers ? "Syncing with cloud registry..." :
                              `Showing page ${currentPage} of the directory.`
                              }
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                          {isLoadingCustomers && customers.length === 0 ? (
                              <div className="p-6 space-y-4">
                                  {[...Array(5)].map((_, i) => (
                                      <div key={i} className="flex items-center space-x-4 p-2 border-b">
                                          <Skeleton className="h-12 w-12 rounded-full" />
                                          <div className="space-y-2 flex-grow">
                                              <Skeleton className="h-4 w-3/4 rounded" />
                                              <Skeleton className="h-4 w-1/2 rounded" />
                                          </div>
                                          <Skeleton className="h-8 w-20 rounded-md" />
                                      </div>
                                  ))}
                              </div>
                          ) : !isLoadingCustomers && customers.length === 0 ? (
                              <div className="py-16 text-center">
                                  <UsersIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                                  <h3 className="text-xl font-semibold mb-2">Registry is Empty</h3>
                                  <p className="text-muted-foreground mb-4">
                                      It looks like your customer list is empty. Add your first customer to get started!
                                  </p>
                                  <Button onClick={handleAddCustomer} disabled={isLoadingCustomers || !permissions.canAddCustomers}>
                                      <PlusCircle className="mr-2 h-4 w-4" /> Add First Customer
                                  </Button>
                              </div>
                          ) : (
                              <div className="w-full overflow-x-auto">
                                  <Table className="min-w-[1200px] md:min-w-full">
                                      <TableHeader className="bg-muted/50">
                                          <TableRow>
                                              <TableHead className="w-[60px] pl-6">Avatar</TableHead>
                                              <TableHead className="min-w-[150px]">Name & Contact</TableHead>
                                              <TableHead className="text-right">Total Spent</TableHead>
                                              <TableHead className="text-right">Credit Due</TableHead>
                                              <TableHead className="text-right">Deposit Bal</TableHead>
                                              <TableHead>Status</TableHead>
                                              <TableHead className="min-w-[100px] text-center pr-6">Actions</TableHead>
                                          </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                          {filteredCustomers.map(customer => {
                                              return (
                                                  <TableRow key={customer.id} className="group hover:bg-muted/30">
                                                      <TableCell className="pl-6">
                                                          <Image
                                                              src={(customer as any).profileImageUrl || defaultProfileImageUrl}
                                                              alt={customer.name}
                                                              width={40} height={40}
                                                              className="rounded-full object-cover aspect-square shadow-sm"
                                                              data-ai-hint="person face"
                                                              onError={(e: any) => { e.target.src = defaultProfileImageUrl; }}
                                                          />
                                                      </TableCell>
                                                      <TableCell className="font-medium">
                                                          <div className="truncate max-w-[160px] text-sm font-bold" title={customer.name}>{customer.name}</div>
                                                          {customer.email && <div className="text-xs text-muted-foreground truncate max-w-[160px]" title={customer.email}>{customer.email}</div>}
                                                          {customer.phone && <div className="text-xs text-muted-foreground">Phone: {customer.phone}</div>}
                                                      </TableCell>
                                                      <TableCell className="text-right font-medium text-muted-foreground">
                                                          {formatCurrency(customer.totalSpent || 0, currencySymbol)}
                                                      </TableCell>
                                                      <TableCell className="text-right font-black text-destructive">
                                                          {formatCurrency(customer.outstandingCredit || 0, currencySymbol)}
                                                      </TableCell>
                                                      <TableCell className="text-right font-bold text-green-600">
                                                          {formatCurrency(customer.creditBalance || 0, currencySymbol)}
                                                      </TableCell>
                                                      <TableCell>
                                                          {customer.status === 'active' ? (
                                                              <Badge variant="default" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700 h-5 px-2 text-[10px] font-black uppercase tracking-tighter">
                                                                  Active
                                                              </Badge>
                                                          ) : (
                                                              <Badge variant="destructive" className="h-5 px-2 text-[10px] font-black uppercase tracking-tighter">
                                                                  {customer.status}
                                                              </Badge>
                                                          )}
                                                      </TableCell>
                                                      <TableCell className="text-center pr-6">
                                                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenActions(customer)}>
                                                              <MoreHorizontal className="h-4 w-4" />
                                                          </Button>
                                                      </TableCell>
                                                  </TableRow>
                                              );
                                          })}
                                      </TableBody>
                                  </Table>
                              </div>
                          )}
                      </CardContent>
                      <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                        <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                            Page {currentPage} <span className="mx-2">|</span> {totalCustomerCount} Total Members
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingCustomers} className="font-bold">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoadingCustomers} className="font-bold">
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </CardFooter>
                  </Card>
              </TabsContent>

              <TabsContent value="history">
                  <CustomerHistoryTab />
              </TabsContent>
          </Tabs>

          <CustomerFormDialog
              open={isFormOpen}
              onOpenChange={(open) => {
                  setIsFormOpen(open);
                  if (!open) setEditingCustomer(null);
              }}
              onSubmit={handleSaveCustomer}
              defaultValues={editingCustomer}
              isSaving={isSaving}
          />
          
          <BulkPaymentDialog
            isOpen={isBulkPaymentOpen}
            onOpenChange={setIsBulkPaymentOpen}
            customer={customerForBulkPayment}
            currencySymbol={currencySymbol}
            onPaymentRecorded={onBulkPaymentRecorded} 
          />

          <ActionModal
            isOpen={isActionModalOpen}
            onOpenChange={setIsActionModalOpen}
            title={selectedCustomerForActions?.name || 'Customer Actions'}
            description={selectedCustomerForActions?.email || selectedCustomerForActions?.phone || 'Account Insight'}
          >
            {selectedCustomerForActions && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Spent</p>
                        <p className="text-sm font-bold">{formatCurrency(selectedCustomerForActions.totalSpent || 0, currencySymbol)}</p>
                    </div>
                    <div className="text-center border-l">
                        <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Debt Due</p>
                        <p className="text-sm font-bold text-destructive">{formatCurrency(selectedCustomerForActions.outstandingCredit || 0, currencySymbol)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button variant="default" className="justify-start bg-green-600 hover:bg-green-700 h-11" onClick={() => handleBulkPayment(selectedCustomerForActions)} disabled={(selectedCustomerForActions.outstandingCredit || 0) <= 0.01}>
                    <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                  </Button>
                  <Button variant="outline" className="justify-start h-11 font-bold" asChild>
                    <Link href={`/dashboard/customers/${selectedCustomerForActions.id}/statement`}>
                      <FileText className="mr-2 h-4 w-4 text-primary" /> View Statement
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start h-11 font-bold" onClick={() => handleEditCustomer(selectedCustomerForActions)} disabled={!permissions.canEditCustomers}>
                    <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Details
                  </Button>
                  <Button variant="outline" className="justify-start h-11 font-bold" onClick={() => handleContactViaWhatsApp(selectedCustomerForActions)}>
                    <MessageSquare className="mr-2 h-4 w-4 text-green-500" /> WhatsApp Message
                  </Button>
                </div>

                <Separator />
                
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={selectedCustomerForActions.status === 'active' ? 'default' : 'outline'} 
                      size="sm" 
                      className={cn("h-8 text-[10px] font-black uppercase", selectedCustomerForActions.status === 'active' && "bg-green-600 hover:bg-green-700")}
                      onClick={() => setCustomerStatus(selectedCustomerForActions.id, 'active', selectedCustomerForActions.name)}
                      disabled={isUpdatingStatus || selectedCustomerForActions.status === 'active'}
                    >
                      {updatingCustomerId === selectedCustomerForActions.id && isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                      Active
                    </Button>
                    <Button 
                      variant={selectedCustomerForActions.status === 'inactive' ? 'secondary' : 'outline'} 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase"
                      onClick={() => setCustomerStatus(selectedCustomerForActions.id, 'inactive', selectedCustomerForActions.name)}
                      disabled={isUpdatingStatus || selectedCustomerForActions.status === 'inactive'}
                    >
                      Inactive
                    </Button>
                    <Button 
                      variant={selectedCustomerForActions.status === 'banned' ? 'destructive' : 'outline'} 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase"
                      onClick={() => setCustomerStatus(selectedCustomerForActions.id, 'banned', selectedCustomerForActions.name)}
                      disabled={isUpdatingStatus || selectedCustomerForActions.status === 'banned'}
                    >
                      <Ban className="mr-1 h-3 w-3" /> Ban
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Communication Prefs</Label>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <span className="text-xs font-medium flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-blue-500"/> Allow SMS</span>
                    <Switch 
                      checked={selectedCustomerForActions.allowSms} 
                      onCheckedChange={() => toggleCommunicationPreference(selectedCustomerForActions.id, 'allowSms', selectedCustomerForActions.allowSms)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <span className="text-xs font-medium flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-green-500"/> Allow WhatsApp</span>
                    <Switch 
                      checked={selectedCustomerForActions.allowWhatsapp} 
                      onCheckedChange={() => toggleCommunicationPreference(selectedCustomerForActions.id, 'allowWhatsapp', selectedCustomerForActions.allowWhatsapp)}
                    />
                  </div>
                </div>

                <Separator />

                <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 text-[10px] font-black uppercase h-8" onClick={() => handleDeleteCustomer(selectedCustomerForActions)} disabled={!permissions.canDeleteCustomers}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Account Permanently
                </Button>
              </div>
            )}
          </ActionModal>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Delete Customer Profile?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete <strong>"{customerToDelete?.name || ''}"</strong> and all of their associated data. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => customerToDelete && deleteCustomer(customerToDelete.id, customerToDelete.name)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : 'Confirm Delete'}
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

          {paymentReceiptInfo && (
            <CreditPaymentReceiptModal
                isOpen={isPaymentReceiptOpen}
                onClose={() => { setIsPaymentReceiptOpen(false); setPaymentReceiptInfo(null); }}
                paymentInfo={paymentReceiptInfo}
                currencySymbol={currencySymbol}
            />
          )}
      </div>
    </>
  );
}
