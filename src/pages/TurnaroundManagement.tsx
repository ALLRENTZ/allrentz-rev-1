
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Settings, Calendar, MapPin, Users, DollarSign, AlertCircle,
  CheckCircle, Clock, Target, Wrench, TrendingUp, Building,
  Truck, Package, Shield, Activity, ArrowLeft
} from 'lucide-react';

interface TurnaroundEvent {
  id: string;
  facilityName: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  status: 'planning' | 'active' | 'completed';
  equipmentNeeds: string[];
  criticalPath: boolean;
  estimatedCost: number;
  actualCost?: number;
  unitsAffected: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface EquipmentDeployment {
  id: string;
  equipmentType: string;
  quantity: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'deployed' | 'complete';
  vendor: string;
  dailyRate: number;
}

const TurnaroundManagement = () => {
  const [selectedTurnaround, setSelectedTurnaround] = useState<string>('ta-001');

  // Demo data for turnaround events
  const turnaroundEvents: TurnaroundEvent[] = [
    {
      id: 'ta-001',
      facilityName: 'Gulf Coast Refinery',
      startDate: '2024-03-15',
      endDate: '2024-04-05',
      duration: 21,
      progress: 65,
      status: 'active',
      equipmentNeeds: ['Scaffold Systems', 'Mobile Cranes', 'Heat Exchangers', 'Pressure Vessels', 'Compressor Units', 'Safety Equipment'],
      criticalPath: true,
      estimatedCost: 2400000,
      actualCost: 1850000,
      unitsAffected: ['Crude Unit', 'FCC Unit', 'Alkylation'],
      riskLevel: 'medium'
    },
    {
      id: 'ta-002',
      facilityName: 'East Texas Facility',
      startDate: '2024-05-10',
      endDate: '2024-05-24',
      duration: 14,
      progress: 0,
      status: 'planning',
      equipmentNeeds: ['Mobile Cranes', 'Scaffold Systems', 'Welding Equipment'],
      criticalPath: false,
      estimatedCost: 890000,
      unitsAffected: ['Reformer Unit'],
      riskLevel: 'low'
    },
    {
      id: 'ta-003',
      facilityName: 'Louisiana Complex',
      startDate: '2024-02-01',
      endDate: '2024-02-21',
      duration: 20,
      progress: 100,
      status: 'completed',
      equipmentNeeds: ['Heat Exchangers', 'Compressor Units', 'Safety Equipment'],
      criticalPath: true,
      estimatedCost: 1950000,
      actualCost: 1820000,
      unitsAffected: ['Hydrotreater', 'Coker Unit'],
      riskLevel: 'high'
    }
  ];

  // Demo equipment deployment data
  const equipmentDeployments: EquipmentDeployment[] = [
    {
      id: 'dep-001',
      equipmentType: 'Mobile Crane (150 ton)',
      quantity: 2,
      unit: 'Crude Unit',
      startDate: '2024-03-15',
      endDate: '2024-03-22',
      status: 'deployed',
      vendor: 'Houston Heavy Lift',
      dailyRate: 2500
    },
    {
      id: 'dep-002',
      equipmentType: 'Scaffold System',
      quantity: 5000,
      unit: 'FCC Unit',
      startDate: '2024-03-16',
      endDate: '2024-04-01',
      status: 'deployed',
      vendor: 'Gulf Coast Scaffolding',
      dailyRate: 45
    },
    {
      id: 'dep-003',
      equipmentType: 'Heat Exchanger',
      quantity: 3,
      unit: 'Alkylation',
      startDate: '2024-03-25',
      endDate: '2024-03-30',
      status: 'scheduled',
      vendor: 'Industrial Heat Solutions',
      dailyRate: 1200
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'deployed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'complete': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentTurnaround = turnaroundEvents.find(ta => ta.id === selectedTurnaround);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/customer-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Settings className="h-8 w-8 text-orange-600" />
            <span>Turnaround Management</span>
          </h1>
          <p className="text-gray-600 mt-2">Plan, coordinate, and optimize refinery turnaround operations</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Turnarounds</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {turnaroundEvents.filter(ta => ta.status === 'active').length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Equipment Deployed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {equipmentDeployments.filter(dep => dep.status === 'deployed').length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Investment</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(turnaroundEvents.reduce((sum, ta) => sum + (ta.actualCost || ta.estimatedCost), 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cost Savings</p>
                  <p className="text-2xl font-bold text-green-600">$340K</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Active Turnarounds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Active Turnarounds</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {turnaroundEvents.map((turnaround) => (
                    <div 
                      key={turnaround.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTurnaround === turnaround.id ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTurnaround(turnaround.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{turnaround.facilityName}</h3>
                          <p className="text-sm text-gray-600">{turnaround.duration} days • {turnaround.unitsAffected.join(', ')}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRiskColor(turnaround.riskLevel)}>
                            {turnaround.riskLevel} risk
                          </Badge>
                          <Badge className={getStatusColor(turnaround.status)}>
                            {turnaround.status}
                          </Badge>
                          {turnaround.criticalPath && (
                            <Badge variant="destructive">Critical Path</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">{new Date(turnaround.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Date</p>
                          <p className="font-medium">{new Date(turnaround.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Budget</p>
                          <p className="font-medium">${(turnaround.estimatedCost / 1000000).toFixed(1)}M</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Progress</p>
                          <div className="flex items-center space-x-2">
                            <Progress value={turnaround.progress} className="flex-1" />
                            <span className="text-sm font-medium">{turnaround.progress}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {turnaround.equipmentNeeds.slice(0, 3).map((equipment, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {equipment}
                          </Badge>
                        ))}
                        {turnaround.equipmentNeeds.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{turnaround.equipmentNeeds.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Equipment Deployment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {equipmentDeployments.map((deployment) => (
                    <div key={deployment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{deployment.equipmentType}</h4>
                          <p className="text-sm text-gray-600">
                            {deployment.quantity} units • {deployment.unit} • {deployment.vendor}
                          </p>
                        </div>
                        <Badge className={getStatusColor(deployment.status)}>
                          {deployment.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Start Date</p>
                          <p className="font-medium">{new Date(deployment.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">End Date</p>
                          <p className="font-medium">{new Date(deployment.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Daily Rate</p>
                          <p className="font-medium">${deployment.dailyRate}/day</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Cost</p>
                          <p className="font-medium">
                            ${((new Date(deployment.endDate).getTime() - new Date(deployment.startDate).getTime()) / (1000 * 60 * 60 * 24) * deployment.dailyRate * deployment.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Turnaround Schedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Schedule Coming Soon</h3>
                  <p className="text-gray-600 mb-4">
                    Gantt chart view of equipment deployment timelines and critical path analysis
                  </p>
                  <Button variant="outline">
                    Request Feature
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Cost Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Cost Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentTurnaround && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estimated Cost</span>
                        <span className="font-semibold">${(currentTurnaround.estimatedCost / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Actual Cost</span>
                        <span className="font-semibold text-green-600">
                          ${((currentTurnaround.actualCost || 0) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Savings</span>
                        <span className="font-semibold text-green-600">
                          ${((currentTurnaround.estimatedCost - (currentTurnaround.actualCost || currentTurnaround.estimatedCost)) / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <Progress 
                        value={(((currentTurnaround.actualCost || 0) / currentTurnaround.estimatedCost) * 100)} 
                        className="w-full"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">On-Time Delivery</span>
                      <span className="font-semibold text-green-600">94%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Vendor Response Rate</span>
                      <span className="font-semibold">89%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Safety Score</span>
                      <span className="font-semibold text-green-600">98.3%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cost Optimization</span>
                      <span className="font-semibold text-green-600">+18%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TurnaroundManagement;
