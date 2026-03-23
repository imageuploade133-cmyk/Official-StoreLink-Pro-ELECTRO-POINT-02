'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WebStoreGridSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function WebStoreGridSettings({ settingsData, isLoading }: WebStoreGridSettingsProps) {
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4 | 'custom'>(
    settingsData?.storeGridColumns || 2
  );
  const [customColumns, setCustomColumns] = useState(
    settingsData?.storeGridCustomColumns || 5
  );
  const [mobileColumns, setMobileColumns] = useState<2 | 3>(
    settingsData?.storeGridColumnsMobile || 2
  );
  const [tabletColumns, setTabletColumns] = useState<2 | 3 | 4>(
    settingsData?.storeGridColumnsTablet || 3
  );

  useEffect(() => {
    if (settingsData) {
      setGridColumns(settingsData.storeGridColumns || 2);
      setCustomColumns(settingsData.storeGridCustomColumns || 5);
      setMobileColumns(settingsData.storeGridColumnsMobile || 2);
      setTabletColumns(settingsData.storeGridColumnsTablet || 3);
    }
  }, [settingsData]);

  const handleSave = async () => {
    if (!firestore) return;
    
    setIsSaving(true);
    try {
      const settingsRef = doc(firestore, 'settings', 'global');
      await updateDoc(settingsRef, {
        storeGridColumns: gridColumns,
        storeGridCustomColumns: gridColumns === 'custom' ? customColumns : undefined,
        storeGridColumnsMobile: mobileColumns,
        storeGridColumnsTablet: tabletColumns,
      });
    } catch (error) {
      console.error('Error saving grid settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Web Store Product Grid Layout</CardTitle>
            <CardDescription>
              Configure how products display in grid on your web store
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Desktop Grid Columns */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold mb-4 block">Desktop Layout (lg screens)</Label>
            <div className="grid grid-cols-5 gap-3">
              {[2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  onClick={() => {
                    setGridColumns(cols as 2 | 3 | 4);
                  }}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    gridColumns === cols
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
                onClick={() => setGridColumns('custom')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all flex items-center justify-center',
                  gridColumns === 'custom'
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <span className="text-sm font-semibold">Custom</span>
              </button>
            </div>
          </div>

          {/* Custom Columns Input */}
          {gridColumns === 'custom' && (
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

        {/* Mobile Grid Columns */}
        <div className="space-y-4">
          <Label className="text-base font-semibold block">Mobile Layout (sm screens)</Label>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[2].map((cols) => (
              <button
                key={cols}
                onClick={() => setMobileColumns(cols as 2 | 3)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  mobileColumns === cols
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <div className="grid grid-cols-2 gap-1">
                  {[...Array(cols)].map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-300 dark:bg-slate-600 rounded" />
                  ))}
                </div>
                <p className="text-sm font-semibold mt-2">{cols} Columns</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mobile devices always display 2 columns for optimal viewing
          </p>
        </div>

        {/* Tablet Grid Columns */}
        <div className="space-y-4">
          <Label className="text-base font-semibold block">Tablet Layout (md screens)</Label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[2, 3].map((cols) => (
              <button
                key={cols}
                onClick={() => setTabletColumns(cols as 2 | 3)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all',
                  tabletColumns === cols
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                )}
              >
                <div className={cn(
                  'grid gap-1',
                  cols === 2 && 'grid-cols-2',
                  cols === 3 && 'grid-cols-3'
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

        {/* Preview Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold mb-2">Layout Summary:</p>
          <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <li>• <strong>Mobile:</strong> {mobileColumns} column{mobileColumns > 1 ? 's' : ''}</li>
            <li>• <strong>Tablet:</strong> {tabletColumns} column{tabletColumns > 1 ? 's' : ''}</li>
            <li>• <strong>Desktop:</strong> {gridColumns === 'custom' ? `${customColumns} column${customColumns > 1 ? 's' : ''}` : `${gridColumns} column${gridColumns > 1 ? 's' : ''}`}</li>
          </ul>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading}
          className="w-full"
        >
          {isSaving ? 'Saving...' : 'Save Grid Layout'}
        </Button>
      </CardContent>
    </Card>
  );
}
