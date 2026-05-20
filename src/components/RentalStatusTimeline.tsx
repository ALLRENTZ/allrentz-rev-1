import React from 'react';
import { CheckCircle, Clock, Truck, Wrench, Package, XCircle } from 'lucide-react';

export type RentalStatus =
  | 'scheduled'
  | 'en_route'
  | 'on_site'
  | 'ready_for_use'
  | 'picked_up'
  | 'closed_out';

interface RentalStatusTimelineProps {
  currentStatus: RentalStatus;
  rentalData?: {
    scheduledDate?: string;
    dispatchDate?: string;
    deliveryDate?: string;
    readyDate?: string;
    pickupDate?: string;
    closedDate?: string;
  };
}

const statusOrder: RentalStatus[] = [
  'scheduled',
  'en_route',
  'on_site',
  'ready_for_use',
  'picked_up',
  'closed_out',
];

const RentalStatusTimeline: React.FC<RentalStatusTimelineProps> = ({
  currentStatus,
  rentalData = {},
}) => {
  const currentIndex = statusOrder.indexOf(currentStatus);

  const steps = [
    {
      id: 'scheduled',
      title: 'Scheduled',
      description: 'Equipment booked and confirmed',
      icon: <Clock className="h-4 w-4" />,
      date: rentalData.scheduledDate,
    },
    {
      id: 'en_route',
      title: 'En Route',
      description: 'Equipment loaded and in transit to site',
      icon: <Truck className="h-4 w-4" />,
      date: rentalData.dispatchDate,
    },
    {
      id: 'on_site',
      title: 'On Site',
      description: 'Equipment delivered to facility',
      icon: <Package className="h-4 w-4" />,
      date: rentalData.deliveryDate,
    },
    {
      id: 'ready_for_use',
      title: 'Ready for Use',
      description: 'Equipment set up and operational',
      icon: <Wrench className="h-4 w-4" />,
      date: rentalData.readyDate,
    },
    {
      id: 'picked_up',
      title: 'Picked Up',
      description: 'Equipment picked up from site',
      icon: <Truck className="h-4 w-4" />,
      date: rentalData.pickupDate,
    },
    {
      id: 'closed_out',
      title: 'Closed Out',
      description: 'Rental complete and documented',
      icon: <CheckCircle className="h-4 w-4" />,
      date: rentalData.closedDate,
    },
  ];

  const getColors = (idx: number) => {
    if (idx < currentIndex)
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        icon: 'text-green-600',
        text: 'text-green-800',
        line: 'bg-green-300',
      };
    if (idx === currentIndex)
      return {
        bg: 'bg-blue-100',
        border: 'border-blue-500',
        icon: 'text-blue-600',
        text: 'text-blue-800',
        line: 'bg-gray-300',
      };
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      icon: 'text-gray-400',
      text: 'text-gray-500',
      line: 'bg-gray-300',
    };
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold text-allrentz-gray mb-4">Rental Status</h3>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const colors = getColors(index);
          const isLast = index === steps.length - 1;
          const isCompleted = index < currentIndex;
          return (
            <div key={step.id} className="flex items-start">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${colors.bg} ${colors.border}`}
                >
                  <div className={colors.icon}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.icon}
                  </div>
                </div>
                {!isLast && <div className={`w-0.5 h-8 mt-2 ${colors.line}`} />}
              </div>
              <div className="ml-4 flex-1 min-w-0 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${colors.text}`}>{step.title}</h4>
                  {step.date && <span className="text-xs text-gray-500">{step.date}</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                {index === currentIndex && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Current Status
                    </span>
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
