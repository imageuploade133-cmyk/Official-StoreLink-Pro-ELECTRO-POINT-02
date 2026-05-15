'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PageSpinner } from '@/components/ui/spinner';

const loadingStates = [
  { label: 'StoreLink Pro', subLabel: 'Initializing your workspace…' },
  { label: 'StoreLink Pro', subLabel: 'Checking your session…' },
  { label: 'StoreLink Pro', subLabel: 'Almost ready…' },
];

export default function HomePage() {
  const { user, store, staffMember, isCustomer, isLoading } = useAuth();
  const router = useRouter();
  const [stateIndex, setStateIndex] = useState(0);

  // Cycle through loading messages every 1.8s for a lively feel
  useEffect(() => {
    const interval = setInterval(() => {
      setStateIndex((prev) => (prev + 1) % loadingStates.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (store || staffMember) {
          router.replace('/dashboard');
        } else if (isCustomer) {
          // Use a relative path or a more specific store-based path if possible
          router.replace('/global/account');
        } else {
          // Logged in but no recognized role, could be a new merchant
          router.replace('/signup-merchant');
        }
      } else {
        // Default for visitors: Show the store
        // Only redirect if we are truly at the root to avoid interference
        if (window.location.pathname === '/') {
           router.replace('/global');
        }
      }
    }
  }, [user, store, staffMember, isCustomer, isLoading, router]);

  const current = loadingStates[stateIndex];

  return (
    <PageSpinner
      label={current.label}
      subLabel={current.subLabel}
    />
  );
}
