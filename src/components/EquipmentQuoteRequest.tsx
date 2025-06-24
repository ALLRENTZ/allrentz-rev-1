
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, MapPin, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Equipment {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  location: string;
  image_url: string;
}

interface EquipmentQuoteRequestProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EquipmentQuoteRequest: React.FC<EquipmentQuoteRequestProps> = ({
  equipment,
  open,
  onOpenChange
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 8));
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [quoteGenerated, setQuoteGenerated] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!equipment) return null;

  const totalDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;
  const subtotal = totalDays * equipment.daily_rate;
  const deliveryFee = 150;
  const taxes = subtotal * 0.08;
  const totalAmount = subtotal + deliveryFee + taxes;

  const handleRequestQuote = async () => {
    if (!user || !startDate || !endDate) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('rental_requests')
        .insert({
          customer_id: user.id,
          equipment_id: equipment.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_amount: totalAmount,
          delivery_address: deliveryAddress,
          special_requirements: specialRequirements,
          status: 'quoted',
          quote_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      setQuoteGenerated(true);
      
      toast({
        title: "Quote Generated!",
        description: "Your quote is ready. Valid for 24 hours.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate quote. Please try again.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleAcceptQuote = () => {
    toast({
      title: "Quote Accepted!",
      description: "Your rental is being processed. You'll receive updates via email.",
    });
    onOpenChange(false);
    setQuoteGenerated(false);
  };

  if (quoteGenerated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Quote Ready</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Equipment Rental</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Delivery & Pickup</span>
                    <span className="font-medium">${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxes & Fees</span>
                    <span className="font-medium">${taxes.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount</span>
                      <span className="font-bold text-lg text-allrentz-red">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <Clock className="inline h-4 w-4 mr-1" />
                Quote valid for 24 hours • Instant approval available
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setQuoteGenerated(false)}>
                Modify Quote
              </Button>
              <Button onClick={handleAcceptQuote} className="bg-allrentz-red hover:bg-red-700">
                Accept Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Quote - {equipment.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Requirements</Label>
              <Textarea
                placeholder="Any special requirements or notes..."
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Right Column - Quote Summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quote Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Daily Rate:</span>
                    <span>${equipment.daily_rate}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{totalDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipment Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery & Pickup:</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes & Fees:</span>
                    <span>${taxes.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Estimated Total:</span>
                      <span className="text-allrentz-red">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <p className="text-blue-800">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Final quote may vary based on delivery distance and additional services
              </p>
            </div>

            <Button 
              onClick={handleRequestQuote} 
              disabled={loading || !startDate || !endDate || !deliveryAddress}
              className="w-full bg-allrentz-red hover:bg-red-700"
            >
              {loading ? 'Generating Quote...' : 'Get Instant Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentQuoteRequest;
