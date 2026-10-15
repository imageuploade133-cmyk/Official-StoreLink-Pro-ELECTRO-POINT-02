'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  Mail,
  Send,
  Users,
  UserCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Code,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Customer, StaffMember } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { EmptyTableState } from '@/components/ui/empty-table-state';

const EMAIL_TEMPLATES = [
  {
    id: 'promo',
    name: '🎉 Special Promotion & Discount',
    subject: 'Exclusive Offer for You at {storeName}!',
    content: `<h2>Hello {name},</h2>
<p>We're thrilled to offer you an exclusive discount on your next purchase at <strong>{storeName}</strong>!</p>
<p>Use code <strong>SPECIAL10</strong> at checkout to get 10% off today.</p>
<br/>
<p>Best regards,<br/>The {storeName} Team</p>`
  },
  {
    id: 'new_arrival',
    name: '🚀 New Product Launch',
    subject: 'Check Out What\'s New at {storeName}!',
    content: `<h2>Hi {name},</h2>
<p>Exciting news! We have just launched brand new items in our collection at <strong>{storeName}</strong>.</p>
<p>Be the first to explore our latest arrivals and upgrades.</p>
<br/>
<p>Happy Shopping!<br/>{storeName}</p>`
  },
  {
    id: 'staff_notice',
    name: '📢 Staff Internal Announcement',
    subject: 'Important Announcement for {storeName} Staff',
    content: `<h2>Dear {name},</h2>
<p>Please review the updated operational guidelines and upcoming schedule updates for <strong>{storeName}</strong>.</p>
<p>Thank you for your dedication and hard work.</p>
<br/>
<p>Management,<br/>{storeName}</p>`
  }
];

