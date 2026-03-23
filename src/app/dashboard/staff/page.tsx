
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  deleteDoc, 
  setDoc, 
  where, 
  Timestamp, 
  writeBatch,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } from 'firebase/auth';
import type { StaffMember, SaleTransaction, Role } from '@/lib/types';
import { roles, allPermissions } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, KeyRound, Users, RotateCcw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StaffTable from '@/components/staff-management/StaffTable';
import StaffFormDialog from '@/components/staff-management/StaffFormDialog';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { isToday, startOfDay, addDays, differenceInMilliseconds } from 'date-fns';
import { convertToDateSafely, cn } from '@/lib/utils';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { PageHeader } from '@/components/PageHeader';
import { AdvancedPagination } from '@/components/pagination/AdvancedPagination';
import { Separator } from '@/components/ui/separator';

export default function StaffManagementPage() {
  const { user, permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const firebaseAuth = getAuth();

  // List State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalStaffCount, setTotalStaffCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedStaffForActions, setSelectedStaffForActions] = useState<StaffMember | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const fetchStaffData = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !user) return;
    setIsLoadingData(true);

    try {
      let q = query(collection(firestore, 'staff'), orderBy('name', 'asc'));

      // 1. Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalStaffCount(countSnap.data().count);
      }

      // 2. Apply cursors
      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(itemsPerPage));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(itemsPerPage));
      } else {
        q = query(q, limit(itemsPerPage));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < itemsPerPage);

        const basicStaffData = docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
        const staffUids = basicStaffData.map(s => s.uid).filter(Boolean) as string[];

        // 3. TARGETED Enrichment: Fetch sales only for these 10 staff members
        const staffStats: Record<string, { totalSales: number, totalTransactions: number, todaySales: number }> = {};
        
        if (staffUids.length > 0) {
            // Split into chunks of 30 if needed (Firestore IN limit), but here we only have 10
            const salesQuery = query(
                collection(firestore, 'saleTransactions'),
                where('staffId', 'in', staffUids)
            );
            const salesSnapshot = await getDocs(salesQuery);
            const todayStart = startOfDay(new Date());

            salesSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const staffId = data.staffId;
                const createdAt = convertToDateSafely(data.createdAt);
                const netTotal = (data.grandTotal || 0) - (data.returnedAmount || 0);

                if (!staffStats[staffId]) {
                    staffStats[staffId] = { totalSales: 0, totalTransactions: 0, todaySales: 0 };
                }

                staffStats[staffId].totalSales += netTotal;
                staffStats[staffId].totalTransactions += 1;
                if (createdAt && createdAt >= todayStart) {
                    staffStats[staffId].todaySales += netTotal;
                }
            });
        }

        const enrichedStaffData = basicStaffData.map(staffMember => ({
            ...staffMember,
            totalSales: staffStats[staffMember.uid]?.totalSales || 0,
            totalTransactions: staffStats[staffMember.uid]?.totalTransactions || 0,
            todaySales: staffStats[staffMember.uid]?.todaySales || 0,
        }));

        setStaffList(enrichedStaffData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
            setStaffList([]);
            setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching staff:", error);
      toast({ variant: 'destructive', title: 'Sync Error', description: 'Failed to load staff records.' });
    } finally {
      setIsLoadingData(false);
    }
  }, [firestore, user, toast, itemsPerPage]);

  useEffect(() => {
    if (!isAuthLoading && permissions.manage_staff) {
      fetchStaffData('initial');
    }
  }, [isAuthLoading, permissions.manage_staff, fetchStaffData]);

  const handleOpenActions = (staff: StaffMember) => {
    setSelectedStaffForActions(staff);
    setIsActionModalOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };
  
  const handleDeleteStaff = (staff: StaffMember) => {
    setSelectedStaffForActions(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveStaff = async (values: any, existingStaff?: StaffMember | null) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
        if (existingStaff) {
            const staffRef = doc(firestore, 'staff', existingStaff.id);
            const staffDataToUpdate = {
                name: values.name,
                email: values.email,
                phone: values.phone,
                role: values.role,
                status: values.status,
                permissions: {
                    pages: values.pages || [],
                },
            };
            await setDoc(staffRef, staffDataToUpdate, { merge: true });
            toast({ title: 'Success', description: 'Staff member updated successfully.' });
        } else {
            const staffQuery = query(collection(firestore, "staff"), where("email", "==", values.email));
            const existingStaffSnap = await getDocs(staffQuery);
            if (!existingStaffSnap.empty) {
                throw new Error("A staff profile with this email already exists.");
            }

            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, values.email, values.password);
            const newFirebaseUser = userCredential.user;

            const batch = writeBatch(firestore);

            const staffRef = doc(firestore, 'staff', newFirebaseUser.uid);
            const staffDataToCreate: Omit<StaffMember, 'id'> = {
                uid: newFirebaseUser.uid,
                name: values.name,
                email: values.email,
                phone: values.phone,
                role: values.role,
                status: values.status,
                permissions: {
                    pages: values.pages || [],
                },
            };
            batch.set(staffRef, staffDataToCreate);
            
            const userProfileRef = doc(firestore, 'users', newFirebaseUser.uid);
            const userProfileData = {
                uid: newFirebaseUser.uid,
                email: values.email,
                displayName: values.name,
                photoURL: '',
            };
            batch.set(userProfileRef, userProfileData);

            await batch.commit();
            toast({ title: 'Account Created', description: `Login for ${values.name} created.` });
        }
        
        fetchStaffData('initial');
        setIsFormOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!selectedStaffForActions || !firestore) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'staff', selectedStaffForActions.id));
      toast({ title: 'Success', description: 'Staff member has been deleted.' });
      fetchStaffData('initial');
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to delete staff: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

   const handlePasswordReset = async (staffMember: StaffMember) => {
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, staffMember.email);
      toast({
        title: 'Password Reset Sent',
        description: `Reset instructions sent to ${staffMember.email}.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    firstDocRef.current = null;
    lastDocRef.current = null;
  };
  
  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions.manage_staff) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
            icon={Users}
            title="Staff Management"
            description="Audit performance and manage access for your entire business team."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchStaffData('initial')} disabled={isLoadingData}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingData && "animate-spin")} />
                Sync
            </Button>
            <Button onClick={() => { setEditingStaff(null); setIsFormOpen(true); }} size="lg">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Staff
            </Button>
        </div>
      </div>
      
      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Incremental fetching active. Use pagination to browse all members.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StaffTable
            staff={staffList}
            isLoading={isLoadingData}
            onOpenActions={handleOpenActions}
            roles={roles}
          />
        </CardContent>
        <CardFooter className="py-4 border-t bg-muted/5">
            <AdvancedPagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalStaffCount / itemsPerPage) || 1}
              itemsPerPage={itemsPerPage}
              totalItems={totalStaffCount}
              onPageChange={(page) => {
                setCurrentPage(page);
                if (page > currentPage) fetchStaffData('next');
                else if (page < currentPage) fetchStaffData('prev');
              }}
              onItemsPerPageChange={handleItemsPerPageChange}
              isLoading={isLoadingData}
              itemsPerPageOptions={[5, 10, 15, 25, 50]}
            />
        </CardFooter>
      </Card>
      
      <StaffFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveStaff}
        isSubmitting={isSubmitting}
        existingStaff={editingStaff}
        roles={roles}
        allPermissions={allPermissions}
      />

    {selectedStaffForActions && (
        <ActionModal
          isOpen={isActionModalOpen}
          onOpenChange={setIsActionModalOpen}
          title={selectedStaffForActions.name}
          description={selectedStaffForActions.email}
        >
            <Button variant="outline" className="justify-start h-11" onClick={() => {handleEditStaff(selectedStaffForActions); setIsActionModalOpen(false)}}>
                <Edit className="mr-2 h-4 w-4" /> Edit Permissions
            </Button>
             <Button variant="outline" className="justify-start h-11" onClick={() => {handlePasswordReset(selectedStaffForActions); setIsActionModalOpen(false)}} disabled={isSendingReset}>
                {isSendingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Reset Password
            </Button>
            <Separator />
            <Button variant="destructive" className="justify-start h-11" onClick={() => {handleDeleteStaff(selectedStaffForActions); setIsActionModalOpen(false)}}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
            </Button>
        </ActionModal>
    )}

    <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteStaff}
        itemName={selectedStaffForActions?.name || ''}
        itemType="staff member"
        isDeleting={isSubmitting}
        dialogDescription="This will permanently delete the staff member's profile. Their login account will remain but will have no permissions in the app. This action cannot be undone."
      />

    </div>
  );
}
