'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, Settings as SettingsIcon } from 'lucide-react';
import { type LayoutSettings, type LayoutPreset } from '@/app/dashboard/print-barcodes/page';
import { Switch } from '../ui/switch';

interface PageLayoutSettingsCardProps {
    layoutSettings: LayoutSettings;
    onLayoutSettingChange: (setting: keyof LayoutSettings, value: string) => void;
    layoutPresets: LayoutPreset[];
    selectedPreset: string;
    onPresetChange: (value: string) => void;
    calculatedLabelsPerPage: number;
    fontSize: number;
    isBold: boolean;
    onFontSizeChange: (value: number) => void;
    onIsBoldChange: (value: boolean) => void;
}

export function PageLayoutSettingsCard({
    layoutSettings,
    onLayoutSettingChange,
    layoutPresets,
    selectedPreset,
    onPresetChange,
    calculatedLabelsPerPage,
    fontSize,
    isBold,
    onFontSizeChange,
    onIsBoldChange,
}: PageLayoutSettingsCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">Page Layout</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleCollapse} className="h-8 w-8">
          {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          <span className="sr-only">{isCollapsed ? "Expand" : "Collapse"}</span>
        </Button>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="layout-select" className="text-xs font-medium">Layout Preset</Label>
            <Select value={selectedPreset} onValueChange={onPresetChange}>
              <SelectTrigger id="layout-select" className="h-9 text-xs">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                {layoutPresets.map(preset => (
                    <SelectItem key={preset.value} value={preset.value} className="text-xs">{preset.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="label-width" className="text-xs font-medium">Label Width (mm)</Label>
              <Input id="label-width" type="number" value={layoutSettings.labelWidth} onChange={(e) => onLayoutSettingChange('labelWidth', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="label-height" className="text-xs font-medium">Label Height (mm)</Label>
              <Input id="label-height" type="number" value={layoutSettings.labelHeight} onChange={(e) => onLayoutSettingChange('labelHeight', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="top-margin" className="text-xs font-medium">Page Top Margin (mm)</Label>
              <Input id="top-margin" type="number" value={layoutSettings.marginTop} onChange={(e) => onLayoutSettingChange('marginTop', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="left-margin" className="text-xs font-medium">Page Left Margin (mm)</Label>
              <Input id="left-margin" type="number" value={layoutSettings.marginLeft} onChange={(e) => onLayoutSettingChange('marginLeft', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="vertical-gap" className="text-xs font-medium">Vertical Gap (mm)</Label>
              <Input id="vertical-gap" type="number" value={layoutSettings.verticalGap} onChange={(e) => onLayoutSettingChange('verticalGap', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label htmlFor="horizontal-gap" className="text-xs font-medium">Horizontal Gap (mm)</Label>
              <Input id="horizontal-gap" type="number" value={layoutSettings.horizontalGap} onChange={(e) => onLayoutSettingChange('horizontalGap', e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t mt-4">
            <div>
                <Label htmlFor="font-size" className="text-xs font-medium">Font Size (px)</Label>
                <Input id="font-size" type="number" min="6" max="24" value={fontSize} onChange={(e) => onFontSizeChange(Number(e.target.value))} className="h-9 text-xs" />
            </div>
            <div className="flex items-end pb-1">
                <div className="flex items-center space-x-2">
                    <Switch id="font-bold" checked={isBold} onCheckedChange={onIsBoldChange} />
                    <Label htmlFor="font-bold" className="text-xs font-medium">Bold Text</Label>
                </div>
            </div>
        </div>


          <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-md text-center">
            <p className="text-sm font-medium text-foreground">
              Calculated Quantity: <span className="text-primary">{calculatedLabelsPerPage} labels per page</span>
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
