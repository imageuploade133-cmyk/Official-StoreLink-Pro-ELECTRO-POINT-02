
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users2, 
  X, 
  PlusCircle, 
  Loader2, 
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { useSettings } from '@/contexts/settings-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { CustomerSearchList } from './CustomerSearchList';
import { useAuth } from '@/contexts/auth-context';
import { logCustomerActivity } from '@/lib/logger';
import { CustomerFormDialog } from '@/components/dialogs/CustomerFormDialog';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const mapDocToCustomer = (doc: any): Customer => {
  const data = doc.data();
  return {
    id: doc.id,
    uid: data.uid || null,
    name: data.name || 'Unknown Customer',
    email: data.email || undefined,
    phone: data.phone || undefined,
    status: data.status || 'active',
    totalSpent: data.totalSpent || 0,
    outstandingCredit: data.outstandingCredit || 0,
    creditBalance: data.creditBalance || 0,
    allowSms: data.allowSms ?? true,
    allowWhatsapp: data.allowWhatsapp ?? true,
    branchId: data.branchId || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export function CustomerManagementModal({ isOpen, onOpenChange, onCustomerSelect }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerSelect: (customer: Customer) => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: authUser, staffMember, store } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [registryFilter, setRegistryFilter] = useState<'all' | 'pos' | 'online'>('all');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Pagination State
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);

  const isMobile = useIsMobile();

  const fetchCustomers = useCallback(async (direction: 'next' | 'prev' | 'initial' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);
    try {
      let q = query(collection(firestore, "customers"), where("store_id", "==", currentStoreId), orderBy("name", "asc"));

      // Apply registry filters
      if (registryFilter === 'pos') {
        q = query(q, where('uid', '==', null));
      } else if (registryFilter === 'online') {
        q = query(q, where('uid', '!=', null));
      }

      if (direction === 'next' && lastDoc) {
        q = query(q, startAfter(lastDoc), limit(PAGE_SIZE));
      } else if (direction === 'prev' && firstDoc) {
        q = query(q, endBefore(firstDoc), limitToLast(PAGE_SIZE));
      } else {
        q = query(q, limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      
      if (docs.length > 0) {
        setFirstDoc(docs[0]);
        setLastDoc(docs[docs.length - 1]);
        setCustomers(docs.map(mapDocToCustomer));
        
        setIsLastPage(docs.length < PAGE_SIZE);
        
        if (direction === 'next') setPage(p => p + 1);
        if (direction === 'prev') setPage(p => Math.max(1, p - 1));
        if (direction === 'initial') {
            setPage(1);
        }
      } else {
        if (direction === 'initial') {
            setCustomers([]);
            setIsLastPage(true);
        }
      }

    } catch (e: any) {
      console.error("Error loading customers: ", e);
      toast({ variant: "destructive", title: "Query Error", description: "Failed to load customers." });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, registryFilter, firstDoc, lastDoc, toast, currentStoreId]);

  useEffect(() => {
    if (isOpen && currentStoreId) {
      fetchCustomers('initial');
    }
  }, [isOpen, registryFilter, currentStoreId]);

  const handleNextPage = () => fetchCustomers('next');
  const handlePrevPage = () => fetchCustomers('prev');

  const handleRegisterSubmit = async (values: any) => {
    if (!firestore || !authUser || !currentStoreId) return;
    
    setIsSaving(true);
    try {
        const newCustomerData = {
            ...values,
            store_id: currentStoreId,
            branchId: null,
            uid: null,
            totalSpent: 0,
            outstandingCredit: 0,
            creditBalance: 0,
            status: 'active' as const,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(firestore, 'customers'), newCustomerData);
        
        const createdCustomer: Customer = {
            id: docRef.id,
            ...newCustomerData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        } as Customer;

        await logCustomerActivity(firestore, {
            action: "CREATE",
            store_id: currentStoreId!,
            entityId: docRef.id,
            entityDescription: values.name,
            userId: authUser.uid,
            userName: authUser.email || 'System',
            afterData: createdCustomer
        });

        toast({ title: 'Customer Registered', description: `"${values.name}" has been added and selected for this cart.` });
        
        // Automatically select the new customer for the cart
        onCustomerSelect(createdCustomer);
        setIsRegisterOpen(false);
        onOpenChange(false);

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Registration Failed', description: e.message || 'Failed to create customer.' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            "flex flex-col p-0 overflow-hidden",
            isMobile ? "w h max-w-none m-0 rounded-none border-none left-0 top-0 translate-x-0 translate-y-0" : "w max-w-6xl h rounded-xl"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-background">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-primary/10 rounded-full shrink-0">
                  <Users2 className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
                </div>
                <div className="min-w-0">
                    <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight truncate">Customer Hub</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm truncate">Manage terminal and web customers.</DialogDescription>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsRegisterOpen(true)}
                size={isMobile ? "sm" : "default"}
                className="gap-2 font-bold   shrink-0 mr-6 sm:mr-8"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Add New Profile</span>
                <span className="inline sm:hidden">Add</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1 h-full">
                <div className="p-3 sm:p-6 pt-4">
                    <CustomerSearchList
                        customers={customers}
                        isLoading={isLoading}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        onCustomerSelect={onCustomerSelect}
                        currencySymbol={currencySymbol}
                        registryFilter={registryFilter}
                        onRegistryFilterChange={setRegistryFilter}
                        page={page}
                        isLastPage={isLastPage}
                        onNextPage={handleNextPage}
                        onPrevPage={handlePrevPage}
                    />
                </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="p-6 border-t mt-auto bg-background shrink-0">
            <DialogClose asChild>
              <Button variant="outline" className="h-11 px-8 font-bold">
                 <X className="mr-2 h-4 w-4" /> Close Hub
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={isRegisterOpen}
        onOpenChange={setIsRegisterOpen}
        onSubmit={handleRegisterSubmit}
        defaultValues={null}
        isSaving={isSaving}
      />
    </>
  );
}
