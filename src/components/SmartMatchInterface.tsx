
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { smartMatchEngine, SmartMatchRequest, MatchedVendor } from '@/services/smartMatchEngine';
import SmartMatchForm from '@/components/SmartMatchForm';
import SmartMatchResults from '@/components/SmartMatchResults';
import HowItWorksSection from '@/components/HowItWorksSection';
import { Card, CardContent } from '@/components/ui/card';
import { Info, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SmartMatchInterface: React.FC = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchedVendor[]>([]);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<SmartMatchRequest>({
    equipment_type: '',
    location: '',
    urgency: 'today' as const,
    additional_requirements: {}
  });

  const handleMatch = async () => {
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
      const customerId = user?.id ?? 'unauthenticated';
      const result = await smartMatchEngine.processMatch(request, customerId, profile?.is_demo ?? !user);
      
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
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to request quotes from vendors.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Quote Request Sent",
      description: `Quote request sent to ${vendor.company_name}`,
    });
  };

  return (
    <div className="space-y-6">
      {!user && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> You're experiencing SmartMatch with simulated data. 
                  Sign in to access real vendor networks and request actual quotes.
                </p>
                <Link to="/auth">
                  <Button size="sm" variant="outline" className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Sign Up for Full Access
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
