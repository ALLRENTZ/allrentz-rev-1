import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeAxe } from './utils/accessibility'
import { performanceMonitor } from './utils/performance'
import { registerSW } from './utils/serviceWorkerRegistration'

// Initialize accessibility testing in development
if (process.env.NODE_ENV !== 'production') {
  initializeAxe().catch(console.error);
}

// Initialize performance monitoring
console.log('🚀 ALLRENTZ Performance Monitor initialized');

// Register service worker for offline capabilities
registerSW({
  onSuccess: (registration) => {
    console.log('✅ ALLRENTZ is now available offline');
  },
  onUpdate: (registration) => {
    console.log('🔄 New version available - refresh to update');
  },
  onOffline: () => {
    console.log('📱 Working in offline mode');
  },
  onOnline: () => {
    console.log('🌐 Back online - syncing data');
  }
});

createRoot(document.getElementById("root")!).render(<App />);
