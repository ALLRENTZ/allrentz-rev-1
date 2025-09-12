
import React from 'react';
import { CheckCircle, AlertTriangle, Camera, Eye, Upload } from 'lucide-react';

interface EquipmentVerificationProps {
  equipment: {
    id: string;
    name: string;
    hasPhotos: boolean;
    specVerified: boolean;
  };
  onPhotoUpload?: () => void;
  onSpecVerify?: () => void;
  onRequestPhotos?: () => void;
  onRequestSpecs?: () => void;
  showCustomerActions?: boolean;
}

const EquipmentVerificationSystem: React.FC<EquipmentVerificationProps> = ({
  equipment,
  onPhotoUpload,
  onSpecVerify,
  onRequestPhotos,
  onRequestSpecs,
  showCustomerActions = false
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

  const isFullyVerified = equipment.hasPhotos && equipment.specVerified;

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

      {!isFullyVerified && (
        <div className="space-y-2">
          {/* Vendor Actions */}
          {!showCustomerActions && (
            <>
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
            </>
          )}

          {/* Customer Actions */}
          {showCustomerActions && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 mb-2">
                This equipment needs verification before booking:
              </p>
              <div className="flex flex-wrap gap-2">
                {!equipment.hasPhotos && onRequestPhotos && (
                  <button
                    onClick={onRequestPhotos}
                    className="flex items-center space-x-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Request Photos</span>
                  </button>
                )}
                
                {!equipment.specVerified && onRequestSpecs && (
                  <button
                    onClick={onRequestSpecs}
                    className="flex items-center space-x-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Request Spec Verification</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const getEquipmentVerificationStatus = (equipment: { hasPhotos: boolean; specVerified: boolean }) => {
  return {
    isFullyVerified: equipment.hasPhotos && equipment.specVerified,
    hasPhotos: equipment.hasPhotos,
    specVerified: equipment.specVerified,
    missingCount: (equipment.hasPhotos ? 0 : 1) + (equipment.specVerified ? 0 : 1)
  };
};

export default EquipmentVerificationSystem;
