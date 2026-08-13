import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeOffRentControlRecord,
  offRentEventLabel,
  type OffRentControlRecord,
} from '@/lib/offRentControl';

interface OffRentControlPanelProps {
  rfqId: string;
  refreshKey?: number;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

export default function OffRentControlPanel({ rfqId, refreshKey = 0 }: OffRentControlPanelProps) {
  const [record, setRecord] = useState<OffRentControlRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('rfq-off-rent', {
      body: { action: 'status', rfq_id: rfqId },
    });
    if (invokeError) {
      setRecord(null);
      setError('The governed off-rent control record is unavailable. Billing authority remains blocked.');
      setLoading(false);
      return;
    }
    const normalized = normalizeOffRentControlRecord(data);
    if (!normalized) {
      setRecord(null);
      setError('The control record response was incomplete. Billing authority remains blocked.');
    } else {
      setRecord(normalized);
    }
    setLoading(false);
  }, [rfqId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord, refreshKey]);

  if (loading) {
    return <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">Loading governed off-rent record…</div>;
  }

  if (error || !record) {
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Off-rent authority unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRecord()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>
    );
  }

  const determined = record.authority.contractual_status === 'DETERMINED';
  const blocked = record.authority.contractual_status === 'BLOCKED';

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4" aria-label="Governed off-rent control record">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="font-semibold text-slate-900">Governed off-rent control</h5>
          <p className="mt-1 text-xs text-slate-600">Requests and pickup coordination do not establish a billing cutoff.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadRecord()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={determined ? 'default' : 'outline'} className={determined ? 'bg-green-700' : blocked ? 'border-red-300 text-red-800' : 'border-amber-300 text-amber-800'}>
          Contract authority: {record.authority.contractual_status}
        </Badge>
        <Badge variant={record.authority.billing_cutoff_status === 'DETERMINED' ? 'default' : 'outline'} className={record.authority.billing_cutoff_status === 'DETERMINED' ? 'bg-green-700' : 'border-red-300 text-red-800'}>
          Billing cutoff: {record.authority.billing_cutoff_status}
        </Badge>
      </div>

      <div className={`mt-3 rounded-md p-3 text-sm ${determined ? 'bg-green-50 text-green-900' : blocked ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
        <div className="flex items-start gap-2">
          {determined ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p className="font-medium">{record.authority.explanation}</p>
            {record.authority.blocker_code && <p className="mt-1 text-xs">Control code: {record.authority.blocker_code}</p>}
            {determined && (
              <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                <span>Stop effective: {formatDate(record.authority.stop_effective_at)}</span>
                <span>Billable through: {formatDate(record.authority.billable_through_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium text-slate-900">Customer request</p>
          {record.request ? (
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p>Recorded: {formatDate(record.request.requested_at)}</p>
              <p>Requested stop: {formatDate(record.request.requested_stop_at)}</p>
              <p>Pickup availability: {formatDate(record.request.pickup_available_from)} – {formatDate(record.request.pickup_available_until)}</p>
              {record.request.customer_notes && <p>Notes: {record.request.customer_notes}</p>}
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">No governed customer request recorded.</p>}
        </div>
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium text-slate-900">Vendor acknowledgment</p>
          {record.acknowledgment ? (
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p>Recorded: {formatDate(record.acknowledgment.acknowledged_at)}</p>
              <p>Pickup window: {formatDate(record.acknowledgment.pickup_window_start)} – {formatDate(record.acknowledgment.pickup_window_end)}</p>
              {record.acknowledgment.vendor_notes && <p>Notes: {record.acknowledgment.vendor_notes}</p>}
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">Awaiting vendor acknowledgment.</p>}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <Clock3 className="h-4 w-4" /> Audit timeline
        </div>
        {record.timeline.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No off-rent events recorded.</p>
        ) : (
          <ol className="mt-2 space-y-2 border-l border-slate-200 pl-4">
            {record.timeline.map((event) => (
              <li key={event.id} className="text-xs text-slate-600">
                <p className="font-medium text-slate-800">{offRentEventLabel(event.event_type, event.state)}</p>
                <p>{formatDate(event.occurred_at)}{event.actor_role ? ` · ${event.actor_role.replace(/_/g, ' ')}` : ''}</p>
                {event.reason && <p className="mt-0.5">{event.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
