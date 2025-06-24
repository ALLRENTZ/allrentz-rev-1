
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
    id: 'storage-tanks',
    title: 'Storage & Frac Tanks',
    description: 'High-capacity storage solutions for industrial operations',
    image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 45,
    subItems: ['21K Gallon Frac Tanks', 'Vacuum-Ready Storage', '500 BBL Tanks', 'Mobile Storage Units'],
    label: 'Core Solutions',
    category: 'Storage'
  },
  {
    id: 'power-generation',
    title: 'Power Generation',
    description: 'Reliable power solutions for industrial sites',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 32,
    subItems: ['Diesel Generators', 'Natural Gas Units', 'Portable Power', 'Load Banks'],
    label: 'Core Solutions',
    category: 'Power Generation'
  },
  {
    id: 'boilers-steam',
    title: 'Boilers & Steam Systems',
    description: 'Industrial boilers and steam generation equipment',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6717d4e89?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 28,
    subItems: ['Steam Boilers', 'Hot Water Systems', 'Thermal Fluid Heaters', 'Heat Exchangers'],
    label: 'Core Solutions',
    category: 'Boilers'
  },
  {
    id: 'safety-equipment',
    title: 'Safety & Monitoring',
    description: 'Critical safety equipment for hazardous environments',
    image: 'https://images.unsplash.com/photo-1621416894227-d6a8b66e12d3?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 67,
    subItems: ['Gas Detectors', 'Emergency Showers', 'Fire Suppression', 'Personal Protection'],
    label: 'Advanced',
    category: 'Safety'
  },
  {
    id: 'cleaning-systems',
    title: 'Cleaning & Decontamination',
    description: 'Industrial cleaning and decontamination solutions',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 41,
    subItems: ['High-Pressure Washers', 'Chemical Cleaning', 'Steam Cleaning', 'Vacuum Systems'],
    label: 'Advanced',
    category: 'Cleaning'
  },
  {
    id: 'compressors',
    title: 'Compressors & Air Systems',
    description: 'Compressed air and gas solutions for industrial use',
    image: 'https://images.unsplash.com/photo-1592840464026-34f74cede7e7?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 35,
    subItems: ['Rotary Screw Compressors', 'Portable Units', 'Oil-Free Systems', 'High-Pressure Units'],
    label: 'Core Solutions',
    category: 'Compressors'
  },
  {
    id: 'material-handling',
    title: 'Material Handling',
    description: 'Equipment for moving and positioning materials',
    image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 52,
    subItems: ['Forklifts', 'Conveyor Systems', 'Hoists & Cranes', 'Pneumatic Handlers'],
    label: 'Tooling',
    category: 'Material Handling'
  },
  {
    id: 'testing-instrumentation',
    title: 'Testing & Instrumentation',
    description: 'Precision testing and measurement equipment',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop&auto=format',
    equipmentCount: 29,
    subItems: ['NDT Equipment', 'Pressure Testing', 'Flow Meters', 'Calibration Tools'],
    label: 'Advanced',
    category: 'Testing & Instrumentation'
  }
];
