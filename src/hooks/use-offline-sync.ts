'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineScan {
  id: string;
  ticket_id: string;
  gate_id: string;
  scan_type: 'check_in' | 'check_out';
  scanned_at: string;
  sync_id: string;
}

const DB_NAME = 'heypass-offline';
const DB_VERSION = 1;
const STORE_NAME = 'scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sync_id', 'sync_id', { unique: true });
        store.createIndex('scanned_at', 'scanned_at');
      }
    };
  });
}

async function saveOfflineScan(scan: OfflineScan): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(scan);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getOfflineScans(): Promise<OfflineScan[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineScan(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineSync() {
  const [pendingScans, setPendingScans] = useState<OfflineScan[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingScans();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending scans
    loadPendingScans();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadPendingScans() {
    try {
      const scans = await getOfflineScans();
      setPendingScans(scans);
    } catch (error) {
      console.error('Failed to load offline scans:', error);
    }
  }

  const queueScan = useCallback(async (scan: Omit<OfflineScan, 'id' | 'sync_id'>) => {
    const fullScan: OfflineScan = {
      ...scan,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sync_id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    await saveOfflineScan(fullScan);
    setPendingScans((prev) => [...prev, fullScan]);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await syncPendingScans();
    }

    return fullScan;
  }, []);

  const syncPendingScans = useCallback(async () => {
    if (syncing || !navigator.onLine) return;

    setSyncing(true);
    try {
      const scans = await getOfflineScans();

      for (const scan of scans) {
        try {
          const response = await fetch('/api/offline/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scan),
          });

          if (response.ok) {
            await deleteOfflineScan(scan.id);
          }
        } catch (error) {
          console.error(`Failed to sync scan ${scan.id}:`, error);
        }
      }

      await loadPendingScans();
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return {
    pendingScans,
    isOnline,
    syncing,
    queueScan,
    syncPendingScans,
    pendingCount: pendingScans.length,
  };
}
