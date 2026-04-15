'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { StaffMember, Role, Permission } from '@/lib/types';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import groupBy from 'lodash/groupBy';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const createStaffFormSchema = (isEditing: boolean) => {
    const baseSchema = z.object({
        name: z.string().min(2, 'Name must be at least 2 characters long.'),
        email: z.string().trim().email('Please enter a valid email address.'),
        phone: z.string().optional(),
        role: z.string().min(1, 'Role is required for display purposes.'),
        status: z.enum(['Active', 'Inactive']),
        pages: z.array(z.string()).min(1, "At least one page permission is required."),
        password: isEditing ? z.string().optional() : z.string().min(6, 'Password must be at least 6 characters long.'),
        confirmPassword: isEditing ? z.string().optional() : z.string().min(6, 'Please confirm the password.'),
    });

    return baseSchema.refine(data => isEditing || data.password === data.confirmPassword, {
            message: "Passwords do not match",
            path: ["confirmPassword"],
        });
};


interface StaffFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any, existingStaff?: StaffMember | null) => void;
  isSubmitting: boolean;
  existingStaff: StaffMember | null;
  roles: Role[];
  allPermissions: Permission[];
}

export default function StaffFormDialog({
  isOpen,
  onOpenChange,
  onSave,
  isSubmitting,
  existingStaff,
  roles,
  allPermissions,
}: StaffFormDialogProps) {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = !!existingStaff;

  const StaffFormSchema = useMemo(() => {
    return createStaffFormSchema(isEditing);
  }, [isEditing]);
  type StaffFormValues = z.infer<typeof StaffFormSchema>;
  
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(StaffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: '',
      status: 'Active',
      pages: [],
      password: '',
      confirmPassword: '',
    },
  });

  const isEditingSelfAsAdmin = existingStaff && user && existingStaff.uid === user.uid;

  useEffect(() => {
    if (isOpen) {
      if (existingStaff) {
        form.reset({
          name: existingStaff.name,
          email: existingStaff.email,
          phone: existingStaff.phone || '',
          role: existingStaff.role,
          status: existingStaff.status || 'Active',
          pages: existingStaff.permissions?.pages || [],
          password: '',
          confirmPassword: '',
        });
      } else {
        const defaultRole = roles.find(r => r.id === 'pos_only') || roles[0];
        form.reset({
          name: '',
          email: '',
          phone: '',
          role: defaultRole.id,
          status: 'Active',
          pages: defaultRole.permissions || [],
          password: '',
          confirmPassword: '',
        });
      }
    }
  }, [isOpen, existingStaff, roles, form]);

  const onSubmit = (values: StaffFormValues) => {
    onSave(values, existingStaff);
  };
  
  const handleRolePresetChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
        form.setValue('role', role.id);
        form.setValue('pages', role.permissions, { shouldValidate: true });
    }
  };

  const permissionsByModule = groupBy(allPermissions, 'module');
  const watchedPages = form.watch('pages') || [];
  const isPosSelected = watchedPages.includes('canAccessPOS');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{existingStaff ? 'Edit Staff Member' : 'Add New Staff'}</DialogTitle>
          <DialogDescription>
            {existingStaff ? `Update the details for ${existingStaff.name}.` : 'Create a new staff profile and set their role and permissions.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="staff-form" className="flex-1 overflow-auto">
            <ScrollArea className="h-full pr-6">
                <div className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSubmitting || !!isEditingSelfAsAdmin} />
                        </FormControl>
                        {isEditingSelfAsAdmin && (
                          <FormDescription className="text-xs text-blue-600">
                             You can edit your own name on the{' '}
                            <Link href="/dashboard/profile" className="underline font-medium" onClick={() => onOpenChange(false)}>
                              My Profile
                            </Link>{' '}
                            page.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={isSubmitting || !!existingStaff} />
                        </FormControl>
                         {!existingStaff && <p className="text-xs text-muted-foreground">This will be used for login.</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 {!existingStaff && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'} {...field} disabled={isSubmitting} placeholder="Min. 6 characters" />
                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input type={showPassword ? 'text' : 'password'} {...field} disabled={isSubmitting} placeholder="Re-enter password" />
                                         <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} value={field.value || ''} disabled={isSubmitting} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role Preset</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); handleRolePresetChange(value); }} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role preset..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role.id} value={role.id}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                                <p className="text-xs text-muted-foreground">Select a preset to apply a set of permissions.</p>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>
                
                <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Page Permissions</h3>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('pages', allPermissions.map(p => p.id), { shouldValidate: true })}
                                disabled={isSubmitting}
                            >
                                Select All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue('pages', [], { shouldValidate: true })}
                                disabled={isSubmitting}
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="pages"
                      render={({ field }) => (
                        <FormItem>
                          <Accordion type="multiple" defaultValue={Object.keys(permissionsByModule)} className="w-full">
                            {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                              <AccordionItem value={moduleName} key={moduleName}>
                                <AccordionTrigger>{moduleName}</AccordionTrigger>
                                <AccordionContent className="space-y-3">
                                  {perms.map((permission) => {
                                    const isMySalesHistory = permission.id === 'view_my_sales';
                                    const isPosAccess = permission.id === 'canAccessPOS';
                                    const isDisabledByDependency = isMySalesHistory && isPosSelected;

                                    return (
                                      <FormItem
                                        key={permission.id}
                                        className={cn(
                                          "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 hover:bg-muted/50 transition-colors",
                                          isDisabledByDependency && "bg-muted/50 border-primary/20"
                                        )}
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(permission.id)}
                                            onCheckedChange={(checked) => {
                                              let newValue = checked
                                                ? [...(field.value || []), permission.id]
                                                : (field.value || []).filter(
                                                    (value) => value !== permission.id
                                                  );
                                              
                                              // Auto-select logic for POS -> My Sales History
                                              if (isPosAccess && checked) {
                                                if (!newValue.includes('view_my_sales')) {
                                                  newValue.push('view_my_sales');
                                                }
                                              }

                                              field.onChange(newValue);
                                            }}
                                            disabled={isSubmitting || isDisabledByDependency}
                                          />
                                        </FormControl>
                                        <div className="space-y-1">
                                          <FormLabel className="text-sm font-normal cursor-pointer">
                                            {permission.name}
                                            {isDisabledByDependency && (
                                              <span className="ml-2 inline-flex items-center text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                                                <AlertCircle className="mr-1 h-2.5 w-2.5" /> Required for POS
                                              </span>
                                            )}
                                          </FormLabel>
                                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                                        </div>
                                      </FormItem>
                                    );
                                  })}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                          <FormMessage className="mt-2" />
                        </FormItem>
                      )}
                    />
                </div>
                </div>
            </ScrollArea>
            </form>
        </Form>

        <DialogFooter className="mt-auto border-t pt-6">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button type="submit" form="staff-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingStaff ? 'Save Changes' : 'Create Staff Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