export default function EmailMarketingPage() {
  const { user, permissions, store, staffMember } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id || 'global', [staffMember, store]);

  // Recipient Queries
  const customersQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return currentStoreId === 'global'
      ? query(collection(firestore, 'customers'))
      : query(collection(firestore, 'customers'), where('store_id', '==', currentStoreId));
  }, [firestore, currentStoreId]);

  const staffQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return currentStoreId === 'global'
      ? query(collection(firestore, 'staff'))
      : query(collection(firestore, 'staff'), where('store_id', '==', currentStoreId));
  }, [firestore, currentStoreId]);

  const campaignLogsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
      collection(firestore, 'emailCampaignLogs'),
      where('storeId', '==', currentStoreId),
      limit(20)
    );
  }, [firestore, currentStoreId]);

  const { data: customersData, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const { data: staffData, isLoading: isLoadingStaff } = useCollection<StaffMember>(staffQuery);
  const { data: campaignLogs } = useCollection<any>(campaignLogsQuery);

  const [activeTab, setActiveTab] = useState<'customers' | 'staff'>('customers');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Filtered lists
  const filteredCustomers = useMemo(() => {
    if (!customersData) return [];
    return customersData.filter(c =>
      c.email && (c.name.toLowerCase().includes(searchFilter.toLowerCase()) || c.email.toLowerCase().includes(searchFilter.toLowerCase()))
    );
  }, [customersData, searchFilter]);

  const filteredStaff = useMemo(() => {
    if (!staffData) return [];
    return staffData.filter(s =>
      s.email && (s.name.toLowerCase().includes(searchFilter.toLowerCase()) || s.email.toLowerCase().includes(searchFilter.toLowerCase()))
    );
  }, [staffData, searchFilter]);

  const currentRecipientList = activeTab === 'customers' ? filteredCustomers : filteredStaff;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEmails = currentRecipientList.map(item => item.email!).filter(Boolean);
      setSelectedEmails(allEmails);
    } else {
      setSelectedEmails([]);
    }
  };

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleInsertVariable = (variable: string) => {
    setContent(prev => prev + ' ' + variable);
  };

  const handleTemplateSelect = (templateId: string) => {
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setContent(tmpl.content);
      toast({ title: 'Template Loaded', description: `Loaded "${tmpl.name}" template.` });
    }
  };

  const handleSendBroadcast = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send broadcasts.' });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide both subject and email content.' });
      return;
    }

    setIsSending(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/marketing/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          targetTab: activeTab,
          subject,
          content,
          recipientEmails: selectedEmails.length > 0 ? selectedEmails : undefined,
          storeId: currentStoreId
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast({
          title: 'Broadcast Sent Successfully',
          description: `Delivered to ${result.totalSent} recipients (${result.totalFailed} failed).`
        });
        setSubject('');
        setContent('');
        setSelectedEmails([]);
      } else {
        throw new Error(result.error || 'Failed to dispatch email campaign.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error Dispatching Campaign', description: e.message });
    } finally {
      setIsSending(false);
    }
  };

  if (!permissions.canSendMarketingWhatsapp && !permissions.manage_settings) {
    return <AccessDenied />;
  }

  const previewSubject = subject
    .replace(/\{name\}/gi, 'Jane Doe')
    .replace(/\{email\}/gi, 'jane@example.com')
    .replace(/\{storeName\}/gi, store?.name || 'Our Store');

  const previewContent = content
    .replace(/\{name\}/gi, 'Jane Doe')
    .replace(/\{email\}/gi, 'jane@example.com')
    .replace(/\{storeName\}/gi, store?.name || 'Our Store');

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Mail}
        title="Email Broadcasts & Marketing"
        description="Design and dispatch automated or manual email campaigns directly to your customers and staff members."
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Customer Base
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">{customersData?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active emailable customer profiles</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Staff Members
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">{staffData?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Internal store team members</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
              <Send className="h-4 w-4" /> Campaigns Sent
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold">{campaignLogs?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Recorded email broadcasts</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Campaign Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Target Audience Tabs */}
        <Card className="lg:col-span-5 rounded-3xl border-none shadow-lg overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-border/50 pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" /> Select Audience
            </CardTitle>
            <CardDescription>Choose recipients for your email campaign</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setSelectedEmails([]); }}>
              <TabsList className="grid grid-cols-2 rounded-2xl h-12 bg-gray-100 dark:bg-muted p-1">
                <TabsTrigger value="customers" className="rounded-xl font-bold">
                  Customers ({customersData?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="staff" className="rounded-xl font-bold">
                  Staffs ({staffData?.length || 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-11 rounded-2xl bg-gray-50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
              />
            </div>

            <div className="flex items-center justify-between px-2 pt-2 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEmails.length > 0 && selectedEmails.length === currentRecipientList.length}
                  onCheckedChange={handleSelectAll}
                />
                <span>Select All ({currentRecipientList.length})</span>
              </div>
              <span>{selectedEmails.length} selected</span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {currentRecipientList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No matching {activeTab} with email addresses found.</p>
              ) : (
                currentRecipientList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleEmail(item.email!)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      selectedEmails.includes(item.email!)
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-gray-100 dark:border-border/40 hover:bg-gray-50 dark:hover:bg-muted/30'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold leading-none">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </div>
                    <Checkbox checked={selectedEmails.includes(item.email!)} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Email Composer */}
        <Card className="lg:col-span-7 rounded-3xl border-none shadow-lg overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-500" /> Composer
                </CardTitle>
                <CardDescription>Draft and customize your broadcast message</CardDescription>
              </div>

              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-48 rounded-2xl h-10 border-gray-200">
                  <SelectValue placeholder="Pre-built Templates" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {EMAIL_TEMPLATES.map(tmpl => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold">Email Subject</label>
              <Input
                placeholder="Enter compelling email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-12 rounded-2xl bg-gray-50 dark:bg-muted/50 border-gray-100 dark:border-border/50"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Email Body (HTML / Text)</label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{name}')} className="h-7 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30">
                    + Name
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{email}')} className="h-7 text-xs rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30">
                    + Email
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleInsertVariable('{storeName}')} className="h-7 text-xs rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30">
                    + Store Name
                  </Button>
                </div>
              </div>
              <Textarea
                rows={10}
                placeholder="Write your email content here (HTML supported)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-2xl bg-gray-50 dark:bg-muted/50 border-gray-100 dark:border-border/50 font-mono text-sm"
              />
            </div>
          </CardContent>

          <CardFooter className="px-6 py-6 border-t border-gray-100 dark:border-border/50 bg-gray-50/50 dark:bg-muted/10 flex items-center justify-between">
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="rounded-2xl h-12 px-6">
                  <Eye className="h-4 w-4 mr-2" /> Live Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Email Broadcast Preview</DialogTitle>
                  <DialogDescription>Sample preview showing dynamic placeholder substitution.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Subject</p>
                    <p className="font-bold text-lg">{previewSubject || 'No Subject'}</p>
                  </div>
                  <div className="p-6 rounded-2xl border bg-white dark:bg-black overflow-auto max-h-96">
                    <div dangerouslySetInnerHTML={{ __html: previewContent || '<p>No Content</p>' }} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              onClick={handleSendBroadcast}
              loading={isSending}
              className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Send className="h-4 w-4 mr-2" /> Dispatch Campaign
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Broadcast History Section */}
      <Card className="rounded-3xl border-none shadow-lg overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-border/50">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" /> Recent Broadcast Logs
          </CardTitle>
          <CardDescription>History of dispatched email campaigns for this store</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!campaignLogs || campaignLogs.length === 0 ? (
            <div className="p-8">
              <EmptyTableState
                icon={Mail}
                title="No Campaign Logs Yet"
                description="Your dispatched email marketing campaigns will appear here once sent."
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-border/40">
              {campaignLogs.map((log: any) => (
                <div key={log.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base">{log.subject}</p>
                      <Badge variant="outline" className="capitalize text-xs font-semibold rounded-full px-3">
                        {log.targetTab}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sent by: <span className="font-semibold text-foreground">{log.sentBy}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {log.successCount} Sent
                      </p>
                      {log.failureCount > 0 && (
                        <p className="text-xs font-bold text-red-500">
                          {log.failureCount} Failed
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : 'Just now'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
