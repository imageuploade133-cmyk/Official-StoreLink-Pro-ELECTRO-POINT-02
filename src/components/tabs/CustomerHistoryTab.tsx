'use client';

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Info } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { CustomerHistory } from '@/lib/types';
import { format } from 'date-fns';
import { convertToDateSafely } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const getActionBadgeVariant = (action: CustomerHistory['action']) => {
    switch (action) {
        case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
        case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
        case 'STATUS_UPDATE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'PAYMENT': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'SALE': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

export default function CustomerHistoryTab() {
    const firestore = useFirestore();

    const historyQuery = useMemo(() => {
        if (!firestore) return null;
        
        return query(collection(firestore, 'customerHistory'), orderBy('timestamp', 'desc'));
    }, [firestore]);

    const { data: rawHistory, isLoading } = useCollection<CustomerHistory>(historyQuery);

    const history = useMemo(() => {
        if (!rawHistory) return null;
        // We sort client-side to avoid needing a composite index in Firestore.
        // This is more robust and handles all cases.
        return [...rawHistory].sort((a, b) => {
            const dateA = convertToDateSafely(a.timestamp)?.getTime() || 0;
            const dateB = convertToDateSafely(b.timestamp)?.getTime() || 0;
            return dateB - dateA;
        });
    }, [rawHistory]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Customer Activity Log
                </CardTitle>
                <CardDescription>
                    A detailed log of all customer-related activities.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] border rounded-md">
                    {isLoading && !history ? (
                        <div className="p-4 space-y-3">
                             {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : history && history.length > 0 ? (
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/95 z-10">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Performed By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map(entry => {
                                    const entryDate = convertToDateSafely(entry.timestamp);
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {entryDate ? format(entryDate, 'EEEE - MMM- dd- yyyy') : 'Invalid Date'}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">{entry.customerName}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getActionBadgeVariant(entry.action)}>
                                                    {entry.action.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{entry.details}</TableCell>
                                            <TableCell className="text-xs">{entry.userName}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-10 text-muted-foreground text-center">
                            <History className="h-16 w-16 mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold text-foreground">No Customer History</h3>
                            <p>There are no recorded activities for customers yet.</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
