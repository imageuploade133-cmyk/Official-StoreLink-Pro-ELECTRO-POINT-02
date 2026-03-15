'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { roles, allPermissions } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import groupBy from 'lodash/groupBy';
import AccessDenied from '@/components/staff-management/AccessDenied';

export default function PermissionsPage() {
  const { isAdmin, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AccessDenied />;
  }

  const permissionsByModule = groupBy(allPermissions, 'module');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-semibold">Roles & Permissions</h1>
      </div>
      <CardDescription className="max-w-3xl">
        This page provides a read-only overview of the permissions assigned to each role. Roles and their associated permissions are defined in the application's code to ensure system stability and security. To change a user's access level, assign them a different role on the Staff Management page.
      </CardDescription>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-6">
                        {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                            <div key={moduleName}>
                                <h4 className="font-semibold text-sm mb-3 border-b pb-2">{moduleName}</h4>
                                <div className="space-y-4">
                                {perms.map((permission) => (
                                    <div key={permission.id} className="flex items-start space-x-3">
                                        <Checkbox
                                            id={`${role.id}-${permission.id}`}
                                            checked={role.permissions.includes(permission.id)}
                                            disabled
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor={`${role.id}-${permission.id}`} className="font-medium cursor-not-allowed">
                                                {permission.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {permission.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
