import { useState, useEffect, useCallback } from 'react';
import { queueAction } from '@/utils/serviceWorkerRegistration';

interface OfflineAction {
  id: string;
  type: 'equipment-request' | 'quote-request' | 'vendor-contact' | 'save-search';
  data: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  queueOfflineAction: (type: OfflineAction['type'], data: any) => void;
  retryFailedActions: () => void;
  clearSyncedActions: () => void;
  syncStatus: 'idle' | 'syncing' | 'error';
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Load pending actions from localStorage on mount
  useEffect(() => {
    const loadPendingActions = () => {
      try {
        const stored = localStorage.getItem('offline_actions');
        if (stored) {
          const actions = JSON.parse(stored);
          setPendingActions(actions);
        }
      } catch (error) {
        console.error('Failed to load offline actions:', error);
      }
    };

    loadPendingActions();
  }, []);

  // Save pending actions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('offline_actions', JSON.stringify(pendingActions));
    } catch (error) {
      console.error('Failed to save offline actions:', error);
    }
  }, [pendingActions]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - attempting to sync pending actions');
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      console.log('📱 Gone offline - actions will be queued');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Queue an offline action
  const queueOfflineAction = useCallback((type: OfflineAction['type'], data: any) => {
    const action: OfflineAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    setPendingActions(prev => [...prev, action]);

    // If online, try to sync immediately
    if (isOnline) {
      syncAction(action);
    } else {
      // Use service worker background sync
      queueAction(type, data);
      console.log(`📋 Queued offline action: ${type}`);
    }
  }, [isOnline]);

  // Sync a single action
  const syncAction = async (action: OfflineAction): Promise<boolean> => {
    try {
      let success = false;

      switch (action.type) {
        case 'equipment-request':
          success = await syncEquipmentRequest(action.data);
          break;
        case 'quote-request':
          success = await syncQuoteRequest(action.data);
          break;
        case 'vendor-contact':
          success = await syncVendorContact(action.data);
          break;
        case 'save-search':
          success = await syncSaveSearch(action.data);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
          return false;
      }

      if (success) {
        setPendingActions(prev =>
          prev.map(a =>
            a.id === action.id
              ? { ...a, status: 'synced' as const }
              : a
          )
        );
        console.log(`✅ Synced action: ${action.type}`);
      } else {
        setPendingActions(prev =>
          prev.map(a =>
            a.id === action.id
              ? { ...a, status: 'failed' as const }
              : a
          )
        );
        console.error(`❌ Failed to sync action: ${action.type}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Error syncing action ${action.type}:`, error);
      setPendingActions(prev =>
        prev.map(a =>
          a.id === action.id
            ? { ...a, status: 'failed' as const }
            : a
        )
      );
      return false;
    }
  };

  // Sync all pending actions
  const syncPendingActions = useCallback(async () => {
    const pending = pendingActions.filter(action => action.status === 'pending');
    
    if (pending.length === 0) {
      return;
    }

    setSyncStatus('syncing');
    console.log(`🔄 Syncing ${pending.length} pending actions...`);

    let syncedCount = 0;
    let failedCount = 0;

    for (const action of pending) {
      const success = await syncAction(action);
      if (success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    setSyncStatus(failedCount > 0 ? 'error' : 'idle');
    
    console.log(`📊 Sync complete: ${syncedCount} synced, ${failedCount} failed`);

    if (syncedCount > 0) {
      showSyncNotification(`✅ Synced ${syncedCount} offline actions`);
    }
    
    if (failedCount > 0) {
      showSyncNotification(`⚠️ ${failedCount} actions failed to sync`, 'error');
    }
  }, [pendingActions]);

  // Retry failed actions
  const retryFailedActions = useCallback(async () => {
    const failedActions = pendingActions.filter(action => action.status === 'failed');
    
    if (failedActions.length === 0) {
      return;
    }

    setSyncStatus('syncing');
    console.log(`🔄 Retrying ${failedActions.length} failed actions...`);

    // Reset failed actions to pending
    setPendingActions(prev =>
      prev.map(action =>
        action.status === 'failed'
          ? { ...action, status: 'pending' as const }
          : action
      )
    );

    // Sync after a short delay
    setTimeout(() => {
      syncPendingActions();
    }, 1000);
  }, [pendingActions, syncPendingActions]);

  // Clear synced actions
  const clearSyncedActions = useCallback(() => {
    setPendingActions(prev => prev.filter(action => action.status !== 'synced'));
    console.log('🧹 Cleared synced actions from queue');
  }, []);

  return {
    isOnline,
    pendingActions,
    queueOfflineAction,
    retryFailedActions,
    clearSyncedActions,
    syncStatus
  };
};

// API sync functions (mock implementations - replace with actual API calls)

async function syncEquipmentRequest(data: any): Promise<boolean> {
  try {
    // Simulate API call
    const response = await fetch('/api/equipment/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Equipment request sync failed:', error);
    return false;
  }
}

async function syncQuoteRequest(data: any): Promise<boolean> {
  try {
    // Simulate API call
    const response = await fetch('/api/quotes/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Quote request sync failed:', error);
    return false;
  }
}

async function syncVendorContact(data: any): Promise<boolean> {
  try {
    // Simulate API call
    const response = await fetch('/api/vendors/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Vendor contact sync failed:', error);
    return false;
  }
}

async function syncSaveSearch(data: any): Promise<boolean> {
  try {
    // Simulate API call
    const response = await fetch('/api/searches/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.error('Save search sync failed:', error);
    return false;
  }
}

// Show sync notification (simple implementation)
function showSyncNotification(message: string, type: 'success' | 'error' = 'success'): void {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    animation: slideIn 0.3s ease-out, fadeOut 0.5s ease-out 3s forwards;
  `;

  // Add keyframes for animations
  if (!document.querySelector('#sync-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'sync-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        to { opacity: 0; transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Remove after animation
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3500);
}

export default useOfflineSync;