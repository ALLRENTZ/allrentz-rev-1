// Maps broad industry-group category labels (used by CategoryCard URLs)
// to the concrete equipment.category values stored in the Supabase
// `equipment` / `equipment_public` rows.
export const CATEGORY_GROUP_MAP: Record<string, string[]> = {
  'Core Equipment & Earthmoving': ['Excavators', 'Dozers', 'Skid Steers', 'Loaders', 'Telehandlers', 'Forklifts', 'Cranes'],
  'Power, Climate & Fluids': ['Generators', 'HVAC', 'Pumps', 'Fuel Tanks', 'Water Tanks'],
  'Tanks & Containment': ['Tanks', 'Frac Tanks', 'Double-Wall Tanks', 'Poly Tanks', 'Spill Berms', 'Roll-Off Boxes'],
  'Turnaround & Shutdown Essentials': ['Boilers', 'Water Heaters', 'Compressors', 'Vac Boxes', 'Filter Pots', 'Air Movers'],
  'Inspection, Safety & Compliance': ['Gas Detection', 'Confined Space Entry', 'NDT', 'Pipeline Inspection', 'Rescue Tripods', 'Fall Protection'],
  'Welding, Fabrication & Tooling': ['Welding Machines', 'Pipe Cutting', 'Fab Stations', 'Material Handling Cribs'],
  'Cleaning & Surface Prep': ['UHP Water Blasting', 'Hydro Vac Trucks', 'Shot Blasters', 'Grinders', 'Environmental Remediation'],
};

export const resolveCategoryGroup = (groupOrCategory: string): string[] | null => {
  if (!groupOrCategory || groupOrCategory === 'all') return null;
  const mapped = CATEGORY_GROUP_MAP[groupOrCategory];
  if (mapped && mapped.length) return mapped;
  // Treat unknown values as a literal single category filter.
  return [groupOrCategory];
};
