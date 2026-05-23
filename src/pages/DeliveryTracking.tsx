
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Truck, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const DeliveryTracking = () => {
  const { profile } = useAuth();

  const deliveries = [
    {
      id: '1',
      equipment: 'Industrial Centrifugal Pump - 500 GPM',
      status: 'In Transit',
      estimatedArrival: 'Tomorrow 8:00 AM',
      currentLocation: 'Houston Distribution Center',
      deliveryAddress: '1250 Industrial Blvd, Houston, TX 77015',
      driver: 'Mike Johnson',
      driverPhone: '(713) 555-0123',
      trackingSteps: [
        { step: 'Equipment Prepared', completed: true, time: '2 days ago' },
        { step: 'Loaded on Truck', completed: true, time: '1 day ago' },
        { step: 'In Transit', completed: true, time: '4 hours ago' },
        { step: 'Delivered', completed: false, time: 'Tomorrow 8:00 AM' }
      ]
    },
    {
      id: '2',
      equipment: 'Hydraulic Torque Wrench Set',
      status: 'Delivered',
      deliveredAt: 'Yesterday 10:30 AM',
      deliveryAddress: '1250 Industrial Blvd, Houston, TX 77015',
      signedBy: 'John Smith - Maintenance Supervisor',
      trackingSteps: [
        { step: 'Equipment Prepared', completed: true, time: '3 days ago' },
        { step: 'Loaded on Truck', completed: true, time: '2 days ago' },
        { step: 'In Transit', completed: true, time: '1 day ago' },
        { step: 'Delivered', completed: true, time: 'Yesterday 10:30 AM' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/customer-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Tracking</h1>
          <p className="text-gray-600 mt-2">
            {profile?.company_name || 'Your Company'} • Track your equipment deliveries
          </p>
        </div>

        {/* Demo data notice */}
        <div className="mb-6 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
          Sample demo data — delivery records shown are for demonstration purposes only.
        </div>

        {/* Deliveries */}
        <div className="space-y-6">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="industrial-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold mb-2">
                      {delivery.equipment}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        delivery.status === 'Delivered' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {delivery.status === 'Delivered' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Truck className="h-3 w-3 mr-1" />
                        )}
                        {delivery.status}
                      </Badge>
                    </div>
                  </div>
                  {delivery.status === 'In Transit' && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">ETA</p>
                      <p className="font-semibold text-allrentz-red">
                        {delivery.estimatedArrival}
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Delivery Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Delivery Address</h4>
                      <div className="flex items-start space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{delivery.deliveryAddress}</span>
                      </div>
                    </div>

                    {delivery.status === 'In Transit' && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Current Location</h4>
                          <p className="text-sm text-gray-600">{delivery.currentLocation}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Driver</h4>
                          <p className="text-sm text-gray-600">
                            {delivery.driver} • {delivery.driverPhone}
                          </p>
                        </div>
                      </>
                    )}

                    {delivery.status === 'Delivered' && (
                      <>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Delivered</h4>
                          <p className="text-sm text-gray-600">{delivery.deliveredAt}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Signed By</h4>
                          <p className="text-sm text-gray-600">{delivery.signedBy}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tracking Timeline */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Tracking Timeline</h4>
                    <div className="space-y-3">
                      {delivery.trackingSteps.map((step, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            step.completed 
                              ? 'bg-green-500' 
                              : 'bg-gray-300'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              step.completed ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {step.step}
                            </p>
                            <p className="text-xs text-gray-500">{step.time}</p>
                          </div>
                          {step.completed && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Safety Notice */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Safety Reminder</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ensure proper PPE and safety protocols are followed during equipment delivery and setup. 
                  TWIC cards may be required for refinery access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryTracking;
