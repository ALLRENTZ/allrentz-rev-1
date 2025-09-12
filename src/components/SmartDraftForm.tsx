
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Wrench, FileText } from 'lucide-react';

interface SmartDraftFormProps {
  onSubmit: (data: any) => void;
}

const SmartDraftForm = ({ onSubmit }: SmartDraftFormProps) => {
  const [formData, setFormData] = useState({
    equipmentType: '',
    jobType: '',
    deliveryZipCode: '',
    deliveryStartDate: '',
    deliveryEndDate: '',
    siteRequirements: [] as string[],
    specialInstructions: ''
  });

  const equipmentTypes = [
    'Air Compressor',
    'Light Tower',
    'Generator',
    'Crane',
    'Excavator',
    'Scaffolding',
    'Welding Equipment',
    'Pressure Washer',
    'Forklift',
    'Boom Lift',
    'Scissor Lift',
    'Concrete Mixer'
  ];

  const jobTypes = [
    'Turnaround',
    'Emergency',
    'Routine Maintenance',
    'Construction',
    'Inspection',
    'Repair',
    'Installation'
  ];

  const siteRequirementOptions = [
    'TWIC Required',
    'HAZMAT Certified',
    'Certified Startup',
    'Remote Monitoring',
    'Fuel Plan',
    '24/7 Operator',
    'Safety Training',
    'Environmental Compliance'
  ];

  const handleSiteRequirementChange = (requirement: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        siteRequirements: [...prev.siteRequirements, requirement]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        siteRequirements: prev.siteRequirements.filter(r => r !== requirement)
      }));
    }
  };

  const calculateDuration = () => {
    if (formData.deliveryStartDate && formData.deliveryEndDate) {
      const start = new Date(formData.deliveryStartDate);
      const end = new Date(formData.deliveryEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationDays = calculateDuration();
    
    onSubmit({
      ...formData,
      durationDays
    });
  };

  const isFormValid = formData.equipmentType && formData.jobType && formData.deliveryZipCode && 
                     formData.deliveryStartDate && formData.deliveryEndDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Equipment Type */}
        <div className="space-y-2">
          <Label htmlFor="equipmentType" className="flex items-center space-x-2">
            <Wrench className="h-4 w-4" />
            <span>Equipment Type *</span>
          </Label>
          <Select value={formData.equipmentType} onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}>
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

        {/* Job Type */}
        <div className="space-y-2">
          <Label htmlFor="jobType" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Job Type *</span>
          </Label>
          <Select value={formData.jobType} onValueChange={(value) => setFormData(prev => ({ ...prev, jobType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select job type" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Delivery ZIP Code */}
        <div className="space-y-2">
          <Label htmlFor="deliveryZipCode" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Delivery ZIP Code *</span>
          </Label>
          <Input
            id="deliveryZipCode"
            type="text"
            placeholder="Enter ZIP code"
            value={formData.deliveryZipCode}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryZipCode: e.target.value }))}
            maxLength={5}
          />
        </div>

        {/* Duration display */}
        <div className="space-y-2">
          <Label className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Duration</span>
          </Label>
          <div className="p-2 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-600">
              {calculateDuration()} days
            </span>
          </div>
        </div>

        {/* Delivery Start Date */}
        <div className="space-y-2">
          <Label htmlFor="deliveryStartDate">Delivery Start Date *</Label>
          <Input
            id="deliveryStartDate"
            type="date"
            value={formData.deliveryStartDate}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryStartDate: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Delivery End Date */}
        <div className="space-y-2">
          <Label htmlFor="deliveryEndDate">Delivery End Date *</Label>
          <Input
            id="deliveryEndDate"
            type="date"
            value={formData.deliveryEndDate}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryEndDate: e.target.value }))}
            min={formData.deliveryStartDate || new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Site Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {siteRequirementOptions.map(requirement => (
              <div key={requirement} className="flex items-center space-x-2">
                <Checkbox
                  id={requirement}
                  checked={formData.siteRequirements.includes(requirement)}
                  onCheckedChange={(checked) => handleSiteRequirementChange(requirement, checked as boolean)}
                />
                <Label htmlFor={requirement} className="text-sm cursor-pointer">{requirement}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Special Instructions */}
      <div className="space-y-2">
        <Label htmlFor="specialInstructions">Special Instructions</Label>
        <Textarea
          id="specialInstructions"
          placeholder="Enter any special requirements or notes..."
          value={formData.specialInstructions}
          onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full"
        disabled={!isFormValid}
      >
        Generate Smart Draft
      </Button>
    </form>
  );
};

export default SmartDraftForm;
