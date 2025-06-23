
import React from 'react';
import { CheckCircle, AlertTriangle, Camera, Shield, Eye } from 'lucide-react';

interface EquipmentVerificationProps {
  equipment: {
    id: string;
    name: string;
    hasPhotos: boolean;
    specVerified: boolean;
    preDispatchConfirmed: boolean;
    vendorQualityScore: number;
  };
  onPhotoUpload?: () => void;
  onSpecVerify?: () => void;
  onPreDispatchConfirm?: () => void;
}

const EquipmentVerificationSystem: React.FC<EquipmentVerificationProps> = ({
  equipment,
  onPhotoUpload,
  onSpecVerify,
  onPreDispatchConfirm
}) => {
  const getVerificationBadge = (verified: boolean, label: string) => {
    return (
      <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
        verified 
          ? 'bg-green-100 text-green-800' 
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {verified ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        <span>{label}</span>
      </div>
    );
  };

  const getQualityScoreBadge = (score: number) => {
    const getScoreColor = () => {
      if (score >= 95) return 'bg-green-100 text-green-800';
      if (score >= 85) return 'bg-blue-100 text-blue-800';
      if (score >= 75) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    };

    return (
      <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${getScoreColor()}`}>
        <Shield className="h-3 w-3" />
        <span>{score}% Quality</span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {getVerificationBadge(equipment.hasPhotos, 'Visual Verified')}
        {getVerificationBadge(equipment.specVerified, 'Spec Confirmed')}
        {getVerificationBadge(equipment.preDispatchConfirmed, 'Pre-Dispatch OK')}
        {getQualityScoreBadge(equipment.vendorQualityScore)}
      </div>

      {(!equipment.hasPhotos || !equipment.specVerified || !equipment.preDispatchConfirmed) && (
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
          
          {!equipment.preDispatchConfirmed && onPreDispatchConfirm && (
            <button
              onClick={onPreDispatchConfirm}
              className="flex items-center space-x-2 text-sm text-allrentz-red hover:text-allrentz-red-dark"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Confirm Pre-Dispatch</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EquipmentVerificationSystem;
