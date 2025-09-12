
import React from 'react';
import { Settings, Activity, Shield, Globe, Zap, Target, Users, TrendingUp, Database, CheckCircle, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { useSecurity } from './SecurityProvider';

const OperationsCenterDashboard = () => {
  const { 
    turnaroundOptimization,
    complianceAutomation,
    vendorIntelligence,
    geographicCoverage,
    erpConnections
  } = useSecurity();

  // Operations metrics for the command center
  const operationsMetrics = [
    { label: 'Active Turnarounds', value: '23', trend: '+5%', icon: Target, color: 'text-blue-600' },
    { label: 'Vendor Coordination', value: '89%', trend: '+12%', icon: Users, color: 'text-green-600' },
    { label: 'Compliance Score', value: '98.3%', trend: '+2.1%', icon: Shield, color: 'text-purple-600' },
    { label: 'Geographic Coverage', value: `${geographicCoverage}%`, trend: '+8%', icon: Globe, color: 'text-orange-600' },
    { label: 'ERP Connections', value: `${erpConnections}`, trend: '+2', icon: Database, color: 'text-indigo-600' },
    { label: 'Predictive Accuracy', value: '94.7%', trend: '+3.2%', icon: TrendingUp, color: 'text-teal-600' },
    { label: 'Response Time', value: '1.2h', trend: '-15%', icon: Clock, color: 'text-red-600' },
    { label: 'Cost Optimization', value: '$2.4M', trend: '+18%', icon: Activity, color: 'text-yellow-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Operations Center</h1>
              <p className="text-gray-600 mt-2">ALLRENTZ Strategic Command Center - Real-time Operations Intelligence</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-green-100 text-green-800 flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span className="font-medium">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Operations Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {operationsMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-sm text-green-600">{metric.trend}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${metric.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Strategic Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Turnaround Planning & Optimization */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Target className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Turnaround Planning & Optimization</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gulf Coast Refinery TA-001</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-600">21 days remaining</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Equipment Positioning</span>
                {turnaroundOptimization ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Critical Path Analysis</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cost Optimization</span>
                <span className="text-sm font-medium text-green-600">$340K saved</span>
              </div>
            </div>
          </div>

          {/* Real-time Vendor Coordination */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Real-time Vendor Coordination</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Vendors</span>
                <span className="text-sm font-medium text-gray-900">47 online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Rate</span>
                <span className="text-sm font-medium text-green-600">89%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Emergency Coordination</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SLA Compliance</span>
                <span className="text-sm font-medium text-green-600">96.2%</span>
              </div>
            </div>
          </div>

          {/* Compliance Automation Dashboard */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Compliance Automation</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">OSHA PSM Compliance</span>
                <span className="text-sm font-medium text-green-600">98.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API 653 Certifications</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Insurance Validation</span>
                {complianceAutomation ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Safety Score</span>
                <span className="text-sm font-medium text-green-600">94.7/100</span>
              </div>
            </div>
          </div>

          {/* Geographic Coverage Analytics */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Globe className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Geographic Coverage</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Permian Basin</span>
                <span className="text-sm font-medium text-orange-600">45 vendors</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gulf Coast</span>
                <span className="text-sm font-medium text-green-600">89 vendors</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bakken Formation</span>
                <span className="text-sm font-medium text-yellow-600">32 vendors</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Coverage Optimization</span>
                <span className="text-sm font-medium text-blue-600">{geographicCoverage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ERP Integration & Vendor Financing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-indigo-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">ERP Integration Status</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SAP Connection</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-600">12,847 records</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Maximo Sync</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-600">8,392 records</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Oracle Integration</span>
                <span className="text-sm font-medium text-yellow-600">Pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Connections</span>
                <span className="text-sm font-medium text-blue-600">{erpConnections} active</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-teal-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Vendor Financing & Analytics</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Working Capital Extended</span>
                <span className="text-sm font-medium text-green-600">$2.4M</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Small Vendor Support</span>
                <span className="text-sm font-medium text-blue-600">23 active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lead Generation</span>
                {vendorIntelligence ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Growth Analytics</span>
                <span className="text-sm font-medium text-teal-600">+18% ROI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Operations Events */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Operations Events</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Turnaround equipment positioned</p>
                <p className="text-xs text-blue-700">Gulf Coast refinery TA-001 - Critical path optimized - 3 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <Users className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Vendor coordination completed</p>
                <p className="text-xs text-green-700">12 vendors coordinated for emergency response - Permian Basin - 7 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-900">Compliance automation triggered</p>
                <p className="text-xs text-purple-700">OSHA PSM certification verified for 5 new vendors - 12 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-orange-50 rounded-lg">
              <MapPin className="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-orange-900">Geographic optimization updated</p>
                <p className="text-xs text-orange-700">Bakken Formation inventory repositioned - Response time improved by 15% - 18 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsCenterDashboard;
