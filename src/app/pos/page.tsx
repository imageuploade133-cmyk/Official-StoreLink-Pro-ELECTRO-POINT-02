
'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  runTransaction,
  writeBatch,
  addDoc,
  deleteDoc,
  getDoc,
  query as firestoreQuery,
  where,
  limit,
  orderBy,
  updateDoc,
  increment,
  serverTimestamp,
  type DocumentSnapshot,
  type DocumentReference,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { useSettings } from '@/contexts/settings-context';
import { useAuth } from '@/contexts/auth-context';
import { logActivity } from '@/lib/activity-log-utils';
import { sendWhatsAppReceipt, sendStockAlert } from '@/lib/whatsapp';
import { sendSmsReceipt } from '@/lib/sms';
import { formatPhoneNumberForWhatsapp } from '@/lib/phone-utils';
import { format as formatDate, startOfDay } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { ensureNumber, calculateEffectivePrice } from '@/lib/pos-utils';
import type {
  Product as ProductType,
  Category,
  SaleTransaction,
  SaleTransactionItem,
  Customer,
  HeldSale as HeldSaleType,
  HeldSaleItem,
  ActivityLog,
  PaymentMethod,
  PaymentDetails,
  WhatsappPayload,
  PaymentRecord,
  CreditSaleSettlementStatus,
  WhatsappMessageLog,
  DisplayProduct,
  CartItem,
  StaffMember,
} from '@/lib/types';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, Store } from 'lucide-react';
import { PageSpinner } from '@/components/ui/spinner';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { CustomerManagementModal } from '@/components/pos/customer-management-modal';
import { HeldSalesModal } from '@/components/pos/held-sales-modal';
import { ConfirmHoldSaleDialog } from '@/components/pos/confirm-hold-sale-dialog';
import { CalculatorDialog } from '@/components/pos/CalculatorDialog';
import { ConfirmPaymentDialog } from '@/components/pos/confirm-payment-dialog';
import { CreditSaleDialog } from '@/components/pos/credit-sale-dialog';
import { VariantSelectorDialog } from '@/components/pos/VariantSelectorDialog';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { ProductArea } from '@/components/pos/ProductArea';
import { CartArea } from '@/components/pos/CartArea';
import { SendReceiptDialog } from '@/components/pos/SendReceiptDialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/UserNav';
import { OutOfDataDrawer } from '@/components/ui/out-of-data-drawer';
import { useRouter } from 'next/navigation';
import type { ProductVariant } from '@/lib/types';

type HeldSaleDisplay = HeldSaleType & { id: string };

interface SaleDataForDialog {
  items: SaleTransactionItem[];
  grandTotal: number;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  customer: Customer | null;
  notes: string;
  isCreditSale: boolean;
  dueDate?: Date | null;
  initialPaymentAtSale?: number | null;
  initialPaymentMethod?: string;
}

