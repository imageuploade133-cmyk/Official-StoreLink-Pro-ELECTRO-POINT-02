
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { StaffMember, PermissionId, Store } from '@/lib/types';
import { allPermissions, roles } from '@/lib/roles';

interface AuthContextType {
  user: ReturnType<typeof useUser>['user'];
  staffMember: StaffMember | null;
  store: Store | null;
  permissions: Record<PermissionId, boolean>;
  isLoading: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  roleId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  staffMember: null,
  store: null,
  permissions: {} as Record<PermissionId, boolean>,
  isLoading: true,
  isAdmin: false,
  isCustomer: false,
  roleId: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);

  // Monitor Staff Record
  useEffect(() => {
    if (!user || !firestore) {
      setStaffMember(null);
      setIsStaffLoading(false);
      return;
    }

    setIsStaffLoading(true);
    const staffRef = doc(firestore, 'staff', user.uid);
    const unsubscribe = onSnapshot(staffRef, (doc) => {
      if (doc.exists()) {
        setStaffMember({ id: doc.id, ...doc.data() } as StaffMember);
      } else {
        setStaffMember(null);
      }
      setIsStaffLoading(false);
    }, (error) => {
        console.error("Error fetching staff member:", error);
        setStaffMember(null);
        setIsStaffLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Monitor Store Ownership
  useEffect(() => {
    if (!user || !firestore) {
      setStore(null);
      setIsStoreLoading(false);
      return;
    }

    setIsStoreLoading(true);
    // In our system, storeId is often the same as the owner's UID for the primary store
    const storeRef = doc(firestore, 'stores', user.uid);
    const unsubscribe = onSnapshot(storeRef, (docSnap) => {
      if (docSnap.exists()) {
        setStore({ id: docSnap.id, ...docSnap.data() } as Store);
      } else {
        setStore(null);
      }
      setIsStoreLoading(false);
    }, (error) => {
      console.error("Error fetching store:", error);
      setStore(null);
      setIsStoreLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  // Monitor Customer Record
  useEffect(() => {
    if (!user || !firestore) {
      setIsCustomer(false);
      setIsCustomerLoading(false);
      return;
    }

    setIsCustomerLoading(true);
    const customerRef = doc(firestore, 'customers', user.uid);
    const unsubscribe = onSnapshot(customerRef, (doc) => {
      setIsCustomer(doc.exists());
      setIsCustomerLoading(false);
    }, (error) => {
      console.error("Error fetching customer status:", error);
      setIsCustomer(false);
      setIsCustomerLoading(false);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const isLoading = isAuthLoading || isStaffLoading || isCustomerLoading || isStoreLoading;

  const { permissions, isAdmin, roleId } = useMemo(() => {
    const defaultPermissions: Record<PermissionId, boolean> = {} as Record<PermissionId, boolean>;
    allPermissions.forEach(p => { defaultPermissions[p.id] = false; });

    if (isLoading || !user) {
      return { permissions: defaultPermissions, isAdmin: false, roleId: null };
    }
    
    // If the user is found in the customers collection, they are strictly NOT staff/admin
    if (isCustomer) {
        return { permissions: defaultPermissions, isAdmin: false, roleId: 'customer' };
    }

    // NEW LOGIC: Check if user is a Store Owner
    if (store) {
        const allPerms = { ...defaultPermissions };
        allPermissions.forEach(p => { allPerms[p.id] = true; });
        return { permissions: allPerms, isAdmin: true, roleId: 'admin' };
    }

    if (staffMember) {
      const isRoleAdmin = staffMember.role === 'admin';
      const resolvedPermissions = { ...defaultPermissions };
      
      if (staffMember.permissions?.pages) {
        staffMember.permissions.pages.forEach(pId => {
          if (pId in resolvedPermissions) {
            resolvedPermissions[pId] = true;
          }
        });
      }

      return {
        permissions: resolvedPermissions,
        isAdmin: isRoleAdmin,
        roleId: staffMember.role,
      };
    }

    return { permissions: defaultPermissions, isAdmin: false, roleId: null };
  }, [user, staffMember, isCustomer, isLoading, isStaffLoading]);


  const value = {
    user,
    staffMember,
    permissions,
    isLoading,
    isAdmin,
    isCustomer,
    roleId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
