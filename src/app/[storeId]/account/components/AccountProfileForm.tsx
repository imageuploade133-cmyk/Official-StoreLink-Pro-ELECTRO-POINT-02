'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { updateProfile, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email(),
  deliveryAddress: z.string().optional(),
  alternativePhoneNumber: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileUpdateFormProps {
  user: User;
  userProfile: UserProfile | null;
}

export function AccountProfileForm({ user, userProfile }: ProfileUpdateFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      deliveryAddress: '',
      alternativePhoneNumber: '',
    },
  });

  useEffect(() => {
    form.reset({
      name: user.displayName || userProfile?.displayName || '',
      email: user.email || '',
      deliveryAddress: userProfile?.deliveryAddress || '',
      alternativePhoneNumber: userProfile?.alternativePhoneNumber || '',
    });
  }, [user, userProfile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      
      const profileUpdates: Partial<UserProfile> = {};
      let authDisplayNameUpdated = false;

      if (user.displayName !== values.name) {
        await updateProfile(user, { displayName: values.name });
        profileUpdates.displayName = values.name;
        authDisplayNameUpdated = true;
      }

      if (userProfile?.deliveryAddress !== values.deliveryAddress) {
        profileUpdates.deliveryAddress = values.deliveryAddress;
      }

      if (userProfile?.alternativePhoneNumber !== values.alternativePhoneNumber) {
        profileUpdates.alternativePhoneNumber = values.alternativePhoneNumber;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await setDoc(userProfileRef, profileUpdates, { merge: true });
        toast({ title: 'Success', description: 'Your profile has been updated.' });
      } else if (!authDisplayNameUpdated) {
        toast({ title: 'No Changes', description: 'Your profile is already up to date.' });
      }

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your display name and delivery information.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                   <FormDescription>You cannot change your email address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter your full delivery address" {...field} value={field.value ?? ''} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alternativePhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternative Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="An alternative number for delivery contact" {...field} value={field.value ?? ''} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={isSaving}>
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
