'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function SignupRedirect() {
  const router = useRouter();
  const { user, store, staffMember, isCustomer, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (store || staffMember) {
          router.replace('/dashboard');
        } else if (isCustomer) {
          router.replace('/store/account');
        } else {
          router.replace('/signup-merchant');
        }
      } else {
        router.replace('/store/signup');
      }
    }
  }, [user, store, staffMember, isCustomer, isLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
