'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { StoreCartItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ensureNumber } from '@/lib/pos-utils';
import { safeStorage } from '@/lib/storage-utils';
import { useAds } from '@/contexts/ad-context';

interface CartContextType {
  cartItems: StoreCartItem[];
  addToCart: (product: Product, salePrice: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<StoreCartItem[]>([]);
  const { toast } = useToast();
  const { triggerAd } = useAds();

  useEffect(() => {
    const storedCart = safeStorage.getItem('storeCart');
    if (storedCart) {
      try {
        const parsedCart: StoreCartItem[] = JSON.parse(storedCart);
        // Data migration/validation to prevent NaN errors from old cart data
        const validatedCart = parsedCart.map(item => ({
            ...item,
            quantity: ensureNumber(item.quantity, 1),
            // If salePrice is missing or invalid, fall back to sellingPrice
            salePrice: ensureNumber(item.salePrice, ensureNumber(item.sellingPrice, 0)),
        }));
        setCartItems(validatedCart);
      } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
        safeStorage.removeItem('storeCart');
      }
    }
  }, []);

  useEffect(() => {
    if (cartItems.length > 0 || safeStorage.getItem('storeCart')) {
        safeStorage.setItem('storeCart', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const addToCart = useCallback((product: Product, salePrice: number) => {
    const productStock = ensureNumber(product.stock, 0);

    if (productStock <= 0) {
        toast({
            variant: "destructive",
            title: "Out of Stock",
            description: `${product.name} is currently unavailable.`,
        });
        return;
    }

    setCartItems(prevItems => {
        triggerAd('add_to_cart');
        const existingItem = prevItems.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity >= productStock) {
                setTimeout(() => {
                    toast({
                        variant: "destructive",
                        title: "Stock Limit Reached",
                        description: `You already have the maximum available stock for ${product.name} in your cart.`,
                    });
                }, 0);
                return prevItems;
            }
            setTimeout(() => {
                toast({ title: "Added to Cart", description: `Increased quantity for ${product.name}.` });
            }, 0);
            return prevItems.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        } else {
            setTimeout(() => {
                toast({ title: "Added to Cart", description: `${product.name} has been added.` });
            }, 0);
            return [...prevItems, { ...product, quantity: 1, salePrice }];
        }
    });
  }, [toast]);

  const removeFromCart = useCallback((productId: string) => {
    const itemBeingRemoved = cartItems.find(item => item.id === productId);
    const newCartItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newCartItems);
    
    if (itemBeingRemoved) {
        setTimeout(() => {
            toast({ title: "Item Removed", description: `${itemBeingRemoved.name} has been removed from your cart.` });
        }, 0);
    }
  }, [cartItems, toast]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === productId) {
          const itemStock = ensureNumber(item.stock, 0);
          if (quantity > itemStock) {
            setTimeout(() => {
                toast({
                  variant: "destructive",
                  title: "Stock Limit Exceeded",
                  description: `Only ${itemStock} units of ${item.name} are available.`,
                });
            }, 0);
            return { ...item, quantity: itemStock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, [removeFromCart, toast]);

  const clearCart = () => {
    if (cartItems.length > 0) {
      setCartItems([]);
      setTimeout(() => {
        toast({ title: "Cart Cleared", description: `Your shopping cart is now empty.` });
      }, 0);
    }
  };
  
  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
