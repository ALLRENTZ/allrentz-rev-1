import React from 'react';
import { Wifi, WifiOff, Sync, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  className = '' 
}) => {
  const { 
    isOnline, 
    pendingActions, 
    syncStatus, 
    retryFailedActions,
    clearSyncedActions 
  } = useOfflineSync();

  const pendingCount = pendingActions.filter(a => a.status === 'pending').length;
  const failedCount = pendingActions.filter(a => a.status === 'failed').length;
  const syncedCount = pendingActions.filter(a => a.status === 'synced').length;

  // Don't show indicator when online with no pending actions
  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus === 'syncing') return <Sync className="w-4 h-4 animate-spin" />;
    if (failedCount > 0) return <AlertCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return pendingCount > 0 
        ? `Offline - ${pendingCount} action${pendingCount !== 1 ? 's' : ''} queued`
        : 'Offline Mode';
    }
    
    if (syncStatus === 'syncing') {
      return 'Syncing...';
    }
    
    if (failedCount > 0) {
      return `${failedCount} failed to sync`;
    }
    
    if (pendingCount > 0) {
      return `${pendingCount} pending`;
    }
    
    if (syncedCount > 0) {
      return `${syncedCount} synced`;
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-amber-500';
    if (failedCount > 0) return 'bg-red-500';
    if (syncStatus === 'syncing') return 'bg-blue-500';
    if (pendingCount > 0) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Status indicator */}
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium
          ${getStatusColor()}
          transition-all duration-200
        `}
        role="status"
        aria-live="polite"
        aria-label={`Connection status: ${getStatusText()}`}
      >
        {getStatusIcon()}
        <span className="whitespace-nowrap">
          {getStatusText()}
        </span>
      </div>

      {/* Action buttons for failed syncs */}
      {failedCount > 0 && isOnline && (
        <button
          onClick={retryFailedActions}
          className="
            px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700
            border border-red-200 hover:border-red-300 rounded
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          "
          aria-label={`Retry ${failedCount} failed sync${failedCount !== 1 ? 's' : ''}`}
        >
          Retry
        </button>
      )}

      {/* Clear synced actions button */}
      {syncedCount > 0 && (
        <button
          onClick={clearSyncedActions}
          className="
            px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-600
            border border-gray-200 hover:border-gray-300 rounded
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          "
          aria-label={`Clear ${syncedCount} synced action${syncedCount !== 1 ? 's' : ''}`}
        >
          Clear
        </button>
      )}
    </div>
  );
};

// Detailed status component for dashboards
export const OfflineStatus: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { 
    isOnline, 
    pendingActions, 
    syncStatus, 
    retryFailedActions,
    clearSyncedActions 
  } = useOfflineSync();

  const pendingActions_ = pendingActions.filter(a => a.status === 'pending');
  const failedActions = pendingActions.filter(a => a.status === 'failed');
  const syncedActions = pendingActions.filter(a => a.status === 'synced');

  if (isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 text-amber-500" />
              Offline Mode
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              Sync Status
            </>
          )}
        </h3>
        
        {syncStatus === 'syncing' && (
          <Sync className="w-4 h-4 text-blue-500 animate-spin" />
        )}
      </div>

      <div className="space-y-2 text-sm">
        {!isOnline && (
          <p className="text-amber-700 bg-amber-50 px-3 py-2 rounded">
            You're currently offline. Actions will sync automatically when you're back online.
          </p>
        )}

        {pendingActions_.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="text-gray-600">
              Pending actions: {pendingActions_.length}
            </span>
            <div className="flex gap-1">
              {pendingActions_.slice(0, 3).map((action, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded"
                >
                  {action.type.replace('-', ' ')}
                </span>
              ))}
              {pendingActions_.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  +{pendingActions_.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {failedActions.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="text-red-600">
              Failed to sync: {failedActions.length}
            </span>
            <button
              onClick={retryFailedActions}
              disabled={!isOnline}
              className="
                px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700
                border border-red-200 hover:border-red-300 rounded
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              Retry All
            </button>
          </div>
        )}

        {syncedActions.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <span className="text-green-600">
              Successfully synced: {syncedActions.length}
            </span>
            <button
              onClick={clearSyncedActions}
              className="
                px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-600
                border border-gray-200 hover:border-gray-300 rounded
                transition-colors duration-200
              "
            >
              Clear
            </button>
          </div>
        )}

        {syncStatus === 'syncing' && (
          <p className="text-blue-600 bg-blue-50 px-3 py-2 rounded">
            Syncing your offline actions...
          </p>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;