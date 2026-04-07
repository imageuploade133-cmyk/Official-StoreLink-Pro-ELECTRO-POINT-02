'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { PageSpinner } from '@/components/ui/spinner';

const loadingStates = [
  { label: 'StoreLink Pro', subLabel: 'Initializing your workspace…' },
  { label: 'StoreLink Pro', subLabel: 'Checking your session…' },
  { label: 'StoreLink Pro', subLabel: 'Almost ready…' },
];

export default function HomePage() {
  const { user, isLoading } = useUser();
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
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  const current = loadingStates[stateIndex];

  return (
    <PageSpinner
      label={current.label}
      subLabel={current.subLabel}
    />
  );
}
