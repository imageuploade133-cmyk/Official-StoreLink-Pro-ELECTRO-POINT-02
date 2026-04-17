
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  doc, 
  writeBatch, 
  runTransaction, 
  getDocs,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { convertToDateSafely, cn } from '@/lib/utils';

import type { RestockEntry } from '@/lib/types';

import AccessDenied from '@/components/staff-management/AccessDenied';
import { PageHeader } from '@/components/PageHeader';
import { format, startOfDay, endOfDay } from 'date-fns';
import Image from 'next/image';
import { 
  Loader2, 
  ListChecks, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal, 
  Undo2, 
  Calendar as CalendarIcon, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign,
  Search,
  Eye,
  FileText,
  Truck,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { formatCurrency } from '@/lib/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { AdminAuthDialog } from '@/components/dialogs/AdminAuthDialog';
import { RestockStats } from '@/components/inventory/RestockStats';

const ITEMS_PER_PAGE = 15;

export default function RestockHistoryPage() {
  const { user, permissions, isAdmin, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const firebaseAuth = getAuth();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [entryPendingDeletion, setEntryPendingDeletion] = useState<RestockEntry | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedEntryForActions, setSelectedEntryForActions] = useState<RestockEntry | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<RestockEntry | null>(null);

  const [restockEntries, setRestockEntries] = useState<RestockEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [todayRestockCount, setTodayRestockCount] = useState(0);
  const [totalRestockValue, setTotalRestockValue] = useState(0);

  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const currencySymbol = settings?.currency || '$';
  
  const canModify = isAdmin;

  const fetchRestockHistory = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoadingEntries(true);

    try {
      let q = query(collection(firestore, 'restockEntries'), where('store_id', '==', currentStoreId), orderBy('restockDate', 'desc'));

      if (dateRange?.from) {
        q = query(q, where('restockDate', '>=', startOfDay(dateRange.from)));
        if (dateRange.to) {
          q = query(q, where('restockDate', '<=', endOfDay(dateRange.to)));
        }
      }

      // Initial count and summary stats (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCount(countSnap.data().count);

        // Fetch today's stats separately to keep them accurate without full collection scan
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const todayQuery = query(collection(firestore, 'restockEntries'), where('store_id', '==', currentStoreId), where('restockDate', '>=', todayStart), where('restockDate', '<=', todayEnd));
        const todaySnapshot = await getDocs(todayQuery);
        setTodayRestockCount(todaySnapshot.docs.reduce((sum, d) => sum + (d.data().quantity || 0), 0));
        
        // Fetch approximate total value from latest records
        const statsQuery = query(collection(firestore, 'restockEntries'), where('store_id', '==', currentStoreId), limit(500));
        const statsSnapshot = await getDocs(statsQuery);
        setTotalRestockValue(statsSnapshot.docs.reduce((sum, d) => sum + (d.data().totalCost || 0), 0));
      }

      // Apply Pagination Cursors
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

        const entries = docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          restockDate: convertToDateSafely(d.data().restockDate),
          createdAt: convertToDateSafely(d.data().createdAt),
        } as RestockEntry));

        setRestockEntries(entries);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setRestockEntries([]);
          setIsLastPage(true);
        } else if (direction === 'next') {
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching restock history:", error);
      toast({ variant: 'destructive', title: "Sync Error", description: "Could not load restock history." });
    } finally {
      setIsLoadingEntries(false);
    }
  }, [firestore, dateRange, toast, currentStoreId]);

  useEffect(() => {
    if (firestore && !isAuthLoading && permissions?.transfer_stock && currentStoreId) {
      fetchRestockHistory('initial');
    }
  }, [firestore, isAuthLoading, permissions, dateRange, fetchRestockHistory, currentStoreId]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return restockEntries;
    const lowercasedTerm = searchTerm.toLowerCase();
    return restockEntries.filter(entry =>
      entry.productName.toLowerCase().includes(lowercasedTerm) ||
      (entry.supplierName || '').toLowerCase().includes(lowercasedTerm) ||
      (entry.userEmail || '').toLowerCase().includes(lowercasedTerm)
    );
  }, [restockEntries, searchTerm]);

  const handleInitiateDelete = (entry: RestockEntry) => {
    setEntryPendingDeletion(entry);
    setIsProcessingDelete(false);
    setIsAuthDialogOpen(true);
  };

  const handleOpenActionsModal = (entry: RestockEntry) => {
    setSelectedEntryForActions(entry);
    setIsActionModalOpen(true);
  };
  
  const handleAuthDialogClose = (open: boolean) => {
    setIsAuthDialogOpen(open);
    if (!open) {
      setEntryPendingDeletion(null);
      setIsProcessingDelete(false);
    }
  };
  
  const confirmDeleteEntry = async (password: string, emailConfirmation: string) => {
    if (!entryPendingDeletion || !user || !firebaseAuth.currentUser || !firestore || user.email !== emailConfirmation) {
        toast({ variant: 'destructive', title: 'Authorization Failed', description: 'Invalid user or confirmation email did not match.' });
        return;
    }

    setIsProcessingDelete(true);
    const credential = EmailAuthProvider.credential(user.email, password);

    try {
        await reauthenticateWithCredential(firebaseAuth.currentUser, credential);
        
        const entryRef = doc(firestore, 'restockEntries', entryPendingDeletion.id);
        const productRef = doc(firestore, 'products', entryPendingDeletion.productId);

        await runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw new Error("Product associated with this restock entry no longer exists.");
            }
            
            const newStock = (productDoc.data().stock || 0) - entryPendingDeletion.quantity;
            transaction.update(productRef, { stock: newStock });

            transaction.delete(entryRef);
        });

        toast({ title: "Success", description: "Restock entry reversed and stock updated." });
        fetchRestockHistory('initial');
        handleAuthDialogClose(false);

    } catch (error: any) {
        const errorMessage = error.code === 'auth/wrong-password' 
            ? 'The password you entered is incorrect.' 
            : error.message;
        toast({ variant: 'destructive', title: 'Reversal Failed', description: errorMessage });
    } finally {
        setIsProcessingDelete(false);
    }
  };

  if (isAuthLoading || isSettingsLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  if (!permissions?.transfer_stock) return <AccessDenied />;
  
  const handlePrevPage = () => fetchRestockHistory('prev');
  const handleNextPage = () => fetchRestockHistory('next');

  return (
    <>
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <PageHeader
                icon={ListChecks}
                title="Restock History"
                description="View all historical stock adjustments and inventory movements."
            />
            <Button variant="outline" onClick={() => fetchRestockHistory('initial')} disabled={isLoadingEntries}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingEntries && "animate-spin")} />
                Sync History
            </Button>
        </div>
        
        <RestockStats
            isLoading={isLoadingEntries}
            totalItems={totalCount}
            totalValue={totalRestockValue}
            todayItems={todayRestockCount}
            currencySymbol={currencySymbol}
        />
        
        <Card className=" border-none ring-1 ring-border overflow-hidden">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Inventory Movement Log</CardTitle>
                <CardDescription className="mt-1">
                  Incremental fetching active to save costs. Results {getDateRangeTitle(dateRange)}.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search view..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 w-full sm:w-64" />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}</>) : format(dateRange.from, "LLL dd, y")) : (<span>Pick a date range</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingEntries && restockEntries.length === 0 ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-16"><Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">No History Found</h3><p className="text-sm text-muted-foreground">No restock entries match your current filters.</p></div>
            ) : (
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Cost/Unit</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead className="w-[80px] text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredEntries.map((entry) => (
                            <TableRow key={entry.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="font-medium">{entry.productName}</TableCell>
                            <TableCell className="text-[10px] font-bold">
                                {entry.restockDate instanceof Date ? format(entry.restockDate, 'PP p') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {entry.quantity > 0 
                                ? <span className="text-green-600 flex items-center justify-end gap-1 font-black"><TrendingUp className="h-3 w-3"/>+{entry.quantity}</span> 
                                : <span className="text-red-600 flex items-center justify-end gap-1 font-black"><TrendingDown className="h-3 w-3"/>{entry.quantity}</span>
                                }
                            </TableCell>
                            <TableCell className="text-right text-xs">{formatCurrency(entry.costPricePerUnit, currencySymbol)}</TableCell>
                            <TableCell className="text-right font-black text-sm">{formatCurrency(entry.totalCost, currencySymbol)}</TableCell>
                            <TableCell className="text-[10px] uppercase font-black text-muted-foreground truncate max-w-[80px]" title={entry.userEmail}>{entry.userEmail?.split('@')[0] || 'N/A'}</TableCell>
                            <TableCell className="text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenActionsModal(entry)} disabled={!canModify}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
          </CardContent>
          <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    Page {currentPage} <span className="mx-2">|</span> {totalCount} Total Entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoadingEntries} className="font-bold">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoadingEntries} className="font-bold">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    </div>
    {selectedEntryForActions && (
        <ActionModal
            isOpen={isActionModalOpen}
            onOpenChange={setIsActionModalOpen}
            title={`Entry Details`}
            description={`${selectedEntryForActions.productName} | ${selectedEntryForActions.quantity > 0 ? '+' : ''}${selectedEntryForActions.quantity} units`}
            >
            <Button
            variant="outline"
            className="justify-start h-11"
            onClick={() => { setSelectedEntryForDetails(selectedEntryForActions); setIsDetailsDialogOpen(true); setIsActionModalOpen(false); }}
            >
            <Eye className="mr-2 h-4 w-4"/> View Full Details
            </Button>
            <Button variant="destructive" className="justify-start h-11" onClick={() => { handleInitiateDelete(selectedEntryForActions); setIsActionModalOpen(false); }} disabled={!canModify || selectedEntryForActions.quantity < 0}>
            <Undo2 className="mr-2 h-4 w-4"/> Reverse Adjustment
            </Button>
            </ActionModal>
            )}

            <RestockDetailsDialog
            isOpen={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            entry={selectedEntryForDetails}
            currencySymbol={currencySymbol}
            />

        <AdminAuthDialog
            isOpen={isAuthDialogOpen}
            onOpenChange={handleAuthDialogClose}
            userEmail={user?.email || ''}
            onConfirm={confirmDeleteEntry}
            isProcessing={isProcessingDelete}
            title="Authorize Reversal"
            description={`This will reverse the selected stock entry for "${entryPendingDeletion?.productName}". The quantity will be subtracted from the current stock. This action is permanent.`}
            confirmButtonText="Confirm & Reverse"
        />
        </>
      );
    }

    function RestockDetailsDialog({ isOpen, onOpenChange, entry, currencySymbol }: { isOpen: boolean, onOpenChange: (open: boolean) => void, entry: RestockEntry | null, currencySymbol: string }) {
        if (!entry) return null;
        
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" /> Procurement & Stock Entry Details
                        </DialogTitle>
                        <DialogDescription>
                            Full record for {entry.productName} updated on {entry.restockDate instanceof Date ? format(entry.restockDate, 'PPP') : 'N/A'}.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transaction Info</Label>
                                <div className="mt-1 p-3 rounded-xl bg-muted/30 border border-dashed space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Quantity Adjusted:</span>
                                        <span className={cn("font-black", entry.quantity > 0 ? "text-green-600" : "text-red-600")}>
                                            {entry.quantity > 0 ? '+' : ''}{entry.quantity} units
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Cost per Unit:</span>
                                        <span className="font-bold">{formatCurrency(entry.costPricePerUnit, currencySymbol)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 border-t">
                                        <span className="text-muted-foreground font-black uppercase text-[10px]">Total Investment:</span>
                                        <span className="font-black text-primary">{formatCurrency(entry.totalCost, currencySymbol)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recorder Info</Label>
                                <div className="mt-1 p-3 rounded-xl bg-muted/30 border border-dashed">
                                    <div className="text-sm font-bold truncate">{entry.userEmail}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-black mt-1">
                                        Logged: {entry.createdAt instanceof Date ? format(entry.createdAt, 'PP p') : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Supplier Information</Label>
                                <div className="mt-1 p-3 rounded-xl bg-muted/30 border border-dashed space-y-2">
                                    <div className="flex items-start gap-2">
                                        <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <div className="font-bold">{entry.supplierName || entry.supplierBusinessName || 'N/A'}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">Company / Distributor</div>
                                        </div>
                                    </div>
                                    {entry.supplierContactName && (
                                        <div className="flex items-start gap-2">
                                            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <div className="font-bold">{entry.supplierContactName}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase">Contact Person</div>
                                            </div>
                                        </div>
                                    )}
                                    {entry.supplierPhone && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <div className="font-bold">{entry.supplierPhone}</div>
                                            </div>
                                        </div>
                                    )}
                                    {entry.supplierLocation && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <div className="text-sm font-medium">{entry.supplierLocation}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {entry.notes && (
                                <div>
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes</Label>
                                    <div className="mt-1 p-3 rounded-xl bg-muted/30 border border-dashed text-sm italic">
                                        "{entry.notes}"
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {entry.receiptUrl && (
                        <div className="mt-4 pt-4 border-t">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Stock Document / Receipt</Label>
                            <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed bg-muted flex items-center justify-center group">
                                {entry.receiptUrl.match(/\.(jpeg|jpg|gif|png)$/) != null || entry.receiptUrl.includes('imgbb') ? (
                                    <Image src={entry.receiptUrl} alt="Receipt" fill className="object-contain" unoptimized />
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileText className="h-12 w-12 text-muted-foreground" />
                                        <span className="text-sm font-bold">Document (PDF/Other)</span>
                                    </div>
                                )}
                                <a 
                                    href={entry.receiptUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Button variant="secondary" className="gap-2">
                                        <ExternalLink className="h-4 w-4" /> Open Original
                                    </Button>
                                </a>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter className="mt-6 border-t pt-4">
                        <Button onClick={() => onOpenChange(false)} className="w-full">Close Details</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

function getDateRangeTitle(dateRange: DateRange | undefined) {
    if (!dateRange?.from) return "all time";
    const fromStr = format(dateRange.from, "MMM dd, yyyy");
    const toStr = dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy");
    if (fromStr === toStr) return `on ${toStr}`;
    return `from ${fromStr} to ${toStr}`;
}
