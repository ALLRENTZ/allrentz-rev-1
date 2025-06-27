
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, DollarSign, MapPin, Shield, Star } from 'lucide-react';

interface DemoDataShowcaseProps {
  userType: 'customer' | 'vendor';
}

const DemoDataShowcase: React.FC<DemoDataShowcaseProps> = ({ userType }) => {
  if (userType === 'customer') {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span>Your Demo Profile: Gulf Coast Refinery</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Active Rentals</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Steam Boiler (200 HP)</span>
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Frac Tank (25K gal)</span>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Company Details</h4>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Houston, TX</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">TWIC & HAZMAT Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">NET15 Payment Terms</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Demo Features:</strong> Real rental history, live notifications, 
              compliance tracking, and SmartMatch recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Your Demo Profile: Pat-Rentals Equipment Co</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Equipment Portfolio</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Steam Boiler</span>
                <span className="text-sm font-medium">$950/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Frac Tank</span>
                <span className="text-sm font-medium">$175/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Industrial Chiller</span>
                <span className="text-sm font-medium">$1,250/day</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Performance Metrics</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">4.8/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm">95% Compliance Score</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">2hr Avg Response</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-green-200">
          <p className="text-sm text-green-700">
            <strong>Demo Features:</strong> Active rental requests, payment processing, 
            customer communications, and performance analytics
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoDataShowcase;
