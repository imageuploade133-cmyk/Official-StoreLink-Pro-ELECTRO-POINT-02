'use client';

import React, { useEffect, useMemo } from 'react';
import { useUser, useAuth, useFirestore, useDoc } from '@/firebase';
import { Loader2, ShoppingBag, UserCircle, LogOut, Wallet, Coins, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import type { UserProfile, Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';

import { OrderHistoryTab } from './components/OrderHistoryTab';
import { ProfileSettingsTab } from './components/ProfileSettingsTab';

export default function AccountPage() {
  const { user, isLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const userProfileRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user, firestore]);

  const customerRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'customers', user.uid);
    }
    return null;
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const { data: customer, isLoading: isCustomerLoading } = useDoc<Customer>(customerRef);

  const isLoading = isAuthLoading || isProfileLoading || isCustomerLoading;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/store/login');
    }
  }, [isAuthLoading, user, router]);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
     if (parts.length > 1) {
        return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 1) {
      return parts[0].substring(0,2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
    });
    router.push('/store');
  };

  if (isLoading || !user) {
    return (
      <div className="bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div className="md:col-span-3 space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 space-y-6">
                <div className="bg-card p-6 rounded-3xl shadow-xl text-center border-t-4 border-primary">
                     <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary/20">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback className="text-3xl font-black">{getInitials(user?.email)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-black tracking-tight">{user.displayName || 'You'}</h2>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">{user.email}</p>
                     <Button variant="destructive" onClick={handleLogout} className="w-full mt-8 rounded-2xl h-12 font-bold uppercase text-[10px] tracking-widest">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                </div>

                {/* Account Credit Display */}
                <div className="bg-primary text-primary-foreground p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                        <Coins className="h-20 w-20 -mr-4 -mt-4" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Account Status</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Available Credit</p>
                            <p className="text-3xl font-black tracking-tighter">
                                {formatCurrency(customer?.creditBalance || 0, currencySymbol)}
                            </p>
                        </div>
                        <div className="pt-2">
                            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                                <CheckCircle2 className="h-3 w-3 text-green-400" /> 
                                Includes Welcome Bonus
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:col-span-3">
                <Tabs defaultValue="orders" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-14 rounded-2xl border">
                        <TabsTrigger value="orders" className="rounded-xl font-bold uppercase text-xs tracking-widest">
                            <ShoppingBag className="mr-2 h-4 w-4" /> Order History
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-xl font-bold uppercase text-xs tracking-widest">
                            <UserCircle className="mr-2 h-4 w-4" /> Profile Settings
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="orders" className="mt-8">
                        <OrderHistoryTab />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-8">
                        <ProfileSettingsTab user={user} userProfile={userProfile} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
      </div>
    </div>
  );
}
