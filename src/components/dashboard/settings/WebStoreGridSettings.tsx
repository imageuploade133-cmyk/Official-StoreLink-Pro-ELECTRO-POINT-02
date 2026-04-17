'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Check, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WebStoreGridSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const DEFAULT_GRID_VALUES = {
  storeGridColumnsDefault: 2 as const,
  storeGridColumnsSm: 2 as const,
  storeGridColumnsMd: 3 as const,
  storeGridColumnsLg: 4 as const,
  storeGridColumnsCustom: 5,
};

export function WebStoreGridSettings({ settingsData, isLoading, storeId }: WebStoreGridSettingsProps) {
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const [defaultColumns, setDefaultColumns] = useState<2 | 3>(
    settingsData?.storeGridColumnsDefault || DEFAULT_GRID_VALUES.storeGridColumnsDefault
  );
  const [smColumns, setSmColumns] = useState<2 | 3>(
    settingsData?.storeGridColumnsSm || DEFAULT_GRID_VALUES.storeGridColumnsSm
  );
  const [mdColumns, setMdColumns] = useState<2 | 3 | 4>(
    settingsData?.storeGridColumnsMd || DEFAULT_GRID_VALUES.storeGridColumnsMd
  );
  const [lgColumns, setLgColumns] = useState<2 | 3 | 4 | 'custom'>(
    settingsData?.storeGridColumnsLg || DEFAULT_GRID_VALUES.storeGridColumnsLg
  );
  const [customColumns, setCustomColumns] = useState(
    settingsData?.storeGridColumnsCustom || DEFAULT_GRID_VALUES.storeGridColumnsCustom
  );

  useEffect(() => {
    if (settingsData) {
      setDefaultColumns(settingsData.storeGridColumnsDefault || DEFAULT_GRID_VALUES.storeGridColumnsDefault);
      setSmColumns(settingsData.storeGridColumnsSm || DEFAULT_GRID_VALUES.storeGridColumnsSm);
      setMdColumns(settingsData.storeGridColumnsMd || DEFAULT_GRID_VALUES.storeGridColumnsMd);
      setLgColumns(settingsData.storeGridColumnsLg || DEFAULT_GRID_VALUES.storeGridColumnsLg);
      setCustomColumns(settingsData.storeGridColumnsCustom || DEFAULT_GRID_VALUES.storeGridColumnsCustom);
    }
  }, [settingsData]);

  // Reset status message after 4 seconds
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleReset = () => {
    setDefaultColumns(DEFAULT_GRID_VALUES.storeGridColumnsDefault);
    setSmColumns(DEFAULT_GRID_VALUES.storeGridColumnsSm);
    setMdColumns(DEFAULT_GRID_VALUES.storeGridColumnsMd);
    setLgColumns(DEFAULT_GRID_VALUES.storeGridColumnsLg);
    setCustomColumns(DEFAULT_GRID_VALUES.storeGridColumnsCustom);
  };

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
        storeGridColumnsDefault: defaultColumns,
        storeGridColumnsSm: smColumns,
        storeGridColumnsMd: mdColumns,
        storeGridColumnsLg: lgColumns,
        ...(lgColumns === 'custom' && { storeGridColumnsCustom: customColumns })
      };

      console.log("[v0] Saving grid settings:", updateData);

      // Also save to old location for compatibility
      if (storeId) {
        const oldSettingsRef = doc(firestore, 'settings', storeId);
        await setDoc(oldSettingsRef, updateData, { merge: true });
      }

      await setDoc(settingsRef, updateData, { merge: true });
      console.log("[v0] Settings updated successfully");

      setSaveStatus('success');
      console.log("[v0] Grid settings saved successfully");
    } catch (error: any) {
      console.error("[v0] Error saving grid settings:", error);
      setSaveStatus('error');
      setErrorMessage(error?.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700  hover: transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold">Web Store Product Grid Layout</CardTitle>
              <CardDescription className="mt-1">
                Customize how many products display per row on different screen sizes. Changes apply instantly across your entire store.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-10">
        {/* Device Type Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide">Device Breakpoints</p>
          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
            Configure grid columns for each device size: extra small phones (xs) → small phones (sm) → tablets (md) → desktops (lg)
          </p>
        </div>

        {/* Default (xs) Grid Columns */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <Label className="text-base font-semibold">Default Layout</Label>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">XS screens (extra small phones)</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Smallest mobile devices for maximum readability</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[2, 3].map((cols) => (
              <button
                key={cols}
                onClick={() => setDefaultColumns(cols as 2 | 3)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-950',
                  defaultColumns === cols
                    ? 'border-primary bg-primary/10 '
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:'
                )}
              >
                <div className={cn('grid gap-1', cols === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                  {[...Array(cols)].map((_, i) => (
                    <div key={i} className={cn('aspect-square rounded', defaultColumns === cols ? 'bg-primary/30' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500')} />
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2">{cols} Columns</p>
              </button>
            ))}
          </div>
        </div>

        {/* Small (sm) Grid Columns */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-baseline gap-2">
            <Label className="text-base font-semibold">Small Layout</Label>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">SM screens (small phones)</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Compact devices like older smartphones</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[2, 3].map((cols) => (
              <button
                key={cols}
                onClick={() => setSmColumns(cols as 2 | 3)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  smColumns === cols
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <div className={cn('grid gap-1', cols === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                  {[...Array(cols)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-300 dark:bg-slate-600 rounded" />
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2">{cols} Columns</p>
              </button>
            ))}
          </div>
        </div>

        {/* Medium (md) Grid Columns */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-baseline gap-2">
            <Label className="text-base font-semibold">Medium Layout</Label>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">MD screens (tablets)</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Tablets and larger phones for balanced browsing</p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[2, 3, 4].map((cols) => (
              <button
                key={cols}
                onClick={() => setMdColumns(cols as 2 | 3 | 4)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  mdColumns === cols
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'grid gap-1',
                  cols === 2 && 'grid-cols-2',
                  cols === 3 && 'grid-cols-3',
                  cols === 4 && 'grid-cols-4'
                )}>
                  {[...Array(cols)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-300 dark:bg-slate-600 rounded" />
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2">{cols} Columns</p>
              </button>
            ))}
          </div>
        </div>

        {/* Large (lg) Grid Columns */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-baseline gap-2">
            <Label className="text-base font-semibold">Large Layout</Label>
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">LG screens (desktop)</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Desktop computers and large monitors for maximum product showcase</p>
          <div className="grid grid-cols-5 gap-3">
            {[2, 3, 4].map((cols) => (
              <button
                key={cols}
                onClick={() => setLgColumns(cols as 2 | 3 | 4)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  lgColumns === cols
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'grid gap-1',
                  cols === 2 && 'grid-cols-2',
                  cols === 3 && 'grid-cols-3',
                  cols === 4 && 'grid-cols-4'
                )}>
                  {[...Array(cols)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-300 dark:bg-slate-600 rounded" />
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2">{cols} Columns</p>
              </button>
            ))}
            <button
              onClick={() => setLgColumns('custom')}
              className={cn(
                'p-4 rounded-lg border-2 transition-all flex items-center justify-center',
                lgColumns === 'custom'
                  ? 'border-primary bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
              )}
            >
              <span className="text-sm font-semibold">Custom</span>
            </button>
          </div>

          {/* Custom Columns Input */}
          {lgColumns === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="customCols">Number of Columns (2-8)</Label>
              <Input
                id="customCols"
                type="number"
                min="2"
                max="8"
                value={customColumns}
                onChange={(e) => setCustomColumns(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))}
                className="max-w-xs"
              />
            </div>
          )}
        </div>

        {/* Preview Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold mb-2">Layout Summary:</p>
          <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <li>• <strong>Default (xs):</strong> {defaultColumns} column{defaultColumns > 1 ? 's' : ''}</li>
            <li>• <strong>Small (sm):</strong> {smColumns} column{smColumns > 1 ? 's' : ''}</li>
            <li>• <strong>Medium (md):</strong> {mdColumns} column{mdColumns > 1 ? 's' : ''}</li>
            <li>• <strong>Large (lg):</strong> {lgColumns === 'custom' ? `${customColumns} column${customColumns > 1 ? 's' : ''}` : `${lgColumns} column${lgColumns > 1 ? 's' : ''}`}</li>
          </ul>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Grid layout saved successfully!
            </p>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {errorMessage || 'Failed to save grid layout. Please try again.'}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            className={cn(
              "flex-1 transition-all",
              saveStatus === 'success' && 'bg-green-600 hover:bg-green-700',
              saveStatus === 'error' && 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Grid Layout...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              'Save Grid Layout'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
