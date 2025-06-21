
import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance, getEmergencyStatus, getEquipmentCoordinates } from '../utils/geofencing';

interface Equipment {
  id: number;
  name: string;
  vendor: string;
  status: 'Active' | 'In Transit' | 'Maintenance';
  lastUpdate: string;
}

interface EquipmentMapProps {
  equipment: Equipment[];
}

const EquipmentMap = ({ equipment }: EquipmentMapProps) => {
  const { latitude, longitude, getCurrentLocation, loading, error } = useGeolocation();
  const [selectedEquipment, setSelectedEquipment] = useState<number | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-600';
      case 'In Transit': return 'text-blue-600';
      case 'Maintenance': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle className="h-4 w-4" />;
      case 'In Transit': return <Navigation className="h-4 w-4" />;
      case 'Maintenance': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="industrial-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-allrentz-gray">Equipment Tracking</h2>
        <button 
          onClick={getCurrentLocation}
          className="industrial-button-secondary text-sm py-2 px-4"
          disabled={loading}
        >
          {loading ? 'Locating...' : 'Update Location'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Mock Map View */}
      <div className="bg-gray-100 rounded-lg h-64 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-allrentz-red mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Interactive Equipment Map</p>
            <p className="text-sm text-gray-500">Real-time GPS tracking with geofence alerts</p>
          </div>
        </div>
        
        {/* Equipment Markers */}
        <div className="absolute top-4 right-4 bg-white rounded-lg p-2 shadow-sm">
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Active</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>In Transit</span>
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Maintenance</span>
          </div>
        </div>
        
        {/* Your Location */}
        {latitude && longitude && (
          <div className="absolute bottom-4 left-4 bg-allrentz-red text-white rounded-lg p-2 text-xs">
            Your Location: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </div>
        )}
      </div>

      {/* Equipment List */}
      <div className="space-y-3">
        {equipment.map((item) => {
          const coords = getEquipmentCoordinates(item.id);
          const distance = latitude && longitude ? 
            calculateDistance(latitude, longitude, coords.lat, coords.lng) : null;
          const emergencyStatus = distance ? getEmergencyStatus(distance) : null;
          
          return (
            <div 
              key={item.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedEquipment === item.id ? 'border-allrentz-red bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedEquipment(selectedEquipment === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-allrentz-gray">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.vendor}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`industrial-badge ${item.status === 'Active' ? 'industrial-badge-approved' : 
                      item.status === 'In Transit' ? 'industrial-badge-pending' : 'industrial-badge'}`}>
                      {item.status}
                    </span>
                    {emergencyStatus && (
                      <span className={`text-xs px-2 py-1 rounded ${emergencyStatus.color}`}>
                        {emergencyStatus.label}
                      </span>
                    )}
                  </div>
                  {distance && (
                    <p className="text-xs text-gray-500">{distance.toFixed(1)} miles away</p>
                  )}
                </div>
              </div>
              
              {selectedEquipment === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>
                      <p className="text-gray-600">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Update:</span>
                      <p className="text-gray-600">{item.lastUpdate}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button className="industrial-button-secondary text-xs py-1 px-3">
                      View Details
                    </button>
                    <button className="industrial-button-secondary text-xs py-1 px-3">
                      Set Geofence
                    </button>
                    <button className="industrial-button-secondary text-xs py-1 px-3">
                      Schedule Return
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentMap;
