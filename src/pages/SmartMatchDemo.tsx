
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
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-allrentz-gray">SmartMatch AI Demo</h1>
              <p className="text-gray-600">AI-powered equipment matching for industrial rentals</p>
            </div>
          </div>
        </div>

        {/* SmartMatch Interface */}
        <SmartMatchInterface />

        {/* How It Works */}
        <div className="mt-12 bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">How SmartMatch Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Smart Analysis</h3>
              <p className="text-sm text-gray-600">AI analyzes your requirements against our vendor network</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Instant Matching</h3>
              <p className="text-sm text-gray-600">Get ranked matches based on distance, compliance, and availability</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Direct Connection</h3>
              <p className="text-sm text-gray-600">Vendors are notified instantly and can respond in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartMatchDemo;
