'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  isLoading?: boolean;
  itemsPerPageOptions?: number[];
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false,
  itemsPerPageOptions = [10, 15, 25, 50, 100],
}: AdvancedPaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    onItemsPerPageChange(parseInt(value, 10));
  };

  if (totalPages <= 1 && itemsPerPage >= totalItems) {
    return null;
  }

  const startItem = Math.max(1, (currentPage - 1) * itemsPerPage + 1);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Items per page:
        </label>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={handleItemsPerPageChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {itemsPerPageOptions.map((option) => (
              <SelectItem key={option} value={option.toString()}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground font-medium tabular-nums">
        Showing {startItem} to {endItem} of {totalItems}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1 || isLoading}
          className="h-8 text-xs font-bold"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Previous
        </Button>

        <span className="text-xs font-semibold text-muted-foreground min-w-16 text-center">
          Page {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
          className="h-8 text-xs font-bold"
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
