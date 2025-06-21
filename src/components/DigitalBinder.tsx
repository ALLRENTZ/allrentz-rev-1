
import { useState } from 'react';
import { FileText, Upload, Download, Eye, AlertTriangle, CheckCircle, Calendar, Shield } from 'lucide-react';

interface Document {
  id: number;
  name: string;
  type: 'certificate' | 'msds' | 'spec' | 'insurance' | 'inspection';
  equipmentId: number;
  equipmentName: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'valid' | 'expiring' | 'expired';
  fileSize: string;
}

const DigitalBinder = () => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  const documents: Document[] = [
    {
      id: 1,
      name: 'Safety Compliance Certificate',
      type: 'certificate',
      equipmentId: 1,
      equipmentName: 'Steam Boiler - 150 HP',
      uploadDate: '2024-06-15',
      expiryDate: '2024-12-15',
      status: 'valid',
      fileSize: '2.3 MB'
    },
    {
      id: 2,
      name: 'Material Safety Data Sheet',
      type: 'msds',
      equipmentId: 1,
      equipmentName: 'Steam Boiler - 150 HP',
      uploadDate: '2024-06-15',
      expiryDate: '2024-07-01',
      status: 'expiring',
      fileSize: '1.8 MB'
    },
    {
      id: 3,
      name: 'Insurance Certificate',
      type: 'insurance',
      equipmentId: 2,
      equipmentName: 'Frac Tank - 21,000 Gal',
      uploadDate: '2024-06-20',
      expiryDate: '2025-01-20',
      status: 'valid',
      fileSize: '1.2 MB'
    },
    {
      id: 4,
      name: 'Equipment Specifications',
      type: 'spec',
      equipmentId: 3,
      equipmentName: 'Confined Space Ventilation',
      uploadDate: '2024-06-18',
      status: 'valid',
      fileSize: '3.1 MB'
    },
    {
      id: 5,
      name: 'Annual Inspection Report',
      type: 'inspection',
      equipmentId: 1,
      equipmentName: 'Steam Boiler - 150 HP',
      uploadDate: '2024-05-15',
      expiryDate: '2024-06-30',
      status: 'expired',
      fileSize: '4.2 MB'
    }
  ];

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'certificate': return <Shield className="h-5 w-5 text-green-600" />;
      case 'msds': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'spec': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'insurance': return <Shield className="h-5 w-5 text-purple-600" />;
      case 'inspection': return <CheckCircle className="h-5 w-5 text-indigo-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return 'industrial-badge-approved';
      case 'expiring': return 'industrial-badge-pending';
      case 'expired': return 'industrial-badge-rejected';
      default: return 'industrial-badge';
    }
  };

  const filteredDocuments = documents.filter(doc => 
    activeFilter === 'all' || doc.type === activeFilter || doc.status === activeFilter
  );

  const documentTypeLabels = {
    certificate: 'Certificates',
    msds: 'MSDS',
    spec: 'Specifications',
    insurance: 'Insurance',
    inspection: 'Inspections'
  };

  return (
    <div className="industrial-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-allrentz-gray">Digital Equipment Binder</h2>
          <p className="text-gray-600 text-sm">Manage compliance documents and specifications</p>
        </div>
        <button className="industrial-button inline-flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
            activeFilter === 'all' 
              ? 'bg-allrentz-red text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Documents
        </button>
        {Object.entries(documentTypeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeFilter === key 
                ? 'bg-allrentz-red text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setActiveFilter('expiring')}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
            activeFilter === 'expiring' 
              ? 'bg-allrentz-red text-white' 
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          Expiring Soon
        </button>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getDocumentIcon(doc.type)}
                <div>
                  <h3 className="font-semibold text-allrentz-gray">{doc.name}</h3>
                  <p className="text-sm text-gray-600">{doc.equipmentName}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    <span>Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}</span>
                    {doc.expiryDate && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                      </span>
                    )}
                    <span>{doc.fileSize}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`${getStatusBadge(doc.status)}`}>
                  {doc.status === 'valid' ? 'Valid' : doc.status === 'expiring' ? 'Expiring Soon' : 'Expired'}
                </span>
                <div className="flex space-x-1">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No documents found for the selected filter.</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{documents.filter(d => d.status === 'valid').length}</div>
            <div className="text-xs text-gray-600">Valid</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{documents.filter(d => d.status === 'expiring').length}</div>
            <div className="text-xs text-gray-600">Expiring</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{documents.filter(d => d.status === 'expired').length}</div>
            <div className="text-xs text-gray-600">Expired</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-allrentz-gray">{documents.length}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalBinder;
