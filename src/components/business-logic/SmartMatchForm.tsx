
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Zap } from 'lucide-react';
import { SmartMatchRequest } from '@/services/smartMatchEngine';

interface SmartMatchFormProps {
  request: SmartMatchRequest;
  setRequest: React.Dispatch<React.SetStateAction<SmartMatchRequest>>;
  isMatching: boolean;
  onMatch: () => void;
}

const SmartMatchForm: React.FC<SmartMatchFormProps> = ({
  request,
  setRequest,
  isMatching,
  onMatch
}) => {
  const equipmentTypes = [
    'Boilers', 'Storage', 'Power Generation', 'Pumps', 'Compressors',
    'Heat Exchangers', 'Filters', 'Cranes', 'Lifting Equipment'
  ];

  return (
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
                <SelectItem value="immediate">Immediate (&lt; 4 hours)</SelectItem>
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
          onClick={onMatch} 
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
  );
};

export default SmartMatchForm;
