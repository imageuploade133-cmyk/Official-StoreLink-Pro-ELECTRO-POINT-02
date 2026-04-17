'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { 
    Bell, 
    ArrowLeft, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    ChevronRight, 
    Circle, 
    Info, 
    XCircle, 
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { convertToDateSafely, cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useStoreUrl } from '@/hooks/use-store-url';

interface NotificationsViewProps {
    onClose: () => void;
    onNavigate?: (tab: string) => void;
}

const getNotificationConfig = (status: string) => {
    switch (status) {
        case 'pending': return { 
            title: 'Order Received', 
            message: 'Your order is in the registry and awaiting verification.', 
            icon: Clock, 
            color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' 
        };
        case 'processing': return { 
            title: 'Items Preparing', 
            message: 'Our warehouse is carefully picking and packing your items.', 
            icon: Package, 
            color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' 
        };
        case 'shipped': return { 
            title: 'Package Dispatched', 
            message: 'Your essentials are now in transit via our logistics network.', 
            icon: Truck, 
            color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20' 
        };
        case 'delivered': return { 
            title: 'Fulfillment Complete', 
            message: 'Your order has been successfully delivered to your location.', 
            icon: CheckCircle2, 
            color: 'text-green-500 bg-green-50 dark:bg-green-950/20' 
        };
        case 'cancelled': return { 
            title: 'Order Terminated', 
            message: 'The order session has been closed or cancelled.', 
            icon: XCircle, 
            color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' 
        };
        default: return { 
            title: 'Status Updated', 
            message: `Your order status is now: ${status}`, 
            icon: Info, 
            color: 'text-slate-500 bg-slate-50 dark:bg-slate-900' 
        };
    }
};

export function NotificationsView({ onClose, onNavigate }: NotificationsViewProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { storeId } = useStoreUrl();

    const ordersQuery = useMemo(() => {
        if (!firestore || !user || !storeId) return null;
        return query(
            collection(firestore, 'orders'),
            where('store_id', '==', storeId),
            where('user_id', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
    }, [firestore, user, storeId]);

    const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 fade-in duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-black/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800  border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Alerts</h1>
                </div>
                <button className="text font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity">
                    Mark Read
                </button>
            </header>

            <ScrollArea className="flex-1 px-6 pb-32">
                <div className="py-8 space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Fulfillment Feed</h2>
                        <p className="text-sm font-medium text-slate-500">Real-time status updates only.</p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-24 w-full bg-white dark:bg-slate-800 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : !user ? (
                        <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                            <div className="size-32 bg-slate-100 dark:bg-slate-800/50 rounded flex items-center justify-center mx-auto  group">
                                <ShieldCheck className="size-14 text-slate-300 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Unlock Alerts</h3>
                                <p className="text-sm font-medium text-slate-500 max-w mx-auto leading-relaxed">Sign in to receive real-time fulfillment telemetry and exclusive updates.</p>
                            </div>
                            <Button 
                                onClick={() => onNavigate?.('profile')} 
                                size="lg" 
                                className="rounded-2xl font-black uppercase text tracking-widest px-10 h-14  active:scale-95 transition-transform"
                            >
                                Enter Profile
                            </Button>
                        </div>
                    ) : orders && orders.length > 0 ? (
                        <div className="space-y-4">
                            {orders.map((order) => {
                                const config = getNotificationConfig(order.status);
                                const StatusIcon = config.icon;
                                const date = convertToDateSafely(order.createdAt);

                                return (
                                    <div 
                                        key={order.id} 
                                        className="relative p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-800  group active:scale transition-all"
                                    >
                                        <div className="flex gap-5">
                                            <div className={cn("size-12 rounded-2xl flex items-center justify-center shrink-0 ", config.color)}>
                                                <StatusIcon className="size-6" strokeWidth={2.5} />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{config.title}</h3>
                                                    <p className="text font-black text-slate-400 uppercase tracking-widest">
                                                        {date ? format(date, 'h:mm a') : 'Now'}
                                                    </p>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-2">
                                                    {config.message} Order <span className="text-primary font-bold">#{order.id.substring(0, 8).toUpperCase()}</span>
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Unread dot indicator (visual only) */}
                                        {order.status !== 'delivered' && (
                                            <div className="absolute top-3 left-3">
                                                <Circle className="size-2 fill-primary text-primary animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                            <div className="size-32 bg-slate-100 dark:bg-slate-800/50 rounded flex items-center justify-center mx-auto  group">
                                <Bell className="size-14 text-slate-300 group-hover:rotate-12 transition-transform duration-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Registry Clear</h3>
                                <p className="text-sm font-medium text-slate-500 max-w mx-auto leading-relaxed">No new fulfillment updates recorded. You&apos;re all caught up!</p>
                            </div>
                            <Button 
                                onClick={onClose} 
                                size="lg" 
                                className="rounded-2xl font-black uppercase text tracking-widest px-10 h-14  active:scale-95 transition-transform"
                            >
                                Return Home
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
