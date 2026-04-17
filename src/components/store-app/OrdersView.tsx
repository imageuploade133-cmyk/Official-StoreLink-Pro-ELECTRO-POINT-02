'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    ShoppingBag, 
    ArrowLeft, 
    ChevronRight, 
    Clock, 
    Package, 
    Truck, 
    CheckCircle2, 
    XCircle,
    RotateCcw,
    ChevronDown,
    MapPin,
    CreditCard,
    ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import { useStoreUrl } from '@/hooks/use-store-url';

interface OrdersViewProps {
    onClose: () => void;
    onNavigate?: (tab: string) => void;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending': return { icon: Clock, label: 'Awaiting Fulfillment', color: 'text-amber-600 bg-amber-50 border-amber-100' };
        case 'processing': return { icon: Package, label: 'In Preparation', color: 'text-blue-600 bg-blue-50 border-blue-100' };
        case 'shipped': return { icon: Truck, label: 'Dispatched', color: 'text-purple-600 bg-purple-50 border-purple-100' };
        case 'delivered': return { icon: CheckCircle2, label: 'Fulfillment Complete', color: 'text-green-600 bg-green-50 border-green-100' };
        case 'cancelled': return { icon: XCircle, label: 'Order Terminated', color: 'text-rose-600 bg-rose-50 border-rose-100' };
        default: return { icon: Clock, label: status, color: 'text-slate-600 bg-slate-50 border-slate-100' };
    }
};

export function OrdersView({ onClose, onNavigate }: OrdersViewProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const currencySymbol = settings?.currency || '$';

    const ordersQuery = useMemo(() => {
        if (!firestore || !user || !storeId) return null;
        return query(
            collection(firestore, 'orders'),
            where('store_id', '==', storeId),
            where('user_id', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
    }, [firestore, user, storeId]);

    const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-black/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800  border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Registry</h1>
                </div>
                <Badge variant="secondary" className="font-black h-8 px-4 rounded-full ">Orders</Badge>
            </header>

            <ScrollArea className="flex-1 px-6 pb-32">
                <div className="py-8 space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Order History</h2>
                        <p className="text-sm font-medium text-slate-500">Real-time fulfillment telemetry.</p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-[2.5rem]" />)}
                        </div>
                    ) : !user ? (
                        <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                            <div className="size-32 bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner group">
                                <ShieldCheck className="size-14 text-slate-300 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Unlock History</h3>
                                <p className="text-sm font-medium text-slate-500 max-w-[220px] mx-auto leading-relaxed">Sign in to access your curated order registry and fulfillment history.</p>
                            </div>
                            <Button 
                                onClick={() => onNavigate?.('profile')} 
                                size="lg" 
                                className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 h-14  active:scale-95 transition-transform"
                            >
                                Enter Profile
                            </Button>
                        </div>
                    ) : orders && orders.length > 0 ? (
                        <div className="space-y-6">
                            {orders.map((order) => {
                                const date = convertToDateSafely(order.createdAt);
                                const status = getStatusConfig(order.status);
                                const StatusIcon = status.icon;

                                return (
                                    <div key={order.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800  overflow-hidden group">
                                        <div className="p-6 space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">#{order.id.substring(0, 12).toUpperCase()}</p>
                                                    <p className="text-xs font-bold text-slate-400">{date ? format(date, 'EEEE, MMM do') : 'Recent'}</p>
                                                </div>
                                                <div className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ", status.color)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {status.label}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl px-4 border border-slate-100 dark:border-slate-800">
                                                <div className="flex -space-x-3 overflow-hidden">
                                                    {[...Array(Math.min(order.items.length, 3))].map((_, i) => (
                                                        <div key={i} className="h-10 w-10 rounded-full bg-primary/10 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-black text-primary">
                                                            <ShoppingBag className="h-4 w-4" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black tracking-tight">{order.items.length} Premium Item{order.items.length !== 1 ? 's' : ''}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Combined Registry</p>
                                                </div>
                                                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                    {formatCurrency(order.totalAmount, currencySymbol)}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                                    <CreditCard className="h-3.5 w-3.5 opacity-50" />
                                                    {order.paymentMethod}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase justify-end">
                                                    <MapPin className="h-3.5 w-3.5 opacity-50" />
                                                    Delivery Active
                                                </div>
                                            </div>
                                        </div>
                                        <button className="w-full h-12 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary border-t hover:bg-primary hover:text-white transition-all">
                                            Manage Shipment <ChevronRight className="h-3 w-3" strokeWidth={3} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner group">
                                <ShoppingBag className="h-14 w-14 text-slate-300 group-hover:rotate-12 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Registry Empty</h3>
                                <p className="text-sm text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">When you place an order, our fulfillment telemetry will appear here.</p>
                            </div>
                            <Button onClick={onClose} size="lg" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 h-14  active:scale-95 transition-transform">Start Discovery</Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
