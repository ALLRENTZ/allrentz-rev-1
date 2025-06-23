
import React from 'react';
import { CheckCircle, AlertTriangle, Camera, Eye } from 'lucide-react';

interface EquipmentVerificationProps {
  equipment: {
    id: string;
    name: string;
    hasPhotos: boolean;
    specVerified: boolean;
  };
  onPhotoUpload?: () => void;
  onSpecVerify?: () => void;
}

const EquipmentVerificationSystem: React.FC<EquipmentVerificationProps> = ({
  equipment,
  onPhotoUpload,
  onSpecVerify
}) => {
  const getVerificationBadge = (verified: boolean, label: string, description: string) => {
    return (
      <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
        verified 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-600'
      }`} title={description}>
        {verified ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {getVerificationBadge(
          equipment.hasPhotos, 
          'Visual Verification', 
          'I can see what I\'m getting'
        )}
        {getVerificationBadge(
          equipment.specVerified, 
          'Spec Confirmation', 
          'Technical details are accurate'
        )}
      </div>

      {(!equipment.hasPhotos || !equipment.specVerified) && (
        <div className="space-y-2">
          {!equipment.hasPhotos && onPhotoUpload && (
            <button
              onClick={onPhotoUpload}
              className="flex items-center space-x-2 text-sm text-allrentz-red hover:text-allrentz-red-dark"
            >
              <Camera className="h-4 w-4" />
              <span>Upload Equipment Photos</span>
            </button>
          )}
          
          {!equipment.specVerified && onSpecVerify && (
            <button
              onClick={onSpecVerify}
              className="flex items-center space-x-2 text-sm text-allrentz-red hover:text-allrentz-red-dark"
            >
              <Eye className="h-4 w-4" />
              <span>Verify Specifications</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EquipmentVerificationSystem;
