
import React from 'react';
import { FileText, Download, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface RentalTermsGeneratorProps {
  equipmentType: string;
  dailyRate: number;
  isRefineryReady?: boolean;
  operatorIncluded?: boolean;
}

const RentalTermsGenerator: React.FC<RentalTermsGeneratorProps> = ({
  equipmentType,
  dailyRate,
  isRefineryReady = false,
  operatorIncluded = false
}) => {
  const generateTerms = () => {
    const baseTerms = {
      rentalRate: `$${dailyRate.toLocaleString()}/day`,
      minimumRental: isRefineryReady ? '7 days' : '1 day',
      deliveryFee: 'Included within 50 miles',
      insurance: 'Required - Customer responsible',
      damage: 'Customer liable for damage beyond normal wear',
      fuelMaintenance: operatorIncluded ? 'Included with operator' : 'Customer responsible',
      cancellation: '24 hours notice required',
      paymentTerms: 'Net 30 days',
      safetyCompliance: isRefineryReady ? 'ATEX/Class 1 Div 1 compliant' : 'Standard safety requirements'
    };

    const refinerySpecificTerms = isRefineryReady ? {
      siteAccess: 'Vendor pre-qualified for refinery access',
      hotWork: 'Hot work permits handled by vendor',
      gasMonitoring: 'Continuous gas monitoring required',
      emergencyResponse: '24/7 emergency support included'
    } : {};

    return { ...baseTerms, ...refinerySpecificTerms };
  };

  const terms = generateTerms();

  const downloadTerms = () => {
    // Simulate terms document download
    console.log('Downloading rental terms:', terms);
    
    // In real implementation, this would generate and download a PDF
    const termsText = Object.entries(terms)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`)
      .join('\n');
    
    const blob = new Blob([`ALLRENTZ RENTAL TERMS\n\nEquipment: ${equipmentType}\n\n${termsText}`], 
      { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-terms-${equipmentType.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-allrentz-red" />
          <h3 className="text-lg font-semibold text-allrentz-gray">
            Standard Rental Terms
          </h3>
        </div>
        <Button onClick={downloadTerms} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Terms
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Daily Rate:</span>
            <span className="font-medium">{terms.rentalRate}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Minimum Rental:</span>
            <span className="font-medium">{terms.minimumRental}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery:</span>
            <span className="font-medium">{terms.deliveryFee}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Terms:</span>
            <span className="font-medium">{terms.paymentTerms}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Cancellation:</span>
            <span className="font-medium">{terms.cancellation}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Insurance:</span>
            <span className="font-medium">{terms.insurance}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Fuel/Maintenance:</span>
            <span className="font-medium">{terms.fuelMaintenance}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Safety Compliance:</span>
            <span className="font-medium">{terms.safetyCompliance}</span>
          </div>
          
          {isRefineryReady && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Site Access:</span>
                <span className="font-medium text-green-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  Pre-qualified
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Emergency Support:</span>
                <span className="font-medium text-green-600">
                  <Check className="h-4 w-4 inline mr-1" />
                  24/7 Available
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {isRefineryReady && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Refinery-Ready Equipment:</strong> This equipment meets enhanced safety and 
            compliance standards for refinery and terminal operations.
          </p>
        </div>
      )}
    </div>
  );
};

export default RentalTermsGenerator;

