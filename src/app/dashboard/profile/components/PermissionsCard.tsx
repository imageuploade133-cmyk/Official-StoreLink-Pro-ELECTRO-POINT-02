'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShieldCheck, CheckCircle } from 'lucide-react';
import { allPermissions } from '@/lib/roles';
import type { PermissionId } from '@/lib/types';
import groupBy from 'lodash/groupBy';

interface PermissionsCardProps {
  userPermissions: Record<PermissionId, boolean>;
}

export function PermissionsCard({ userPermissions }: PermissionsCardProps) {
  const grantedPermissions = React.useMemo(() => 
    allPermissions.filter(p => userPermissions[p.id]),
    [userPermissions]
  );

  if (grantedPermissions.length === 0) {
    return null;
  }

  const permissionsByModule = React.useMemo(() => 
    groupBy(grantedPermissions, 'module'),
    [grantedPermissions]
  );
  
  const defaultOpenModules = React.useMemo(() => 
    Object.keys(permissionsByModule),
    [permissionsByModule]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Your Permissions
        </CardTitle>
        <CardDescription>
          This is a read-only view of the features you have access to.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {grantedPermissions.length === allPermissions.length ? (
            <div className="p-4 bg-green-50 text-green-800 rounded-md border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700">
                <p className="font-semibold">You have full Administrator access to all features.</p>
            </div>
        ) : (
        <Accordion type="multiple" defaultValue={defaultOpenModules} className="w-full">
            {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
                <AccordionItem value={moduleName} key={moduleName}>
                    <AccordionTrigger>{moduleName} ({perms.length})</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-3 pl-2">
                            {perms.map((permission) => (
                                <li key={permission.id} className="flex items-start gap-3 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium">{permission.name}</p>
                                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
