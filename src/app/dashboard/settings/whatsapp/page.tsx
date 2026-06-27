'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/settings/whatsapp/overview');
  }, [router]);
  return null;
}
