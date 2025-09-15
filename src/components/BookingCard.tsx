import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookingDetails } from '@/services/bookingService';
import { Booking } from '@/repositories/interfaces';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  User, 
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Clock
} from 'lucide-react';

interface BookingCardProps {
  booking: BookingDetails;
  userRole: 'customer' | 'vendor' | 'admin';
  onConfirm?: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
  onStatusUpdate?: (bookingId: string, status: Booking['status']) => void;
  showActions?: boolean;
  compact?: boolean;
}

const statusConfig = {
  pending: { icon: AlertCircle, color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-500', textColor: 'text-blue-700' },
  active: { icon: PlayCircle, color: 'bg-green-500', textColor: 'text-green-700' },
  completed: { icon: CheckCircle, color: 'bg-gray-500', textColor: 'text-gray-700' },
  cancelled: { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-700' }
};

export default function BookingCard({ 
  booking, 
  userRole, 
  onConfirm, 
  onCancel, 
  onStatusUpdate,
  showActions = true,
  compact = false 
}: BookingCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: Booking['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateDuration = () => {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isUpcoming = () => {
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const diffTime = startDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  if (compact) {
    return (
      <Card className={`${isUpcoming() ? 'border-blue-200 bg-blue-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-sm">
                  {booking.equipment?.title || `Equipment ${booking.equipment_id.slice(0, 8)}`}
                </h4>
                {getStatusBadge(booking.status)}
              </div>
              
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(booking.start_date)}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{formatCurrency(booking.total_amount)}</span>
                </div>
              </div>
            </div>
            
            {showActions && (
              <div className="flex gap-1">
                {userRole === 'vendor' && booking.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={() => onConfirm?.(booking.id)}>
                    Confirm
                  </Button>
                )}
                
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => onCancel?.(booking.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isUpcoming() ? 'border-blue-200 bg-blue-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {booking.equipment?.title || `Equipment ${booking.equipment_id}`}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(booking.status)}
              {isUpcoming() && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Upcoming
                </Badge>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              {userRole === 'vendor' && booking.status === 'pending' && (
                <Button size="sm" onClick={() => onConfirm?.(booking.id)}>
                  Confirm
                </Button>
              )}
              
              {userRole === 'vendor' && booking.status === 'confirmed' && (
                <Button size="sm" onClick={() => onStatusUpdate?.(booking.id, 'active')}>
                  Start
                </Button>
              )}
              
              {userRole === 'vendor' && booking.status === 'active' && (
                <Button size="sm" onClick={() => onStatusUpdate?.(booking.id, 'completed')}>
                  Complete
                </Button>
              )}
              
              {(booking.status === 'pending' || booking.status === 'confirmed') && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => onCancel?.(booking.id)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Equipment Description */}
          {booking.equipment?.description && (
            <p className="text-sm text-muted-foreground">
              {booking.equipment.description}
            </p>
          )}
          
          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{calculateDuration()} days</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{booking.location}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>
                  {formatCurrency(booking.daily_rate)}/day
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-green-600">
                  Total: {formatCurrency(booking.total_amount)}
                </span>
              </div>
              
              {userRole === 'vendor' && booking.customer && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.customer.name}</span>
                </div>
              )}
              
              {userRole === 'customer' && booking.vendor_company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.vendor_company.name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Confirmed Date */}
          {booking.confirmed_at && (
            <div className="text-xs text-green-600 pt-2 border-t">
              Confirmed: {formatDate(booking.confirmed_at)}
            </div>
          )}
          
          {/* Special Requirements */}
          {booking.requirements && Object.keys(booking.requirements).length > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <span className="font-medium">Special Requirements: </span>
              <span>{JSON.stringify(booking.requirements, null, 2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}