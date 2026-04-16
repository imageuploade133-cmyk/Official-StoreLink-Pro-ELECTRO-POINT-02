'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MessageSquare, XCircle, Loader2, Receipt } from 'lucide-react';
import { collection, query, getDocs, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import type { WhatsappMessageLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';

const UNIT_COST_PER_MESSAGE = 3.1;

export default function WhatsappDashboard() {
  const [totalMarketingMessages, setTotalMarketingMessages] = useState(0);
  const [totalReceiptsSent, setTotalReceiptsSent] = useState(0);
  const [totalFailedMessages, setTotalFailedMessages] = useState(0);
  const [totalUnitsCharged, setTotalUnitsCharged] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const currentStoreId = React.useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  useEffect(() => {
    const fetchMessageLogs = async () => {
      if (!firestore || !currentStoreId) return;
      setIsLoading(true);
      try {
        const q = query(collection(firestore, "whatsappMessageLogs"), where("store_id", "==", currentStoreId));
        const querySnapshot = await getDocs(q);
        
        let marketingCount = 0;
        let receiptCount = 0;
        let failedCount = 0;
        let unitsAccumulated = 0;

        querySnapshot.forEach(doc => {
          const log = doc.data() as WhatsappMessageLog;
          if (log.status === 'sent') {
            if (log.eventType === 'custom_message') {
              marketingCount += 1;
            } else {
              receiptCount += 1;
            }
            unitsAccumulated += log.unitsCharged || UNIT_COST_PER_MESSAGE; 
          } else if (log.status === 'failed') {
            failedCount += 1;
          }
        });

        setTotalMarketingMessages(marketingCount);
        setTotalReceiptsSent(receiptCount);
        setTotalFailedMessages(failedCount);
        setTotalUnitsCharged(parseFloat(unitsAccumulated.toFixed(2)));
      } catch (e: any) {
        console.error("Error fetching WhatsApp message logs: ", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load WhatsApp message statistics.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessageLogs();
  }, [toast, firestore]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card className="bg-green-50 dark:bg-green-950">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Receipts Sent</CardTitle>
          <Receipt className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalReceiptsSent}</div>
          <p className="text-xs text-muted-foreground">
            Automated sale & payment receipts
          </p>
        </CardContent>
      </Card>
       <Card className="bg-blue-50 dark:bg-blue-950">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Marketing Messages</CardTitle>
          <MessageSquare className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalMarketingMessages}</div>
          <p className="text-xs text-muted-foreground">
            Manually sent marketing campaigns
          </p>
        </CardContent>
      </Card>
      <Card className="bg-purple-50 dark:bg-purple-950">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Units Charged</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUnitsCharged.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Based on {UNIT_COST_PER_MESSAGE} units per message
          </p>
        </CardContent>
      </Card>
      <Card className="bg-red-50 dark:bg-red-950">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Failed Messages</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalFailedMessages}</div>
          <p className="text-xs text-muted-foreground">
            Messages that could not be sent
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
