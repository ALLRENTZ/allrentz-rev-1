// ALLRENTZ Service Worker Registration
// Handles SW lifecycle, updates, and offline capabilities

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

// Register service worker with enterprise-grade error handling
export async function registerSW(config?: ServiceWorkerConfig): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Registering ALLRENTZ Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('✅ Service Worker registered:', registration.scope);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        console.log('🔄 New Service Worker installing...');

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              console.log('🆕 New content available! Please refresh.');
              config?.onUpdate?.(registration);
              showUpdateNotification(registration);
            } else {
              // Content is cached for the first time
              console.log('📦 Content cached for offline use.');
              config?.onSuccess?.(registration);
              showOfflineReadyNotification();
            }
          }
        });
      });

      // Listen for controller change (new SW took over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed, reloading...');
        window.location.reload();
      });

      // Check for updates every 10 minutes
      setInterval(() => {
        registration.update().catch(console.error);
      }, 10 * 60 * 1000);

      // Handle network status changes
      setupNetworkListeners(config);

      // Setup background sync registration
      setupBackgroundSync(registration);

      // Setup push notification handling
      setupPushNotifications(registration);

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      
      // Fallback for offline detection without SW
      setupNetworkListeners(config);
    }
  } else {
    console.warn('⚠️ Service Workers not supported in this browser');
    setupNetworkListeners(config);
  }
}

// Unregister service worker (for development/testing)
export async function unregisterSW(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const success = await registration.unregister();
      
      if (success) {
        console.log('🗑️ Service Worker unregistered successfully');
      } else {
        console.warn('⚠️ Service Worker unregistration failed');
      }
    } catch (error) {
      console.error('❌ Service Worker unregistration error:', error);
    }
  }
}

// Setup network status monitoring
function setupNetworkListeners(config?: ServiceWorkerConfig): void {
  const handleOnline = () => {
    console.log('🌐 Back online');
    document.body.classList.remove('offline');
    document.body.classList.add('online');
    config?.onOnline?.();
    hideOfflineIndicator();
  };

  const handleOffline = () => {
    console.log('📶 Gone offline');
    document.body.classList.remove('online');
    document.body.classList.add('offline');
    config?.onOffline?.();
    showOfflineIndicator();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial network status
  if (navigator.onLine) {
    handleOnline();
  } else {
    handleOffline();
  }
}

// Background sync setup for offline actions
function setupBackgroundSync(registration: ServiceWorkerRegistration): void {
  if ('sync' in window.ServiceWorkerRegistration.prototype) {
    // Register sync events for equipment and quote requests
    const syncTags = ['equipment-request', 'quote-request'];
    
    syncTags.forEach(tag => {
      registration.sync.register(tag).catch(error => {
        console.warn(`⚠️ Background sync registration failed for ${tag}:`, error);
      });
    });

    console.log('🔄 Background sync registered for offline actions');
  } else {
    console.warn('⚠️ Background sync not supported');
  }
}

// Push notification setup
function setupPushNotifications(registration: ServiceWorkerRegistration): void {
  if ('PushManager' in window) {
    // Check if user has granted permission
    if (Notification.permission === 'granted') {
      subscribeToPush(registration);
    } else if (Notification.permission !== 'denied') {
      // Could request permission here based on user interaction
      console.log('📬 Push notifications available but not subscribed');
    }
  } else {
    console.warn('⚠️ Push notifications not supported');
  }
}

// Subscribe to push notifications
async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    // In production, replace with your VAPID public key
    const applicationServerKey = urlBase64ToUint8Array(
      process.env.VITE_VAPID_PUBLIC_KEY || 'demo-key'
    );

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('📬 Push subscription successful:', subscription);
    
    // Send subscription to your backend
    // await sendSubscriptionToBackend(subscription);
    
  } catch (error) {
    console.error('❌ Push subscription failed:', error);
  }
}

