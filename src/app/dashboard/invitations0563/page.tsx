'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Calendar,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  MoreVertical,
  Ticket,
  Users,
  Sparkles,
  AlertTriangle,
  History,
  TrendingUp,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { usePathname } from 'next/navigation';
import { format, isToday } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from '@/components/ui/form';
import AccessDenied from '@/components/staff-management/AccessDenied';

interface Invitation {
  id: string;
  codeHash: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  status: 'unused' | 'used' | 'revoked' | 'expired';
  usedBy?: string;
  usedAt?: string;
  maxUses: number;
  usedCount: number;
  plan?: 'free' | 'pro' | 'premium';
  planDurationDays?: number;
  history?: {
    action: string;
    userId: string;
    timestamp: string;
  }[];
}

export default function InvitationManagerPage() {
  const auth = useFirebaseAuth();
  const pathname = usePathname();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = user?.email === 'abdulkadir123shaba@gmail.com';

  // Automatically derive the required PIN from the URL path (e.g., '0563' from 'invitations0563')
  const requiredPin = pathname.match(/\d+$/)?.[0] || '0563';

  const InvitationSchema = z.object({
    type: z.enum(['single', 'multiple']),
    maxUses: z.number().min(1, 'At least 1 use is required.'),
    expiresAt: z.string().optional().or(z.literal('')),
    plan: z.enum(['free', 'pro', 'premium']),
    planDurationDays: z.number().min(1, 'Duration must be at least 1 day.'),
  });

  const form = useForm<z.infer<typeof InvitationSchema>>({
    resolver: zodResolver(InvitationSchema),
    defaultValues: {
      type: 'single',
      maxUses: 1,
      expiresAt: '',
      plan: 'free',
      planDurationDays: 30,
    }
  });

  const invitationType = form.watch('type');

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No ID token found");

      const response = await fetch('/api/admin/invitations', {
        headers: {
            'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch invitations:', errorText);
        if (errorText.includes('Could not load Firebase Admin credentials')) {
            toast({
                variant: "destructive",
                title: "Server Configuration Error",
                description: "Firebase Admin SDK is not properly configured on the server. Please check FIREBASE_ADMIN_SETUP.md."
            });
        }
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && isAuthorized) {
      fetchInvitations();
    }
  }, [isSuperAdmin, isAuthorized]);

  if (isAuthLoading) {
    return <div className="p-8 flex justify-center"><Spinner /></div>;
  }

  if (!isSuperAdmin) {
    return <AccessDenied />;
  }

  if (!isAuthorized) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <Card className="w-full max-w-md border-2 border-primary/20 shadow-none">
                <CardContent className="pt-10 pb-10 space-y-6 text-center">
                    <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <Lock className="size-10 text-primary" strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">Restricted Access</h2>
                        <p className="text-muted-foreground text-sm px-4">
                            Please enter your administrative passphrase to manage invitations.
                        </p>
                    </div>
                    <div className="space-y-4 px-4">
                        <Input
                            type="password"
                            placeholder="Enter administrative code"
                            className="h-14 text-center text-lg rounded-2xl bg-muted/50 focus:bg-background transition-all"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && passphrase === requiredPin) setIsAuthorized(true);
                            }}
                        />
                        <Button
                            className="w-full h-14 rounded-2xl font-bold text-lg shadow-none transition-all active:scale-95"
                            onClick={() => {
                                if (passphrase === requiredPin) {
                                    setIsAuthorized(true);
                                } else {
                                    toast({ variant: "destructive", title: "Access Denied", description: "Invalid administrative code." });
                                }
                            }}
                        >
                            Verify & Unlock <ShieldCheck className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  const handleGenerate = async (values: z.infer<typeof InvitationSchema>) => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("You must be logged in to perform this action.");
      }

      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          createdBy: user?.displayName || user?.email || 'Admin',
          maxUses: values.maxUses,
          expiresAt: values.expiresAt || null,
          plan: values.plan,
          planDurationDays: values.planDurationDays
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCode(data.code);
        setIsCreateModalOpen(false);
        setIsViewCodeModalOpen(true);
        fetchInvitations();
        form.reset();
        toast({ title: "Invitation Generated", description: "The code is ready to use." });
      } else {
        const errorData = await response.json().catch(async () => ({ error: "Unknown error" }));

        let errorMsg = errorData.error || "Server returned an error. Please try again.";
        let title = "Generation Failed";

        if (errorMsg.includes('Could not load Firebase Admin credentials')) {
            title = "Configuration Error";
            errorMsg = "Firebase Admin SDK is not configured. Check the FIREBASE_ADMIN_SETUP.md file.";
        }

        toast({
          variant: "destructive",
          title,
          description: errorMsg
        });
      }
    } catch (error: any) {
      console.error("Invitation generation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/invitations', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ id, status: 'revoked' })
      });

      if (response.ok) {
        toast({ title: "Invitation Revoked", description: "The code is no longer valid." });
        fetchInvitations();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to revoke invitation." });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Invitation code copied to clipboard." });
  };

  const getStatusBadge = (status: string, expiresAt: string | null, usedCount: number, maxUses: number) => {
    if (status === 'revoked') return (
      <Badge variant="outline" className="bg-rose-500/5 text-rose-600 border-rose-500/20 px-3 py-1 rounded-full font-bold">
        <Ban className="w-3.5 h-3.5 mr-1.5" /> Revoked
      </Badge>
    );

    if (expiresAt && new Date(expiresAt) < new Date()) return (
      <Badge variant="outline" className="bg-zinc-500/5 text-zinc-600 border-zinc-500/20 px-3 py-1 rounded-full font-bold">
        <Clock className="w-3.5 h-3.5 mr-1.5" /> Expired
      </Badge>
    );

    if (usedCount >= maxUses) return (
      <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full font-bold">
        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Used Up
      </Badge>
    );

    return (
      <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20 px-3 py-1 rounded-full font-bold">
        <Ticket className="w-3.5 h-3.5 mr-1.5" /> Active
      </Badge>
    );
  };

  const filteredInvitations = invitations.filter(inv =>
    (inv.createdBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGenerated = invitations.length;
  const totalUsed = invitations.reduce((acc, inv) => acc + (inv.usedCount || 0), 0);
  const todayUsed = invitations.reduce((acc, inv) =>
    acc + (inv.history?.filter(h => isToday(new Date(h.timestamp))).length || 0), 0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Ticket}
        title="Invitation Manager"
        description="Generate and manage secure invitation codes for new merchant registration."
      >
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90 border-b-4 border-primary-foreground/20 active:border-b-0 transition-all shadow-none">
          <Plus className="w-4 h-4 mr-2" /> Generate Invitation
        </Button>
      </PageHeader>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden border border-blue-600/20 shadow-none relative group hover:border-blue-600/40 transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-blue-600/5 to-transparent transition-transform group-hover:scale-105 duration-500" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">Total Generated</p>
                <h3 className="text-3xl font-bold tracking-tight">{totalGenerated}</h3>
              </div>
              <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                <Ticket className="size-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-blue-600/60 font-medium bg-blue-600/5 w-fit px-2 py-1 rounded-full border border-blue-600/10">
              <History className="size-3 mr-1" /> All-time records
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-emerald-600/20 shadow-none relative group hover:border-emerald-600/40 transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-emerald-600/5 to-transparent transition-transform group-hover:scale-105 duration-500" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">Total Used</p>
                <h3 className="text-3xl font-bold tracking-tight">{totalUsed}</h3>
              </div>
              <div className="size-12 rounded-2xl bg-emerald-600/10 flex items-center justify-center border border-emerald-600/20">
                <CheckCircle className="size-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-600/60 font-medium bg-emerald-600/5 w-fit px-2 py-1 rounded-full border border-emerald-600/10">
              <TrendingUp className="size-3 mr-1" /> Overall activation rate
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-orange-600/20 shadow-none relative group hover:border-orange-600/40 transition-colors duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-orange-600/5 to-transparent transition-transform group-hover:scale-105 duration-500" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-600/80 dark:text-orange-400/80 uppercase tracking-wider">Used Today</p>
                <h3 className="text-3xl font-bold tracking-tight">{todayUsed}</h3>
              </div>
              <div className="size-12 rounded-2xl bg-orange-600/10 flex items-center justify-center border border-orange-600/20">
                <Clock className="size-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-orange-600/60 font-medium bg-orange-600/5 w-fit px-2 py-1 rounded-full border border-orange-600/10">
              <Sparkles className="size-3 mr-1" /> Real-time activity
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by creator..."
            className="pl-10 h-11 rounded-xl border-2 focus-visible:ring-primary/20 transition-all bg-background shadow-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchInvitations}
          className="h-11 w-11 rounded-xl border-2 hover:bg-muted active:scale-95 transition-all p-0 shadow-none"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="shadow-none border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Created At</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Created By</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Plan / Duration</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 text-center">Usage</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Expires At</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-muted-foreground py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Spinner size="sm" />
                  </TableCell>
                </TableRow>
              ) : filteredInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No invitations found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvitations.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors border-b last:border-0 group">
                    <TableCell className="font-medium py-5 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(inv.createdAt), 'HH:mm:ss')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <UserIcon className="size-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{inv.createdBy}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {inv.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle">
                      <div className="flex flex-col">
                        <Badge variant="outline" className={cn(
                            "w-fit uppercase text-[10px] font-bold px-2 py-0",
                            inv.plan === 'premium' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            inv.plan === 'pro' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                            "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                        )}>
                            {inv.plan || 'free'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground mt-1 font-medium">{inv.planDurationDays || 30} days access</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle text-center">
                        <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-bold text-primary">{inv.usedCount} <span className="text-muted-foreground font-normal">/</span> {inv.maxUses}</span>
                            <div className="w-16 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${inv.usedCount >= inv.maxUses ? 'bg-emerald-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, (inv.usedCount / inv.maxUses) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="py-5 align-middle">
                      {inv.expiresAt ? (
                        <div className="flex items-center gap-2 text-zinc-600 font-medium text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {format(new Date(inv.expiresAt), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-zinc-400 font-normal px-2 border-transparent hover:bg-transparent">
                            <XCircle className="size-3 mr-1.5" /> No Expiry
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-5 align-middle">
                      {getStatusBadge(inv.status, inv.expiresAt, inv.usedCount, inv.maxUses)}
                    </TableCell>
                    <TableCell className="text-right py-5 align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRevoke(inv.id)} className="text-rose-500">
                            <Ban className="w-4 h-4 mr-2" /> Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[100vw] h-[100dvh] sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[90vh] p-0 flex flex-col overflow-hidden border-none sm:border left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="size-5 text-primary" />
              </div>
              Generate Invitation
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Create a secure, random invitation code for merchant signup. These codes are one-time visible and cryptographically secure.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleGenerate, (errors) => {
                    console.error("Form validation errors:", errors);
                    toast({
                      variant: "destructive",
                      title: "Validation Error",
                      description: "Please check the form for errors."
                    });
                  })}
                  id="generate-invitation-form"
                  className="space-y-6 py-2 sm:py-4"
                >
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Ticket className="size-4 text-muted-foreground" />
                        Invitation Type
                        </FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant={field.value === 'single' ? 'default' : 'outline'}
                            className={`h-24 rounded-2xl flex flex-col gap-1 items-center justify-center transition-all ${field.value === 'single' ? 'border-b-4 border-primary-foreground/20' : 'border-2'}`}
                            onClick={() => {
                            field.onChange('single');
                            form.setValue('maxUses', 1);
                            }}
                        >
                            <UserIcon className="size-5" />
                            <span className="font-bold">Single Use</span>
                            <span className="text-[10px] opacity-70">Deactivates after 1 use</span>
                        </Button>
                        <Button
                            type="button"
                            variant={field.value === 'multiple' ? 'default' : 'outline'}
                            className={`h-24 rounded-2xl flex flex-col gap-1 items-center justify-center transition-all ${field.value === 'multiple' ? 'border-b-4 border-primary-foreground/20' : 'border-2'}`}
                            onClick={() => field.onChange('multiple')}
                        >
                            <Users className="size-5" />
                            <span className="font-bold">Multiple Use</span>
                            <span className="text-[10px] opacity-70">Custom usage limit</span>
                        </Button>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                {invitationType === 'multiple' && (
                    <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <div className="flex items-center justify-between">
                            <FormLabel className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Users className="size-4 text-muted-foreground" />
                            Usage Limit
                            </FormLabel>
                            <Badge variant="outline" className="font-mono text-xs border-2">{field.value} uses</Badge>
                        </div>
                        <FormControl>
                            <Input
                            type="number"
                            min="2"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                            className="h-12 text-lg font-medium rounded-xl border-2 focus-visible:ring-primary/20 transition-all shadow-none"
                            />
                        </FormControl>
                        <FormDescription className="text-[11px] flex items-center gap-1.5 px-1 font-medium">
                            <AlertTriangle className="size-3 text-amber-500" />
                            Defines how many different merchants can sign up using this same code.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

                <div className="grid grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <ShieldCheck className="size-4 text-muted-foreground" />
                            Subscription Plan
                            </FormLabel>
                            <FormControl>
                            <select
                                {...field}
                                className="w-full h-12 px-3 rounded-xl border-2 bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            >
                                <option value="free">Free Plan</option>
                                <option value="pro">Pro Plan</option>
                                <option value="premium">Premium Plan</option>
                            </select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="planDurationDays"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Calendar className="size-4 text-muted-foreground" />
                            Duration (Days)
                            </FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                                className="h-12 text-lg font-medium rounded-xl border-2 focus-visible:ring-primary/20 transition-all shadow-none"
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Calendar className="size-4 text-muted-foreground" />
                        Expiration Date (Optional)
                        </FormLabel>
                        <FormControl>
                        <Input
                            type="date"
                            {...field}
                            className="h-12 text-lg font-medium rounded-xl border-2 focus-visible:ring-primary/20 transition-all shadow-none"
                        />
                        </FormControl>
                        <FormDescription className="text-[11px] flex items-center gap-1.5 px-1 font-medium">
                        <Clock className="size-3 text-blue-500" />
                        Leave empty for a code that never expires.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </form>
            </Form>
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t mt-auto flex flex-col gap-2">
            <Button
                type="submit"
                form="generate-invitation-form"
                disabled={isGenerating}
                className="w-full sm:w-auto h-12 rounded-xl px-8 font-bold shadow-none border-b-4 border-primary-foreground/20 active:border-b-0 transition-all"
            >
                {isGenerating ? (
                  <>Processing... <RefreshCw className="ml-2 size-4 animate-spin" /></>
                ) : (
                  <>Generate Invitation Code <Sparkles className="ml-2 size-4" /></>
                )}
            </Button>
            <Button
                type="button"
                variant="outline"
                disabled={isGenerating}
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full sm:w-auto rounded-xl h-12 font-bold border-2 shadow-none"
            >
                Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Code Modal (Show Only Once) */}
      <Dialog open={isViewCodeModalOpen} onOpenChange={setIsViewCodeModalOpen}>
        <DialogContent className="w-[100vw] h-[100dvh] sm:w-full sm:max-w-lg sm:h-auto sm:max-h-[90vh] p-0 flex flex-col overflow-hidden border-none sm:border left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]">
          <DialogHeader className="p-4 sm:p-6 border-b shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="size-6 text-emerald-500" />
              Invitation Ready
            </DialogTitle>
            <div className="mt-4 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold uppercase tracking-tight">Security Warning</p>
                    <p className="opacity-90 font-medium">This code is encrypted and will <b>only be shown once</b>. If you close this window without copying, you'll need to generate a new one.</p>
                </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex flex-col items-center justify-center space-y-6 bg-zinc-950 dark:bg-zinc-950 p-10 rounded-2xl border border-white/10 shadow-none">
                    <code className="text-3xl sm:text-4xl font-mono tracking-[0.2em] text-emerald-400 font-bold break-all text-center">
                        {generatedCode}
                    </code>
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => copyToClipboard(generatedCode)}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/10 h-12 px-8 rounded-xl font-bold"
                    >
                        <Copy className="mr-2 h-5 w-5" /> Copy to Clipboard
                    </Button>
                </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t mt-auto">
            <Button
                className="w-full h-14 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-none border-b-4 border-emerald-900/40 active:border-b-0 transition-all active:scale-[0.98] text-lg"
                onClick={() => setIsViewCodeModalOpen(false)}
            >
                I've Saved the Code <CheckCircle className="ml-2 size-5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
