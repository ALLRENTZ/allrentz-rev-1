import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileQuestion, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  buildComplianceDocumentRegister,
  buildUnknownComplianceDocumentRegister,
  type ComplianceDocumentRegister as ComplianceDocumentRegisterModel,
  type RegisterDocumentStatus,
  type RegisterRequirementStatus,
} from '@/lib/complianceDocumentRegister';

const requirementBadge = (status: RegisterRequirementStatus) => {
  if (status === 'REQUIRED') return 'bg-blue-100 text-blue-800';
  if (status === 'NOT REQUIRED') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-900';
};

const documentBadge = (status: RegisterDocumentStatus) => {
  if (status === 'NOT APPLICABLE') return 'bg-slate-100 text-slate-700';
  return 'bg-amber-100 text-amber-900';
};

const ComplianceDocumentRegister = () => {
  const { profile, user } = useAuth();
  const [register, setRegister] = useState<ComplianceDocumentRegisterModel>(() =>
    buildUnknownComplianceDocumentRegister(),
  );
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRegister = async () => {
      if (!user) {
        if (active) {
          setRegister(buildUnknownComplianceDocumentRegister());
          setLoadFailed(true);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('customer_profiles')
        .select('twic_required,isnet_required,purchase_order_required,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setRegister(buildUnknownComplianceDocumentRegister());
        setLoadFailed(true);
      } else {
        setRegister(buildComplianceDocumentRegister(data));
        setLoadFailed(false);
      }
      setLoading(false);
    };

    void loadRegister();
    return () => {
      active = false;
    };
  }, [user]);

  const summary = useMemo(
    () => ({
      required: register.items.filter((item) => item.requirementStatus === 'REQUIRED').length,
      reviewRequired: register.items.filter(
        (item) =>
          item.requirementStatus === 'UNKNOWN' || item.documentStatus === 'REVIEW REQUIRED',
      ).length,
    }),
    [register],
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/customer-dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Compliance requirement register</h1>
          <p className="mt-2 text-gray-600">
            {profile?.company_name || 'Your company'} · customer-declared requirements only
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
            <div>
              <p className="font-semibold">Document authority is not implemented</p>
              <p className="mt-1">
                This register shows requirement declarations already stored in your customer profile.
                It does not prove that a document exists, is current, was reviewed, satisfies a
                contract, or must be retained. Those decisions remain UNKNOWN.
              </p>
            </div>
          </div>
        </div>

        {loadFailed && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            The authoritative profile declaration could not be read. All requirement statuses are
            REVIEW REQUIRED until access is restored.
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{loading ? '—' : summary.required}</p>
                  <p className="text-sm text-gray-600">Declared required</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <FileQuestion className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{loading ? '—' : summary.reviewRequired}</p>
                  <p className="text-sm text-gray-600">Requirement review needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">UNKNOWN</p>
                  <p className="text-sm text-gray-600">Document sufficiency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recorded requirement declarations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {register.items.map((item) => (
                <div key={item.key} className="rounded-lg border bg-white p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileQuestion className="h-5 w-5 text-gray-500" />
                        <h2 className="font-semibold text-gray-900">{item.label}</h2>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={requirementBadge(item.requirementStatus)}>
                        Requirement: {item.requirementStatus}
                      </Badge>
                      <Badge className={documentBadge(item.documentStatus)}>
                        Document: {item.documentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
              <div className="text-sm text-blue-950">
                <p className="font-semibold">Authority boundary</p>
                <p className="mt-1">
                  Source: your customer profile under existing row-level security. No upload,
                  approval, retention, expiry, AI review, release gate, or legal-sufficiency action
                  is available from this page.
                </p>
                <p className="mt-2">
                  Last declaration update:{' '}
                  {register.recordedAt ? new Date(register.recordedAt).toLocaleString() : 'UNKNOWN'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceDocumentRegister;
