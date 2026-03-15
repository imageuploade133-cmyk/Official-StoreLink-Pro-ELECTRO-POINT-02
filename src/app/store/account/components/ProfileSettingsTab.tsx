'use client';
import React from 'react';
import type { User } from 'firebase/auth';
import { AccountProfileForm } from './AccountProfileForm';
import { AccountPasswordForm } from './AccountPasswordForm';
import type { UserProfile } from '@/lib/types';

interface ProfileSettingsTabProps {
    user: User;
    userProfile: UserProfile | null;
}

export function ProfileSettingsTab({ user, userProfile }: ProfileSettingsTabProps) {
    return (
        <div className="space-y-6">
            <AccountProfileForm user={user} userProfile={userProfile} />
            <AccountPasswordForm user={user} />
        </div>
    )
}
