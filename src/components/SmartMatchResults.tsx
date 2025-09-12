
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Star, CheckCircle2, Truck } from 'lucide-react';
import { MatchedVendor } from '@/services/smartMatchEngine';

interface SmartMatchResultsProps {
  matchResults: MatchedVendor[];
  totalMatches: number;
  processingTime: number;
  onRequestQuote: (vendor: MatchedVendor) => void;
}

const SmartMatchResults: React.FC<SmartMatchResultsProps> = ({
  matchResults,
  totalMatches,
  processingTime,
  onRequestQuote
}) => {
  if (matchResults.length === 0) {
    return null;
  }

  return (
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
                    onClick={() => onRequestQuote(vendor)}
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
  );
};

export default SmartMatchResults;
