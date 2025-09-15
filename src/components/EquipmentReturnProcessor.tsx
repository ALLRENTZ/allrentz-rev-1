import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  MapPin, 
  Calendar,
  Camera,
  FileText,
  Clock,
  User,
  Building,
  Wrench
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEquipmentTracking } from '@/hooks/useEquipmentTracking';
import { ReturnSchedule } from '@/services/equipmentTrackingService';

interface EquipmentReturnProcessorProps {
  vendorId?: string;
  onReturnProcessed?: (equipmentId: string, bookingId: string) => void;
}

interface ReturnFormData {
  actual_return_date: string;
  condition_on_return: 'excellent' | 'good' | 'fair' | 'needs_repair';
  notes: string;
  return_location: string;
  mileage_hours?: string;
  fuel_level?: string;
  damages?: string[];
  photos?: string[];
}

const EquipmentReturnProcessor: React.FC<EquipmentReturnProcessorProps> = ({ 
  vendorId, 
  onReturnProcessed 
}) => {
  const [selectedReturn, setSelectedReturn] = useState<ReturnSchedule | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnFormData>({
    actual_return_date: new Date().toISOString().split('T')[0],
    condition_on_return: 'good',
    notes: '',
    return_location: '',
    mileage_hours: '',
    fuel_level: '',
    damages: [],
    photos: []
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const { useReturnSchedule, useProcessReturn } = useEquipmentTracking(vendorId);
  const { data: returnSchedule, isLoading, refetch } = useReturnSchedule(30);
  const processReturnMutation = useProcessReturn();

  const handleReturnSelect = (returnItem: ReturnSchedule) => {
    setSelectedReturn(returnItem);
    setReturnForm({
      actual_return_date: new Date().toISOString().split('T')[0],
      condition_on_return: 'good',
      notes: '',
      return_location: returnItem.return_location,
      mileage_hours: '',
      fuel_level: '',
      damages: [],
      photos: []
    });
  };

  const handleFormChange = (field: keyof ReturnFormData, value: any) => {
    setReturnForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDamageToggle = (damage: string) => {
    setReturnForm(prev => ({
      ...prev,
      damages: prev.damages?.includes(damage) 
        ? prev.damages.filter(d => d !== damage)
        : [...(prev.damages || []), damage]
    }));
  };

  const handleProcessReturn = async () => {
    if (!selectedReturn) return;

    setIsProcessing(true);
    try {
      const success = await processReturnMutation.mutateAsync({
        equipmentId: selectedReturn.equipment_id,
        bookingId: selectedReturn.current_booking_id,
        returnData: {
          actual_return_date: returnForm.actual_return_date,
          condition_on_return: returnForm.condition_on_return,
          notes: returnForm.notes,
          return_location: returnForm.return_location
        }
      });

      if (success) {
        toast({
          title: "Return Processed Successfully",
          description: `${selectedReturn.equipment_name} has been returned and is now available.`,
        });
        
        setSelectedReturn(null);
        setReturnForm({
          actual_return_date: new Date().toISOString().split('T')[0],
          condition_on_return: 'good',
          notes: '',
          return_location: '',
          mileage_hours: '',
          fuel_level: '',
          damages: [],
          photos: []
        });
        
        refetch();
        onReturnProcessed?.(selectedReturn.equipment_id, selectedReturn.current_booking_id);
      } else {
        throw new Error('Failed to process return');
      }
    } catch (error) {
      toast({
        title: "Error Processing Return",
        description: "There was an error processing the equipment return. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (item: ReturnSchedule) => {
    if (item.is_overdue) return 'bg-red-100 text-red-800';
    if (item.days_until_return <= 1) return 'bg-orange-100 text-orange-800';
    if (item.days_until_return <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'needs_repair': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const commonDamages = [
    'Scratches/Dents',
    'Hydraulic Leaks',
    'Tire/Track Damage',
    'Engine Issues',
    'Electrical Problems',
    'Missing Parts',
    'Excessive Wear',
    'Fluid Leaks',
    'Structural Damage',
    'Other'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-allrentz-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading return schedule...</p>
        </div>
      </div>
    );
  }

  const upcomingReturns = returnSchedule?.filter(item => 
    item.days_until_return <= 7 || item.is_overdue
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Equipment Return Processing</h2>
          <p className="text-gray-600 mt-1">Process equipment returns and update availability status</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Pending Returns</span>
              {upcomingReturns.length > 0 && (
                <Badge variant="secondary">{upcomingReturns.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingReturns.length > 0 ? (
                upcomingReturns.map((returnItem) => (
                  <div 
                    key={returnItem.current_booking_id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedReturn?.current_booking_id === returnItem.current_booking_id
                        ? 'border-allrentz-red bg-red-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleReturnSelect(returnItem)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{returnItem.equipment_name}</h3>
                          <Badge className={getStatusColor(returnItem)}>
                            {returnItem.is_overdue ? 'OVERDUE' : `${returnItem.days_until_return}d`}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{returnItem.customer_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{returnItem.customer_company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(returnItem.scheduled_return_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{returnItem.return_location}</span>
                          </div>
                        </div>
                      </div>
                      {returnItem.is_overdue && (
                        <AlertTriangle className="h-5 w-5 text-red-500 ml-2" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Returns</h3>
                  <p className="text-gray-600">All equipment returns are up to date.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Return Processing Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Process Return</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReturn ? (
              <div className="space-y-4">
                {/* Equipment Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg">{selectedReturn.equipment_name}</h3>
                  <p className="text-gray-600">{selectedReturn.category}</p>
                  <div className="mt-2 text-sm">
                    <p><strong>Customer:</strong> {selectedReturn.customer_name}</p>
                    <p><strong>Company:</strong> {selectedReturn.customer_company}</p>
                    <p><strong>Booking:</strong> {selectedReturn.current_booking_id}</p>
                  </div>
                </div>

                {/* Return Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="return_date">Actual Return Date</Label>
                      <Input
                        id="return_date"
                        type="date"
                        value={returnForm.actual_return_date}
                        onChange={(e) => handleFormChange('actual_return_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="condition">Condition on Return</Label>
                      <Select
                        value={returnForm.condition_on_return}
                        onValueChange={(value) => handleFormChange('condition_on_return', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="needs_repair">Needs Repair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="return_location">Return Location</Label>
                    <Input
                      id="return_location"
                      value={returnForm.return_location}
                      onChange={(e) => handleFormChange('return_location', e.target.value)}
                      placeholder="Return location address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mileage">Mileage/Hours</Label>
                      <Input
                        id="mileage"
                        value={returnForm.mileage_hours}
                        onChange={(e) => handleFormChange('mileage_hours', e.target.value)}
                        placeholder="Current meter reading"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuel">Fuel Level</Label>
                      <Select
                        value={returnForm.fuel_level}
                        onValueChange={(value) => handleFormChange('fuel_level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full</SelectItem>
                          <SelectItem value="3/4">3/4 Tank</SelectItem>
                          <SelectItem value="1/2">1/2 Tank</SelectItem>
                          <SelectItem value="1/4">1/4 Tank</SelectItem>
                          <SelectItem value="empty">Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Damage Assessment */}
                  <div>
                    <Label>Damage Assessment</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {commonDamages.map((damage) => (
                        <button
                          key={damage}
                          type="button"
                          onClick={() => handleDamageToggle(damage)}
                          className={`text-left p-2 text-sm rounded border ${
                            returnForm.damages?.includes(damage)
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {damage}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Return Notes</Label>
                    <Textarea
                      id="notes"
                      value={returnForm.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      placeholder="Additional notes about the equipment condition, issues, or recommendations..."
                      rows={3}
                    />
                  </div>

                  {/* Photo Upload Section */}
                  <div>
                    <Label>Return Photos</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Take photos of the equipment condition
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Add Photos
                      </Button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Return Summary</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Date:</strong> {new Date(returnForm.actual_return_date).toLocaleDateString()}</p>
                      <p><strong>Condition:</strong> 
                        <Badge className={`ml-2 ${getConditionColor(returnForm.condition_on_return)}`}>
                          {returnForm.condition_on_return}
                        </Badge>
                      </p>
                      <p><strong>Location:</strong> {returnForm.return_location}</p>
                      {returnForm.damages && returnForm.damages.length > 0 && (
                        <p><strong>Damages:</strong> {returnForm.damages.join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="flex-1"
                          disabled={!returnForm.actual_return_date || !returnForm.condition_on_return}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Process Return
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirm Equipment Return</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to process the return for {selectedReturn.equipment_name}? 
                            This will mark the equipment as available and complete the booking.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleProcessReturn}
                            disabled={isProcessing}
                          >
                            {isProcessing ? 'Processing...' : 'Confirm Return'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedReturn(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Equipment Return</h3>
                <p className="text-gray-600">Choose an equipment return from the list to process.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EquipmentReturnProcessor;