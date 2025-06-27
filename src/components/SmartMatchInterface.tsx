
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { smartMatchEngine, SmartMatchRequest, MatchedVendor } from '@/services/smartMatchEngine';
import SmartMatchForm from '@/components/SmartMatchForm';
import SmartMatchResults from '@/components/SmartMatchResults';
import HowItWorksSection from '@/components/HowItWorksSection';

const SmartMatchInterface: React.FC = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchedVendor[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<SmartMatchRequest>({
    equipment_type: '',
    location: '',
    urgency: 'today' as const,
    additional_requirements: {}
  });

  const handleMatch = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use SmartMatch.",
        variant: "destructive",
      });
      return;
    }

    if (!request.equipment_type || !request.location) {
      toast({
        title: "Missing information",
        description: "Please specify equipment type and location.",
        variant: "destructive",
      });
      return;
    }

    setIsMatching(true);
    setMatchResults([]);

    try {
      const result = await smartMatchEngine.processMatch(request, user.id);
      
      setMatchResults(result.matches);
      setTotalMatches(result.total_matches);
      setProcessingTime(result.processing_time_ms);

      // Simulate vendor notifications
      await smartMatchEngine.notifyVendors(result.matches, request);

      toast({
        title: "SmartMatch Complete!",
        description: `Found ${result.matches.length} qualified vendors in ${result.processing_time_ms}ms`,
      });

    } catch (error) {
      console.error('SmartMatch error:', error);
      toast({
        title: "SmartMatch Failed",
        description: "Unable to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleRequestQuote = (vendor: MatchedVendor) => {
    toast({
      title: "Quote Request Sent",
      description: `Quote request sent to ${vendor.company_name}`,
    });
  };

  return (
    <div className="space-y-6">
      <SmartMatchForm
        request={request}
        setRequest={setRequest}
        isMatching={isMatching}
        onMatch={handleMatch}
      />

      <SmartMatchResults
        matchResults={matchResults}
        totalMatches={totalMatches}
        processingTime={processingTime}
        onRequestQuote={handleRequestQuote}
      />

      <HowItWorksSection />
    </div>
  );
};

export default SmartMatchInterface;
