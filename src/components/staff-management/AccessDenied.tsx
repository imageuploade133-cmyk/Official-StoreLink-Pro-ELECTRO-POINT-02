'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

const AccessDenied = () => {
  const router = useRouter();
  const { roleId } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      let redirectPath = '/dashboard';
      if (roleId === 'pos_only') {
        redirectPath = '/pos';
      } else if (roleId === 'inventory_only') {
        redirectPath = '/inventory';
      }
      
      router.push(redirectPath);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, roleId]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-md text-center border-destructive bg-destructive/10">
        <CardHeader>
          <div className="mx-auto bg-destructive/20 rounded-full p-4 w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive mt-4">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-destructive/90">
            You do not have permission to view this page. You will be redirected to your home page shortly.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
