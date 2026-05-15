'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { useStoreUrl } from '@/hooks/use-store-url';

export default function SignupRedirect() {
  const router = useRouter();
  const { user, store, staffMember, isCustomer, isLoading } = useAuth();
  const { getStoreUrl } = useStoreUrl();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (store || staffMember) {
          router.replace('/dashboard');
        } else if (isCustomer) {
          router.replace(getStoreUrl('/store/account'));
        } else {
          router.replace('/signup-merchant');
        }
      } else {
        router.replace(getStoreUrl('/store/signup'));
      }
    }
  }, [user, store, staffMember, isCustomer, isLoading, router, getStoreUrl]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
