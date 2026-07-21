
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SmartMatchInterface from '@/components/SmartMatchInterface';

const SmartMatchDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/customer-dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-allrentz-gray">SmartMatch</h1>
              <p className="text-gray-600">Equipment matching based on type, location, and compliance requirements</p>
            </div>
          </div>
        </div>

        {/* SmartMatch Interface */}
        <SmartMatchInterface />
      </div>
    </div>
  );
};

export default SmartMatchDemo;
