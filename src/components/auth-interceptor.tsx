'use client';

import { useEffect } from 'react';
import { initAuthInterceptor } from '@/lib/auth-interceptor';

export function AuthInterceptor() {
  useEffect(() => {
    initAuthInterceptor();
  }, []);
  return null;
}
