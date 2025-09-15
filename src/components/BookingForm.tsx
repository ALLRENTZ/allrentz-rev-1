import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCsvAuth } from '@/contexts/CsvAuthContext';
import { useBookingService } from '@/hooks/useBookingService';
import { CreateBookingRequest } from '@/services/bookingService';
import { Equipment } from '@/repositories/interfaces';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Wrench
} from 'lucide-react';

interface BookingFormProps {
  equipment: Equipment;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export default function BookingForm({ equipment, onSuccess, onCancel, className }: BookingFormProps) {
  const { csvUser } = useCsvAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bookingService = useBookingService();

  const [formData, setFormData] = useState<CreateBookingRequest>({
    customer_id: csvUser?.id || '',
    equipment_id: equipment.id,
    start_date: '',
    end_date: '',
    location: '',
    requirements: {}
  });

  const [specialRequirements, setSpecialRequirements] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createBookingMutation = useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.createBooking(data),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-stats'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-bookings'] });
      
      toast({
        title: 'Booking Created Successfully',
        description: `Your booking for ${equipment.title} has been submitted and is pending vendor approval.`,
      });
      
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Booking Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (!formData.location) {
      newErrors.location = 'Location is required';
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        newErrors.start_date = 'Start date cannot be in the past';
      }

      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }

      // Check for reasonable rental duration (not more than 365 days)
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (durationDays > 365) {
        newErrors.end_date = 'Rental duration cannot exceed 365 days';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEstimate = () => {
    if (!formData.start_date || !formData.end_date) return null;

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      duration: durationDays,
      totalCost: equipment.daily_rate * durationDays,
      dailyRate: equipment.daily_rate
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Parse special requirements
    const requirements: Record<string, any> = {};
    if (specialRequirements.trim()) {
      requirements.special_instructions = specialRequirements.trim();
    }

    // Add equipment compliance requirements if any
    if (equipment.compliance?.certifications && equipment.compliance.certifications.length > 0) {
      requirements.required_certifications = equipment.compliance.certifications;
    }

    const bookingData: CreateBookingRequest = {
      ...formData,
      requirements
    };

    createBookingMutation.mutate(bookingData);
  };

  const handleInputChange = (field: keyof CreateBookingRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const estimate = calculateEstimate();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Book: {equipment.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Equipment Info */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Category: {equipment.category}</p>
              <p>Location: {equipment.location}</p>
            </div>
            <div>
              <p className="font-medium text-green-600">
                Daily Rate: {formatCurrency(equipment.daily_rate)}
              </p>
              <p className={`font-medium ${
                equipment.availability_status === 'available' 
                  ? 'text-green-600' 
                  : 'text-yellow-600'
              }`}>
                Status: {equipment.availability_status}
              </p>
            </div>
          </div>
          
          {equipment.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {equipment.description}
            </p>
          )}
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                min={formData.start_date || new Date().toISOString().split('T')[0]}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && (
                <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="location">Delivery Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter street address or facility name"
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && (
              <p className="text-red-500 text-xs mt-1">{errors.location}</p>
            )}
          </div>

          <div>
            <Label htmlFor="requirements">Special Requirements (Optional)</Label>
            <Textarea
              id="requirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="Any special delivery instructions, setup requirements, or other notes..."
              rows={3}
            />
          </div>

          {/* Cost Estimate */}
          {estimate && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Rental Estimate
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{estimate.duration} day{estimate.duration !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span>{formatCurrency(estimate.dailyRate)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-700 border-t pt-1">
                  <span>Total Cost:</span>
                  <span>{formatCurrency(estimate.totalCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Requirements */}
          {equipment.compliance?.certifications && equipment.compliance.certifications.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Required Certifications:</strong> {equipment.compliance.certifications.join(', ')}
                <br />
                Please ensure your team has the required certifications for this equipment.
              </AlertDescription>
            </Alert>
          )}

          {/* Equipment Availability Warning */}
          {equipment.availability_status !== 'available' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This equipment is currently marked as "{equipment.availability_status}". 
                Your booking request will be submitted but may require vendor approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={createBookingMutation.isPending}
              className="flex-1"
            >
              {createBookingMutation.isPending ? 'Creating Booking...' : 'Submit Booking Request'}
            </Button>
            
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Success Message */}
        {createBookingMutation.isSuccess && (
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your booking request has been submitted successfully! 
              The vendor will review and confirm your booking.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Calculator icon component (since it might not be available in lucide-react)
const Calculator = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="16" y1="10" x2="16" y2="10" />
    <line x1="12" y1="10" x2="12" y2="10" />
    <line x1="8" y1="10" x2="8" y2="10" />
    <line x1="16" y1="14" x2="16" y2="14" />
    <line x1="12" y1="14" x2="12" y2="14" />
    <line x1="8" y1="14" x2="8" y2="14" />
    <line x1="16" y1="18" x2="16" y2="18" />
    <line x1="12" y1="18" x2="12" y2="18" />
    <line x1="8" y1="18" x2="8" y2="18" />
  </svg>
);