
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Download, Eye, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const DocumentsManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const documents = [
    {
      id: '1',
      name: 'Rental Agreement - Industrial Pump',
      type: 'Contract',
      status: 'Active',
      uploadDate: '2024-06-25',
      expiryDate: '2024-07-03',
      category: 'Rental Agreement',
      equipment: 'Industrial Centrifugal Pump - 500 GPM',
      size: '2.3 MB'
    },
    {
      id: '2',
      name: 'Safety Data Sheet - Pump Operations',
      type: 'Safety',
      status: 'Current',
      uploadDate: '2024-06-20',
      expiryDate: '2025-06-20',
      category: 'Safety Documentation',
      equipment: 'Industrial Centrifugal Pump - 500 GPM',
      size: '1.8 MB'
    },
    {
      id: '3',
      name: 'TWIC Verification Certificate',
      type: 'Compliance',
      status: 'Verified',
      uploadDate: '2024-01-15',
      expiryDate: '2026-01-15',
      category: 'Security Clearance',
      equipment: 'All Equipment',
      size: '945 KB'
    },
    {
      id: '4',
      name: 'Equipment Inspection Report',
      type: 'Inspection',
      status: 'Current',
      uploadDate: '2024-06-01',
      expiryDate: '2024-12-01',
      category: 'Quality Assurance',
      equipment: 'Industrial Centrifugal Pump - 500 GPM',
      size: '3.1 MB'
    },
    {
      id: '5',
      name: 'Insurance Certificate',
      type: 'Insurance',
      status: 'Expiring Soon',
      uploadDate: '2023-07-01',
      expiryDate: '2024-07-01',
      category: 'Insurance',
      equipment: 'All Equipment',
      size: '1.2 MB'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Current':
      case 'Verified':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Current':
      case 'Verified':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'Expiring Soon':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      default:
        return <FileText className="h-3 w-3 mr-1" />;
    }
  };

  const documentCategories = ['All', 'Rental Agreement', 'Safety Documentation', 'Security Clearance', 'Quality Assurance', 'Insurance'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600 mt-2">
            {profile?.company_name || 'Your Company'} • Manage rental agreements, safety docs, and compliance certificates
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="industrial-card">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">5</p>
                  <p className="text-sm text-gray-600">Total Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="industrial-card">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">4</p>
                  <p className="text-sm text-gray-600">Current</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="industrial-card">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">1</p>
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="industrial-card">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">30</p>
                  <p className="text-sm text-gray-600">Days Avg Validity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <Card className="industrial-card">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                        <Badge className={getStatusColor(doc.status)}>
                          {getStatusIcon(doc.status)}
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{doc.equipment}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Category: {doc.category}</span>
                        <span>Size: {doc.size}</span>
                        <span>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast({ title: 'Feature coming soon', description: 'Document viewer will be available shortly.' })}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast({ title: 'Feature coming soon', description: 'Document download will be available shortly.' })}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Notice */}
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Compliance Status</h4>
                <p className="text-sm text-blue-700 mt-1">
                  All required safety and compliance documents are current. Insurance certificate expires in 5 days - 
                  renewal reminder has been sent to your email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DocumentsManagement;
