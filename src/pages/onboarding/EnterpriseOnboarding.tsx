
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, Users, Settings, CheckCircle, ArrowRight, Database } from 'lucide-react';
import BulkImportWizard from '../components/BulkImportWizard';
import DataMappingWizard from '../components/DataMappingWizard';
import TemplateDownloader from '../components/TemplateDownloader';

const EnterpriseOnboarding = () => {
  const [currentPhase, setCurrentPhase] = useState<'overview' | 'templates' | 'import' | 'mapping' | 'validation'>('overview');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const phases = [
    { id: 'overview', title: 'Enterprise Setup', icon: Users },
    { id: 'templates', title: 'Data Templates', icon: FileText },
    { id: 'import', title: 'Bulk Import', icon: Upload },
    { id: 'mapping', title: 'Data Mapping', icon: Database },
    { id: 'validation', title: 'Validation', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-allrentz-gray">Enterprise Vendor Onboarding</h1>
            <p className="text-gray-600 mt-2">Streamlined setup for large equipment rental companies</p>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                const isActive = phase.id === currentPhase;
                const isCompleted = phases.findIndex(p => p.id === currentPhase) > index;
                
                return (
                  <div key={phase.id} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-allrentz-red text-white' : 
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < phases.length - 1 && (
                      <div className={`w-16 h-1 ml-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              {phases.map(phase => (
                <span key={phase.id} className="text-center">{phase.title}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPhase === 'overview' && (
          <div className="industrial-card p-8">
            <div className="text-center mb-8">
              <Users className="h-16 w-16 text-allrentz-red mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-allrentz-gray">Welcome to Enterprise Setup</h2>
              <p className="text-gray-600 mt-2">Designed for companies with 100+ equipment pieces</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold text-allrentz-gray mb-2">Bulk Import</h3>
                <p className="text-sm text-gray-600">Upload your existing equipment database via Excel or CSV</p>
              </div>
              
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <Database className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold text-allrentz-gray mb-2">Smart Mapping</h3>
                <p className="text-sm text-gray-600">Automatically map your data fields to our system</p>
              </div>
              
              <div className="text-center p-6 border border-gray-200 rounded-lg">
                <Settings className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold text-allrentz-gray mb-2">Validation</h3>
                <p className="text-sm text-gray-600">Ensure data accuracy with automated validation</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-3">What You'll Need</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Equipment inventory list (Excel/CSV format preferred)</li>
                <li>• Equipment photos and specifications</li>
                <li>• Compliance certificates and insurance documents</li>
                <li>• Pricing information for each equipment category</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setCurrentPhase('templates')}
                className="industrial-button inline-flex items-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {currentPhase === 'templates' && (
          <TemplateDownloader onNext={() => setCurrentPhase('import')} />
        )}

        {currentPhase === 'import' && (
          <BulkImportWizard 
            onFileUploaded={(file) => {
              setUploadedFile(file);
              setCurrentPhase('mapping');
            }}
            onBack={() => setCurrentPhase('templates')}
          />
        )}

        {currentPhase === 'mapping' && uploadedFile && (
          <DataMappingWizard 
            file={uploadedFile}
            onNext={() => setCurrentPhase('validation')}
            onBack={() => setCurrentPhase('import')}
          />
        )}

        {currentPhase === 'validation' && (
          <div className="industrial-card p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-allrentz-gray mb-4">Setup Complete!</h2>
            <p className="text-gray-600 mb-8">Your equipment data has been successfully imported and validated.</p>
            <Link to="/vendor-dashboard" className="industrial-button">
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseOnboarding;
