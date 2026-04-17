
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Layers, Loader2, Save } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings } from '@/lib/types';

interface BackgroundShadowSettingsProps {
    settingsData: AppSettings | undefined;
    isLoading: boolean;
    storeId: string | undefined;
}

export function BackgroundShadowSettings({ settingsData, isLoading, storeId }: BackgroundShadowSettingsProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [enableBackgroundShadow, setEnableBackgroundShadow] = useState(settingsData?.enableBackgroundShadow ?? true);

    // Sync with settingsData when it changes
    useEffect(() => {
        if (settingsData?.enableBackgroundShadow !== undefined) {
            setEnableBackgroundShadow(settingsData.enableBackgroundShadow);
        }
    }, [settingsData?.enableBackgroundShadow]);

    const handleSave = async () => {
        if (!firestore || !storeId) return;

        setIsSaving(true);
        try {
            const settingsRef = doc(firestore, 'stores', storeId, 'settings', 'config');
            await updateDoc(settingsRef, {
                enableBackgroundShadow,
                updatedAt: new Date(),
            });
            toast({
                title: 'Success',
                description: 'Background shadow settings updated successfully',
            });
        } catch (error) {
            console.error('Error updating background shadow settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to update background shadow settings',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>UI Background Shadow</CardTitle>
                            <CardDescription>
                                Enable or disable background shadow effects across the public store and store app.
                            </CardDescription>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="enable-shadow" className="flex flex-col space-y-1">
                        <span>Enable Background Shadow</span>
                        <span className="font-normal text-sm text-muted-foreground">
                            When enabled, a subtle shadow will be applied to the main content area.
                        </span>
                    </Label>
                    <Switch
                        id="enable-shadow"
                        checked={enableBackgroundShadow}
                        onCheckedChange={setEnableBackgroundShadow}
                        disabled={isLoading}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
