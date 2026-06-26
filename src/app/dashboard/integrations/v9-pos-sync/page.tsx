'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  Timestamp,
  doc,
  setDoc,
  onSnapshot,
  getCountFromServer
} from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { 
  History, 
  Settings,
  ShieldCheck,
  Zap,
  Globe,
  Package,
  Activity,
  Server,
  CloudZap,
  Loader2,
  RotateCcw,
  Play,
  ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function V9SyncPage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [mappingCount, setMappingCount] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    clientId: '',
    sharedSecret: ''
  });

  useEffect(() => {
    const configRef = doc(db, 'sync_settings', 'global');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(data);
        setFormData({
          clientId: data.clientId || '',
          sharedSecret: data.sharedSecret || ''
        });
      }
    });

    const getCounts = async () => {
        try {
            const coll = collection(db, 'product_sync_map');
            const snapshot = await getCountFromServer(coll);
            setMappingCount(snapshot.data().count);
        } catch (e) {
            console.error(e);
        }
    };
    getCounts();

    return () => unsubscribe();
  }, [db]);

  const eventsQuery = useMemo(() => query(
    collection(db, 'integration_events'),
    orderBy('created_at', 'desc'),
    limit(20)
  ), [db]);
  
  const eventsResult = useCollection<any>(eventsQuery);
  
  const events = useMemo(() => {
    if (!eventsResult) return [];
    if (Array.isArray(eventsResult)) return eventsResult;
    if (eventsResult && typeof eventsResult === 'object' && 'data' in eventsResult) {
        return Array.isArray(eventsResult.data) ? eventsResult.data : [];
    }
    return [];
  }, [eventsResult]);

  const stats = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    return {
        pending: safeEvents.filter(e => e?.status === 'pending').length,
        failed: safeEvents.filter(e => e?.status === 'failed').length,
        success: safeEvents.filter(e => e?.status === 'success').length,
    };
  }, [events]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'sync_settings', 'global'), {
        ...formData,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      if (formData.clientId) {
        await setDoc(doc(db, 'sync_settings', formData.clientId), {
          sharedSecret: formData.sharedSecret,
          updatedAt: Timestamp.now()
        });
      }
      
      toast({ title: "Configuration Saved", description: "V9 POS sync credentials updated." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save configuration." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/integrations/v9-pos/process-pending', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Processing Complete", description: `Processed ${result.processedCount} events.` });
      } else {
        toast({ variant: "destructive", title: "Processing Failed", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to trigger processing." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/integrations/v9-pos/retry-failed', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Retry Complete", description: `Processed ${result.processedCount} failed events.` });
      } else {
        toast({ variant: "destructive", title: "Retry Failed", description: result.message });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to trigger retry." });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">V9 POS Integration</h1>
          <p className="text-muted-foreground">Manage incoming product synchronization from V9 POS systems.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md overflow-hidden border-none">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Webhook Authorization
              </CardTitle>
              <CardDescription className="text-slate-300">
                Define the credentials that V9 POS must use to sign and send product data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="clientId" className="text-xs uppercase font-bold text-muted-foreground">V9 Client ID</Label>
                  <Input 
                    id="clientId"
                    name="clientId"
                    className="bg-muted/50 font-mono"
                    placeholder="e.g. v9_pos_main"
                    value={formData.clientId}
                    onChange={handleInputChange}
                  />
                  <p className="text-[10px] text-muted-foreground">Used as the primary identifier in request headers.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sharedSecret" className="text-xs uppercase font-bold text-muted-foreground">Shared Secret (HMAC Key)</Label>
                  <Input 
                    id="sharedSecret"
                    name="sharedSecret"
                    type="password"
                    className="bg-muted/50 font-mono"
                    placeholder="Enter Shared Secret"
                    value={formData.sharedSecret}
                    onChange={handleInputChange}
                  />
                  <p className="text-[10px] text-muted-foreground">Critical for verifying request signatures. Keep this private.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CloudZap className="h-3 w-3" />
                <span>Endpoint: <code className="bg-muted px-1 rounded">/api/integrations/v9-pos/events</code></span>
              </div>
              <Button onClick={handleSaveConfig} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                Update Credentials
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <History className="h-5 w-5" /> Inbound Event Queue
                </CardTitle>
                <CardDescription>
                  Real-time status of incoming product events from the POS.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRetryFailed} disabled={isRetrying || stats.failed === 0}>
                  {isRetrying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Retry Failures
                </Button>
                <Button variant="default" size="sm" onClick={handleProcessPending} disabled={isProcessing || stats.pending === 0}>
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Process Pending
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>V9 ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!events || events.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                        No events received yet. Webhook is active and waiting.
                      </TableCell>
                    </TableRow>
                  )}
                  {Array.isArray(events) && events.map((event: any) => (
                    <TableRow key={event.id} className="hover:bg-muted/30">
                      <TableCell className="text-[11px] font-mono whitespace-nowrap">
                        {event.created_at ? format(event.created_at.toDate(), 'HH:mm:ss') : 'Pending'}
                      </TableCell>
                      <TableCell className="text-[10px] font-bold">
                        <Badge variant="outline" className="uppercase border-slate-300">
                            {event.event_type?.split('.').pop() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">
                        {event.external_product_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          event.status === 'success' ? 'default' : 
                          event.status === 'failed' ? 'destructive' : 
                          'secondary'
                        } className={event.status === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-none' : ''}>
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.status === 'failed' ? (
                          <div className="text-[10px] text-red-500 max-w-[200px] truncate font-medium" title={event.error_message}>
                            {event.error_message}
                          </div>
                        ) : event.status === 'success' ? (
                            <div className="text-[10px] text-emerald-600 font-medium">Synced successfully</div>
                        ) : (
                            <div className="text-[10px] text-muted-foreground">Waiting in queue...</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" /> Sync Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Mapped Products</p>
                    <p className="text-2xl font-black text-white">{mappingCount ?? '...'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Queue Load</p>
                    <p className="text-2xl font-black text-amber-400">{stats.pending}</p>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Source System:</span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">V9 POS</Badge>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Conflict Res.:</span>
                  <span className="font-bold text-white">Latest Wins</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Atomicity:</span>
                  <Badge variant="outline" className="text-blue-400 border-blue-400/50 uppercase text-[9px]">Transactional</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4 bg-white/5 border-white/20 text-white hover:bg-white/10" asChild>
                <a href="/dashboard/inventory">
                  <Package className="mr-2 h-4 w-4" /> Browse Inventory
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="text-sm uppercase tracking-wider font-bold text-muted-foreground">Connection Health</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-emerald-800">WEBHOOK ACTIVE</p>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    Listening for V9 POS events.
                  </p>
                </div>
                <Server className="h-4 w-4 text-emerald-400" />
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Processing Stats</p>
                <div className="flex justify-between text-xs items-center">
                    <span>Recent Success Rate</span>
                    <span className="font-bold text-emerald-600">
                        {events?.length ? Math.round((stats.success / events.length) * 100) : 0}%
                    </span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                        style={{ width: `${events?.length ? (stats.success / events.length) * 100 : 0}%` }}
                    />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
