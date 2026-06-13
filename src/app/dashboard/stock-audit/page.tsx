
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  where,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { 
  ClipboardList, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Calendar as CalendarIcon,
  ShoppingCart,
  Truck,
  Undo2,
  Settings2,
  Filter,
  UserCircle,
  Trash2,
  X,
  Scan
} from 'lucide-react';
import { BarcodeScannerField } from '@/components/inventory/BarcodeScannerField';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { cn, convertToDateSafely } from '@/lib/utils';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { StockAuditEntry } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';

const ITEMS_PER_PAGE = 20;

export default function StockAuditPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { settings } = useSettings();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination State
  const [auditLogs, setAuditLogs] = useState<StockAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalRegistryCount, setTotalRegistryCount] = useState(0);

  // Cursors
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { playSuccessSound, vibrate } = useBarcodeScanner({
    onScan: (barcode) => {
        setSearchTerm(barcode);
        fetchAuditLogs('initial'); // This might need adjustment if it doesn't filter by barcode yet
    },
    enabled: !isScannerOpen
  });

  const fetchAuditLogs = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      let q = query(collection(firestore, 'stockAudit'), where('store_id', '==', currentStoreId), orderBy('timestamp', 'desc'));

      // If searchTerm looks like a barcode/reference, we might want to filter by it in Firestore
      // but the current implementation filters in memory (filteredLogs).
      // For barcodes, it's better to search in Firestore if possible.

      if (typeFilter !== 'all') {
        q = query(q, where('type', '==', typeFilter));
      }

      if (dateRange?.from) {
        q = query(q, where('timestamp', '>=', startOfDay(dateRange.from)));
        if (dateRange.to) {
          q = query(q, where('timestamp', '<=', endOfDay(dateRange.to)));
        }
      }

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalRegistryCount(countSnap.data().count);
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

        const logs = docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            timestamp: convertToDateSafely(d.data().timestamp)
        } as unknown as StockAuditEntry));

        setAuditLogs(logs);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setAuditLogs([]);
          setIsLastPage(true);
        }
      }
    } catch (error) {
      console.error("Audit log fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, typeFilter, dateRange, currentStoreId]);

  useEffect(() => {
    if (!isAuthLoading && permissions.view_stock_audit && currentStoreId) {
      fetchAuditLogs('initial');
    }
  }, [isAuthLoading, permissions.view_stock_audit, typeFilter, dateRange, fetchAuditLogs, currentStoreId]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return auditLogs;
    const term = searchTerm.toLowerCase().trim();
    return auditLogs.filter(log => 
      log.productName.toLowerCase().includes(term) || 
      log.staffName.toLowerCase().includes(term) ||
      log.referenceId.toLowerCase().includes(term)
    );
  }, [auditLogs, searchTerm]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SALE': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 h-5 font-black uppercase text-[9px]"><ShoppingCart className="h-2.5 w-2.5" /> Sale</Badge>;
      case 'RESTOCK': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5 h-5 font-black uppercase text-[9px]"><Truck className="h-2.5 w-2.5" /> Restock</Badge>;
      case 'RETURN': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1.5 h-5 font-black uppercase text-[9px]"><Undo2 className="h-2.5 w-2.5" /> Return</Badge>;
      case 'ADJUSTMENT': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1.5 h-5 font-black uppercase text-[9px]"><Settings2 className="h-2.5 w-2.5" /> Adjust</Badge>;
      case 'DELETE': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5 h-5 font-black uppercase text-[9px]"><Trash2 className="h-2.5 w-2.5" /> Deletion</Badge>;
      default: return <Badge variant="secondary" className="h-5 text-[9px] font-black uppercase">{type}</Badge>;
    }
  };

  const handlePrevPage = () => fetchAuditLogs('prev');
  const handleNextPage = () => fetchAuditLogs('next');

  if (isAuthLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions.view_stock_audit) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={ClipboardList} 
          title="Stock Audit Protocol" 
          description="A chronological ledger of every inventory change, including before/after snapshots."
        />
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchAuditLogs('initial')} disabled={isLoading}>
                <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Sync Ledger
            </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                Registry Depth <Info className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{totalRegistryCount.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Total Events Cataloged</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50/50 border-green-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center justify-between">
                Recent Batch Restocks <ArrowUpRight className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">
                {auditLogs.filter(l => l.change > 0).reduce((acc, l) => acc + l.change, 0)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Units added in current view</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 border-rose-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center justify-between">
                Recent Batch Outflow <ArrowDownLeft className="h-3.5 w-3.5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-700">
                {Math.abs(auditLogs.filter(l => l.change < 0).reduce((acc, l) => acc + l.change, 0))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Units depleted in current view</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <CardTitle>Audit Ledger</CardTitle>
                <CardDescription>Real-time inventory telemetry with personnel mapping.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <BarcodeScannerField 
                    onScan={(barcode) => setSearchTerm(barcode)}
                    placeholder="Search product, staff or barcode..."
                    className="flex-grow lg:w-72"
                />
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-dashed"
                    onClick={() => setIsScannerOpen(true)}
                >
                    <Scan className="h-4 w-4" />
                </Button>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-10">
                        <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="SALE">Sales</SelectItem>
                        <SelectItem value="RESTOCK">Restocks</SelectItem>
                        <SelectItem value="RETURN">Returns</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                        <SelectItem value="DELETE">Deletions</SelectItem>
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10 gap-2 font-bold px-4">
                            <CalendarIcon className="h-4 w-4" />
                            {dateRange?.from ? format(dateRange.from, 'MMM d') : 'Period'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
                    </PopoverContent>
                </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px] md:min-w-full">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-transparent">
                  <TableHead className="pl-6 text-left">Timestamp</TableHead>
                  <TableHead className="text-left">Product Identity</TableHead>
                  <TableHead className="text-left">Audit Event</TableHead>
                  <TableHead className="text-left">Previous</TableHead>
                  <TableHead className="text-left">Delta</TableHead>
                  <TableHead className="text-left">Resulting</TableHead>
                  <TableHead className="text-left pr-6">Personnel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && auditLogs.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground italic">
                      No audit entries found matching the current criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const time = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any)?.toDate?.();
                    const isIncrease = log.change > 0;
                    
                    return (
                      <TableRow key={log.id} className="group transition-colors hover:bg-muted/30 border-b last:border-0">
                        <TableCell className="pl-6 py-4">
                          <div className="text-xs font-bold text-gray-900">
                            {time ? format(time, 'EEEE - dd- yyyy') : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {time ? `time ${format(time, 'hh:mm a')}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-sm leading-tight text-gray-900">{log.productName}</div>
                          {log.selectedOptions && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(log.selectedOptions).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-[8px] px-1 py-0 h-3.5 bg-muted/50 border-muted-foreground/20">
                                        {value}
                                    </Badge>
                                ))}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-muted-foreground uppercase mt-1">Ref: {log.referenceId?.substring(0, 12)}...</div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(log.type)}
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{log.beforeStock}</span>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className={cn(
                            "flex items-center justify-start gap-1 font-black text-sm",
                            isIncrease ? "text-green-600" : "text-rose-600"
                          )}>
                            {isIncrease ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {isIncrease ? '+' : ''}{log.change}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="text-sm font-black text-primary">{log.afterStock}</span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <UserCircle className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{log.staffName}</p>
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Verified Agent</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Total Registry: {totalRegistryCount}
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 1 || isLoading}
                    className="h-10 font-bold"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleNextPage} 
                    disabled={isLastPage || isLoading}
                    className="h-10 font-bold"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </CardFooter>
      </Card>

      <BarcodeScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(barcode) => setSearchTerm(barcode)}
      />
    </div>
  );
}
