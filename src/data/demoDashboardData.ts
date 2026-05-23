
const today = new Date();
const rel = (days: number): string =>
  new Date(today.getTime() + days * 86_400_000).toISOString();
const relDate = (days: number): string => rel(days).split('T')[0];
const tomorrowLabel = new Date(today.getTime() + 86_400_000).toLocaleDateString('en-US', {
  weekday: 'long', month: 'short', day: 'numeric',
});

export const demoCustomerRentalRequests = [
  {
    id: 'demo-req-001',
    customer_id: 'demo-customer',
    status: 'in_transit',
    start_date: relDate(-1),
    end_date: relDate(20),
    total_amount: 7665,
    delivery_address: '2301 Hwy 87 — Gulf Coast Refinery, Unit 5 Turnaround, Port Arthur, TX 77640',
    special_requirements: 'TWIC required. Gate B access only. Contact site coordinator on arrival.',
    created_at: rel(-3),
    equipment: {
      title: '600 CFM Air Compressor',
      daily_rate: 365,
      category: 'Air Compressors',
      image_url: null,
    },
  },
  {
    id: 'demo-req-002',
    customer_id: 'demo-customer',
    status: 'quoted',
    start_date: relDate(5),
    end_date: relDate(35),
    total_amount: 12600,
    delivery_address: '4400 Terminal Blvd, Beaumont Tank Terminal, Beaumont, TX 77705',
    special_requirements: 'Zone 2 rated required. Quantity: 2 units.',
    created_at: rel(-1),
    vendor_name: 'Atlas Industrial Equipment',
    quote_notes: 'Both Zone 2 units confirmed available. Zone 2 certifications on file. Delivery window: Monday 06:00 — Gate B access required. TWIC-compliant driver assigned.',
    equipment: {
      title: 'Zone 2 Explosion-Proof Light Tower (x2)',
      daily_rate: 210,
      category: 'Lighting Equipment',
      image_url: null,
    },
  },
  {
    id: 'demo-req-003',
    customer_id: 'demo-customer',
    status: 'approved',
    start_date: relDate(3),
    end_date: relDate(17),
    total_amount: 3780,
    delivery_address: '1100 Refinery Row, Motiva Enterprises, Port Arthur, TX 77640',
    special_requirements: 'Confined space application. Safety standby team on site.',
    created_at: rel(-5),
    equipment: {
      title: 'Vacuum Box System',
      daily_rate: 270,
      category: 'Vacuum Equipment',
      image_url: null,
    },
  },
  {
    id: 'demo-req-004',
    customer_id: 'demo-customer',
    status: 'completed',
    start_date: relDate(-21),
    end_date: relDate(-5),
    total_amount: 12800,
    delivery_address: '7800 Industrial Dr, Flint Hills Resources, Corpus Christi, TX 78407',
    special_requirements: null,
    created_at: rel(-24),
    equipment: {
      title: '40K PSI UHP Water Blasting Pump',
      daily_rate: 800,
      category: 'Pressure Equipment',
      image_url: null,
    },
  },
];

export const demoCustomerNotifications = [
  {
    id: 'demo-notif-001',
    user_id: 'demo-customer',
    title: 'Quote received — Zone 2 Light Towers',
    message: 'Atlas Industrial Equipment responded to your RFQ for Beaumont Tank Terminal. Review and confirm to proceed.',
    read: false,
    type: 'quote',
    created_at: rel(-0.2),
  },
  {
    id: 'demo-notif-002',
    user_id: 'demo-customer',
    title: 'Delivery update — 600 CFM Air Compressor',
    message: `Driver confirmed. ETA: ${tomorrowLabel} at 07:00. Driver: M. Castillo — (713) 555-0184.`,
    read: false,
    type: 'delivery',
    created_at: rel(-0.3),
  },
  {
    id: 'demo-notif-003',
    user_id: 'demo-customer',
    title: 'Compliance reminder — Port Arthur site access',
    message: 'TWIC verification required before Vacuum Box System delivery. Confirm credentials or contact site coordinator.',
    read: true,
    type: 'compliance',
    created_at: rel(-4),
  },
  {
    id: 'demo-notif-004',
    user_id: 'demo-customer',
    title: 'Rental approved — Vacuum Box System',
    message: 'Your Motiva Port Arthur rental has been approved by the vendor. Delivery date confirmed.',
    read: true,
    type: 'approval',
    created_at: rel(-5),
  },
];
