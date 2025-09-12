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
    id: 'core-equipment-earthmoving',
    title: 'Core Equipment & Earthmoving',
    description: 'Heavy-duty machinery for site prep, lifting, and material handling',
    image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 85,
    subItems: ['Excavators', 'Dozers', 'Skid Steers', 'Telehandlers / Forklifts', 'Loaders'],
    label: 'Core Solutions',
    category: 'Core Equipment & Earthmoving'
  },
  {
    id: 'power-climate-fluids',
    title: 'Power, Climate & Fluids',
    description: 'Temporary utilities to power, heat, cool, and move fluid across jobsites',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 92,
    subItems: ['Generators', 'HVAC / Climate Control Units', 'Pumps (High Flow, High Head, Submersible)', 'Fuel / Water Tanks'],
    label: 'Core Solutions',
    category: 'Power, Climate & Fluids'
  },
  {
    id: 'tanks-containment',
    title: 'Tanks & Containment',
    description: 'Storage and environmental protection for industrial and hazardous fluids',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 67,
    subItems: ['Frac Tanks', 'Double-Wall Tanks', 'Poly / Mix Tanks', 'Spill Berms & Secondary Containment', 'Dewatering / Roll-Off Boxes'],
    label: 'Core Solutions',
    category: 'Tanks & Containment'
  },
  {
    id: 'turnaround-shutdown-essentials',
    title: 'Turnaround & Shutdown Essentials',
    description: 'Bundled systems for plant turnarounds, maintenance events, and shutdowns',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 54,
    subItems: ['Boilers & Steam Systems', 'Mobile Water Heaters', 'Air Compressors', 'Vac Boxes', 'Filter Pots & Air Movers'],
    label: 'Advanced',
    category: 'Turnaround & Shutdown Essentials'
  },
  {
    id: 'inspection-safety-compliance',
    title: 'Inspection, Safety & Compliance',
    description: 'Critical safety, entry, and detection systems for regulated sites',
    image: 'https://images.unsplash.com/photo-1621416894227-d6a8b66e12d3?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 78,
    subItems: ['Gas Detection / H2S Monitors', 'Confined Space Entry Kits', 'NDT / Pipeline Inspection', 'Rescue Tripods & Fall Protection'],
    label: 'Advanced',
    category: 'Inspection, Safety & Compliance'
  },
  {
    id: 'welding-fabrication-tooling',
    title: 'Welding, Fabrication & Tooling',
    description: 'Mobile and modular equipment for onsite fabrication and piping support',
    image: 'https://images.unsplash.com/photo-1592840464026-34f74cede7e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 43,
    subItems: ['Welding Machines & Rigs', 'Pipe Cutting & Threading', 'Mobile Fab Stations', 'Material Handling Cribs'],
    label: 'Tooling',
    category: 'Welding, Fabrication & Tooling'
  },
  {
    id: 'cleaning-surface-prep',
    title: 'Cleaning & Surface Prep',
    description: 'Solutions for tank cleaning, liner removal, blasting, and environmental remediation',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 36,
    subItems: ['UHP Water Blasting Systems', 'Hydro/Vac Trucks (via partner)', 'Shot Blasters / Grinders', 'Environmental Remediation Units'],
    label: 'Advanced',
    category: 'Cleaning & Surface Prep'
  }
];

// Helper function to get categories with conditional offshore display
export const getVisibleCategories = (showOffshore: boolean = false): EquipmentCategory[] => {
  // Since we removed the offshore category, this function now simply returns all categories
  // Keeping the function for backward compatibility
  return equipmentCategories;
};
