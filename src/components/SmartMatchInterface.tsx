import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, MapPin, Clock, DollarSign, Star, CheckCircle2, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { smartMatchEngine, SmartMatchRequest, MatchedVendor } from '@/services/smartMatchEngine';

const SmartMatchInterface: React.FC = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchedVendor[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<SmartMatchRequest>({
    equipment_type: '',
    location: '',
    urgency: 'today' as const,
    additional_requirements: {}
  });

  const equipmentTypes = [
    'Boilers', 'Storage', 'Power Generation', 'Pumps', 'Compressors',
    'Heat Exchangers', 'Filters', 'Cranes', 'Lifting Equipment'
  ];

  const handleMatch = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use SmartMatch.",
        variant: "destructive",
      });
      return;
    }

    if (!request.equipment_type || !request.location) {
      toast({
        title: "Missing information",
        description: "Please specify equipment type and location.",
        variant: "destructive",
      });
      return;
    }

    setIsMatching(true);
    setMatchResults([]);

    try {
      const result = await smartMatchEngine.processMatch(request, user.id);
      
      setMatchResults(result.matches);
      setTotalMatches(result.total_matches);
      setProcessingTime(result.processing_time_ms);

      // Simulate vendor notifications
      await smartMatchEngine.notifyVendors(result.matches, request);

      toast({
        title: "SmartMatch Complete!",
        description: `Found ${result.matches.length} qualified vendors in ${result.processing_time_ms}ms`,
      });

    } catch (error) {
      console.error('SmartMatch error:', error);
      toast({
        title: "SmartMatch Failed",
        description: "Unable to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleRequestQuote = (vendor: MatchedVendor) => {
    toast({
      title: "Quote Request Sent",
      description: `Quote request sent to ${vendor.company_name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* SmartMatch Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>SmartMatch AI</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment-type">Equipment Type</Label>
              <Select 
                value={request.equipment_type} 
                onValueChange={(value) => setRequest(prev => ({ ...prev, equipment_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                placeholder="e.g., Houston, TX"
                value={request.location}
                onChange={(e) => setRequest(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select 
                value={request.urgency} 
                onValueChange={(value) => setRequest(prev => ({ ...prev, urgency: value as SmartMatchRequest['urgency'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (< 4 hours)</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-rate">Max Daily Rate ($)</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={request.additional_requirements?.max_daily_rate || ''}
                onChange={(e) => setRequest(prev => ({
                  ...prev,
                  additional_requirements: {
                    ...prev.additional_requirements,
                    max_daily_rate: e.target.value ? Number(e.target.value) : undefined
                  }
                }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="twic-required"
                checked={request.additional_requirements?.twic_required || false}
                onCheckedChange={(checked) => setRequest(prev => ({
                  ...prev,
                  additional_requirements: {
                    ...prev.additional_requirements,
                    twic_required: checked as boolean
                  }
                }))}
              />
              <Label htmlFor="twic-required">TWIC Required</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hazmat-certified"
                checked={request.additional_requirements?.hazmat_certified || false}
                onCheckedChange={(checked) => setRequest(prev => ({
                  ...prev,
                  additional_requirements: {
                    ...prev.additional_requirements,
                    hazmat_certified: checked as boolean
                  }
                }))}
              />
              <Label htmlFor="hazmat-certified">HAZMAT Certified</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="operator-included"
                checked={request.additional_requirements?.operator_included || false}
                onCheckedChange={(checked) => setRequest(prev => ({
                  ...prev,
                  additional_requirements: {
                    ...prev.additional_requirements,
                    operator_included: checked as boolean
                  }
                }))}
              />
              <Label htmlFor="operator-included">Operator Included</Label>
            </div>
          </div>

          <Button 
            onClick={handleMatch} 
            disabled={isMatching || !request.equipment_type || !request.location}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing SmartMatch...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Find Matches
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {matchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>SmartMatch Results</span>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{matchResults.length} of {totalMatches} matches</span>
                <span>Processed in {processingTime}ms</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matchResults.map((vendor) => (
                <Card key={`${vendor.vendor_id}-${vendor.equipment_id}`} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{vendor.equipment_title}</h3>
                        <p className="text-gray-600">{vendor.company_name}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {vendor.match_score}% Match
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{vendor.distance_miles} miles</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{vendor.estimated_delivery}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">${vendor.daily_rate}/day</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{vendor.performance_rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {vendor.compliance_tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Compliance: {vendor.compliance_score}%
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => handleRequestQuote(vendor)}
                        size="sm"
                        className="bg-allrentz-red hover:bg-red-700"
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Request Quote
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartMatchInterface;
