import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Zap, Filter, MapPin, Clock, Star, DollarSign } from 'lucide-react';

// Import our enhanced services
import equipmentService, { EquipmentSearchFilters, EquipmentWithVendor } from '@/services/equipmentService';
import hybridSmartMatchEngine, { SmartMatchRequest, MatchedVendor, SmartMatchResult } from '@/services/hybridSmartMatchEngine';
import { useAuthContext } from '@/contexts/AuthContext';
import LoadingSkeleton from './LoadingSkeleton';

interface HybridSearchInterfaceProps {
  onResults?: (results: any) => void;
  defaultTab?: 'manual' | 'smart';
}

const HybridSearchInterface: React.FC<HybridSearchInterfaceProps> = ({ 
  onResults,
  defaultTab = 'smart' 
}) => {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'manual' | 'smart'>(defaultTab);
  
  // Manual Search State
  const [manualFilters, setManualFilters] = useState<EquipmentSearchFilters>({
    availability_status: 'available'
  });
  const [manualResults, setManualResults] = useState<EquipmentWithVendor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // SmartMatch State
  const [smartRequest, setSmartRequest] = useState<SmartMatchRequest>({
    equipment_type: '',
    location: '',
    urgency: 'flexible'
  });
  const [smartResults, setSmartResults] = useState<SmartMatchResult | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await equipmentService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleManualSearch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await equipmentService.searchEquipment(manualFilters, 20, 0);
      setManualResults(results.equipment);
      onResults?.(results);
    } catch (err) {
      setError('Failed to search equipment. Please try again.');
      console.error('Manual search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmartMatch = async () => {
    if (!smartRequest.equipment_type || !smartRequest.location) {
      setError('Please specify equipment type and location for SmartMatch');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const customerId = user?.id || 'demo-customer';
      const results = await hybridSmartMatchEngine.smartMatch(smartRequest, customerId);
      setSmartResults(results);
      onResults?.(results);
    } catch (err) {
      setError('SmartMatch failed. Please try manual search.');
      console.error('SmartMatch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const categoryDisplayNames: Record<string, string> = {
    'frac_tanks': 'Frac Tanks',
    'steam_boilers': 'Steam Boilers', 
    'pressure_vessels': 'Pressure Vessels',
    'safety_equipment': 'Safety Equipment',
    'power_generation': 'Power Generation',
    'heavy_machinery': 'Heavy Machinery'
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-allrentz-gray">Find Equipment Your Way</h2>
        <p className="text-gray-600">Choose between AI-powered SmartMatch or manual browsing</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manual' | 'smart')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            SmartMatch AI
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Manual Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-allrentz-red" />
                AI-Powered SmartMatch
              </CardTitle>
              <p className="text-sm text-gray-600">
                Tell us what you need, and our AI will find the best matches based on your requirements, location, and compliance needs.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="equipment-type">Equipment Type</Label>
                  <Input
                    id="equipment-type"
                    placeholder="e.g., frac tanks, steam boiler, safety equipment"
                    value={smartRequest.equipment_type}
                    onChange={(e) => setSmartRequest({
                      ...smartRequest,
                      equipment_type: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Houston, Beaumont, Port Arthur"
                    value={smartRequest.location}
                    onChange={(e) => setSmartRequest({
                      ...smartRequest,
                      location: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select
                    value={smartRequest.urgency}
                    onValueChange={(value: any) => setSmartRequest({
                      ...smartRequest,
                      urgency: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-rate">Max Daily Rate (Optional)</Label>
                  <Input
                    id="max-rate"
                    type="number"
                    placeholder="e.g., 500"
                    value={smartRequest.additional_requirements?.max_daily_rate || ''}
                    onChange={(e) => setSmartRequest({
                      ...smartRequest,
                      additional_requirements: {
                        ...smartRequest.additional_requirements,
                        max_daily_rate: e.target.value ? Number(e.target.value) : undefined
                      }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compliance Requirements (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {['TWIC', 'HAZMAT', 'ISNET'].map((req) => (
                    <Badge
                      key={req}
                      variant={
                        (req === 'TWIC' && smartRequest.additional_requirements?.twic_required) ||
                        (req === 'HAZMAT' && smartRequest.additional_requirements?.hazmat_certified) ||
                        (req === 'ISNET' && smartRequest.additional_requirements?.isnet_required)
                          ? 'default' : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const requirements = smartRequest.additional_requirements || {};
                        setSmartRequest({
                          ...smartRequest,
                          additional_requirements: {
                            ...requirements,
                            ...(req === 'TWIC' && { twic_required: !requirements.twic_required }),
                            ...(req === 'HAZMAT' && { hazmat_certified: !requirements.hazmat_certified }),
                            ...(req === 'ISNET' && { isnet_required: !requirements.isnet_required })
                          }
                        });
                      }}
                    >
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleSmartMatch}
                disabled={isLoading || !smartRequest.equipment_type || !smartRequest.location}
                className="w-full bg-allrentz-red hover:bg-red-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isLoading ? 'Finding Matches...' : 'Find SmartMatches'}
              </Button>
            </CardContent>
          </Card>

          {/* SmartMatch Results */}
          {smartResults && (
            <Card>
              <CardHeader>
                <CardTitle>SmartMatch Results</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{smartResults.total_matches} matches found</span>
                  <span>Processed in {smartResults.processing_time_ms}ms</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {smartResults.matches.slice(0, 6).map((match) => (
                    <Card key={match.equipment_id} className="border-l-4 border-l-allrentz-red">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{match.equipment_title}</h4>
                            <p className="text-sm text-gray-600">{match.company_name}</p>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {match.match_score}% match
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(match.daily_rate)}/day
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {match.distance_miles} miles
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {match.response_time_hours}h response
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {match.performance_rating.toFixed(1)} rating
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {match.compliance_tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-allrentz-gray" />
                Manual Equipment Search
              </CardTitle>
              <p className="text-sm text-gray-600">
                Browse and filter equipment manually to find exactly what you need.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={manualFilters.category || ''}
                    onValueChange={(value) => setManualFilters({
                      ...manualFilters,
                      category: value || undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {categoryDisplayNames[category] || category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-location">Location</Label>
                  <Input
                    id="manual-location"
                    placeholder="e.g., Houston"
                    value={manualFilters.location || ''}
                    onChange={(e) => setManualFilters({
                      ...manualFilters,
                      location: e.target.value || undefined
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Select
                    value={manualFilters.availability_status || 'all'}
                    onValueChange={(value: any) => setManualFilters({
                      ...manualFilters,
                      availability_status: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Equipment</SelectItem>
                      <SelectItem value="available">Available Now</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="maintenance">Under Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-daily-rate">Max Daily Rate</Label>
                  <Input
                    id="max-daily-rate"
                    type="number"
                    placeholder="e.g., 500"
                    value={manualFilters.max_daily_rate || ''}
                    onChange={(e) => setManualFilters({
                      ...manualFilters,
                      max_daily_rate: e.target.value ? Number(e.target.value) : undefined
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-rating">Min Rating</Label>
                  <Select
                    value={manualFilters.min_rating?.toString() || ''}
                    onValueChange={(value) => setManualFilters({
                      ...manualFilters,
                      min_rating: value ? Number(value) : undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Rating</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="2">2+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleManualSearch}
                disabled={isLoading}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search Equipment'}
              </Button>
            </CardContent>
          </Card>

          {/* Manual Search Results */}
          {manualResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <p className="text-sm text-gray-600">{manualResults.length} equipment items found</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {manualResults.slice(0, 9).map((equipment) => (
                    <Card key={equipment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{equipment.title}</h4>
                            <p className="text-sm text-gray-600">{equipment.vendor.name}</p>
                          </div>
                          <Badge 
                            variant={equipment.status === 'available' ? 'secondary' : 'outline'}
                            className={equipment.status === 'available' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {equipment.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(equipment.daily_rate)}/day
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {equipment.vendor.rating?.toFixed(1) || 'N/A'} rating
                          </div>
                        </div>

                        {equipment.compliance_certifications && (
                          <div className="flex flex-wrap gap-1">
                            {equipment.compliance_certifications.slice(0, 3).map((cert, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <LoadingSkeleton />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HybridSearchInterface;