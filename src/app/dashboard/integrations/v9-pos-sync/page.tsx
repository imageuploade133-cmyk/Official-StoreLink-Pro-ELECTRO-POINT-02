'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { getStoreUrl } from '@/lib/domain';
import { 
  History, 
  Settings,
  ShieldCheck,
  Zap,
  ArrowRightLeft,
  Package,
  Activity,
  Server,
  Loader2,
  RotateCcw,
  Play,
  Eye,
  EyeOff,
  Copy,
  Check,
  WandSparkles,
  AlertTriangle,
  Link2
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
import { PageHeader } from '@/components/PageHeader';
import { format } from 'date-fns';

export default function V9SyncPage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [mappingCount, setMappingCount] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsError, setEventsError] = useState<any>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  
  const [formData, setFormData] = useState({
    clientId: '',
    sharedSecret: ''
  });

  const { user, store } = useAuth();
  
  const storeUrl = useMemo(() => {
    if (store) {
      return getStoreUrl(
        store.id, 
        store.plan || 'free', 
        store.customDomain, 
        store.subdomain, 
        store.primaryDomainType, 
        store.slug
      );
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, [store]);
  
  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/integrations/v9-pos/dashboard-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.error) {
          throw new Error(data.error);
      }
      
      if (data.config) {
        setConfig(data.config);
        setFormData({
          clientId: data.config.clientId || '',
          sharedSecret: data.config.sharedSecret || ''
        });
      }
      setMappingCount(data.mappingCount);
      setEvents(data.events || []);
      setEventsError(null);
    } catch (e: any) {
      console.error('Failed to load sync dashboard data:', e);
      setEventsError(e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Poll every 15 seconds to keep events fresh
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const stats = useMemo(() => {
    const safeEvents = events || [];
    return {
        pending: safeEvents.filter(e => e.status === 'pending').length,
        failed: safeEvents.filter(e => e.status === 'failed').length,
        success: safeEvents.filter(e => e.status === 'success').length,
    };
  }, [events]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/integrations/v9-pos/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        toast({ title: "Configuration Saved", description: "V9 POS sync credentials updated." });
        loadDashboardData();
      } else {
        throw new Error(result.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error('Save config error:', error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save configuration. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/integrations/v9-pos/process-pending', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Processing Complete", description: `Processed ${result.processedCount} events.` });
        loadDashboardData();
      } else {
        toast({ variant: "destructive", title: "Processing Failed", description: result.message || result.error });
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
      const token = await user?.getIdToken();
      const response = await fetch('/api/integrations/v9-pos/retry-failed', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Retry Complete", description: `Processed ${result.processedCount} failed events.` });
        loadDashboardData();
      } else {
        toast({ variant: "destructive", title: "Retry Failed", description: result.message || result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to trigger retry." });
    } finally {
      setIsRetrying(false);
    }
  };

  const generateSecureToken = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (v) => chars[v % chars.length]).join('');
  };

  const handleGenerateCredentials = () => {
    setIsGenerating(true);
    try {
      const timestamp = Date.now().toString(36);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newClientId = `v9_pos_${timestamp}${randomSuffix}`;
      const newSecret = generateSecureToken(48);

      setFormData({
        clientId: newClientId,
        sharedSecret: newSecret
      });
      setShowSecret(true);
      toast({ title: "Credentials Generated", description: "New Client ID and Shared Secret have been generated. Save them now." });
    } catch (error) {
      toast({ variant: "destructive", title: "Generation Failed", description: "Failed to generate credentials." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(formData.sharedSecret);
      setCopied(true);
      toast({ title: "Copied", description: "Shared Secret copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Copy Failed", description: "Unable to copy to clipboard." });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        icon={ArrowRightLeft}
        title="V9 POS Integration" 
        description="Manage incoming product synchronization from V9 POS systems."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-none overflow-hidden">
            <CardHeader className="bg-slate-900 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-400" /> Connection Settings
              </CardTitle>
              <CardDescription className="text-slate-300">
                Configure the secure bridge between V9 POS and StoreLink Pro.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">StoreLink Base URL</Label>
                  <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md group">
                    <code className="text-sm font-mono flex-1 break-all">{storeUrl || 'https://app.storelink.pro'}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(storeUrl || 'https://app.storelink.pro');
                        toast({ title: "Copied", description: "Base URL copied to clipboard." });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Store ID</Label>
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md group">
                      <code className="text-sm font-mono flex-1">{store?.id || '...'}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          if (store?.id) {
                            navigator.clipboard.writeText(store.id);
                            toast({ title: "Copied", description: "Store ID copied to clipboard." });
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Client ID / Integration Key</Label>
                    <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md group">
                      <code className="text-sm font-mono flex-1 truncate">{formData.clientId || user?.email || '...'}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const val = formData.clientId || user?.email;
                          if (val) {
                            navigator.clipboard.writeText(val);
                            toast({ title: "Copied", description: "Integration key copied to clipboard." });
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Shared Secret (HMAC Key)</Label>
                  <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md group">
                    <code className="text-sm font-mono flex-1">
                      {showSecret ? (formData.sharedSecret || '...') : '••••••••••••••••••••••••'}
                    </code>
                    <div className="flex items-center">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleCopySecret}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md overflow-hidden border-none">
            <CardHeader className="bg-slate-900 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> Webhook Authorization
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Define the credentials that V9 POS must use to sign and send product data.
                  </CardDescription>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleGenerateCredentials}
                  disabled={isGenerating}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <WandSparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Credentials
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="clientId" className="text-xs uppercase font-bold text-muted-foreground">V9 Client ID</Label>
                  <div className="relative">
                    <Input 
                      id="clientId"
                      name="clientId"
                      className="bg-muted/50 font-mono pr-10"
                      placeholder="e.g. v9_pos_main"
                      value={formData.clientId}
                      onChange={handleInputChange}
                    />
                    {formData.clientId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.clientId);
                          toast({ title: "Copied", description: "Client ID copied to clipboard." });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Copy Client ID</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Used as the primary identifier in request headers.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sharedSecret" className="text-xs uppercase font-bold text-muted-foreground">Shared Secret (HMAC Key)</Label>
                  <div className="relative">
                    <Input 
                      id="sharedSecret"
                      name="sharedSecret"
                      type={showSecret ? 'text' : 'password'}
                      className="bg-muted/50 font-mono pr-20"
                      placeholder="Enter Shared Secret"
                      value={formData.sharedSecret}
                      onChange={handleInputChange}
                    />
                    {formData.sharedSecret && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={handleCopySecret}
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="sr-only">{copied ? 'Copied' : 'Copy Shared Secret'}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span className="sr-only">{showSecret ? 'Hide Shared Secret' : 'Show Shared Secret'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Critical for verifying request signatures. Keep this private.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
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
                  {isLoadingEvents && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading events...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {eventsError && !isLoadingEvents && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <AlertTriangle className="h-6 w-6 text-amber-500" />
                          <p className="text-sm font-medium">Unable to load events</p>
                          <p className="text-xs text-muted-foreground/70">
                            {eventsError.code === 'failed-precondition' 
                              ? 'The events collection requires a composite index. Please create it in Firebase Console.' 
                              : eventsError.code === 'permission-denied'
                                ? 'You do not have permission to access the events collection.'
                                : 'An unexpected error occurred. Please try refreshing the page.'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingEvents && !eventsError && (!events || events.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                        No events received yet. Webhook is active and waiting.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingEvents && !eventsError && Array.isArray(events) && events.map((event: any) => (
                    <TableRow key={event.id} className="hover:bg-muted/30">
                      <TableCell className="text-[11px] font-mono whitespace-nowrap">
                        {event.created_at ? (
                          typeof event.created_at === 'string' 
                            ? format(new Date(event.created_at), 'HH:mm:ss')
                            : typeof event.created_at.toDate === 'function'
                              ? format(event.created_at.toDate(), 'HH:mm:ss')
                              : 'Invalid Date'
                        ) : 'Pending'}
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
                <ArrowRightLeft className="h-24 w-24" />
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
