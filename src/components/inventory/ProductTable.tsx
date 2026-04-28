'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  PackageSearch, 
  AlertTriangle, 
  Truck, 
  Clock,
  Image as LucideImageIcon,
  Share2,
  Share,
  ExternalLink,
  Link as LinkIcon,
  Send,
  Copy,
  LayoutGrid
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Product, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { getStoreUrl as getAbsoluteStoreUrl } from '@/lib/domain';

const shareIcons: Record<string, any> = {
  Share2,
  Share,
  ExternalLink,
  LinkIcon,
  Send,
};

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onOpenActions: (product: Product) => void;
  currencySymbol: string;
  globalLowStockThreshold: number;
}

export function ProductTable({ products, categories, onOpenActions, currencySymbol, globalLowStockThreshold }: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { settings } = useSettings();
  const { store } = useAuth();
  const { toast } = useToast();
  const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';

  const ShareIcon = shareIcons[settings?.productSharingIcon || 'Share2'] || Share2;

  const handleShare = (product: Product) => {
    if (!store) {
        const origin = window.location.origin;
        const url = `${origin}/store/product/${product.slug || product.id}`;
        copyToClipboard(url);
        return;
    }

    const baseUrl = getAbsoluteStoreUrl(
        store.id, 
        store.plan || 'free', 
        store.customDomain, 
        store.subdomain, 
        store.primaryDomainType
    );
    
    let path = `/product/${product.slug || product.id}`;
    const fullUrl = `${baseUrl}${path}`;
    
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on our store!`,
        url: fullUrl,
      }).catch(() => {
        copyToClipboard(fullUrl);
      });
    } else {
      copyToClipboard(fullUrl);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied',
      description: 'Product link has been copied to clipboard.',
    });
  };

  const productsWithCategoryNames = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    return products.map(p => ({
      ...p,
      categoryName: categoryMap.get(p.categoryId || '') || 'Uncategorized',
    }));
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    return productsWithCategoryNames.filter(product => {
    const searchLower = searchTerm.toLowerCase();

    const matchesMain = product.name.toLowerCase().includes(searchLower) ||
      product.categoryName.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.supplierName?.toLowerCase().includes(searchLower);

    if (matchesMain) return true;

    // Search in variants
    if (product.hasVariants && product.variants) {
      return product.variants.some(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.sku?.toLowerCase().includes(searchLower) ||
        v.barcode?.toLowerCase().includes(searchLower)
      );
    }

    return false;
  });
  }, [productsWithCategoryNames, searchTerm]);

  if (products.length === 0) {
      return (
          <div className="text-center py-16">
              <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Products Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                  Get started by adding your first product.
              </p>
          </div>
      );
  }


  return (
    <TooltipProvider>
    <div>
      <div className="p-4 border-b">
        <Input
          placeholder="Search by name, category, SKU, or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Preview</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => {
            const threshold = product.lowStockThreshold ?? globalLowStockThreshold;
            const isLowStock = product.stock > 0 && product.stock <= threshold;
            const isOutOfStock = product.stock <= 0;
            
            const expiryDate = product.expiryDate instanceof Date 
              ? product.expiryDate 
              : (product.expiryDate as any)?.toDate?.();
            const isExpired = expiryDate ? expiryDate < new Date() : false;

            return (
              <TableRow
                key={product.id}
                className={cn(
                    "transition-colors group",
                    isExpired && "bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/10 dark:hover:bg-destructive/20",
                    !isExpired && isOutOfStock && "bg-red-50/50 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20",
                    !isExpired && isLowStock && "bg-orange-50/50 hover:bg-orange-50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20"
                )}
              >
                <TableCell>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-background shadow-sm bg-muted flex items-center justify-center shrink-0">
                        <Image
                            src={(product.imageUrl && product.imageUrl.trim() !== "") ? product.imageUrl : defaultProductImageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-110 duration-300"
                            unoptimized
                        />
                    </div>
                </TableCell>
                <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            {product.name}
                            {product.hasVariants && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <LayoutGrid className="h-3.5 w-3.5 text-indigo-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>This product has variants</TooltipContent>
                                </Tooltip>
                            )}
                            {isExpired && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Clock className="h-3.5 w-3.5 text-destructive cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>Product Expired!</TooltipContent>
                                </Tooltip>
                            )}
                            {isLowStock && !isExpired && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>Low Stock (Threshold: {threshold})</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                        {expiryDate && (
                            <span className={cn(
                                "text-[10px] font-medium",
                                isExpired ? "text-destructive" : "text-muted-foreground"
                            )}>
                                {isExpired ? 'Expired: ' : 'Expires: '}{format(expiryDate, "PP")}
                            </span>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tighter">
                        {product.categoryName}
                    </Badge>
                </TableCell>
                <TableCell>
                    {product.supplierName ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{product.supplierName}</span>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-300 italic">No Supplier</span>
                    )}
                </TableCell>
                <TableCell className="font-mono text-xs">{product.sku || 'N/A'}</TableCell>
                <TableCell className="text-right font-black">
                    <div className="flex flex-col items-end">
                        {product.newPrice ? (
                            <>
                                <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">
                                    {formatCurrency(product.sellingPrice || 0, currencySymbol)}
                                </span>
                                <span className="text-green-600">
                                    {formatCurrency(product.newPrice, currencySymbol)}
                                </span>
                            </>
                        ) : (
                            formatCurrency(product.sellingPrice || 0, currencySymbol)
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                  {isOutOfStock ? (
                    <Badge variant="destructive" className="font-black uppercase tracking-tighter text-[10px]">Out of Stock</Badge>
                  ) : isLowStock ? (
                    <Badge variant="outline" className="text-orange-600 border-orange-500 font-black bg-white dark:bg-slate-900">
                        {product.stock}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="font-bold">{product.stock}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {settings?.enableProductSharing && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => handleShare(product)}
                          >
                            <ShareIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share Product</TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => onOpenActions(product)}
                    >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}