
import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface VendorSpecVerificationProps {
  equipmentId: string;
  equipmentName: string;
  specs: string[];
  onVerificationComplete?: () => void;
}

const VendorSpecVerification: React.FC<VendorSpecVerificationProps> = ({
  equipmentId,
  equipmentName,
  specs,
  onVerificationComplete
}) => {
  const [verifiedSpecs, setVerifiedSpecs] = useState<boolean[]>(new Array(specs.length).fill(false));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSpecToggle = (index: number) => {
    setVerifiedSpecs(prev => {
      const newSpecs = [...prev];
      newSpecs[index] = !newSpecs[index];
      return newSpecs;
    });
  };

  const handleSubmitVerification = () => {
    const allVerified = verifiedSpecs.every(verified => verified);
    
    if (!allVerified) {
      toast({
        title: "Incomplete Verification",
        description: "Please verify all specifications before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Specifications Verified",
        description: `All specs for ${equipmentName} have been verified and are now visible to customers.`,
      });
      onVerificationComplete?.();
    }, 1000);
  };

  const allVerified = verifiedSpecs.every(verified => verified);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-allrentz-gray mb-2">
          Verify Specifications for {equipmentName}
        </h3>
        <p className="text-sm text-gray-600">
          Confirm that each specification is accurate and up-to-date
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Important</p>
            <p className="text-sm text-blue-700">
              By verifying these specifications, you confirm they are accurate and customers can rely on this information for their rental decisions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-allrentz-gray">Equipment Specifications</h4>
        {specs.map((spec, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <span className="text-gray-700">{spec}</span>
            <button
              onClick={() => handleSpecToggle(index)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                verifiedSpecs[index]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {verifiedSpecs[index] ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Verify</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button
          onClick={handleSubmitVerification}
          disabled={!allVerified || isSubmitting}
          className={`px-8 py-2 ${
            allVerified && !isSubmitting
              ? 'bg-green-600 hover:bg-green-700'
              : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Verification
            </>
          )}
        </Button>
      </div>

      {allVerified && !isSubmitting && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Ready to submit! All specifications have been verified.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSpecVerification;
