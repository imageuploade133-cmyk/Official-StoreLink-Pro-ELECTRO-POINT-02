'use client';

import React from 'react';
import { OfflineDetector } from '@/components/OfflineDetector';

export default function StoreAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OfflineDetector>
      {children}
    </OfflineDetector>
  );
}
