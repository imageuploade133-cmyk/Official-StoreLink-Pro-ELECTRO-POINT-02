'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PageHeader } from '@/components/PageHeader';
import { UserCircle } from 'lucide-react';
import { ProfileUpdateForm } from './components/ProfileUpdateForm';
import { PasswordChangeForm } from './components/PasswordChangeForm';
import { ProfilePictureUpload } from './components/ProfilePictureUpload';
import { PermissionsCard } from './components/PermissionsCard';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Loader2 } from 'lucide-react';
import { LogoutCard } from './components/LogoutCard';

export default function ProfilePage() {
  const { user, staffMember, isLoading, permissions } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCircle}
        title="My Profile"
        description="Manage your personal information and account settings."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
           <ProfilePictureUpload user={user} staffMember={staffMember} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <ProfileUpdateForm user={user} staffMember={staffMember}/>
          <PasswordChangeForm user={user} />
          <PermissionsCard userPermissions={permissions} />
          <LogoutCard />
        </div>
      </div>
    </div>
  );
}
