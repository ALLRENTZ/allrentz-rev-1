import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle,
  Eye,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { useToast }  from '@/components/ui/use-toast';

interface Document {
  id: number;
  name: string;
  equipment: string;
  type: 'certificate' | 'msds' | 'specification' | 'insurance' | 'inspection';
  status: 'valid' | 'expiring' | 'expired';
  uploadedDate: string;
  expiryDate?: string;
  fileSize: string;
}

const documentsData: Document[] = [
  {
    id: 1,
    name: 'Safety Compliance Certificate',
    equipment: 'Steam Boiler 150 HP',
    type: 'certificate',
    status: 'valid',
    uploadedDate: '2024-01-15',
    expiryDate: '2024-12-15',
    fileSize: '2.4 MB',
  },
  {
    id: 2,
    name: 'Material Safety Data Sheet',
    equipment: 'Steam Boiler 150 HP',
    type: 'msds',
    status: 'expiring',
    uploadedDate: '2023-07-01',
    expiryDate: '2024-07-01',
    fileSize: '1.1 MB',
  },
  {
    id: 3,
    name: 'Insurance Certificate',
    equipment: 'Frac Tank 21,000 Gal',
    type: 'insurance',
    status: 'valid',
    uploadedDate: '2024-01-20',
    expiryDate: '2025-01-20',
    fileSize: '3.2 MB',
  },
  {
    id: 4,
    name: 'Equipment Specifications',
    equipment: 'Confined Space Vent',
    type: 'specification',
    status: 'valid',
    uploadedDate: '2023-05-10',
    fileSize: '850 KB',
  },
  {
    id: 5,
    name: 'Annual Inspection Report',
    equipment: 'Steam Boiler 150 HP',
    type: 'inspection',
    status: 'expired',
    uploadedDate: '2023-06-30',
    expiryDate: '2024-06-30',
    fileSize: '1.8 MB',
  },
];

const filterTabs = [
  'All Documents',
  'Certificates',
  'MSDS',
  'Specifications',
  'Insurance',
  'Inspections',
  'Expiring Soon',
] as const;

type FilterTab = (typeof filterTabs)[number];

const getDocIcon = (type: Document['type']) => {
  switch (type) {
    case 'certificate':
    case 'insurance':
      return <Shield className="h-5 w-5 text-blue-500" />;
    case 'msds':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'specification':
      return <FileText className="h-5 w-5 text-purple-500" />;
    case 'inspection':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <FileText className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusBadge = (status: Document['status']) => {
  switch (status) {
    case 'valid':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'expiring':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const getStatusLabel = (status: Document['status']) => {
  switch (status) {
    case 'valid':
      return 'Valid';
    case 'expiring':
      return 'Expiring Soon';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
};

const DigitalBinder: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All Documents');
  const { toast } = useToast();

  const filteredDocuments = useMemo(() => {
    switch (activeFilter) {
      case 'All Documents':
        return documentsData;
      case 'Certificates':
        return documentsData.filter((d) => d.type === 'certificate');
      case 'MSDS':
        return documentsData.filter((d) => d.type === 'msds');
      case 'Specifications':
        return documentsData.filter((d) => d.type === 'specification');
      case 'Insurance':
        return documentsData.filter((d) => d.type === 'insurance');
      case 'Inspections':
        return documentsData.filter((d) => d.type === 'inspection');
      case 'Expiring Soon':
        return documentsData.filter((d) => d.status === 'expiring');
      default:
        return documentsData;
    }
  }, [activeFilter]);

  const stats = useMemo(() => {
    const valid = documentsData.filter((d) => d.status === 'valid').length;
    const expiring = documentsData.filter((d) => d.status === 'expiring').length;
    const expired = documentsData.filter((d) => d.status === 'expired').length;
    const total = documentsData.length;
    return { valid, expiring, expired, total };
  }, []);

  const handleView = (docName: string) => {
    toast({
      title: 'Feature coming soon',
      description: `Viewing "${docName}" will be available soon.`,
    });
  };

  const handleDownload = (docName: string) => {
    toast({
      title: 'Feature coming soon',
      description: `Downloading "${docName}" will be available soon.`,
    });
  };

  const handleUpload = () => {
    toast({
      title: 'Feature coming soon',
      description: 'Document upload will be available soon.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-allrentz-gray">Digital Equipment Binder</h2>
        <button
          onClick={handleUpload}
          className="industrial-button inline-flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={
              activeFilter === tab
                ? 'px-4 py-2 rounded-md text-sm font-medium bg-allrentz-red text-white transition-colors'
                : 'px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {filteredDocuments.length === 1 && (
          <div className="text-sm text-gray-500">
            1 document found
          </div>
        )}
        {filteredDocuments.length > 1 && (
          <div className="text-sm text-gray-500">
            {filteredDocuments.length} documents found
          </div>
        )}
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="mt-1">{getDocIcon(doc.type)}</div>
                <div>
                  <h3 className="font-semibold text-allrentz-gray">{doc.name}</h3>
                  <p className="text-sm text-gray-600">{doc.equipment}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                    <span>Uploaded: {doc.uploadedDate}</span>
                    {doc.expiryDate ? (
                      <span>Expires: {doc.expiryDate}</span>
                    ) : (
                      <span className="text-gray-400">No expiry</span>
                    )}
                    <span>{doc.fileSize}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3 md:ml-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}
                >
                  {getStatusLabel(doc.status)}
                </span>
                <button
                  onClick={() => handleView(doc.name)}
                  className="p-1.5 text-gray-500 hover:text-allrentz-red transition-colors"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDownload(doc.name)}
                  className="p-1.5 text-gray-500 hover:text-allrentz-red transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-700">{stats.valid}</p>
          <p className="text-sm text-green-600 font-medium">Valid</p>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-700">{stats.expiring}</p>
          <p className="text-sm text-yellow-600 font-medium">Expiring</p>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
          <p className="text-sm text-red-600 font-medium">Expired</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          <p className="text-sm text-gray-600 font-medium">Total</p>
        </div>
      </div>
    </div>
  );
};

export default DigitalBinder;
