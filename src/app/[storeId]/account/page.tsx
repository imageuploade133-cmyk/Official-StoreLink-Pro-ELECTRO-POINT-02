'use client';

import React, { useEffect, useMemo } from 'react';
import { useUser, useAuth, useFirestore, useDoc } from '@/firebase';
import { Loader2, ShoppingBag, UserCircle, LogOut, Wallet, Coins, CheckCircle2, ChevronLeft } from 'lucide-react';
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
import { useStoreUrl } from '@/hooks/use-store-url';

import { OrderHistoryTab } from './components/OrderHistoryTab';
import { ProfileSettingsTab } from './components/ProfileSettingsTab';

export default function AccountPage() {
  const { user, isLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
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
      router.replace(getStoreUrl('/store/login'));
    }
  }, [isAuthLoading, user, router]);

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
     if (parts.length > 1) {
        return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
     }
    return (email[0] || 'U').toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push(getStoreUrl('/store/shop'));
      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your account...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start justify-between mb-12">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
            <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-950 shadow-xl relative">
              <AvatarImage src={userProfile?.photoURL || user.photoURL || undefined} />
              <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {userProfile?.displayName || user.displayName || 'Account'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {user.email}
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                Verified Customer
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button 
            variant="ghost" 
            className="btn-back h-11"
            onClick={() => router.push(getStoreUrl('/store/shop'))}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>
          <Button 
            variant="destructive" 
            className="rounded-xl font-bold uppercase text-xs tracking-widest h-11 shadow-lg shadow-destructive/20"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500"></div>
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Wallet Balance</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(customer?.balance || 0, currencySymbol)}
                </span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">Available Credit</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-primary/10 border border-slate-800 dark:border-primary/20 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl"></div>
            
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Reward Points</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-3xl font-black text-white">
                  {customer?.points || 0}
                </span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1">Points Earned</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Membership Info</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                <span className="text-slate-500 text-sm">Customer ID</span>
                <span className="font-mono text-xs font-bold">{user.uid.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                <span className="text-slate-500 text-sm">Joined</span>
                <span className="font-bold text-sm">
                  {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Status</span>
                <span className="flex items-center text-green-500 text-xs font-black uppercase tracking-widest">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl h-14 mb-8">
              <TabsTrigger 
                value="orders" 
                className="rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Order History
              </TabsTrigger>
              <TabsTrigger 
                value="profile"
                className="rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                <UserCircle className="w-4 h-4 mr-2" />
                Profile Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <OrderHistoryTab user={user} />
            </TabsContent>

            <TabsContent value="profile" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <ProfileSettingsTab user={user} userProfile={userProfile} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
