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
      <DialogContent className="max-w-4xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border">
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between w-full">
                <div>
                    <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3 text-left">
                        <Package className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-none">{product.name}</span>
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm truncate text-left">
                        A detailed sales and inventory log for this product.
                    </DialogDescription>
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0">
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
                </DialogClose>
            </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/20">
          <div className="p-4 sm:p-6 space-y-6">
            <Card className="border-none sm:border shadow-none sm:shadow-sm">
                <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:col-span-1">
                         <Image
                            src={product.imageUrl || defaultProductImageUrl}
                            alt={product.name}
                            width={100}
                            height={100}
                            className="rounded-lg object-cover aspect-square border-2 shadow-sm shrink-0 sm:w-[120px] sm:h-[120px]"
                            data-ai-hint={product.dataAiHint || product.name.toLowerCase().split(' ').slice(0,2).join(' ')}
                        />
                        <div className="text-xs sm:text-sm flex-1 min-w-0">
                            {product.sku && <p className="truncate"><span className="font-medium text-muted-foreground uppercase text-[10px]">SKU:</span> <br className="sm:hidden" /> {product.sku}</p>}
                            {product.barcode && <p className="truncate mt-1 sm:mt-0"><span className="font-medium text-muted-foreground uppercase text-[10px]">Barcode:</span> <br className="sm:hidden" /> {product.barcode}</p>}
                        </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-3 gap-2 sm:gap-4 bg-muted/50 p-2 sm:p-4 rounded-xl">
                        <div className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg text-center bg-green-50 dark:bg-green-950/20">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 mb-1 text-green-600" />
                            <p className="text-sm sm:text-xl font-bold font-mono truncate w-full">{formatCurrency(product.totalRevenueGenerated, currencySymbol)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Revenue</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg text-center bg-blue-50 dark:bg-blue-950/20">
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mb-1 text-blue-600" />
                            <p className="text-sm sm:text-xl font-bold truncate w-full">{product.totalQuantitySold}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Sold</p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-lg text-center bg-amber-50 dark:bg-amber-950/20">
                            <Boxes className="h-4 w-4 sm:h-5 sm:w-5 mb-1 text-amber-600" />
                            <p className="text-sm sm:text-xl font-bold truncate w-full">{product.currentStock}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Stock</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none sm:border shadow-none sm:shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Hash className="h-5 w-5 text-primary"/> Individual Sales Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                {detailedSalesEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-4">
                        <Info className="h-16 w-16 text-gray-300 dark:text-gray-700" />
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">No Sales Found</h3>
                            <p>There are no individual sales transactions for this product in the current time range.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[180px]"><CalendarDays className="h-4 w-4 inline mr-1.5"/>Date & Time</TableHead>
                                        <TableHead className="text-right">Qty Sold</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead><UserCircle className="h-4 w-4 inline mr-1.5"/>Staff Member</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailedSalesEntries.map((entry) => (
                                    <TableRow key={entry.saleId + entry.saleDate.toISOString()} className="hover:bg-muted/50">
                                        <TableCell className="font-medium text-sm">{format(entry.saleDate, "PP p")}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary" className="font-semibold">{entry.quantitySold}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(entry.unitPrice, currencySymbol)}</TableCell>
                                        <TableCell className="truncate max-w-[150px]" title={entry.staffName}>{entry.staffName}</TableCell>
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

                        <div className="md:hidden space-y-3">
                            {detailedSalesEntries.map((entry) => (
                                <div 
                                    key={entry.saleId + entry.saleDate.toISOString()} 
                                    className="p-4 rounded-xl border bg-card shadow-sm active:bg-muted/50 transition-colors"
                                    onClick={() => handleViewSaleDetails(entry.saleId)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">{format(entry.saleDate, "MMM dd, yyyy")}</p>
                                            <p className="text-[10px] text-muted-foreground">{format(entry.saleDate, "h:mm a")}</p>
                                        </div>
                                        <Badge variant="secondary" className="font-bold">Qty: {entry.quantitySold}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserCircle className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.staffName}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold font-mono">{formatCurrency(entry.unitPrice, currencySymbol)}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Unit Price</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
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
