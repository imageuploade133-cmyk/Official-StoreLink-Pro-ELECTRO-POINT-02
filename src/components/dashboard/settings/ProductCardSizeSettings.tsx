'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Box, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardSizeSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function ProductCardSizeSettings({ settingsData, isLoading, storeId }: ProductCardSizeSettingsProps) {
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [cardHeight, setCardHeight] = useState(380);

  useEffect(() => {
    if (settingsData?.productCardHeight) {
      setCardHeight(settingsData.productCardHeight);
    }
  }, [settingsData]);

  // Reset status message after 4 seconds
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSave = async () => {
    if (!firestore) {
      setSaveStatus('error');
      setErrorMessage('Firestore not available');
      console.log("[v0] Firestore not available");
      return;
    }
    
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');
    
    try {
      const settingsRef = storeId 
        ? doc(firestore, 'stores', storeId, 'settings', 'config')
        : doc(firestore, 'settings', 'global');
      
      const updateData = {
        productCardHeight: cardHeight
      };

      console.log("[v0] Saving card size settings:", updateData);

      // Also save to old location for compatibility
      if (storeId) {
        const oldSettingsRef = doc(firestore, 'settings', storeId);
        await setDoc(oldSettingsRef, updateData, { merge: true });
      }

      await setDoc(settingsRef, updateData, { merge: true });
      console.log("[v0] Settings updated successfully");

      setSaveStatus('success');
      console.log("[v0] Card size settings saved successfully");
    } catch (error: any) {
      console.error("[v0] Error saving card size settings:", error);
      setSaveStatus('error');
      setErrorMessage(error?.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Box className="h-5 w-5 text-primary" />
          Product Card Size
        </CardTitle>
        <CardDescription>
          Customize the height of product cards in your store grid. Increase the height to show more content per card.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Card Height Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Card Height</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="200"
                max="800"
                value={cardHeight}
                onChange={(e) => setCardHeight(Math.max(200, Math.min(800, parseInt(e.target.value) || 200)))}
                className="w-20 text-center"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">px</span>
            </div>
          </div>

          <Slider
            value={[cardHeight]}
            onValueChange={(value) => setCardHeight(value[0])}
            min={200}
            max={800}
            step={10}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>200px (Compact)</span>
            <span>800px (Spacious)</span>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Preview</Label>
          <div className="flex gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            {/* Preview Card */}
            <div 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col w-32 flex-shrink-0 transition-all duration-300"
              style={{ height: `${cardHeight}px` }}
            >
              <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex-1 flex items-center justify-center">
                <Box className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              </div>
              <div className="p-3 space-y-2 flex-shrink-0">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Current Height</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{cardHeight}px</p>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <p>This preview shows how your product cards will appear in the store with the selected height.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Card size saved successfully!
            </p>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorMessage || 'Failed to save card size. Please try again.'}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className={cn(
            "w-full transition-all",
            saveStatus === 'success' && 'bg-green-600 hover:bg-green-700',
            saveStatus === 'error' && 'bg-red-600 hover:bg-red-700'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Card Size...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Card Size'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
