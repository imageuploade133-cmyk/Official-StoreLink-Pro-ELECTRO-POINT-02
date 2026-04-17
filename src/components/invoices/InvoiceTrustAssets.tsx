
'use client';

import React from 'react';
import Image from 'next/image';
import { 
  CheckCircle2, 
  Landmark,
  Stamp,
  PenTool
} from 'lucide-react';
import type { Settings } from '@/lib/types';

interface InvoiceTrustAssetsProps {
  settings: Settings | null;
  status: 'draft' | 'paid' | 'credit';
  invoiceAccentColor?: string;
}

/**
 * InvoiceTrustAssets - Centralized component for rendering 
 * Official Stamp, Authorized Signature, and Bank Details.
 * Respects global visibility settings and document status protocols.
 */
export function InvoiceTrustAssets({ settings, status, invoiceAccentColor }: InvoiceTrustAssetsProps) {
  if (!settings) return null;

  // Logic: 
  // 1. Bank details only show if not hidden AND (draft or credit) AND details exist.
  const showBankDetails = !settings.invoiceHideBankDetails && (status === 'draft' || status === 'credit') && settings.invoiceBankDetails;
  
  // 2. Signature and Stamp only show if not hidden globally.
  const showSignature = !settings.invoiceHideSignature;
  const showStamp = !settings.invoiceHideStamp;

  return (
    <div className="flex flex-col md:flex-row justify-between gap-16 relative mt-12 mb-auto">
      <div className="flex-1 space-y-10">
        {/* Settlement Details (Conditional Registry Rendering) */}
        {showBankDetails && (
          <div className="p-6 bg-primary/5 rounded border border-primary/10 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-primary">
              <Landmark className="h-4 w-4" />
              <span className="text font-black uppercase tracking-widest">Bank Account</span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              {settings.invoiceBankDetails}
            </p>
          </div>
        )}

        {/* Authorized Signature Section */}
        {showSignature && (
          <div className="space-y-4">
            <div className="w-full h-12 border-b-2 border-slate-200 dark:border-slate-800 flex items-end pb-1 italic text-slate-300 relative">
              {status === 'paid' && <CheckCircle2 className="h-10 w-10 text-green-500/20 mb-2" />}
              {settings.invoiceSignatureUrl && (
                <div className="absolute left-4 bottom-1 h-16 w-48 pointer-events-none">
                  <Image 
                    src={settings.invoiceSignatureUrl} 
                    alt="Authorized Signature" 
                    fill 
                    className="object-contain" 
                    unoptimized 
                  />
                </div>
              )}
            </div>
            <p className="text font-black uppercase text-slate-400 tracking">
                {settings.invoiceSignatureLabel || 'Authorized Operational Signature'}
            </p>
          </div>
        )}
        
        {/* Official Stamp / Verification Hub */}
        {showStamp && (
          <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800  min-h">
            {settings.invoiceStampUrl ? (
              <div className="relative w-32 h-32 rotate-12">
                <Image 
                  src={settings.invoiceStampUrl} 
                  alt="Official Stamp" 
                  fill 
                  className="object-contain" 
                  unoptimized 
                />
              </div>
            ) : (
              <div className="text-center space-y-2 opacity-20">
                <CheckCircle2 className="h-10 w-10 mx-auto" />
                <p className="text font-black uppercase tracking-widest text-slate-400">Official Seal</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
