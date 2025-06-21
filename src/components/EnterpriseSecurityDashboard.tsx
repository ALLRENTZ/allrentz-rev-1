
import React from 'react';
import { Shield, Eye, Lock, AlertTriangle, CheckCircle, Activity, Target, Globe, Users, Zap } from 'lucide-react';
import { useSecurity } from './SecurityProvider';

const EnterpriseSecurityDashboard = () => {
  const { 
    securityLevel, 
    mfaEnabled, 
    sessionValid, 
    threatLevel, 
    enableMFA,
    turnaroundOptimization,
    complianceAutomation,
    vendorIntelligence,
    geographicCoverage,
    erpConnections
  } = useSecurity();

  const getSecurityStatusColor = () => {
    switch (threatLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Enhanced metrics with ALLRENTZ intelligence
  const securityMetrics = [
    { label: 'Active Sessions', value: '1,247', trend: '+12%', icon: Activity },
    { label: 'Threat Blocks', value: '23', trend: '-8%', icon: Shield },
    { label: 'MFA Success Rate', value: '99.7%', trend: '+0.2%', icon: Lock },
    { label: 'Asset Tracking', value: '100%', trend: '0%', icon: Eye },
    // New ALLRENTZ metrics
    { label: 'Turnaround Ready', value: '94%', trend: '+15%', icon: Target },
    { label: 'Vendor Compliance', value: '98.3%', trend: '+2.1%', icon: CheckCircle },
    { label: 'Geographic Coverage', value: `${geographicCoverage}%`, trend: '+8%', icon: Globe },
    { label: 'ERP Connections', value: `${erpConnections}`, trend: '+2', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enterprise Security Center</h1>
              <p className="text-gray-600 mt-2">ALLRENTZ Triple-Layer Security & Intelligence Platform</p>
            </div>
            <div className={`px-4 py-2 rounded-full flex items-center space-x-2 ${getSecurityStatusColor()}`}>
              <Shield className="h-5 w-5" />
              <span className="font-medium">Threat Level: {threatLevel.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Security Metrics Grid - same layout, more metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {securityMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-sm text-green-600">{metric.trend}</p>
                  </div>
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Layers - enhanced with ALLRENTZ capabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Layer 1: Identity & Authentication - same layout */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Lock className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Layer 1: Authentication</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Multi-Factor Auth</span>
                <div className="flex items-center">
                  {mfaEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <button 
                      onClick={enableMFA}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Session Validation</span>
                {sessionValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Enterprise SSO</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              {/* New ALLRENTZ feature */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vendor Due Diligence</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Layer 2: Asset Protection - enhanced */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Layer 2: Asset Protection</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Blockchain Ledger</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Smart Contracts</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Asset Tracking</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Escrow Protection</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              {/* New ALLRENTZ capabilities */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Turnaround Optimization</span>
                {turnaroundOptimization ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
            </div>
          </div>

          {/* Layer 3: Monitoring & Intelligence - enhanced */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Eye className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Layer 3: Intelligence</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">24/7 SOC</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Threat Detection</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Compliance Audit</span>
                {complianceAutomation ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Incident Response</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              {/* New ALLRENTZ intelligence */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vendor Intelligence</span>
                {vendorIntelligence ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Alerts - enhanced with ALLRENTZ events */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security & Intelligence Events</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Turnaround optimization completed</p>
                <p className="text-xs text-green-700">Equipment positioned for Gulf Coast refinery - 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">Vendor compliance verified</p>
                <p className="text-xs text-blue-700">OSHA PSM certification confirmed for 3 new vendors - 5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-900">Vendor financing approved</p>
                <p className="text-xs text-purple-700">$150K working capital extended to 2 small vendors - 8 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Geographic risk assessment updated</p>
                <p className="text-xs text-yellow-700">Permian Basin emergency response time optimized - 12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSecurityDashboard;
