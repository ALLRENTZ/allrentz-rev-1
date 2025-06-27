
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronRight, ChevronLeft, Zap, Users, Bell, CheckCircle } from 'lucide-react';

interface DemoTourProps {
  userType: 'customer' | 'vendor';
  onClose: () => void;
}

const DemoTour: React.FC<DemoTourProps> = ({ userType, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const customerSteps = [
    {
      title: "Welcome to ALLRENTZ Demo",
      content: "You're now logged in as Pat from Gulf Coast Refinery. Explore how industrial equipment rental works from a customer perspective.",
      icon: <Users className="h-6 w-6" />,
      highlights: ["Real refinery data", "Active rental requests", "Live notifications"]
    },
    {
      title: "Your Active Rentals",
      content: "See your current rental requests - including an approved Steam Boiler and a pending Frac Tank request with realistic timelines.",
      icon: <CheckCircle className="h-6 w-6" />,
      highlights: ["Approved: Steam Boiler ($6,650)", "Pending: Frac Tank ($2,275)", "Real delivery addresses"]
    },
    {
      title: "SmartMatch Technology",
      content: "Try our AI-powered equipment matching. It connects you with the right vendors based on your specific needs and compliance requirements.",
      icon: <Zap className="h-6 w-6" />,
      highlights: ["AI vendor matching", "Compliance scoring", "Instant notifications"]
    },
    {
      title: "Live Notifications",
      content: "Check your notifications to see rental approvals, quote expirations, and real-time updates from vendors.",
      icon: <Bell className="h-6 w-6" />,
      highlights: ["Rental approved", "Quote expiring soon", "Real-time updates"]
    }
  ];

  const vendorSteps = [
    {
      title: "Welcome to ALLRENTZ Demo",
      content: "You're now logged in as Pat-Rentals Equipment Co. See how vendors manage equipment listings and rental requests.",
      icon: <Users className="h-6 w-6" />,
      highlights: ["Verified vendor status", "95% compliance score", "Active equipment listings"]
    },
    {
      title: "Your Equipment Listings",
      content: "Your equipment portfolio includes industrial boilers, storage tanks, and HVAC systems - all with real specifications and pricing.",
      icon: <CheckCircle className="h-6 w-6" />,
      highlights: ["Steam Boiler: $950/day", "Frac Tank: $175/day", "Industrial Chiller: $1,250/day"]
    },
    {
      title: "Incoming Requests",
      content: "View and manage rental requests from customers like Gulf Coast Refinery with detailed requirements and timelines.",
      icon: <Bell className="h-6 w-6" />,
      highlights: ["New rental request", "Payment processed", "Customer requirements"]
    },
    {
      title: "Performance Metrics",
      content: "Track your 4.8/5 performance rating, 95% compliance score, and 2-hour average response time.",
      icon: <Zap className="h-6 w-6" />,
      highlights: ["4.8★ rating", "95% compliance", "2hr response time"]
    }
  ];

  const steps = userType === 'customer' ? customerSteps : vendorSteps;
  const currentStepData = steps[currentStep];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {currentStepData.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  {userType === 'customer' ? 'Customer Demo' : 'Vendor Demo'}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">{currentStepData.content}</p>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-800">Key Features:</h4>
            <div className="space-y-1">
              {currentStepData.highlights.map((highlight, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep < steps.length - 1 ? (
              <Button size="sm" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onClose}>
                Start Exploring
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoTour;
