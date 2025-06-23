
import React from 'react';
import { CheckCircle, Clock, AlertCircle, Package, Truck, Wrench } from 'lucide-react';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  date?: string;
  icon: React.ReactNode;
}

interface RentalStatusTimelineProps {
  currentStatus: 'quote_requested' | 'quote_received' | 'po_submitted' | 'equipment_dispatched' | 'on_site' | 'returned';
  rentalData?: {
    quoteDate?: string;
    poDate?: string;
    dispatchDate?: string;
    deliveryDate?: string;
    returnDate?: string;
  };
}

const RentalStatusTimeline: React.FC<RentalStatusTimelineProps> = ({
  currentStatus,
  rentalData = {}
}) => {
  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' | 'skipped' => {
    const statusOrder = [
      'quote_requested',
      'quote_received', 
      'po_submitted',
      'equipment_dispatched',
      'on_site',
      'returned'
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const steps: TimelineStep[] = [
    {
      id: 'quote_requested',
      title: 'Quote Requested',
      description: 'Initial quote request sent to vendor',
      status: getStepStatus('quote_requested'),
      date: rentalData.quoteDate,
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'quote_received',
      title: 'Quote Received',
      description: 'Vendor provided quote and terms',
      status: getStepStatus('quote_received'),
      date: rentalData.quoteDate,
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 'po_submitted',
      title: 'PO Submitted',
      description: 'Purchase order approved and sent',
      status: getStepStatus('po_submitted'),
      date: rentalData.poDate,
      icon: <Package className="h-4 w-4" />
    },
    {
      id: 'equipment_dispatched',
      title: 'Equipment Dispatched',
      description: 'Equipment loaded and en route',
      status: getStepStatus('equipment_dispatched'),
      date: rentalData.dispatchDate,
      icon: <Truck className="h-4 w-4" />
    },
    {
      id: 'on_site',
      title: 'On Site',
      description: 'Equipment delivered and operational',
      status: getStepStatus('on_site'),
      date: rentalData.deliveryDate,
      icon: <Wrench className="h-4 w-4" />
    },
    {
      id: 'returned',
      title: 'Returned',
      description: 'Equipment picked up and returned',
      status: getStepStatus('returned'),
      date: rentalData.returnDate,
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const getStepColors = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-green-100',
          border: 'border-green-500',
          icon: 'text-green-600',
          text: 'text-green-800'
        };
      case 'current':
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          icon: 'text-blue-600',
          text: 'text-blue-800'
        };
      case 'pending':
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          icon: 'text-gray-400',
          text: 'text-gray-600'
        };
      default:
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          icon: 'text-gray-400',
          text: 'text-gray-600'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold text-allrentz-gray mb-4">
        Rental Status Timeline
      </h3>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const colors = getStepColors(step.status);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-start">
              {/* Timeline Icon */}
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2
                  ${colors.bg} ${colors.border}
                `}>
                  <div className={colors.icon}>
                    {step.icon}
                  </div>
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 mt-2 ${
                    step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                  }`} />
                )}
              </div>
              
              {/* Timeline Content */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${colors.text}`}>
                    {step.title}
                  </h4>
                  {step.date && (
                    <span className="text-xs text-gray-500">
                      {step.date}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {step.description}
                </p>
                
                {step.status === 'current' && (
                  <div className="mt-2">
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      In Progress
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RentalStatusTimeline;

