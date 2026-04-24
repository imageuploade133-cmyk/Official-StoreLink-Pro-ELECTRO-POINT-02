'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
  getDocs,
  startAfter
} from 'firebase/firestore';
import type { WhatsappMessageLog } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  History, 
  Search, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, convertToDateSafely } from '@/lib/utils';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 20;

export default function WhatsAppLogsPage() {
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [logs, setLogs] = useState<WhatsappMessageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLogs = async (direction: 'initial' | 'next' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      const constraints: any[] = [
        where('store_id', '==', currentStoreId),
        orderBy('timestamp', 'desc'),
        limit(ITEMS_PER_PAGE)
      ];

      if (direction === 'next' && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(firestore, 'whatsappMessageLogs'), ...constraints);
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        setLastDoc(docs[docs.length - 1]);
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const logsData = docs.map(d => ({
          id: d.id,
          ...d.data()
        } as WhatsappMessageLog));

        if (direction === 'initial') {
          setLogs(logsData);
          setCurrentPage(1);
        } else {
          setLogs(prev => [...prev, ...logsData]);
          setCurrentPage(p => p + 1);
        }
      } else {
        if (direction === 'initial') setLogs([]);
        setIsLastPage(true);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && permissions.manage_settings && currentStoreId) {
      fetchLogs('initial');
    }
  }, [isAuthLoading, permissions.manage_settings, currentStoreId]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return logs;
    return logs.filter(log => 
      log.recipientPhone.toLowerCase().includes(term) || 
      log.messageContent.toLowerCase().includes(term) ||
      (log.customerName && log.customerName.toLowerCase().includes(term))
    );
  }, [logs, searchTerm]);

  if (isAuthLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!permissions.manage_settings) return <AccessDenied />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          icon={History}
          title="WhatsApp Logs"
          description="Track all WhatsApp notifications sent from your store."
        />
        <Button variant="outline" onClick={() => fetchLogs('initial')} disabled={isLoading}>
          <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh Logs
        </Button>
      </div>

      <Card className="shadow-lg border-none rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#25D366]" /> Transmission Registry
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search phone or message..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-10 rounded-xl" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="pl-6">Date & Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead className="max-w-[300px]">Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && logs.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5} className="py-4"><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="h-12 w-12 opacity-10" />
                      <p className="font-bold">No logs found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, idx) => {
                  const timestamp = convertToDateSafely(log.timestamp);
                  return (
                    <TableRow key={log.id || idx} className="hover:bg-gray-50/50">
                      <TableCell className="pl-6 text-xs">
                        <div className="font-medium">{timestamp ? format(timestamp, 'PP') : 'N/A'}</div>
                        <div className="text-muted-foreground">{timestamp ? format(timestamp, 'p') : ''}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-sm">{log.recipientPhone}</div>
                        {log.customerName && <div className="text-[10px] text-muted-foreground">{log.customerName}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {log.eventType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs line-clamp-2 text-muted-foreground">{log.messageContent}</p>
                      </TableCell>
                      <TableCell>
                        {log.status === 'sent' ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </Badge>
                        ) : log.status === 'failed' ? (
                          <Badge variant="destructive" className="gap-1 rounded-full">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 rounded-full">
                            <Clock className="h-3 w-3" /> {log.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="py-4 border-t flex justify-center bg-gray-50/30">
          {!isLastPage && (
            <Button variant="outline" onClick={() => fetchLogs('next')} disabled={isLoading} className="rounded-xl px-8 font-bold">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}
              Load More Logs
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
