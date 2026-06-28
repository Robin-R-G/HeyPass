'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';

interface UserPermissions {
  permissions: string[];
  role: string | null;
  is_superadmin: boolean;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      setIsSuperadmin(payload.is_superadmin || false);
      setRole(payload.role || null);

      if (payload.is_superadmin) {
        setPermissions(['*']);
        setLoading(false);
        return;
      }

      const res = await authFetch('/api/auth/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || []);
        setRole(data.role || null);
      }
    } catch {
      console.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (isSuperadmin) return true;
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some(p => hasPermission(p));
  };

  const hasAllPermissions = (...perms: string[]): boolean => {
    return perms.every(p => hasPermission(p));
  };

  return {
    permissions,
    role,
    is_superadmin: isSuperadmin,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: fetchPermissions,
  };
}
