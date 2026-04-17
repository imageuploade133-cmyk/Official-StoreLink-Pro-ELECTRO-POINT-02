'use client';

import { useSettings } from '@/contexts/settings-context';
import { useEffect } from 'react';

export function UIBackgroundShadowManager() {
    const { settings } = useSettings();
    const enableBackgroundShadow = settings?.enableBackgroundShadow ?? true;

    useEffect(() => {
        if (enableBackgroundShadow) {
            document.documentElement.classList.add('ui-shadow-enabled');
        } else {
            document.documentElement.classList.remove('ui-shadow-enabled');
        }
    }, [enableBackgroundShadow]);

    return null;
}
