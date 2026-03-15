'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
  const { user: authUser } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

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
    if (!firestore) return;
    setIsLoading(true);
    try {
      let q = query(collection(firestore, "customers"), orderBy("name", "asc"));

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
  }, [firestore, registryFilter, firstDoc, lastDoc, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers('initial');
    }
  }, [isOpen, registryFilter]);

  const handleNextPage = () => fetchCustomers('next');
  const handlePrevPage = () => fetchCustomers('prev');

  const handleRegisterSubmit = async (values: any) => {
    if (!firestore || !authUser) return;
    
    setIsSaving(true);
    try {
        const newCustomerData = {
            ...values,
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
          className={isMobile ? "w-full h-full p-0 flex flex-col" : "w-full md:max-w-6xl h-full md:h-[90vh] p-0 flex flex-col"}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background flex flex-row items-center justify-between pr-14">
            <div className="flex items-center gap-3">
              <Users2 className="h-7 w-7 text-primary" />
              <div className="min-w-0">
                  <DialogTitle className="text-2xl font-bold tracking-tight truncate">Customer Hub</DialogTitle>
                  <DialogDescription className="truncate">Manage terminal customers and website registrations.</DialogDescription>
              </div>
            </div>
            
            <Button 
              onClick={() => setIsRegisterOpen(true)}
              className="hidden sm:flex gap-2 font-bold shadow-lg shadow-primary/20 mr-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add New Profile
            </Button>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ScrollArea className="flex-1">
                <div className="p-6 pt-4">
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
