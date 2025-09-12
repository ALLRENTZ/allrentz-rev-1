
// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convert miles to approximate drive time (assuming average 35 mph in industrial areas)
export const milesToDriveTime = (miles: number): number => {
  return Math.round((miles / 35) * 60); // minutes
};

// Determine emergency status based on distance
export const getEmergencyStatus = (distanceInMiles: number) => {
  const driveTimeMinutes = milesToDriveTime(distanceInMiles);
  
  if (driveTimeMinutes <= 15) {
    return { status: 'immediate', label: '15 min away', color: 'bg-red-100 text-red-800' };
  } else if (driveTimeMinutes <= 30) {
    return { status: 'emergency', label: 'Emergency Available', color: 'bg-orange-100 text-orange-800' };
  } else if (driveTimeMinutes <= 45) {
    return { status: 'nearby', label: 'Nearby', color: 'bg-yellow-100 text-yellow-800' };
  }
  return null;
};

// Mock coordinates for equipment locations (in real app, this would come from backend)
export const getEquipmentCoordinates = (equipmentId: number) => {
  const mockCoordinates: Record<number, { lat: number; lng: number }> = {
    1: { lat: 29.7604, lng: -95.3698 }, // Houston
    2: { lat: 30.0686, lng: -94.1266 }, // Beaumont
    3: { lat: 29.3013, lng: -94.7977 }, // Galveston
    4: { lat: 29.5316, lng: -95.0403 }, // Texas City
    5: { lat: 29.6910, lng: -95.2091 }, // Pasadena
    6: { lat: 29.6785, lng: -95.1254 }, // Deer Park
  };
  return mockCoordinates[equipmentId] || { lat: 29.7604, lng: -95.3698 };
};

// Check if equipment was recently returned (mock function)
export const isRecentlyReturned = (equipmentId: number): boolean => {
  // Mock: randomly determine if equipment was recently returned
  return [2, 4, 6].includes(equipmentId);
};

// Check for hot swap opportunities
export const getHotSwapStatus = (equipmentCategory: string, equipmentId: number) => {
  const recentlyReturned = isRecentlyReturned(equipmentId);
  const isCriticalCategory = ['Safety', 'Cleaning', 'Process'].includes(equipmentCategory);
  
  if (recentlyReturned && isCriticalCategory) {
    return { isHotSwap: true, label: 'Hot Swap Available', color: 'bg-blue-100 text-blue-800' };
  } else if (recentlyReturned) {
    return { isHotSwap: true, label: 'Recently Returned', color: 'bg-green-100 text-green-800' };
  }
  return null;
};
