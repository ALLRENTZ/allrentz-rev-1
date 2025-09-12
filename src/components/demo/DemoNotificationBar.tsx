
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DemoNotificationBar: React.FC = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);
  
  const isDemoUser = user?.email?.includes('demo.') || false;
  
  if (!isDemoUser || dismissed) return null;

  const demoType = user?.email?.includes('customer') ? 'customer' : 'vendor';

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-4 w-4 text-yellow-300" />
          <span className="text-sm font-medium">
            Demo Mode: You're exploring ALLRENTZ as a {demoType}
          </span>
          <div className="hidden sm:flex items-center space-x-1 text-xs bg-white/20 px-2 py-1 rounded">
            <Info className="h-3 w-3" />
            <span>All data is simulated for demonstration</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-white/20 p-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DemoNotificationBar;