export default function POSPage() {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const {
    user: currentUser,
    permissions,
    isLoading: authLoading,
    staffMember,
    store,
    isAdmin,
  } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id || null, [staffMember, store]);
  
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [today, setToday] = React.useState<Date | null>(null);
  
  React.useEffect(() => {
    setToday(new Date());
  }, []);

  const [discount, setDiscount] = useState<{ type: 'percentage' | 'fixed' | null, value: number }>({ type: null, value: 0 });
  
  // Modal States
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [isHeldSalesModalOpen, setIsHeldSalesModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [heldSaleToDelete, setHeldSaleToDelete] = useState<HeldSaleDisplay | null>(null);
  const [isDeleteHeldSaleDialogOpen, setIsDeleteHeldSaleDialogOpen] = useState(false);
  const [isConfirmPaymentDialogOpen, setIsConfirmPaymentDialogOpen] = useState(false);
  const [isCreditSaleDialogOpen, setIsCreditSaleDialogOpen] = useState(false);
  const [isConfirmHoldSaleDialogOpen, setIsConfirmHoldSaleDialogOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState<DisplayProduct | null>(null);
  const [isOutOfDataDrawerOpen, setIsOutOfDataDrawerOpen] = useState(false);
  const [outOfDataDrawerInfo, setOutOfDataDrawerInfo] = useState({ title: '', description: '', type: 'data' as 'data' | 'stock' | 'error' });
  const [currentSaleForReceipt, setCurrentSaleForReceipt] = useState<SaleTransaction | null>(null);
  const [isSendReceiptDialogOpen, setIsSendReceiptDialogOpen] = useState(false);
  const [saleForReceipt, setSaleForReceipt] = useState<{ transaction: SaleTransaction; customerInfo: { name: string; phone: string; }; } | null>(null);
  
  // Sale State
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPhone, setManualCustomerPhone] = useState('');
  const [saleDataForDialog, setSaleDataForDialog] = useState<SaleDataForDialog | null>(null);

  const isAnyModalOpen = 
    isClearCartDialogOpen || 
    isHeldSalesModalOpen || 
    isCustomerModalOpen || 
    isDeleteHeldSaleDialogOpen || 
    isConfirmPaymentDialogOpen || 
    isCreditSaleDialogOpen || 
    isConfirmHoldSaleDialogOpen || 
    isReceiptModalOpen || 
    isCalculatorOpen;

  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.salePrice * item.quantity, 0), [cartItems]);

  const { grandTotal, discountAmount, taxAmount } = useMemo(() => {
      let calculatedDiscount = 0;
      if (discount.type && discount.value > 0) {
          if (discount.type === 'percentage') {
              calculatedDiscount = (subtotal * discount.value) / 100;
          } else { // fixed
              calculatedDiscount = Math.min(subtotal, discount.value);
          }
      }
      const afterDiscount = subtotal - calculatedDiscount;
      
      let calculatedTax = 0;
      if (settings?.enableTax && settings?.taxRate) {
          calculatedTax = (afterDiscount * settings.taxRate) / 100;
      }
      
      const finalTotal = afterDiscount + calculatedTax;
      return { grandTotal: finalTotal, discountAmount: calculatedDiscount, taxAmount: calculatedTax };
  }, [subtotal, discount, settings]);

  const userStaffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    if (currentUser && staffMember) {
        map.set(currentUser.uid, staffMember);
    } else if (isAdmin && currentUser) {
        map.set(currentUser.uid, {
            id: currentUser.uid,
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email || 'Admin',
            email: currentUser.email || 'N/A',
            role: 'admin',
            status: 'Active',
            permissions: { pages: [] }
        } as any);
    }
    return map;
  }, [currentUser, staffMember, isAdmin]);


  const handleApplyDiscount = (type: 'percentage' | 'fixed', value: number) => {
      if (value < 0) {
          toast({ variant: 'destructive', title: 'Invalid Discount', description: 'Discount value cannot be negative.' });
          return;
      }
      if (type === 'percentage' && value > 100) {
          toast({ variant: 'destructive', title: 'Invalid Discount', description: 'Percentage discount cannot exceed 100%.' });
          return;
      }
      setDiscount({ type, value });
      toast({ title: 'Discount Applied', description: `Applied a ${value}${type === 'percentage' ? '%' : currencySymbol} discount.` });
  };

  const handleClearDiscount = () => {
      setDiscount({ type: null, value: 0 });
      toast({ title: 'Discount Removed' });
  };


  const handleAddToCart = useCallback(
    (product: DisplayProduct, priceForSale: number) => {
        if (product.hasVariants && !product.selectedVariantId) {
            setProductForVariantSelection(product);
            setIsVariantSelectorOpen(true);
            return;
        }

        const existingItem = cartItems.find((item) => 
            item.id === product.id && item.selectedVariantId === product.selectedVariantId
        );

        const currentStock = product.stock;

        if (currentStock <= 0) {
            setOutOfDataDrawerInfo({
                title: 'Out of Stock',
                description: `${product.name} is currently out of stock and cannot be added to the cart.`,
                type: 'stock'
            });
            setIsOutOfDataDrawerOpen(true);
            return;
        }
        
        if (existingItem && existingItem.quantity >= currentStock) {
            setOutOfDataDrawerInfo({
                title: 'Stock Limit Reached',
                description: `You have reached the maximum available stock for ${product.name}. Max available: ${currentStock}.`,
                type: 'stock'
            });
            setIsOutOfDataDrawerOpen(true);
            return;
        }
        
        if (product.isVisibleInPOS === false) {
            toast({ variant: 'default', title: 'Product Not Available', description: `${product.name} is currently not visible in POS.` });
            return;
        }
        
        if (existingItem) {
            setCartItems((prevItems) => {
                const newItems = prevItems.map((item) =>
                    (item.id === product.id && item.selectedVariantId === product.selectedVariantId) 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
                setTimeout(() => { toast({ title: 'Added to Cart', description: `Increased quantity for ${product.name}.` }); }, 0);
                return newItems;
            });
        } else {
            setCartItems((prevItems) => {
                const newItems = [...prevItems, { ...product, quantity: 1, salePrice: priceForSale }];
                setTimeout(() => { toast({ title: 'Added to Cart', description: `${product.name} has been added to your cart.` }); }, 0);
                return newItems;
            });
        }
    },
    [cartItems, toast]
);
  
  const handleRemoveFromCart = (productId: string, variantId?: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item.id === productId && item.selectedVariantId === variantId))
    );
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number, variantId?: string) => {
    if (newQuantity < 1) {
        handleRemoveFromCart(productId, variantId);
        return;
    }
    setCartItems(prevItems => prevItems.map(item => {
        if (item.id === productId && item.selectedVariantId === variantId) {
            if (newQuantity <= item.stock) {
                return { ...item, quantity: newQuantity };
            }
            toast({
                variant: 'default',
                title: 'Stock Limit Reached',
                description: `Max stock for ${item.name} is ${item.stock}.`,
            });
            return { ...item, quantity: item.stock };
        }
        return item;
    }));
  };
  
  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setManualCustomerName('');
    setManualCustomerPhone('');
    handleClearDiscount();
  };

  const handleConfirmClearCart = () => {
    clearCart();
    setIsClearCartDialogOpen(false);
  };

  const handleOpenHeldSaleDeleteDialog = (sale: HeldSaleDisplay) => {
    setHeldSaleToDelete(sale);
    setIsDeleteHeldSaleDialogOpen(true);
  };

  const handleConfirmDeleteHeldSale = async () => {
    if (!heldSaleToDelete || !currentUser || !firestore) return;
    setIsProcessingSale(true);
    try {
      const heldSaleRef = doc(firestore, 'heldSales', heldSaleToDelete.id);
      await deleteDoc(heldSaleRef);
      toast({
        title: 'Held Sale Deleted',
        description: `Held sale ${heldSaleToDelete.id.substring(
          0,
          8
        )}... has been deleted.`,
      });
      setIsHeldSalesModalOpen(false);
      setTimeout(() => setIsHeldSalesModalOpen(true), 100);

      await logActivity(firestore, {
        user: currentUser,
        store_id: currentStoreId!,
        actionType: 'HELD_SALE_DELETED',
        entityType: 'Held Sale',
        entityId: heldSaleToDelete.id,
        summary: `Held sale ID ${heldSaleToDelete.id.substring(0, 8)}... deleted`,
        entityDescription: 'Held sale was permanently deleted from the system.',
        details: {
          heldSaleId: heldSaleToDelete.id,
          totalAmount: heldSaleToDelete.totalAmount,
          customerIdentifier: heldSaleToDelete.customerIdentifier,
          notes: heldSaleToDelete.notes,
        },
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Held Sale',
        description: error.message || 'Could not delete held sale.',
      });
    } finally {
      setIsDeleteHeldSaleDialogOpen(false);
      setHeldSaleToDelete(null);
      setIsProcessingSale(false);
    }
  };

  const handleRestoreHeldSale = async (saleId: string) => {
    if (!currentUser || !firestore || !products) return;
    setIsProcessingSale(true);
    try {
      const heldSaleRef = doc(firestore, 'heldSales', saleId);
      const heldSaleSnap = await getDoc(heldSaleRef);

      if (!heldSaleSnap.exists()) throw new Error('Held sale not found.');
      
      const heldSaleData = heldSaleSnap.data() as HeldSaleType;

      const restoredCartItems: CartItem[] = [];
      for (const heldItem of heldSaleData.items) {
        const productInDb = products.find(p => p.id === heldItem.id);
        if (!productInDb) throw new Error(`${heldItem.name} no longer exists in inventory.`);
        
        let stockToCheck = productInDb.stock;
        let priceToUse = heldItem.sellingPrice;
        let imageUrlToUse = heldItem.imageUrl || productInDb.imageUrl;
        let variantName = '';

        if (heldItem.variantId && productInDb.variants) {
          const variant = productInDb.variants.find(v => v.id === heldItem.variantId);
          if (variant) {
            stockToCheck = variant.stock;
            variantName = ` (${variant.name})`;
            imageUrlToUse = variant.imageUrl || imageUrlToUse;
          }
        }

        if (stockToCheck < heldItem.quantity) throw new Error(`Insufficient stock for ${heldItem.name}${variantName}.`);
        if (!productInDb.isVisibleInPOS) throw new Error(`${heldItem.name}${variantName} is currently not visible in POS.`);
        
        restoredCartItems.push({
            ...productInDb,
            name: heldItem.variantId ? `${productInDb.name}${variantName}` : productInDb.name,
            quantity: heldItem.quantity,
            salePrice: priceToUse,
            stock: stockToCheck,
            imageUrl: imageUrlToUse,
            selectedVariantId: heldItem.variantId,
            selectedOptions: heldItem.selectedOptions,
        } as any);
      }

      setCartItems(restoredCartItems);
      setManualCustomerName('');
      setManualCustomerPhone('');

      if (heldSaleData.customerIdentifier) {
        const customerQuery = firestoreQuery(
          collection(firestore, 'customers'),
          where('name', '==', heldSaleData.customerIdentifier),
          where('store_id', '==', staffMember?.store_id || null),
          limit(1)
        );
        const customerSnapshot = await getDocs(customerQuery);
        if (!customerSnapshot.empty) {
          const customerDoc = customerSnapshot.docs[0];
          const customerData = { id: customerDoc.id, ...customerDoc.data() } as Customer;
          if (customerData.status === 'active') setSelectedCustomer(customerData);
          else toast({ title: 'Customer Note', description: `Held sale associated with: ${heldSaleData.customerIdentifier}, who is currently ${customerData.status}.` });
        } else {
          setManualCustomerName(heldSaleData.customerIdentifier);
          toast({ title: 'Customer Note', description: `Restored manual customer name: ${heldSaleData.customerIdentifier}.` });
        }
      } else {
        setSelectedCustomer(null);
      }

      await deleteDoc(heldSaleRef);

      toast({ title: 'Sale restored', description: `Held sale restored to cart.` });
      setIsHeldSalesModalOpen(false);
    } catch (error: any) {
      console.error('Error restoring held sale:', error);
      toast({ variant: 'destructive', title: 'Error Restoring Sale', description: error.message || 'Could not restore held sale.' });
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleCustomerSelected = (customer: Customer) => {
    if (customer.status !== 'active') {
      toast({
        variant: 'destructive',
        title: 'Customer Not Active',
        description: `${customer.name} is currently ${customer.status} and cannot be selected.`,
      });
      return;
    }
    setSelectedCustomer(customer);
    setManualCustomerName('');
    setManualCustomerPhone('');
    setIsCustomerModalOpen(false);
    toast({ title: 'Customer Selected', description: `${customer.name} is now associated with this sale.` });
  };
  
  const handleProcessSaleFromDialog = async (
    paymentMethod: string,
    paymentDetails?: PaymentDetails,
    initialPaymentAtSale?: number | null
  ): Promise<boolean> => {
    if (!saleDataForDialog || !currentUser || !firestore || !currentStoreId) {
      if (!currentStoreId) {
        toast({ variant: 'destructive', title: 'Sale Failed', description: 'Store ID is missing. Please refresh and try again.' });
      }
      return false;
    }

    let finalTransactionDataForUI: SaleTransaction | null = null;
    const saleTimestamp = Timestamp.now(); 
    
    try {
      await runTransaction(firestore, async (transaction) => {
        // --- 1. GATHER ALL READS FIRST ---
        const productRefs = saleDataForDialog.items.map(item => doc(firestore, 'products', item.productId));
        const productSnapshots = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        let customerDocSnap: DocumentSnapshot | null = null;
        let customerRef: DocumentReference | null = null;
        if (saleDataForDialog.customer) {
            customerRef = doc(firestore, 'customers', saleDataForDialog.customer.id);
            customerDocSnap = await transaction.get(customerRef);
        }

        // --- 2. PERFORM LOGIC AND VALIDATIONS ---
        const docRef = doc(collection(firestore, 'saleTransactions'));
        let oldBalanceAtTimeOfSale = 0;
        let depositBalanceAtTimeOfSale = 0;

        for (let i = 0; i < saleDataForDialog.items.length; i++) {
          const item = saleDataForDialog.items[i];
          const productDoc = productSnapshots[i];
          
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.productName} not found.`);
          }
          const currentStock = productDoc.data().stock || 0;
          let newStock = currentStock - item.quantity;
          
          // --- HANDLE VARIANTS STOCK ---
          if (item.variantId && productDoc.data().hasVariants && productDoc.data().variants) {
            const variants = [...productDoc.data().variants];
            const variantIndex = variants.findIndex((v: any) => v.id === item.variantId);
            if (variantIndex !== -1) {
              const variant = { ...variants[variantIndex] };
              if (variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for variant ${variant.name}.`);
              }
              variant.stock -= item.quantity;
              variants[variantIndex] = variant;
              transaction.update(productRefs[i], { 
                variants, 
                stock: newStock,
                totalSold: increment(item.quantity)
              });
            } else {
              transaction.update(productRefs[i], { 
                stock: newStock,
                totalSold: increment(item.quantity)
              });
            }
          } else {
            transaction.update(productRefs[i], { 
                stock: newStock,
                totalSold: increment(item.quantity)
            });
          }

          // --- LOG STOCK AUDIT ---
          const auditRef = doc(collection(firestore, 'stockAudit'));
          transaction.set(auditRef, {
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId || null,
            selectedOptions: item.selectedOptions || null,
            store_id: currentStoreId!,
            type: 'SALE',
            referenceId: docRef.id,
            beforeStock: currentStock,
            afterStock: newStock,
            change: -item.quantity,
            staffId: currentUser.uid,
            staffName: currentUser.displayName || currentUser.email || 'Staff',
            timestamp: serverTimestamp()
          });
        }

        if (customerDocSnap && customerRef) {
            if (customerDocSnap.exists()) {
                const cData = customerDocSnap.data() as Customer;
                oldBalanceAtTimeOfSale = cData.outstandingCredit || 0;
                depositBalanceAtTimeOfSale = cData.creditBalance || 0;
            }

            const amountToAddToTotalSpent = saleDataForDialog.grandTotal;
            let amountToAddToCredit = 0;
            if (saleDataForDialog.isCreditSale) {
                const initialPayment = saleDataForDialog.initialPaymentAtSale || 0;
                amountToAddToCredit = saleDataForDialog.grandTotal - initialPayment;
            }
            
            // Queue the WRITE
            transaction.update(customerRef, {
                totalSpent: increment(amountToAddToTotalSpent),
                outstandingCredit: increment(amountToAddToCredit),
                updatedAt: serverTimestamp(),
            });
        }
        
        const grandTotal = saleDataForDialog.grandTotal;
        const initialPayment = saleDataForDialog.initialPaymentAtSale ?? 0;
        const isNowFullyPaid = saleDataForDialog.isCreditSale
            ? initialPayment >= grandTotal - 0.001
            : true;

        const paymentHistory: PaymentRecord[] = [];
        if (saleDataForDialog.isCreditSale && initialPayment > 0) {
            paymentHistory.push({
                paymentDate: saleTimestamp,
                amountPaid: initialPayment,
                paymentMethod: saleDataForDialog.initialPaymentMethod || 'Cash',
                notes: 'Initial payment at time of sale.',
            });
        }
        
        const saleDataForDb: any = {
            staffId: currentUser.uid,
            store_id: currentStoreId!,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            grandTotal: saleDataForDialog.grandTotal,
            subtotal: saleDataForDialog.subtotal,
            items: saleDataForDialog.items,
            paymentMethod: saleDataForDialog.isCreditSale ? 'Credit' : paymentMethod,
            paymentDetails: paymentDetails || null,
            reprintCount: 0,
            isCreditSale: saleDataForDialog.isCreditSale,
            customerId: saleDataForDialog.customer?.id || null,
            customerName: saleDataForDialog.customer?.name || manualCustomerName || 'Walk-in Customer',
            notes: saleDataForDialog.notes,
            discountValue: discount.value,
            discountType: discount.type,
            discountAmountCalculated: saleDataForDialog.discountAmount ?? null,
            taxRate: saleDataForDialog.taxRate ?? null,
            taxAmountCalculated: saleDataForDialog.taxAmount ?? null,
            amountPaidTowardsCredit: saleDataForDialog.isCreditSale ? initialPayment : 0,
            paymentHistory: paymentHistory,
            initialPaymentMadeAtTimeOfSale: initialPaymentAtSale ?? null,
            dueDate: saleDataForDialog.dueDate ? Timestamp.fromDate(saleDataForDialog.dueDate) : null,
            isPaid: isNowFullyPaid,
            oldBalanceAtTimeOfSale,
            newBalanceAtTimeOfSale: saleDataForDialog.isCreditSale ? oldBalanceAtTimeOfSale + (grandTotal - initialPayment) : oldBalanceAtTimeOfSale,
            depositBalanceAtTimeOfSale
        };
        
        // Queue the WRITE
        transaction.set(docRef, saleDataForDb);
        
        finalTransactionDataForUI = {
            id: docRef.id,
            ...saleDataForDb,
            createdAt: saleTimestamp, 
            updatedAt: saleTimestamp,
        } as SaleTransaction;

      });

      if (finalTransactionDataForUI) {
        (async () => {
          for (const item of finalTransactionDataForUI!.items) {
            try {
              const productRef = doc(firestore, 'products', item.productId);
              const updatedProductSnap = await getDoc(productRef);
              if (updatedProductSnap.exists()) {
                const updatedProduct = { id: updatedProductSnap.id, ...updatedProductSnap.data() } as ProductType;
                const alertSent = await sendStockAlert(updatedProduct, settings);
                if (alertSent) {
                    toast({ title: 'Stock Alert Sent', description: `A WhatsApp notification was sent for "${updatedProduct.name}".`});
                }
              }
            } catch (alertError: any) {
              console.error(`Failed to send stock alert for product ${item.productId}:`, alertError);
            }
          }
        })();
        
        const customerForReceipt = selectedCustomer || { name: manualCustomerName, phone: manualCustomerPhone };
        if (customerForReceipt.phone && settings?.enableWhatsapp) {
          setSaleForReceipt({ transaction: finalTransactionDataForUI, customerInfo: customerForReceipt });
          setIsSendReceiptDialogOpen(true);
        } else {
          setCurrentSaleForReceipt(finalTransactionDataForUI);
          setIsReceiptModalOpen(true);
          clearCart();
        }
        return true;
      }
      return false;
    } catch (error: any) {
        console.error("Error processing sale: ", error);
        toast({ variant: 'destructive', title: 'Sale Failed', description: error.message || 'The transaction could not be completed.' });
        return false;
    }
  };

  const handlePostSendActions = (transaction: SaleTransaction) => {
    setCurrentSaleForReceipt(transaction);
    setIsReceiptModalOpen(true);
    clearCart();
  };

  const handleInitiatePayment = (isCredit: boolean) => {
    if (cartItems.length === 0) return;
    
    const saleItems: SaleTransactionItem[] = cartItems.map((item) => ({
        productId: item.id, 
        productName: item.name, 
        quantity: item.quantity, 
        unitPrice: item.salePrice,
        originalPrice: item.sellingPrice !== item.salePrice ? ensureNumber(item.sellingPrice) : null,
        totalPrice: item.salePrice * item.quantity,
        variantId: item.selectedVariantId || null,
        selectedOptions: item.selectedOptions || null,
      }));

    if (isCredit) {
      if (!selectedCustomer) {
        toast({ variant: 'destructive', title: 'Customer Required', description: 'Please select a registered customer for a credit sale.' });
        return;
      }
      if (selectedCustomer.status !== 'active') {
        toast({ variant: 'destructive', title: 'Customer Not Active', description: `${selectedCustomer.name} is not active.` });
        return;
      }
      setIsCreditSaleDialogOpen(true);
    } else {
      setSaleDataForDialog({
        items: saleItems, grandTotal, subtotal, customer: selectedCustomer,
        notes: '', isCreditSale: false, discountAmount: discountAmount,
        taxAmount: taxAmount, taxRate: settings?.taxRate || 0
      });
      setIsConfirmPaymentDialogOpen(true);
    }
  };
  
  const handleInitiateCreditSaleConfirmation = ({ dueDate, initialPaymentAmount, paymentMethod }: { dueDate: Date, initialPaymentAmount: number, paymentMethod: string }) => {
    setIsCreditSaleDialogOpen(false);
    if (!selectedCustomer) return;

    const saleItems: SaleTransactionItem[] = cartItems.map((item) => ({
      productId: item.id, 
      productName: item.name, 
      quantity: item.quantity, 
      unitPrice: item.salePrice,
      originalPrice: ensureNumber(item.sellingPrice) !== item.salePrice ? ensureNumber(item.sellingPrice) : null,
      totalPrice: item.salePrice * item.quantity,
      variantId: item.selectedVariantId || null,
      selectedOptions: item.selectedOptions || null,
    }));

    setSaleDataForDialog({
      items: saleItems, grandTotal, subtotal, customer: selectedCustomer,
      notes: '', isCreditSale: true, dueDate, initialPaymentAtSale: initialPaymentAmount,
      initialPaymentMethod: paymentMethod,
      discountAmount,
      taxAmount,
      taxRate: settings?.taxRate || 0
    });
    setIsConfirmPaymentDialogOpen(true);
  };
  
  const handleConfirmHoldSale = async (notes?: string, customerIdentifier?: string) => {
    if (!currentUser || !firestore) return;
    
    setIsProcessingSale(true);
    const heldSale: Omit<HeldSaleType, 'id'> = {
        items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            sellingPrice: item.salePrice,
            quantity: item.quantity,
            imageUrl: item.imageUrl || null,
            dataAiHint: item.dataAiHint || null,
            stock: item.stock,
            barcode: item.barcode || null,
            categoryId: item.categoryId,
            variantId: item.selectedVariantId || null,
            selectedOptions: item.selectedOptions || null,
        })),
        store_id: currentStoreId!,
        totalAmount: grandTotal,
        notes: notes || null,
        customerIdentifier: customerIdentifier || null,
        heldAt: serverTimestamp() as Timestamp,
    };

    try {
        await addDoc(collection(firestore, 'heldSales'), heldSale);
        toast({ title: "Sale Held", description: "The current cart has been saved to held sales." });
        clearCart();
    } catch(e: any) {
        toast({ variant: "destructive", title: "Failed to Hold Sale", description: e.message });
    } finally {
        setIsConfirmHoldSaleDialogOpen(false);
        setIsProcessingSale(false);
    }
  };

  const handleVariantConfirm = (variant: ProductVariant, selectedOptions: { [key: string]: string }) => {
    if (!productForVariantSelection) return;

    const variantProduct: DisplayProduct = {
        ...productForVariantSelection,
        sellingPrice: variant.sellingPrice || productForVariantSelection.sellingPrice,
        stock: variant.stock,
        sku: variant.sku || productForVariantSelection.sku,
        imageUrl: variant.imageUrl || productForVariantSelection.imageUrl,
        hasVariants: true, 
        selectedVariantId: variant.id,
        selectedOptions: selectedOptions,
        name: `${productForVariantSelection.name} (${variant.name})`
    } as any;

    handleAddToCart(variantProduct, variantProduct.sellingPrice);
    setIsVariantSelectorOpen(false);
    setProductForVariantSelection(null);
  };

  if (authLoading || !permissions) {
    return <PageSpinner label="Point of Sale" subLabel="Loading your POS terminal…" />;
  }

  if (!permissions.canAccessPOS) {
    return <AccessDenied />;
  }
  
  return (
    <TooltipProvider>
      <div className="min-h-screen lg:h-dvh flex flex-col overflow-x-auto lg:overflow-hidden bg-muted/30 dark:bg-black">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 dark:bg-black/50 dark:backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-md dark:bg-zinc-900">
                    <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-lg font-semibold">Point of Sale</h1>
                </div>
            </div>
            <UserNav />
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 lg:grid-rows-none gap-3 sm:gap-6 min-h-0 p-3 sm:p-6">
          <div className="lg:col-span-3 h-full flex flex-col bg-card p-2 sm:p-4 rounded-xl shadow-lg lg:overflow-hidden dark:bg-zinc-900/50 dark:border-zinc-800 dark:border">
            <ProductArea
              onAddToCart={handleAddToCart}
              onProductsLoaded={setProducts}
              isScannerEnabled={!isAnyModalOpen}
            />
          </div>

          <div className="lg:col-span-2 h-full flex flex-col lg:overflow-hidden">
            <CartArea
              cartItems={cartItems}
              selectedCustomer={selectedCustomer}
              manualCustomerName={manualCustomerName}
              manualCustomerPhone={manualCustomerPhone}
              isProcessingSale={isProcessingSale}
              currencySymbol={currencySymbol}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveFromCart}
              onClearCart={() => setIsClearCartDialogOpen(true)}
              onCustomerSelect={handleCustomerSelected}
              onClearCustomer={() => setSelectedCustomer(null)}
              onManualCustomerNameChange={setManualCustomerName}
              onManualCustomerPhoneChange={setManualCustomerPhone}
              onOpenSalesHistory={() => router.push('/dashboard/my-sales')}
              onOpenHeldSales={() => setIsHeldSalesModalOpen(true)}
              onOpenCustomerManagement={() => setIsCustomerModalOpen(true)}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onInitiatePayment={() => handleInitiatePayment(false)}
              onInitiateCreditSale={() => handleInitiatePayment(true)}
              onInitiateHoldSale={() => setIsConfirmHoldSaleDialogOpen(true)}
              subtotal={subtotal}
              grandTotal={grandTotal}
              discountAmount={discountAmount}
              discount={discount}
              onApplyDiscount={handleApplyDiscount}
              onClearDiscount={handleClearDiscount}
            />
          </div>
        </div>

        {/* All Modals */}
        <DeleteConfirmationDialog
          isOpen={isClearCartDialogOpen}
          onOpenChange={setIsClearCartDialogOpen}
          onConfirm={handleConfirmClearCart}
          itemName="all items in your current cart"
          itemType="cart"
          isDeleting={false}
          dialogDescription="Are you sure you want to clear all items from the cart?"
        />
        <HeldSalesModal isOpen={isHeldSalesModalOpen} onOpenChange={setIsHeldSalesModalOpen} currencySymbol={currencySymbol} onRestoreHeldSale={handleRestoreHeldSale} onDeleteHeldSale={handleOpenHeldSaleDeleteDialog}/>
        {heldSaleToDelete && (
            <DeleteConfirmationDialog isOpen={isDeleteHeldSaleDialogOpen} onOpenChange={(open) => { if (!open) setHeldSaleToDelete(null); setIsDeleteHeldSaleDialogOpen(open); }} onConfirm={handleConfirmDeleteHeldSale} itemName={`held sale ID ${heldSaleToDelete.id.substring(0,8)}...`} itemType="held sale" isDeleting={isProcessingSale} dialogDescription="Are you sure you want to permanently delete this held sale?" />
        )}
        <CustomerManagementModal isOpen={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen} onCustomerSelect={handleCustomerSelected} />
        <ConfirmPaymentDialog isOpen={isConfirmPaymentDialogOpen} onClose={(action) => { setIsConfirmPaymentDialogOpen(false); if (action === 'back') setIsCreditSaleDialogOpen(true); else setSaleDataForDialog(null); }} saleData={saleDataForDialog} onConfirmSale={handleProcessSaleFromDialog} currencySymbol={currencySymbol} />
        {selectedCustomer && (<CreditSaleDialog isOpen={isCreditSaleDialogOpen} onClose={() => setIsCreditSaleDialogOpen(false)} onConfirm={handleInitiateCreditSaleConfirmation} totalAmount={grandTotal} isSubmitting={isProcessingSale} customer={selectedCustomer} currencySymbol={currencySymbol} />)}
        <ConfirmHoldSaleDialog isOpen={isConfirmHoldSaleDialogOpen} onClose={() => setIsConfirmHoldSaleDialogOpen(false)} onConfirm={handleConfirmHoldSale} isSubmitting={isProcessingSale} />
        <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} saleTransaction={currentSaleForReceipt} staffMap={userStaffMap} />
        <CalculatorDialog isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
        <SendReceiptDialog 
            isOpen={isSendReceiptDialogOpen} 
            onOpenChange={setIsSendReceiptDialogOpen} 
            saleTransaction={saleForReceipt?.transaction || null}
            customerInfo={saleForReceipt?.customerInfo || null}
            settings={settings}
            onSendComplete={() => handlePostSendActions(saleForReceipt!.transaction)}
        />
        <OutOfDataDrawer
            isOpen={isOutOfDataDrawerOpen}
            onOpenChange={setIsOutOfDataDrawerOpen}
            title={outOfDataDrawerInfo.title}
            description={outOfDataDrawerInfo.description}
            type={outOfDataDrawerInfo.type}
        />
        {productForVariantSelection && (
          <VariantSelectorDialog
              isOpen={isVariantSelectorOpen}
              onClose={() => { setIsVariantSelectorOpen(false); setProductForVariantSelection(null); }}
              product={productForVariantSelection}
              onConfirm={handleVariantConfirm}
              currencySymbol={currencySymbol}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
