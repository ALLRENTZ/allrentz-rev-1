
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, MapPin, DollarSign, CheckCircle } from 'lucide-react';
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

  const handleRequestQuote = async () => {
    if (!user || !startDate || !endDate) return;

    setLoading(true);

    try {
      // Step 1: INSERT draft rental_request and capture row ID
      const { data: insertData, error: insertError } = await (supabase as any)
        .from('rental_requests')
        .insert({
          customer_id: user.id,
          equipment_id: equipment.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          delivery_address: deliveryAddress,
          special_requirements: specialRequirements
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Step 2: Transition draft → submitted via Edge Function gate
      const { error: transitionError } = await supabase.functions.invoke('rfq-transition', {
        body: { rfq_id: insertData.id, new_status: 'submitted' }
      });

      if (transitionError) {
        console.error('Transition failed:', transitionError);
        toast({
          title: "Request saved as draft",
          description: "Request saved as draft but submission failed. Please try again from your dashboard.",
          variant: "destructive",
        });
        return;
      }

      setQuoteGenerated(true);

      toast({
        title: "Request Submitted",
        description: "Your rental request has been received. A vendor will follow up with a quote.",
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: "Request failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (quoteGenerated) {
    return (
      <Dialog open={open} onOpenChange={(open) => { if (!open) setQuoteGenerated(false); onOpenChange(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Request Submitted</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your rental request for <span className="font-medium">{equipment.title}</span> has been received.
              Your request has been submitted for vendor review.
            </p>

            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Dates:</span> {startDate ? format(startDate, 'PPP') : ''} – {endDate ? format(endDate, 'PPP') : ''}</p>
              <p><span className="font-medium">Delivery:</span> {deliveryAddress}</p>
            </div>

            <Button
              onClick={() => { onOpenChange(false); setQuoteGenerated(false); }}
              className="w-full bg-allrentz-red hover:bg-red-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) setQuoteGenerated(false); onOpenChange(open); }}>
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

          {/* Right Column - Request Summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Request Summary</h3>
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
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentQuoteRequest;
