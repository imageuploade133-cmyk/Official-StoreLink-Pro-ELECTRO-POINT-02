"use client"

import React from "react"
import Image from "next/image"
import { format } from "date-fns"
import { Eye, X, Package, Info, CalendarDays, UserCircle, DollarSign, Hash, TrendingUp, Boxes } from "lucide-react"

import type { SaleTransaction, StaffMember, AggregatedProductSale as AggregatedProductSaleType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/formatUtils"
import { SaleDetailsModal } from "@/components/dialogs/sale-details-modal"
import { useSettings } from "@/contexts/settings-context"
import { convertToDateSafely } from "@/lib/utils"

interface ProductSalesDetailsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  product: AggregatedProductSaleType | null
  allSalesTransactions: SaleTransaction[]
  staffMap: Map<string, StaffMember>
  currencySymbol: string
}

interface DetailedSaleEntry {
  saleId: string
  saleDate: Date
  quantitySold: number
  unitPrice: number
  staffName: string
}

export function ProductSalesDetailsModal({
    isOpen,
    onOpenChange,
    product,
    allSalesTransactions,
    staffMap,
    currencySymbol,
}: ProductSalesDetailsModalProps) {
  const { settings } = useSettings();
  const defaultProductImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';
  
  const [saleToView, setSaleToView] = React.useState<SaleTransaction | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = React.useState(false);

  if (!isOpen || !product) {
    return null;
  }

  const handleViewSaleDetails = (saleId: string) => {
    const sale = allSalesTransactions.find(s => s.id === saleId);
    if (sale) {
        setSaleToView(sale);
        setIsSubModalOpen(true);
    }
  };

  const detailedSalesEntries: DetailedSaleEntry[] = [];
  allSalesTransactions.forEach(sale => {
    const itemSold = sale.items.find(item => item.productId === product.id);
    
    if (itemSold && sale.staffId) {
      const staff = staffMap.get(sale.staffId);
      const saleDate = convertToDateSafely(sale.createdAt);

      if (saleDate) {
        const staffName = staff?.name || staff?.email || `User ID: ${sale.staffId.substring(0, 8)}...`;
        detailedSalesEntries.push({
          saleId: sale.id,
          saleDate: saleDate,
          quantitySold: itemSold.quantity,
          unitPrice: itemSold.unitPrice,
          staffName: staffName,
        });
      }
    }
  });
  detailedSalesEntries.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h flex flex-col p-0 grid grid-rows">
        <DialogHeader className="flex flex-row items-start justify-between p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <Package className="h-7 w-7 text-primary" />
                    {product.name}
                </DialogTitle>
                <DialogDescription>
                    A detailed sales and inventory log for this product.
                </DialogDescription>
            </div>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full flex-shrink-0">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </Button>
            </DialogClose>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/20">
          <div className="p-6 space-y-6">
            <Card>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center md:items-start md:col-span-1">
                         <Image
                            src={product.imageUrl || defaultProductImageUrl}
                            alt={product.name}
                            width={120}
                            height={120}
                            className="rounded-lg object-cover aspect-square border-2 "
                            data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0,2).join(' ')}
                        />
                        <div className="text-sm mt-4 text-center md:text-left">
                            {product.sku && <p><span className="font-medium text-muted-foreground">SKU:</span> {product.sku}</p>}
                            {product.barcode && <p><span className="font-medium text-muted-foreground">Barcode:</span> {product.barcode}</p>}
                        </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg text-center bg-green-50 dark:bg-green-950/20">
                            <DollarSign className="h-6 w-6 mb-2 text-muted-foreground" />
                            <p className="text-xl font-bold">{formatCurrency(product.totalRevenueGenerated, currencySymbol)}</p>
                            <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg text-center bg-blue-50 dark:bg-blue-950/20">
                            <TrendingUp className="h-6 w-6 mb-2 text-muted-foreground" />
                            <p className="text-xl font-bold">{product.totalQuantitySold}</p>
                            <p className="text-xs text-muted-foreground">Total Units Sold</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg text-center bg-amber-50 dark:bg-amber-950/20">
                            <Boxes className="h-6 w-6 mb-2 text-muted-foreground" />
                            <p className="text-xl font-bold">{product.currentStock}</p>
                            <p className="text-xs text-muted-foreground">Current Stock</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary"/> Individual Sales Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailedSalesEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-4">
                        <Info className="h-16 w-16 text-gray-300 dark:text-gray-700" />
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">No Sales Found</h3>
                            <p>There are no individual sales transactions for this product in the current time range.</p>
                        </div>
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w"><CalendarDays className="h-4 w-4 inline mr-1.5"/>Date & Time</TableHead>
                                    <TableHead className="text-right">Qty Sold</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead><UserCircle className="h-4 w-4 inline mr-1.5"/>Staff Member</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailedSalesEntries.map((entry) => (
                                <TableRow key={entry.saleId + entry.saleDate.toISOString()} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{format(entry.saleDate, "EEEE, MMMM do, yyyy 'at' h:mm a")}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="font-semibold">{entry.quantitySold}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(entry.unitPrice, currencySymbol)}</TableCell>
                                    <TableCell className="truncate max-w" title={entry.staffName}>{entry.staffName}</TableCell>
                                    <TableCell className="text-center">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8"
                                          onClick={() => handleViewSaleDetails(entry.saleId)}
                                        >
                                          <Eye className="h-4 w-4" />
                                          <span className="sr-only">View Sale Details</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
        
        {saleToView && (
            <SaleDetailsModal
                isOpen={isSubModalOpen}
                onOpenChange={setIsSubModalOpen}
                saleTransaction={saleToView}
                currencySymbol={currencySymbol}
                staffMap={staffMap}
            />
        )}
      </DialogContent>
    </Dialog>
  )
}
