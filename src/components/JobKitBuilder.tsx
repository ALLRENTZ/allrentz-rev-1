
import React, { useState } from 'react';
import { Plus, Package, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface JobKitBuilderProps {
  onKitSave: (kit: any) => void;
}

const JobKitBuilder: React.FC<JobKitBuilderProps> = ({ onKitSave }) => {
  const [kitName, setKitName] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<any[]>([]);
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([]);

  const prebuiltKits = [
    {
      id: 'tank-terminal-cleaning',
      name: 'Tank Terminal Cleaning Kit',
      description: 'Complete setup for tank terminal maintenance',
      equipment: [
        'UHP Robotics System',
        'Vacuum Dewatering Box (Hard-cage)',
        'Frac Tank - 21,000 Gal',
        'Industrial Air Compressor - 185 CFM',
        'Safety Equipment Bundle'
      ],
      verified: true
    },
    {
      id: 'refinery-turnaround',
      name: 'Refinery Turnaround Package',
      description: '30-day turnaround equipment bundle',
      equipment: [
        'Steam Boiler - 150 HP',
        'Industrial Generator - 500kW',
        'Multiple Frac Tanks',
        'Crane - 50 Ton',
        'Vacuum Systems',
        'Safety & Compliance Bundle'
      ],
      verified: true
    },
    {
      id: 'offshore-platform',
      name: 'Offshore Platform Kit',
      description: 'Marine-certified equipment for offshore work',
      equipment: [
        'Marine Generator - 300kW',
        'Vacuum Dewatering (DOT-rated)',
        'Offshore Crane - 25 Ton',
        'Safety Equipment (Marine)',
        'Emergency Response Kit'
      ],
      verified: true
    }
  ];

  const availableEquipment = [
    { id: 'uhp-robot', name: 'UHP Robotics System', category: 'Cleaning', compatible: ['vacuum-box', 'frac-tank'] },
    { id: 'vacuum-box', name: 'Vacuum Dewatering Box (Hard-cage)', category: 'Dewatering', compatible: ['uhp-robot', 'compressor'] },
    { id: 'frac-tank', name: 'Frac Tank - 21,000 Gal', category: 'Storage', compatible: ['uhp-robot', 'pump'] },
    { id: 'compressor', name: 'Air Compressor - 185 CFM', category: 'Power', compatible: ['vacuum-box', 'tools'] },
    { id: 'generator', name: 'Industrial Generator - 500kW', category: 'Power', compatible: ['all'] }
  ];

  const addEquipment = (equipment: any) => {
    const newSelection = [...selectedEquipment, equipment];
    setSelectedEquipment(newSelection);
    checkCompatibility(newSelection);
  };

  const removeEquipment = (equipmentId: string) => {
    const newSelection = selectedEquipment.filter(eq => eq.id !== equipmentId);
    setSelectedEquipment(newSelection);
    checkCompatibility(newSelection);
  };

  const checkCompatibility = (equipment: any[]) => {
    const issues: string[] = [];
    
    // Check for common compatibility issues
    const hasVacuum = equipment.some(eq => eq.id === 'vacuum-box');
    const hasUHP = equipment.some(eq => eq.id === 'uhp-robot');
    const hasCompressor = equipment.some(eq => eq.id === 'compressor');
    
    if (hasVacuum && hasUHP && !hasCompressor) {
      issues.push('UHP Robotics + Vacuum Dewatering requires Air Compressor for optimal performance');
    }
    
    setCompatibilityIssues(issues);
  };

  const saveKit = () => {
    const kit = {
      name: kitName,
      equipment: selectedEquipment,
      compatibilityIssues,
      verified: compatibilityIssues.length === 0
    };
    onKitSave(kit);
    
    // Reset form
    setKitName('');
    setSelectedEquipment([]);
    setCompatibilityIssues([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-allrentz-gray mb-3 flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Job Kit Builder</span>
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pre-built Kits */}
          <div>
            <h4 className="font-medium text-allrentz-gray mb-3">Pre-built Equipment Kits</h4>
            <div className="space-y-3">
              {prebuiltKits.map(kit => (
                <div key={kit.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-allrentz-gray">{kit.name}</h5>
                    {kit.verified && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{kit.description}</p>
                  <div className="space-y-1 mb-3">
                    {kit.equipment.slice(0, 3).map((item, index) => (
                      <p key={index} className="text-xs text-gray-500">• {item}</p>
                    ))}
                    {kit.equipment.length > 3 && (
                      <p className="text-xs text-gray-500">+ {kit.equipment.length - 3} more items</p>
                    )}
                  </div>
                  <button className="industrial-button-secondary text-sm py-2 px-4 w-full">
                    Use This Kit
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Kit Builder */}
          <div>
            <h4 className="font-medium text-allrentz-gray mb-3">Build Custom Kit</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kit Name</label>
                <input
                  type="text"
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  placeholder="e.g., My Turnaround Package"
                  className="industrial-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Equipment</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableEquipment.map(equipment => (
                    <div key={equipment.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{equipment.name}</p>
                        <p className="text-xs text-gray-500">{equipment.category}</p>
                      </div>
                      <button
                        onClick={() => addEquipment(equipment)}
                        disabled={selectedEquipment.some(eq => eq.id === equipment.id)}
                        className="industrial-button-secondary text-xs py-1 px-2 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {selectedEquipment.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Equipment</label>
                  <div className="space-y-2">
                    {selectedEquipment.map(equipment => (
                      <div key={equipment.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="text-sm text-gray-900">{equipment.name}</span>
                        <button
                          onClick={() => removeEquipment(equipment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {compatibilityIssues.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Compatibility Suggestions</p>
                      <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                        {compatibilityIssues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={saveKit}
                disabled={!kitName || selectedEquipment.length === 0}
                className="industrial-button w-full disabled:opacity-50"
              >
                Save Equipment Kit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobKitBuilder;
