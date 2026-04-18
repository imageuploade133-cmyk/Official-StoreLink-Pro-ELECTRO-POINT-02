
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Landmark, Info, PlusCircle, Trash2, Edit, Upload, Coins, AlertTriangle, CreditCard, Globe, Wallet, Smartphone, Zap, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  visibilityLocations: z.array(z.string()).default([]),
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
  visibilityLocations: z.array(z.string()).default([]),
});

const stripeSchema = z.object({
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  visibilityLocations: z.array(z.string()).default([]),
});

const opaySchema = z.object({
  merchantId: z.string().optional(),
  testPublicKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  livePublicKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  visibilityLocations: z.array(z.string()).default([]),
});

const palmpaySchema = z.object({
  merchantId: z.string().optional(),
  testAppId: z.string().optional(),
  testSecretKey: z.string().optional(),
  liveAppId: z.string().optional(),
  liveSecretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  visibilityLocations: z.array(z.string()).default([]),
});

const paypalSchema = z.object({
  clientId: z.string().optional(),
  secretKey: z.string().optional(),
  liveClientId: z.string().optional(),
  liveSecretKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  visibilityLocations: z.array(z.string()).default([]),
});

const payOnDeliverySchema = z.object({
  instructions: z.string().optional(),
  isActive: z.boolean().default(false),
  visibilityLocations: z.array(z.string()).default([]),
});

const fastCheckoutSchema = z.object({
  enableApplePay: z.boolean().default(false),
  enableGooglePay: z.boolean().default(false),
  enableExpress: z.boolean().default(false),
  enableQuickPayButtons: z.boolean().default(false),
  isActive: z.boolean().default(false),
  visibilityLocations: z.array(z.string()).default([]),
});

const nowpaymentsSchema = z.object({
  apiKey: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  acceptedCoins: z.array(z.string()).default(['btc', 'usdt', 'eth']),
  visibilityLocations: z.array(z.string()).default([]),
});

const monnifySchema = z.object({
  testApiKey: z.string().optional(),
  testSecretKey: z.string().optional(),
  testContractCode: z.string().optional(),
  liveApiKey: z.string().optional(),
  liveSecretKey: z.string().optional(),
  liveContractCode: z.string().optional(),
  isActive: z.boolean().default(false),
  mode: z.enum(['test', 'live']).default('test'),
  visibilityLocations: z.array(z.string()).default([]),
});

const manualSchema = z.object({
  isActive: z.boolean().default(false),
  visibilityLocations: z.array(z.string()).default([]),
});

type PaystackFormValues = z.infer<typeof paystackSchema>;
type FlutterwaveFormValues = z.infer<typeof flutterwaveSchema>;
type StripeFormValues = z.infer<typeof stripeSchema>;
type OpayFormValues = z.infer<typeof opaySchema>;
type PalmPayFormValues = z.infer<typeof palmpaySchema>;
type PayPalFormValues = z.infer<typeof paypalSchema>;
type PayOnDeliveryFormValues = z.infer<typeof payOnDeliverySchema>;
type FastCheckoutFormValues = z.infer<typeof fastCheckoutSchema>;
type NowPaymentsFormValues = z.infer<typeof nowpaymentsSchema>;
type MonnifyFormValues = z.infer<typeof monnifySchema>;
type ManualFormValues = z.infer<typeof manualSchema>;

const LocationVisibility = ({ control, locations, name }: { control: any, locations: {id: string, name: string}[], name: string }) => {
  if (!locations || locations.length === 0) return null;
  
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-3 pt-4 border-t">
          <div>
            <FormLabel className="text-base">Location Visibility</FormLabel>
            <FormDescription>
              Select which delivery locations this payment method should be visible for. 
              If none selected, it will be visible for all locations.
            </FormDescription>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                <Checkbox 
                  id={`${name}-${loc.id}`} 
                  checked={field.value?.includes(loc.id)}
                  onCheckedChange={(checked) => {
                    const current = field.value || [];
                    if (checked) {
                      field.onChange([...current, loc.id]);
                    } else {
                      field.onChange(current.filter((id: string) => id !== loc.id));
                    }
                  }}
                />
                <Label htmlFor={`${name}-${loc.id}`} className="text-sm font-medium cursor-pointer flex-1">{loc.name}</Label>
              </div>
            ))}
          </div>
        </FormItem>
      )}
    />
  );
};