// Utility function for VAPID key conversion
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// UI notification functions
function showUpdateNotification(registration: ServiceWorkerRegistration): void {
  // Create update notification
  const notification = document.createElement('div');
  notification.className = 'sw-update-notification';
  notification.innerHTML = `
    <div class="sw-notification-content">
      <div class="sw-notification-icon">🔄</div>
      <div class="sw-notification-text">
        <div class="sw-notification-title">Update Available</div>
        <div class="sw-notification-message">New features and improvements are ready!</div>
      </div>
      <div class="sw-notification-actions">
        <button class="sw-btn sw-btn-primary" onclick="updateServiceWorker()">Update Now</button>
        <button class="sw-btn sw-btn-secondary" onclick="dismissNotification(this)">Later</button>
      </div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .sw-update-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    }
    
    .sw-notification-content {
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .sw-notification-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .sw-notification-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: #dc2626;
    }
    
    .sw-notification-message {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    
    .sw-notification-actions {
      display: flex;
      gap: 8px;
    }
    
    .sw-btn {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .sw-btn-primary {
      background: #dc2626;
      color: white;
    }
    
    .sw-btn-primary:hover {
      background: #b91c1c;
    }
    
    .sw-btn-secondary {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .sw-btn-secondary:hover {
      background: #e5e7eb;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(notification);
  
  // Store registration for update function
  (window as any).swRegistration = registration;
}

function showOfflineReadyNotification(): void {
  console.log('📱 ALLRENTZ is now available offline!');
  
  // Could show a toast notification here
  const toast = document.createElement('div');
  toast.textContent = '📱 ALLRENTZ is now available offline!';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    font-weight: 500;
    animation: slideUp 0.3s ease-out, fadeOut 0.5s ease-out 2.5s forwards;
  `;
  
  const keyframes = `
    @keyframes slideUp {
      from { transform: translate(-50%, 100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
    @keyframes fadeOut {
      to { opacity: 0; transform: translate(-50%, 100%); }
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = keyframes;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 3000);
}

function showOfflineIndicator(): void {
  let indicator = document.querySelector('.offline-indicator') as HTMLElement;
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
      <span>⚡ Offline Mode</span>
      <div class="offline-indicator-subtitle">Changes will sync when online</div>
    `;
    
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #dc2626;
      color: white;
      padding: 8px;
      text-align: center;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;
    
    const subtitle = indicator.querySelector('.offline-indicator-subtitle') as HTMLElement;
    if (subtitle) {
      subtitle.style.cssText = `
        font-size: 12px;
        opacity: 0.9;
        margin-top: 2px;
      `;
    }
    
    document.body.appendChild(indicator);
    
    // Adjust body padding to account for indicator
    document.body.style.paddingTop = '50px';
  }
}

function hideOfflineIndicator(): void {
  const indicator = document.querySelector('.offline-indicator');
  if (indicator) {
    indicator.remove();
    document.body.style.paddingTop = '';
  }
}

// Global functions for notification buttons
(window as any).updateServiceWorker = () => {
  const registration = (window as any).swRegistration;
  if (registration && registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
};

(window as any).dismissNotification = (button: HTMLButtonElement) => {
  const notification = button.closest('.sw-update-notification');
  if (notification) {
    notification.remove();
  }
};

// Queue offline actions for background sync
export function queueAction(action: 'equipment-request' | 'quote-request', data: any): void {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    // Store action in IndexedDB for background sync
    storeOfflineAction(action, data);
    
    // Register background sync
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register(action);
    }).catch(error => {
      console.error('Background sync registration failed:', error);
      // Fallback: store in localStorage and retry when online
      localStorage.setItem(`offline_${action}_${Date.now()}`, JSON.stringify(data));
    });
  } else {
    // Fallback for browsers without background sync
    localStorage.setItem(`offline_${action}_${Date.now()}`, JSON.stringify(data));
  }
}

// Store offline actions (simplified - would use IndexedDB in production)
function storeOfflineAction(action: string, data: any): void {
  const actions = JSON.parse(localStorage.getItem('offline_actions') || '[]');
  actions.push({
    id: Date.now().toString(),
    action,
    data,
    timestamp: Date.now()
  });
  localStorage.setItem('offline_actions', JSON.stringify(actions));
}

// Request push notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export default {
  register: registerSW,
  unregister: unregisterSW,
  queueAction,
  requestNotificationPermission
};