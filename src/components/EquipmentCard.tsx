
import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, CheckCircle, Calendar, Shield, AlertTriangle, Wrench } from 'lucide-react';
import EquipmentVerificationSystem, { getEquipmentVerificationStatus } from './EquipmentVerificationSystem';
import { EquipmentItem } from '../data/equipmentData';

interface EquipmentCardProps {
  item: EquipmentItem;
  onRequestPhotos: (equipmentName: string) => void;
  onRequestSpecs: (equipmentName: string) => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ 
  item, 
  onRequestPhotos, 
  onRequestSpecs 
}) => {
  const verificationStatus = getEquipmentVerificationStatus({
    hasPhotos: item.hasPhotos,
    specVerified: item.specVerified
  });

  return (
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {item.isApproved && (
            <span className="industrial-badge-approved inline-flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>ALLRENTZ Verified</span>
            </span>
          )}
          {item.refineryAccess && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full inline-flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Refinery-Ready</span>
            </span>
          )}
          {item.turnaroundCertified && (
            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
              Turnaround Certified
            </span>
          )}
          {verificationStatus.isFullyVerified && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full inline-flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>Fully Verified</span>
            </span>
          )}
        </div>
        {!item.available && (
          <div className="absolute top-3 right-3">
            <span className="industrial-badge-alert">
              Not Available
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-allrentz-gray mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600">{item.vendor}</p>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium">{item.rating}</span>
            <span className="text-gray-500">({item.reviews})</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4" />
          <span>{item.location}</span>
          <span className="text-gray-400">•</span>
          <span>{item.distance}</span>
        </div>

        {/* Exclusive Repair Warning */}
        {item.exclusiveRepairOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-amber-800">
              <Wrench className="h-4 w-4" />
              <span className="text-sm font-medium">Exclusive Vendor Repair</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              This equipment can only be serviced by the vendor during rental period
            </p>
          </div>
        )}

        {/* Equipment Verification */}
        <div className="mb-4">
          <EquipmentVerificationSystem 
            equipment={{
              id: item.id.toString(),
              name: item.name,
              hasPhotos: item.hasPhotos,
              specVerified: item.specVerified
            }}
            onRequestPhotos={() => onRequestPhotos(item.name)}
            onRequestSpecs={() => onRequestSpecs(item.name)}
            showCustomerActions={true}
          />
        </div>

        {/* Compliance Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {item.complianceTags.map((tag, index) => (
            <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-2xl font-bold text-allrentz-gray">
                ${item.dailyRate.toLocaleString()}
                <span className="text-sm font-normal text-gray-600">/day</span>
              </p>
              <p className="text-sm text-gray-600">
                ${item.weeklyRate.toLocaleString()}/week • ${item.monthlyRate.toLocaleString()}/month
              </p>
            </div>
          </div>

          {/* Availability */}
          {item.available ? (
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Available Now</span>
              {item.operatorIncluded && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-blue-600">Operator Included</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-600">
                Next available: {new Date(item.nextAvailable!).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* CTA Button - Verification Workflow */}
          {verificationStatus.isFullyVerified ? (
            <Link 
              to="/customer-onboarding"
              className="w-full text-center inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
            >
              Reserve Equipment
            </Link>
          ) : (
            <Link 
              to="/customer-onboarding"
              className="w-full text-center inline-block industrial-button font-medium py-3 px-6 rounded-md"
            >
              Request Quote
            </Link>
          )}
          
          {!verificationStatus.isFullyVerified && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Verification needed before direct booking
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentCard;

