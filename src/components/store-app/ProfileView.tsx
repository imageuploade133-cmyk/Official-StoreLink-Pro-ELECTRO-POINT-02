'use client';

import React, { useMemo, useState } from 'react';
import { useUser, useAuth, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile, Customer } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
    UserCircle, 
    ShoppingBag, 
    Heart, 
    LogOut, 
    History,
    ShieldCheck,
    ArrowRight,
    Wallet,
    Coins,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import { useStoreUrl } from '@/hooks/use-store-url';

interface ProfileViewProps {
    onNavigate: (tab: string) => void;
}

export function ProfileView({ onNavigate }: ProfileViewProps) {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const currencySymbol = settings?.currency || '$';
    
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

    const userProfileRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Fetch customer record for bonus display - Isolated by store
    const customersQuery = useMemo(() => {
        if (!user || !firestore || !storeId) return null;
        return query(
            collection(firestore, 'customers'),
            where('uid', '==', user.uid),
            where('store_id', '==', storeId),
            limit(1)
        );
    }, [user, firestore, storeId]);
    const { data: customers } = useCollection<Customer>(customersQuery);
    const customer = customers?.[0];

    const getInitials = (email?: string | null) => {
        if (!email) return 'U';
        const parts = email.split('@')[0].replace(/[^a-zA/g, ' ').split(' ').filter(Boolean);
        return parts.length > 1 ? (parts[0][0] + (parts[1][0] || '')).toUpperCase() : email.substring(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast({ title: 'Session Ended', description: 'Your secure session has been finalized.' });
            onNavigate('home');
        } catch (error) {
            console.error("Logout error:", error);
            toast({ variant: 'destructive', title: 'Logout Failed', description: 'Internal protocol error during sign-out.' });
        }
    };

    return (
        <div className="px-6 py-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Immersive Profile Header */}
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                    <Avatar className="h-28 w-24 rounded border-4 border-primary/20 ">
                        <AvatarImage src={user?.photoURL || undefined} className="object-cover" />
                        <AvatarFallback className="font-black text-3xl bg-primary text-white rounded">{getInitials(user?.email)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-2xl  border-4 border-white dark:border-slate-900">
                        <ShieldCheck className="h-4 w-4" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">
                        {user?.displayName || userProfile?.displayName || 'Guest User'}
                    </h2>
                    <p className="text font-black text-slate-400 uppercase tracking">{user?.email || 'Unauthorized session'}</p>
                </div>
            </div>

            {user && (
                <div className="bg-primary p-8 rounded   relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                        <Coins className="h-24 w-24 -mr-6 -mt-6" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-white/70" />
                            <span className="text font-black uppercase tracking text-white/80">Available Credit</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <p className="text-4xl font-black text-white tracking-tighter">
                                {formatCurrency(customer?.creditBalance || 0, currencySymbol)}
                            </p>
                            <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 animate-pulse">
                                <CheckCircle2 className="h-3 w-3 text-green-400" />
                                <span className="text font-black uppercase text-white tracking-widest">Bonus Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {user ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { id: 'profile-settings', icon: UserCircle, label: 'Account Profile', sub: 'Identity & Security', color: 'text-blue-500' },
                            { id: 'orders', icon: ShoppingBag, label: 'Order Registry', sub: 'Active & Past Purchases', color: 'text-emerald-500' },
                            { id: 'wishlist', icon: Heart, label: 'My Favorites', sub: 'Saved Premium Items', color: 'text-rose-500' },
                            { id: 'recently-viewed', icon: History, label: 'Discovery History', sub: 'Browsing Archive', color: 'text-amber-500' }
                        ].map((item) => (
                            <button 
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 rounded border-2 border-slate-100 dark:border-slate-800 hover:border-primary/25  group active:scale transition-all duration-500 text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={cn("h-14 w-14 rounded bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform ", item.color)}>
                                        <item.icon className="h-6 w-6" strokeWidth={2.5} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-black text-sm uppercase tracking-tight">{item.label}</p>
                                        <p className="text font-bold text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-all group-hover:translate-x-1" strokeWidth={3} />
                            </button>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <Button 
                            variant="ghost" 
                            className="w-full h-16 rounded font-black uppercase text tracking text-destructive border-2 border-destructive/25 hover:border-destructive/50 hover:bg-destructive/5  transition-all duration-500 gap-3 active:scale" 
                            onClick={() => setIsLogoutDialogOpen(true)}
                        >
                            <LogOut className="h-5 w-5" /> Sign Out of App
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 text-center py-16 bg-primary/5 rounded border-2 border-dashed border-primary/10 mx-2">
                    <div className="space-y-3 px-10">
                        <p className="text-2xl font-black tracking-tighter uppercase leading-none">Unlock Your Experience</p>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">Sign in to access your curated registry, orders, and exclusive member benefits.</p>
                    </div>
                    <div className="flex flex-col gap-4 px-10">
                        <Button onClick={() => onNavigate('login')} size="lg" className="rounded-2xl h-16 font-black uppercase text-xs tracking ">
                            Enter Profile
                        </Button>
                        <Button onClick={() => onNavigate('signup')} variant="outline" className="rounded-2xl h-16 font-black uppercase text-xs tracking bg-white dark:bg-slate-900 border-2 border-primary/10">
                            Join the Collection
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                <AlertDialogContent className="rounded max-w-sm mx-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase">Confirm Logout?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to end your current discovery session? You will need to re-authenticate to view your orders.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row">
                        <AlertDialogCancel className="rounded-2xl font-bold h-12">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="rounded-2xl font-black uppercase text tracking-widest h-12 bg-destructive hover:bg-destructive/90 text-white">Sign Out</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
