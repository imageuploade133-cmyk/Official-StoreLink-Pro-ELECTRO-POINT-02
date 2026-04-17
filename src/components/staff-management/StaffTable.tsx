'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { StaffMember, Role } from '@/lib/types';
import { findRoleById } from '@/lib/roles';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';

interface StaffTableProps {
  staff: StaffMember[];
  isLoading: boolean;
  onOpenActions: (staff: StaffMember) => void;
  roles: Role[];
}

export default function StaffTable({ staff, isLoading, onOpenActions, roles }: StaffTableProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  if (isLoading) {
    return (
      <div className="border rounded-lg w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Today's Sales</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="w text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32 mt-1" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20 rounded-md" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-16 px-4 border-2 border-dashed rounded-lg">
        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Staff Members Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get started by adding your first staff member.
        </p>
      </div>
    );
  }


  return (
    <div className="border rounded-lg w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Today's Sales</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="w text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((staffMember) => (
              <TableRow key={staffMember.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={staffMember.avatar || `https://placehold.co/40x40.png`} alt={staffMember.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{staffMember.name ? staffMember.name.substring(0, 2).toUpperCase() : 'ST'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium truncate max-w">{staffMember.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w">{staffMember.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{findRoleById(staffMember.role)?.name || staffMember.role}</TableCell>
                <TableCell>
                  <Badge variant={staffMember.status === 'Active' ? 'outline' : 'destructive'} 
                         className={cn(staffMember.status === 'Active' 
                           ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800' 
                           : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800')}>
                    {staffMember.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-sm text-green-600 dark:text-green-400">
                  {formatCurrency(staffMember.todaySales ?? 0, currencySymbol)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(staffMember.totalSales ?? 0, currencySymbol)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {(staffMember.totalTransactions ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                   <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onOpenActions(staffMember)}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  );
}
