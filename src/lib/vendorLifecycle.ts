export type VendorLifecycleAction = {
  nextStatus: 'vendor_confirmed' | 'mobilizing' | 'in_transit';
  label: string;
  pendingLabel: string;
  successMessage: string;
};

const VENDOR_LIFECYCLE_ACTIONS: Record<string, VendorLifecycleAction> = {
  quote_accepted: {
    nextStatus: 'vendor_confirmed',
    label: 'Confirm Deployment',
    pendingLabel: 'Confirming...',
    successMessage: 'Deployment confirmed.',
  },
  vendor_confirmed: {
    nextStatus: 'mobilizing',
    label: 'Begin Mobilization',
    pendingLabel: 'Starting...',
    successMessage: 'Mobilization started.',
  },
  mobilizing: {
    nextStatus: 'in_transit',
    label: 'Mark In Transit',
    pendingLabel: 'Updating...',
    successMessage: 'Equipment marked in transit.',
  },
};

const VENDOR_LIFECYCLE_LABELS: Record<string, string> = {
  quote_accepted: 'Awaiting vendor confirmation',
  vendor_confirmed: 'Vendor confirmed',
  mobilizing: 'Mobilizing',
  in_transit: 'In transit — awaiting field acceptance',
  on_rent: 'On rent',
  off_rent_requested: 'Off-rent requested — pickup acknowledgment required',
  demobilizing: 'Pickup coordination in progress — stop-rent determination pending',
};

export const getVendorLifecycleAction = (status: string) =>
  VENDOR_LIFECYCLE_ACTIONS[status] ?? null;

export const getVendorLifecycleLabel = (status: string) =>
  VENDOR_LIFECYCLE_LABELS[status] ?? status.replace(/_/g, ' ');
