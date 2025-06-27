export interface EquipmentCategory {
  id: string;
  title: string;
  description: string;
  image: string;
  equipmentCount: number;
  subItems: string[];
  label: 'Core Solutions' | 'Advanced' | 'Tooling';
  category: string;
}

export const equipmentCategories: EquipmentCategory[] = [
  {
    id: 'heavy-construction-equipment',
    title: 'Heavy Construction Equipment',
    description: 'Essential earthmoving and construction equipment for industrial operations',
    image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 52,
    subItems: ['Dozers', 'Excavators', 'Road Equipment (Pavers and Reclaimers)'],
    label: 'Core Solutions',
    category: 'Heavy Construction Equipment'
  },
  {
    id: 'power-climate-fluids',
    title: 'Power, Climate & Fluids',
    description: 'Power generation, climate control, and fluid handling systems',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 67,
    subItems: ['Generators & Power', 'HVAC / Climate', 'Pumps & Pressure', 'Dewatering'],
    label: 'Core Solutions',
    category: 'Power, Climate & Fluids'
  },
  {
    id: 'storage-containment',
    title: 'Storage & Frac Tanks',
    description: 'High-capacity storage and containment solutions for industrial operations',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 45,
    subItems: ['Frac Tanks & Temp Storage', 'Chemical Handling', 'Spill/Secondary Containment'],
    label: 'Core Solutions',
    category: 'Storage & Frac Tanks'
  },
  {
    id: 'refinery-process-tools',
    title: 'Refinery & Process Tools',
    description: 'Specialized equipment for refinery and process operations',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 38,
    subItems: ['Specialized Refinery Tools', 'Process Equip & Systems', 'Corrosion / Cathodic'],
    label: 'Advanced',
    category: 'Refinery & Process Tools'
  },
  {
    id: 'inspection-safety-compliance',
    title: 'Inspection, Safety & Compliance',
    description: 'Critical safety equipment for hazardous environments',
    image: 'https://images.unsplash.com/photo-1621416894227-d6a8b66e12d3?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 73,
    subItems: ['NDT / Pipeline Inspection', 'Gas Detection', 'Confined-Space Kits', 'Fire & Emergency'],
    label: 'Advanced',
    category: 'Inspection, Safety & Compliance'
  },
  {
    id: 'fabrication-field-services',
    title: 'Fabrication & Field Services',
    description: 'Mobile fabrication and field service equipment',
    image: 'https://images.unsplash.com/photo-1592840464026-34f74cede7e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 29,
    subItems: ['Welding & Piping', 'Cutting / Threading', 'Mobile Fab Stations'],
    label: 'Tooling',
    category: 'Fabrication & Field Services'
  },
  {
    id: 'cleaning-remediation',
    title: 'Cleaning & Remediation',
    description: 'Industrial cleaning and environmental remediation solutions',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 41,
    subItems: ['Tank Cleaning & HP Water', 'Enviro Remediation', 'Waste Mgmt / Treatment'],
    label: 'Advanced',
    category: 'Cleaning & Remediation'
  },
  {
    id: 'offshore-marine',
    title: 'Offshore & Marine',
    description: 'Specialized equipment for offshore and marine operations',
    image: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 24,
    subItems: ['Subsea / ROV Tooling', 'Marine Rigging', 'Positioning / Nav'],
    label: 'Advanced',
    category: 'Offshore & Marine'
  }
];

// Helper function to get categories with conditional offshore display
export const getVisibleCategories = (showOffshore: boolean = false): EquipmentCategory[] => {
  if (showOffshore) {
    return equipmentCategories;
  }
  return equipmentCategories.filter(category => category.id !== 'offshore-marine');
};
