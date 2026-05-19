'use client';

import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Undo2, TrendingUp, TrendingDown, Tag, Layers } from 'lucide-react';
import type { DisplayProduct, ProductVariant } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { ensureNumber, calculateEffectivePrice } from '@/lib/pos-utils';
import { useSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: DisplayProduct;
    onAddToCart: (product: DisplayProduct, priceForSale: number) => void;
    priority: boolean;
    currencySymbol: string;
    isGlobalPriceModificationDisabled?: boolean;
    defaultImageUrl: string;
    lowStockThreshold: number;
    today: Date | null;
}

export const ProductCard = React.memo(({ product, onAddToCart, priority, currencySymbol, isGlobalPriceModificationDisabled = false, defaultImageUrl, lowStockThreshold, today }: ProductCardProps) => {
    const { settings } = useSettings();
    const posSize = settings?.posProductSize || 'big';
    const isSmallMode = posSize === 'small' || (posSize === 'custom' && (settings?.posCustomColumns || 0) >= 4);

    const initialEffectivePriceString = useMemo(() => {
        return calculateEffectivePrice(product, today).toFixed(2);
    }, [product, today]);

    const [priceInputString, setPriceInputString] = useState<string>(initialEffectivePriceString);
    const [prevInitialPrice, setPrevInitialPrice] = useState<string>(initialEffectivePriceString);
    const [isValidPrice, setIsValidPrice] = useState<boolean>(true);
    
    if (initialEffectivePriceString !== prevInitialPrice) {
        setPriceInputString(initialEffectivePriceString);
        setPrevInitialPrice(initialEffectivePriceString);
        setIsValidPrice(true);
    }

    const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStringValue = e.target.value;
        setPriceInputString(newStringValue);

        if (newStringValue.trim() === "") {
        setIsValidPrice(true); 
        return;
        }
        const validPriceRegex = /^[0-9]*(\.[0-9]{0,2})?$/;
        if (!validPriceRegex.test(newStringValue)) {
        setIsValidPrice(false);
        return;
        }
        const numericValue = parseFloat(newStringValue);
        setIsValidPrice(!isNaN(numericValue) && numericValue >= 0);
    };

    const handlePriceInputBlur = () => {
        const numericValue = parseFloat(priceInputString);
        if (priceInputString.trim() === "" || isNaN(numericValue) || numericValue < 0) {
        setPriceInputString(initialEffectivePriceString); 
        setIsValidPrice(true);
        } else {
        setPriceInputString(numericValue.toFixed(2)); 
        setIsValidPrice(true);
        }
    };

    const handleUndoPriceChange = () => {
        setPriceInputString(initialEffectivePriceString);
        setIsValidPrice(true);
    };
    
    const handleAddToCartClick = () => {
        let priceForSale = parseFloat(priceInputString);
        if (isNaN(priceForSale) || priceForSale < 0 || priceInputString.trim() === "") {
            priceForSale = parseFloat(initialEffectivePriceString);
        }
        onAddToCart(product, parseFloat(priceForSale.toFixed(2)));
    };

    const isPriceManuallyChanged = priceInputString !== initialEffectivePriceString && priceInputString.trim() !== "" && isValidPrice;
    const purchasePrice = ensureNumber(product.purchasePrice);
    let profitLossIndicator: ReactNode = null;

    if (isPriceManuallyChanged && purchasePrice > 0 && !isSmallMode) {
        const currentSalePrice = parseFloat(priceInputString);
        const profit = currentSalePrice - purchasePrice;
        if (profit > 0) {
        profitLossIndicator = (
            <div className="mt-1 flex items-center text-xs text-green-600 dark:text-green-400">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> Profit: {formatCurrency(profit, currencySymbol)}
            </div>
        );
        } else if (profit < 0) {
        profitLossIndicator = (
            <div className="mt-1 flex items-center text-xs text-red-600 dark:text-red-400">
            <TrendingDown className="h-3.5 w-3.5 mr-1" /> Loss: {formatCurrency(Math.abs(profit), currencySymbol)} 
            </div>
        );
        } else {
        profitLossIndicator = (
            <div className="mt-1 text-xs text-muted-foreground">Break-even</div>
        );
        }
    }
    const isPriceInputDisabled = isGlobalPriceModificationDisabled || product.stock <= 0 || !product.allowPriceModification;

    const isAddToCartDisabled = 
        product.stock <= 0 || 
        !isValidPrice || 
        priceInputString.trim() === "" || 
        parseFloat(priceInputString) < 0;

    const hasActivePromo = initialEffectivePriceString !== ensureNumber(product.sellingPrice).toFixed(2);
    
    return (
        <Card className={cn(
            "overflow-hidden shadow-sm transition-shadow duration-200 flex flex-col group border-2 pos-product-card",
            isSmallMode ? "rounded-xl" : "rounded-2xl"
        )}>
        <div className={cn(
            "relative w-full overflow-hidden bg-muted/20",
            isSmallMode ? "aspect-square" : "aspect-[4/3]"
        )}>
            <Image
            src={product.imageUrl || defaultImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 50vw, 40vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0,2).join(' ')}
            priority={priority}
            unoptimized
            />
            {hasActivePromo && (
            <Badge
                variant="destructive"
                className={cn(
                    "absolute font-bold shadow-md",
                    isSmallMode ? "top-1.5 right-1.5 text-[8px] px-1 py-0" : "top-3 right-3 text-xs px-2 py-1"
                )}
            >
                PROMO
            </Badge>
            )}
        </div>
        <CardHeader className={cn("p-3 sm:p-2", !isSmallMode && "sm:p-4")}>
            <CardTitle className={cn(
                "font-bold truncate",
                isSmallMode ? "text-[10px] sm:text-sm" : "text-sm sm:text-base"
            )} title={product.name}>{product.name}</CardTitle>
        </CardHeader>
        <CardContent className={cn("p-3 pt-0 sm:p-2 sm:pt-0 flex-grow space-y-3", !isSmallMode && "sm:p-4 sm:pt-0")}>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                    {!isSmallMode && !product.hasVariants && <span className="text-sm font-black text-primary/60">{currencySymbol}</span>}
                    <div className="relative flex-grow">
                        {isSmallMode && !product.hasVariants && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/60">{currencySymbol}</span>}
                        {product.hasVariants ? (
                            <div className={cn(
                                "flex items-center font-black text-primary/80 bg-primary/5 border border-primary/20 rounded-md px-3",
                                isSmallMode ? "h-8 text-[10px]" : "h-10 text-sm"
                            )}>
                                PRICE VARIES
                            </div>
                        ) : (
                            <Input
                                type="string" 
                                inputMode="decimal"
                                aria-label={`Price for ${product.name}`}
                                className={cn(
                                    "font-black border-muted-foreground/30 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary bg-muted/20",
                                    isSmallMode ? "h-8 text-[10px] sm:text-xs pl-4 pr-1" : "h-10 text-base sm:text-lg p-2"
                                )}
                                value={priceInputString}
                                onChange={handlePriceInputChange}
                                onBlur={handlePriceInputBlur}
                                disabled={isPriceInputDisabled}
                            />
                        )}
                    </div>
                    {isPriceManuallyChanged && !isSmallMode && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 p-0 text-muted-foreground hover:text-primary shrink-0"
                            onClick={handleUndoPriceChange}
                            aria-label="Undo price change"
                            disabled={isPriceInputDisabled}
                        >
                            <Undo2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
            {!isSmallMode && (
                <div className="flex flex-wrap gap-2">
                    {product.stock <= 0 ? (
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5 uppercase font-black">Sold Out</Badge>
                    ) : product.stock <= lowStockThreshold && product.stock > 0 ? (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-orange-500/50 text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-950/30">Low: {product.stock}</Badge>
                    ) : product.stock > lowStockThreshold ? ( 
                    <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 hover:bg-green-200 dark:hover:bg-green-900/50 font-bold">
                        {product.stock} In Stock
                        </Badge>
                    ) : null}
                </div>
            )}
            {isSmallMode && product.stock <= lowStockThreshold && product.stock > 0 && (
                <div className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800/50 w-fit">
                    LOW: {product.stock}
                </div>
            )}
            {profitLossIndicator}
        </CardContent>
        <CardFooter className={cn("p-3 pt-0 sm:p-2 sm:pt-0", !isSmallMode && "sm:p-4 sm:pt-0")}>
            <Button
            size={isSmallMode ? "sm" : "lg"}
            className={cn(
                "w-full font-black uppercase tracking-tight",
                isSmallMode ? "h-8 text-[8px]" : "h-11 text-xs"
            )}
            onClick={handleAddToCartClick}
            disabled={isAddToCartDisabled}
            >
            {product.hasVariants ? <Layers className={cn("mr-2", isSmallMode ? "h-3.5 w-3.5" : "h-5 w-5")} /> : <ShoppingCart className={cn("mr-2", isSmallMode ? "h-3.5 w-3.5" : "h-5 w-5")} />} {product.hasVariants ? "Select Options" : "Add to Cart"}
            </Button>
        </CardFooter>
        </Card>
    );
});
ProductCard.displayName = 'ProductCard';
