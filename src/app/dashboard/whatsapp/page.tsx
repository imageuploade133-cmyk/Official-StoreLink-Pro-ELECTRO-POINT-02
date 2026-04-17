
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, addDoc, serverTimestamp, type Timestamp, where } from 'firebase/firestore'; 
import type { Customer, WhatsappPayload, WhatsappMessageLog, StaffMember } from '@/lib/types';
import { sendWhatsAppReceipt } from '@/lib/whatsapp';
import { MessageSquare, Send, Users, Loader2, AlertTriangle, RotateCcw, Search, Smile, Contact, Hand, PartyPopper } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import WhatsappDashboard from '@/components/whatsapp-marketing/whatsapp-dashboard';
import { useAuth } from '@/contexts/auth-context'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from '@/contexts/settings-context';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { Switch } from '@/components/ui/switch';
import AccessDenied from '@/components/staff-management/AccessDenied';

const MAX_MESSAGE_LENGTH = 3000; 
const UNIT_COST_PER_MESSAGE = 3.1; 

export default function BulkWhatsAppPage() {
  const { user, permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [activeTab, setActiveTab] = useState('customers');
  const [customersWithPhone, setCustomersWithPhone] = useState<Customer[]>([]);
  const [staffWithPhone, setStaffWithPhone] = useState<StaffMember[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();
  const [useCountryCode, setUseCountryCode] = useState(true);
  const [includeGreeting, setIncludeGreeting] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);
    setError(null);
    try {
      let customersQuery = query(collection(firestore, "customers"), where("store_id", "==", currentStoreId));
      const customersSnapshot = await getDocs(customersQuery);
      const customersList = customersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Customer))
        .filter(customer => customer.phone && customer.phone.trim() !== '');
      setCustomersWithPhone(customersList);

      let staffQuery = query(collection(firestore, "staff"), where("store_id", "==", currentStoreId));
      const staffSnapshot = await getDocs(staffQuery);
      const staffList = staffSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as StaffMember))
        .filter(staff => staff.phone && staff.phone.trim() !== '');
      setStaffWithPhone(staffList);

      setSelectedCustomerIds(new Set());
      setSelectedStaffIds(new Set());

    } catch (e: any) {
      console.error("Error fetching contacts: ", e);
      setError("Failed to load contact data. Please try again.");
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not fetch contact data." });
    } finally {
      setIsLoading(false);
    }
  }, [toast, firestore, currentStoreId]);

  useEffect(() => {
    if (permissions.canSendMarketingWhatsapp && currentStoreId) {
      fetchContacts();
    }
  }, [fetchContacts, permissions.canSendMarketingWhatsapp, currentStoreId]);

  const filteredCustomers = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    if (!lowercasedTerm) return customersWithPhone;
    return customersWithPhone.filter(c =>
      c.name.toLowerCase().includes(lowercasedTerm) ||
      (c.phone && c.phone.includes(lowercasedTerm)) ||
      (c.email && c.email.toLowerCase().includes(lowercasedTerm))
    );
  }, [customersWithPhone, searchTerm]);

  const filteredStaff = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    if (!lowercasedTerm) return staffWithPhone;
    return staffWithPhone.filter(s =>
      s.name.toLowerCase().includes(lowercasedTerm) ||
      (s.phone && s.phone.includes(lowercasedTerm)) ||
      (s.email && s.email.toLowerCase().includes(lowercasedTerm))
    );
  }, [staffWithPhone, searchTerm]);

  const selectedCustomers = useMemo(() => {
    return customersWithPhone.filter(c => selectedCustomerIds.has(c.id));
  }, [customersWithPhone, selectedCustomerIds]);

  const selectedStaff = useMemo(() => {
    return staffWithPhone.filter(s => selectedStaffIds.has(s.id));
  }, [staffWithPhone, selectedStaffIds]);

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    setSelectedCustomerIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(customerId);
      } else {
        newSet.delete(customerId);
      }
      return newSet;
    });
  };

  const handleSelectStaff = (staffId: string, checked: boolean) => {
    setSelectedStaffIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(staffId);
      } else {
        newSet.delete(staffId);
      }
      return newSet;
    });
  };

  const handleSelectAllCustomers = (checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
    } else {
      setSelectedCustomerIds(new Set());
    }
  };

  const handleSelectAllStaff = (checked: boolean) => {
    if (checked) {
      setSelectedStaffIds(new Set(filteredStaff.map(s => s.id)));
    } else {
      setSelectedStaffIds(new Set());
    }
  };

  const handleSendMessage = async () => {
    if (settings?.enableWhatsapp === false) {
        toast({ variant: "destructive", title: "WhatsApp Disabled", description: "WhatsApp notifications are currently disabled in system settings." });
        return;
    }

    if (!message.trim()) {
      toast({ variant: "destructive", title: "Empty Message", description: "Cannot send an empty message." });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast({ variant: "destructive", title: "Message Too Long", description: `Message exceeds the maximum length of ${MAX_MESSAGE_LENGTH} characters.` });
      return;
    }

    let allRecipients: (Customer | StaffMember)[] = [];
    if (activeTab === 'customers') {
      if (selectedCustomers.length === 0) {
        toast({ variant: "default", title: "No Recipients Selected", description: "Please select at least one customer." });
        return;
      }
      allRecipients = selectedCustomers;
    } else if (activeTab === 'staff') {
      if (selectedStaff.length === 0) {
        toast({ variant: "default", title: "No Recipients Selected", description: "Please select at least one staff member." });
        return;
      }
      allRecipients = selectedStaff;
    }
    
    const eligibleRecipients = allRecipients.filter(r => (r as Customer).allowWhatsapp !== false);
    const ineligibleCount = allRecipients.length - eligibleRecipients.length;

    if (ineligibleCount > 0) {
        toast({ title: "Some Recipients Skipped", description: `${ineligibleCount} recipient(s) have opted out of WhatsApp and were not messaged.` });
    }

    if (eligibleRecipients.length === 0) {
        toast({ variant: "destructive", title: "No Eligible Recipients", description: "All selected recipients have opted out of WhatsApp messages." });
        return;
    }

    setIsSending(true);
    const whatsappMessageLogsRef = collection(firestore, "whatsappMessageLogs");
    const currentUserId = user?.uid || 'anonymous';
    const currentUserName = user?.displayName || 'Anonymous User';

    const sendPromises = eligibleRecipients.map(async (recipient) => {
        const phoneToSend = useCountryCode
            ? formatPhoneNumberForWhatsapp(recipient.phone!, settings?.countryCode)
            : recipient.phone;
            
        if (!phoneToSend) {
          console.warn(`Skipping recipient ${recipient.name} due to invalid phone number.`);
          return;
        }

        const finalGreeting = includeGreeting && settings?.whatsappMarketingGreeting
            ? settings.whatsappMarketingGreeting
                .replace(/{customerName}/g, recipient.name)
                .replace(/{storeName}/g, settings?.storeName || 'Your Store')
            : undefined;

        const finalFooter = includeFooter && settings?.whatsappMarketingFooter
            ? settings.whatsappMarketingFooter
                .replace(/{customerName}/g, recipient.name)
                .replace(/{storeName}/g, settings?.storeName || 'Your Store')
            : undefined;
        
        const payload: WhatsappPayload = {
            eventType: 'custom_message',
            phone: phoneToSend,
            customerName: recipient.name,
            message: message,
            greeting: finalGreeting,
            footer: finalFooter,
            storeName: settings?.storeName
        };
        
        let status: 'sent' | 'failed' = 'failed';
        let errorDetails: string | null = null;
        let finalMessageForLog = message;

        if (finalGreeting) finalMessageForLog = `${finalGreeting}\n\n${finalMessageForLog}`;
        if (finalFooter) finalMessageForLog = `${finalMessageForLog}\n\n${finalFooter}`;

        try {
            await sendWhatsAppReceipt(payload);
            status = 'sent';
        } catch (error: any) {
            console.error(`Failed to send message to ${recipient.name}:`, error);
            status = 'failed';
            errorDetails = error.message || 'Unknown error';
        } finally {
            const logEntry: WhatsappMessageLog & { store_id?: string } = {
                timestamp: serverTimestamp() as Timestamp,
                eventType: payload.eventType,
                messageContent: finalMessageForLog,
                recipientPhone: recipient.phone!,
                customerName: recipient.name,
                status: status,
                unitsCharged: status === 'sent' ? UNIT_COST_PER_MESSAGE : 0, 
                errorDetails: errorDetails,
                userId: currentUserId,
                userName: currentUserName,
                store_id: currentStoreId
            };
            await addDoc(whatsappMessageLogsRef, logEntry);
        }
    });

    try {
        await Promise.all(sendPromises);
        toast({
            title: "Bulk WhatsApp Message Sending Initiated",
            description: `Messages are being processed for ${eligibleRecipients.length} recipient(s). Please check the dashboard for status updates.`,
        });
        setMessage('');
    } catch (error: any) {
        console.error("Error during bulk send operation:", error);
        toast({
            variant: "destructive",
            title: "Bulk Sending Failed",
            description: "An unexpected error occurred during the bulk message sending process.",
        });
    } finally {
        setIsSending(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    if (message.length + emojiData.emoji.length <= MAX_MESSAGE_LENGTH) {
      setMessage(prevMsg => prevMsg + emojiData.emoji);
    } else {
      toast({
        variant: "destructive",
        title: "Message Too Long",
        description: "Adding this emoji would exceed the maximum message length.",
      });
    }
    setShowEmojiPicker(false); 
  };

  const isAllCustomersSelected = filteredCustomers.length > 0 && selectedCustomerIds.size === filteredCustomers.length;
  const isAllStaffSelected = filteredStaff.length > 0 && selectedStaffIds.size === filteredStaff.length;
  const isMessageTooLong = message.length > MAX_MESSAGE_LENGTH;

  const selectedRecipientCount = activeTab === 'customers' ? selectedCustomerIds.size : selectedStaffIds.size;
  
  if (isAuthLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  if (!permissions.canSendMarketingWhatsapp) {
    return <AccessDenied />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-3xl font-semibold mb-6 flex items-center">
          <MessageSquare className="mr-3 h-8 w-8 text-green-600" /> WhatsApp Marketing
        </h1>
        <WhatsappDashboard />
        <Card className="">
          <CardHeader>
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="h-4 w-4/5 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-1/3" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2 text-destructive">Error Loading Contact Data</h2>
        <p className="text-muted-foreground mb-4 text-center">{error}</p>
        <Button onClick={fetchContacts} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-3xl font-semibold flex items-center">
        <MessageSquare className="mr-3 h-8 w-8 text-green-600" /> WhatsApp Marketing
      </h1>

      <WhatsappDashboard />

      <Card className="">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Send WhatsApp Messages</CardTitle>
          <CardDescription>
            Select recipients for your WhatsApp campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/30">
                <Switch
                    id="use-country-code-whatsapp"
                    checked={useCountryCode}
                    onCheckedChange={setUseCountryCode}
                />
                <Label htmlFor="use-country-code-whatsapp" className="text-sm font-medium">
                    Automatically format phone numbers with country code ({settings?.countryCode || 'N/A'})
                </Label>
            </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" /> Customers ({customersWithPhone.length})
              </TabsTrigger>
              <TabsTrigger value="staff">
                <Contact className="h-4 w-4 mr-2" /> Staff ({staffWithPhone.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="customers" className="mt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search customers by name, phone, or email..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {filteredCustomers.length > 0 ? (
                <>
                  <ScrollArea className="h border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w">
                            <Checkbox
                              checked={isAllCustomersSelected}
                              onCheckedChange={(checked) => handleSelectAllCustomers(checked as boolean)}
                              aria-label="Select all customers"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone Number</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id} data-state={selectedCustomerIds.has(customer.id) ? "selected" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedCustomerIds.has(customer.id)}
                                onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                                aria-label={`Select customer ${customer.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.phone}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedCustomerIds.size} customer(s) selected out of {customersWithPhone.length}.
                  </p>
                </>
              ) : (
                <Card className="bg-muted/30 border-primary/30 border-l-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-primary"/>
                      <div>
                        <p className="text-lg font-semibold text-primary">No Customers Found</p>
                        <p className="text-sm text-muted-foreground">
                          No customers match your search term, or no customers have phone numbers.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="staff" className="mt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search staff by name, phone, or email..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {filteredStaff.length > 0 ? (
                <>
                  <ScrollArea className="h border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w">
                            <Checkbox
                              checked={isAllStaffSelected}
                              onCheckedChange={(checked) => handleSelectAllStaff(checked as boolean)}
                              aria-label="Select all staff"
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStaff.map((staff) => (
                          <TableRow key={staff.id} data-state={selectedStaffIds.has(staff.id) ? "selected" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStaffIds.has(staff.id)}
                                onCheckedChange={(checked) => handleSelectStaff(staff.id, checked as boolean)}
                                aria-label={`Select staff ${staff.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{staff.name}</TableCell>
                            <TableCell>{staff.phone}</TableCell>
                            <TableCell>{staff.role}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedStaffIds.size} staff member(s) selected out of {staffWithPhone.length}.
                  </p>
                </>
              ) : (
                <Card className="bg-muted/30 border-primary/30 border-l-4">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Contact className="h-8 w-8 text-primary"/>
                      <div>
                        <p className="text-lg font-semibold text-primary">No Staff Found</p>
                        <p className="text-sm text-muted-foreground">
                          No staff members match your search term, or no staff members have phone numbers.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-4 pt-4 border-t">
              <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                          <Label htmlFor="include-greeting" className="font-semibold flex items-center gap-2"><PartyPopper className="h-4 w-4 text-blue-500" /> Include Greeting</Label>
                          <p className="text-xs text-muted-foreground pl-6">"{settings?.whatsappMarketingGreeting || 'Hi {customerName},'}"</p>
                      </div>
                      <Switch id="include-greeting" checked={includeGreeting} onCheckedChange={setIncludeGreeting} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                          <Label htmlFor="include-footer" className="font-semibold flex items-center gap-2"><Hand className="h-4 w-4 text-purple-500" /> Include Footer</Label>
                           <p className="text-xs text-muted-foreground pl-6">"{settings?.whatsappMarketingFooter || 'Reply STOP to unsubscribe.'}"</p>
                      </div>
                      <Switch id="include-footer" checked={includeFooter} onCheckedChange={setIncludeFooter} />
                  </div>
              </div>
              <div className="space-y-2 pt-2 relative">
                <Label htmlFor="whatsappMessage" className="text-base font-medium">Message Content</Label>
                <Textarea
                  id="whatsappMessage"
                  placeholder="Type your WhatsApp message here. You can use markdown for formatting, like *bold* and _italic_."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={MAX_MESSAGE_LENGTH} 
                  disabled={isSending || (activeTab === 'customers' && customersWithPhone.length === 0) || (activeTab === 'staff' && staffWithPhone.length === 0)}
                  className="text-base pr-10" 
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-12 right-2 h-8 w-8"
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  aria-label="Toggle emoji picker"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute z-10 bottom-full right-0 mb-2">
                    <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
                  </div>
                )}
                <p className={`text-sm text-right ${isMessageTooLong ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {message.length}/{MAX_MESSAGE_LENGTH} characters
                </p>
                {isMessageTooLong && (
                  <p className="text-sm text-red-500 flex items-center justify-end">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Message exceeds maximum length.
                  </p>
                )}
              </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSendMessage} 
            disabled={isSending || selectedRecipientCount === 0 || !message.trim() || isMessageTooLong}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white min-w"
          >
            {isSending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            Send to {selectedRecipientCount} Selected Recipient(s)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
