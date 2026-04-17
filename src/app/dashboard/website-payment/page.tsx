
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, BankAccount } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Landmark, Info, PlusCircle, Trash2, Edit, X, Upload } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { uploadImage } from '@/ai/flows/image-upload-flow';

const bankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required.'),
  accountNumber: z.string().min(5, 'Valid account number is required.'),
  accountName: z.string().min(2, 'Account holder name is required.'),
  logoUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

const instructionsSchema = z.object({
  bankTransferInstructions: z.string().min(10, 'Please provide clear instructions for customers.'),
});

type AccountFormValues = z.infer<typeof bankAccountSchema>;
type InstructionsFormValues = z.infer<typeof instructionsSchema>;

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const paystackSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
});

const flutterwaveSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  testEncryptionKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  liveEncryptionKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
});

type PaystackFormValues = z.infer<typeof paystackSchema>;
type FlutterwaveFormValues = z.infer<typeof flutterwaveSchema>;

export default function WebsitePaymentSettings() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember, user } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const fetchProviders = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/payment/settings?storeId=${currentStoreId || 'global'}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProviders(data);
      }
    } catch (e) {
      console.error('Failed to fetch providers', e);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (currentStoreId) {
      fetchProviders();
    }
  }, [currentStoreId]);

  const paystackProvider = providers.find(p => p.providerName === 'paystack');
  const flutterwaveProvider = providers.find(p => p.providerName === 'flutterwave');
  const manualProvider = providers.find(p => p.providerName === 'manual');

  const paystackForm = useForm<PaystackFormValues>({
    resolver: zodResolver(paystackSchema),
    defaultValues: {
      testPublicKey: paystackProvider?.config?.testPublicKey || '',
      testSecretKey: paystackProvider?.config?.testSecretKey || '',
      livePublicKey: paystackProvider?.config?.livePublicKey || '',
      liveSecretKey: paystackProvider?.config?.liveSecretKey || '',
      isActive: paystackProvider?.isActive || false,
      mode: paystackProvider?.mode || 'test',
    },
  });

  const flutterwaveForm = useForm<FlutterwaveFormValues>({
    resolver: zodResolver(flutterwaveSchema),
    defaultValues: {
      testPublicKey: flutterwaveProvider?.config?.testPublicKey || '',
      testSecretKey: flutterwaveProvider?.config?.testSecretKey || '',
      testEncryptionKey: flutterwaveProvider?.config?.testEncryptionKey || '',
      livePublicKey: flutterwaveProvider?.config?.livePublicKey || '',
      liveSecretKey: flutterwaveProvider?.config?.liveSecretKey || '',
      liveEncryptionKey: flutterwaveProvider?.config?.liveEncryptionKey || '',
      isActive: flutterwaveProvider?.isActive || false,
      mode: flutterwaveProvider?.mode || 'test',
    },
  });

  useEffect(() => {
    if (paystackProvider) {
      paystackForm.reset({
        testPublicKey: paystackProvider.config?.testPublicKey || '',
        testSecretKey: paystackProvider.config?.testSecretKey || '',
        livePublicKey: paystackProvider.config?.livePublicKey || '',
        liveSecretKey: paystackProvider.config?.liveSecretKey || '',
        isActive: paystackProvider.isActive || false,
        mode: paystackProvider.mode || 'test',
      });
    }
    if (flutterwaveProvider) {
      flutterwaveForm.reset({
        testPublicKey: flutterwaveProvider.config?.testPublicKey || '',
        testSecretKey: flutterwaveProvider.config?.testSecretKey || '',
        testEncryptionKey: flutterwaveProvider.config?.testEncryptionKey || '',
        livePublicKey: flutterwaveProvider.config?.livePublicKey || '',
        liveSecretKey: flutterwaveProvider.config?.liveSecretKey || '',
        liveEncryptionKey: flutterwaveProvider.config?.liveEncryptionKey || '',
        isActive: flutterwaveProvider.isActive || false,
        mode: flutterwaveProvider.mode || 'test',
      });
    }
  }, [paystackProvider, flutterwaveProvider, paystackForm, flutterwaveForm]);

  const saveProviderSettings = async (providerName: string, values: any) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { isActive, mode, ...config } = values;
      
      // Filter out masked keys before saving if they haven't been changed
      Object.keys(config).forEach(key => {
        if (typeof config[key] === 'string' && config[key].startsWith('********')) {
          delete config[key];
        }
      });

      const token = await user.getIdToken();
      const res = await fetch('/api/payment/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerName,
          isActive,
          mode,
          config,
          storeId: currentStoreId || 'global',
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      toast({ title: 'Success', description: `${providerName} settings saved.` });
      fetchProviders();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (providerName: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/payment/test-connection?provider=${providerName}&storeId=${currentStoreId || 'global'}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `${providerName} connection is valid.` });
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Invalid Connection', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (currentStoreId) {
            return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, currentStoreId]
  );

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const bankAccounts = settingsData?.bankAccounts || [];

  const instructionsForm = useForm<InstructionsFormValues>({
    resolver: zodResolver(instructionsSchema),
    defaultValues: {
      bankTransferInstructions: 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
    },
  });

  useEffect(() => {
    if (settingsData) {
      instructionsForm.reset({
        bankTransferInstructions: settingsData.bankTransferInstructions || 'Please transfer the exact total amount to one of the bank accounts below. Use the generated Payment Reference Code as your transaction narration so we can match your payment quickly.',
      });
    }
  }, [settingsData, instructionsForm]);

  const manualForm = useForm({
    defaultValues: {
      isActive: manualProvider?.isActive ?? true,
    }
  });

  useEffect(() => {
    if (manualProvider) {
      manualForm.reset({
        isActive: manualProvider.isActive,
      });
    }
  }, [manualProvider, manualForm]);

  const onSaveInstructions = async (data: InstructionsFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, data);
      } else {
          await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Transfer instructions updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update instructions.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const onAccountFormSubmit = async (values: AccountFormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      let updatedAccounts: BankAccount[];
      if (editingAccount) {
        updatedAccounts = bankAccounts.map((acc) =>
          acc.id === editingAccount.id ? { ...acc, ...values } : acc
        );
      } else {
        const newAccount: BankAccount = {
          ...values,
          id: Math.random().toString(36).substring(2, 9),
        };
        updatedAccounts = [...bankAccounts, newAccount];
      }

      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, { bankAccounts: updatedAccounts });
      } else {
          await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      }
      toast({
        title: 'Success',
        description: `Bank account ${editingAccount ? 'updated' : 'added'} successfully.`,
      });
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save bank account.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!firestore || !accountToDelete) return;
    setIsSaving(true);
    try {
      const updatedAccounts = bankAccounts.filter((acc) => acc.id !== accountToDelete.id);
      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, { bankAccounts: updatedAccounts });
      } else {
          await saveGlobalSettings(firestore, { bankAccounts: updatedAccounts });
      }
      toast({
        title: 'Success',
        description: 'Bank account removed.',
      });
      setAccountToDelete(null);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete bank account.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings || isLoadingProviders) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Landmark} title="Website Payment Method" description="Configure payment options for your public store." />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Landmark}
        title="Website Payment Method"
        description="Configure how your customers pay for orders on your online store."
      />

      <Tabs defaultValue="paystack" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="paystack">Paystack</TabsTrigger>
          <TabsTrigger value="flutterwave">Flutterwave</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="manual">Manual Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="paystack" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...paystackForm}>
                <form onSubmit={paystackForm.handleSubmit((values) => saveProviderSettings('paystack', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Paystack Settings</CardTitle>
                        <CardDescription>Accept payments via cards, bank transfers, and USSD.</CardDescription>
                      </div>
                      <FormField
                        control={paystackForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={paystackForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paystackForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Public Key</FormLabel>
                              <FormControl><Input placeholder="pk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paystackForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_test_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={paystackForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Public Key</FormLabel>
                              <FormControl><Input placeholder="pk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paystackForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="sk_live_..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2 pt-4">
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                          <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/payment/webhook?provider=paystack&storeId=global`} className="bg-muted" />
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/payment/webhook?provider=paystack&storeId=global`);
                            toast({ title: 'Copied', description: 'Webhook URL copied to clipboard.' });
                          }}>Copy</Button>
                        </div>
                        <p className="text-[0.8rem] text-muted-foreground">
                          Set this in your Paystack dashboard to receive payment notifications.
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Paystack Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('paystack')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Paystack
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Paystack allows you to accept payments from customers using various methods.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Supports Card, Bank, Transfer, USSD, and Mobile Money.</li>
                    <li>Highly secure and widely used in Africa.</li>
                    <li>Real-time transaction monitoring.</li>
                  </ul>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Ensure you use the correct keys for Test and Live modes.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="flutterwave" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Form {...flutterwaveForm}>
                <form onSubmit={flutterwaveForm.handleSubmit((values) => saveProviderSettings('flutterwave', values))}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Flutterwave Settings</CardTitle>
                        <CardDescription>Global payment gateway for businesses.</CardDescription>
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enabled</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={flutterwaveForm.control}
                        name="mode"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Transaction Mode</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-row space-x-4"
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="test" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Test Mode</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="live" /></FormControl>
                                  <FormLabel className="font-normal cursor-pointer">Live Mode</FormLabel>
                                </FormItem>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={flutterwaveForm.control}
                          name="testPublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Public Key</FormLabel>
                              <FormControl><Input placeholder="FLWPUBK_TEST-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flutterwaveForm.control}
                          name="testSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Test Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="FLWSECK_TEST-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="testEncryptionKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Encryption Key</FormLabel>
                            <FormControl><Input type="password" placeholder="FLWSECK_TEST_ENCRY..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={flutterwaveForm.control}
                          name="livePublicKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Public Key</FormLabel>
                              <FormControl><Input placeholder="FLWPUBK-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={flutterwaveForm.control}
                          name="liveSecretKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Live Secret Key</FormLabel>
                              <FormControl><Input type="password" placeholder="FLWSECK-..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={flutterwaveForm.control}
                        name="liveEncryptionKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Live Encryption Key</FormLabel>
                            <FormControl><Input type="password" placeholder="FLWSECK_ENCRY..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex gap-2">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Flutterwave Settings
                      </Button>
                      <Button type="button" variant="outline" onClick={() => testConnection('flutterwave')} disabled={isSaving}>
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> About Flutterwave
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>Flutterwave provides a seamless way to accept payments globally.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Accept payments in multiple currencies.</li>
                    <li>Supports cards, mobile money, and bank transfers.</li>
                    <li>Advanced fraud protection.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Settings</CardTitle>
              <CardDescription>Accept global payments via cards and digital wallets.</CardDescription>
            </CardHeader>
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <PlusCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Coming Soon</h3>
              <p className="text-muted-foreground max-w-sm">
                We are currently working on integrating Stripe. You will be able to accept international payments soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Manual Payment</CardTitle>
                    <CardDescription>Enable or disable manual bank transfers.</CardDescription>
                  </div>
                  <Switch 
                    checked={manualForm.watch('isActive')} 
                    onCheckedChange={(checked) => {
                      manualForm.setValue('isActive', checked);
                      saveProviderSettings('manual', { isActive: checked });
                    }} 
                  />
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Bank Accounts</CardTitle>
                    <CardDescription>Add the accounts where customers should send payments.</CardDescription>
                  </div>
                  <Button onClick={handleAddAccount} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Account
                  </Button>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                      <Landmark className="mx-auto h-12 w-12 mb-4 opacity-20" />
                      <p>No bank accounts added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                          <div className="flex items-center gap-4">
                            {acc.logoUrl ? (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border bg-white">
                                <Image src={acc.logoUrl} alt={acc.bankName} fill className="object-contain p-1" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                                <Landmark className="h-6 w-6" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <p className="font-bold text-lg leading-tight">{acc.bankName}</p>
                              <p className="text-sm font-medium">{acc.accountName}</p>
                              <p className="text-sm font-mono tracking-wider">{acc.accountNumber}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditAccount(acc)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setAccountToDelete(acc)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Form {...instructionsForm}>
                <form onSubmit={instructionsForm.handleSubmit(onSaveInstructions)}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Instructions</CardTitle>
                      <CardDescription>Tell customers what to do after choosing bank transfer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={instructionsForm.control}
                        name="bankTransferInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Textarea rows={4} placeholder="e.g., Please transfer the exact amount..." {...field} /></FormControl>
                            <FormDescription>These instructions are shown during checkout.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Instructions
                      </Button>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Info className="h-4 w-4" /> Professional Transfers
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
                  <p>When a customer chooses <strong>Bank Transfer</strong>:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>They see your list of accounts and pick one.</li>
                    <li>The system generates a unique <strong>5-digit tracking code</strong>.</li>
                    <li>Customers are told to use this code as their reference.</li>
                    <li>This allows you to match payments to orders instantly.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Dialog */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Update your bank account details.' : 'Provide details for a new bank account to accept manual transfers.'}
            </DialogDescription>
          </DialogHeader>
          <AccountForm onSubmit={onAccountFormSubmit} isSaving={isSaving} defaultValues={editingAccount || undefined} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog 
        isOpen={!!accountToDelete} 
        onOpenChange={() => setAccountToDelete(null)} 
        onConfirm={confirmDeleteAccount} 
        isDeleting={isSaving} 
        itemName={accountToDelete?.bankName || ''} 
        itemType="bank account" 
      />
    </div>
  );
}

function AccountForm({ onSubmit, isSaving, defaultValues }: { onSubmit: (values: AccountFormValues) => Promise<void>, isSaving: boolean, defaultValues?: AccountFormValues }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: defaultValues || { bankName: '', accountNumber: '', accountName: '', logoUrl: '' }
  });

  const logoUrl = form.watch('logoUrl');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Logo image should be smaller than 1MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('logoUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Logo Uploaded", description: "Bank logo has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload logo." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField control={form.control} name="logoUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Bank Logo (Optional)</FormLabel>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" /> : <Landmark className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex-grow space-y-2">
                <div className="flex items-center gap-2">
                  <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value || ''} disabled={isSaving || isUploading} /></FormControl>
                  <Button asChild variant="outline" size="icon" disabled={isSaving || isUploading}>
                    <label htmlFor="bank-logo-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                    </label>
                  </Button>
                  <Input id="bank-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                </div>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="bankName" render={({ field }) => (
          <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., First National Bank" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountName" render={({ field }) => (
          <FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="e.g., StoreLink Pro Ltd" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="accountNumber" render={({ field }) => (
          <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 1234567890" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <DialogFooter className="pt-4">
          <DialogClose asChild><Button variant="outline" disabled={isSaving || isUploading}>Cancel</Button></DialogClose>
          <Button type="submit" disabled={isSaving || isUploading}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Account</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
