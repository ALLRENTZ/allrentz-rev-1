
import React from 'react';
import { Shield, Eye, Lock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { useSecurity } from './SecurityProvider';

const EnterpriseSecurityDashboard = () => {
  const { securityLevel, mfaEnabled, sessionValid, threatLevel, enableMFA } = useSecurity();

  const getSecurityStatusColor = () => {
    switch (threatLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const securityMetrics = [
    { label: 'Active Sessions', value: '1,247', trend: '+12%', icon: Activity },
    { label: 'Threat Blocks', value: '23', trend: '-8%', icon: Shield },
    { label: 'MFA Success Rate', value: '99.7%', trend: '+0.2%', icon: Lock },
    { label: 'Asset Tracking', value: '100%', trend: '0%', icon: Eye }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enterprise Security Center</h1>
              <p className="text-gray-600 mt-2">Triple-layer security monitoring and control</p>
            </div>
            <div className={`px-4 py-2 rounded-full flex items-center space-x-2 ${getSecurityStatusColor()}`}>
              <Shield className="h-5 w-5" />
              <span className="font-medium">Threat Level: {threatLevel.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Security Metrics */}
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

        {/* Security Layers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Layer 1: Identity & Authentication */}
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
            </div>
          </div>

          {/* Layer 2: Transaction Protection */}
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
            </div>
          </div>

          {/* Layer 3: Monitoring & Compliance */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Eye className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Layer 3: Monitoring</h3>
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
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Incident Response</span>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Security Alerts */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-900">Security scan completed</p>
                <p className="text-xs text-green-700">All systems secure - 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">MFA authentication successful</p>
                <p className="text-xs text-blue-700">Enterprise client login verified - 5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Unusual access pattern detected</p>
                <p className="text-xs text-yellow-700">Monitoring increased for user session - 12 minutes ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseSecurityDashboard;
