
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Wrench, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import EquipmentQuoteRequest from './EquipmentQuoteRequest';

interface Equipment {
  id: string;
  title: string;
  category: string;
  daily_rate: number;
  location: string;
  image_url?: string;
  available?: boolean;
  description?: string;
  response_time_hours?: number;
  requires_operator?: boolean;
  hazmat_certified?: boolean;
  compliance_tags?: string[];
}

interface EquipmentCardProps {
  equipment: Equipment;
  onQuoteRequest?: (equipmentId: string) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onQuoteRequest }) => {
  const { user, profile } = useAuth();
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const handleRequestQuote = () => {
    if (!user) {
      // Redirect to auth if not logged in
      window.location.href = '/auth';
      return;
    }

    // Check if user has completed onboarding
    if (profile?.onboarding_completed) {
      // Show quote modal directly for completed users
      setShowQuoteModal(true);
    } else {
      // Redirect to onboarding for incomplete users
      window.location.href = '/customer-onboarding';
    }
  };

  const handleQuoteSubmitted = () => {
    setShowQuoteModal(false);
    if (onQuoteRequest) {
      onQuoteRequest(equipment.id);
    }
  };

  return (
    <>
      <Card className="industrial-card hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                {equipment.title}
              </CardTitle>
              <Badge variant="secondary" className="mb-2">
                {equipment.category}
              </Badge>
            </div>
            {equipment.available && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Available
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {equipment.image_url && (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={equipment.image_url} 
                alt={equipment.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {equipment.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {equipment.description}
            </p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{equipment.location}</span>
            </div>
            
            {equipment.response_time_hours && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>{equipment.response_time_hours}hr response time</span>
              </div>
            )}
            
            {equipment.requires_operator && (
              <div className="flex items-center text-sm text-gray-600">
                <Wrench className="h-4 w-4 mr-2" />
                <span>Operator included</span>
              </div>
            )}
          </div>

          {equipment.compliance_tags && equipment.compliance_tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {equipment.compliance_tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <span className="text-2xl font-bold text-allrentz-red">
                ${equipment.daily_rate}
              </span>
              <span className="text-gray-600 text-sm ml-1">/day</span>
            </div>
            <Button 
              onClick={handleRequestQuote}
              className="bg-allrentz-red hover:bg-red-700"
            >
              Request Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      {showQuoteModal && (
        <EquipmentQuoteRequest
          equipment={equipment}
          onClose={() => setShowQuoteModal(false)}
          onSubmitted={handleQuoteSubmitted}
        />
      )}
    </>
  );
};

export default EquipmentCard;
