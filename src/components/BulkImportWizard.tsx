
import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface BulkImportWizardProps {
  onFileUploaded: (file: File) => void;
  onBack: () => void;
}

const BulkImportWizard = ({ onFileUploaded, onBack }: BulkImportWizardProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('success');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (selectedFile) {
      setUploadStatus('uploading');
      // Simulate processing time
      setTimeout(() => {
        onFileUploaded(selectedFile);
      }, 2000);
    }
  };

  return (
    <div className="industrial-card p-8">
      <div className="text-center mb-8">
        <Upload className="h-16 w-16 text-allrentz-red mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-allrentz-gray">Bulk Equipment Import</h2>
        <p className="text-gray-600 mt-2">Upload your equipment database for quick setup</p>
      </div>

      {uploadStatus === 'idle' || uploadStatus === 'error' ? (
        <div className="mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive 
                ? 'border-allrentz-red bg-red-50' 
                : uploadStatus === 'error'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 hover:border-allrentz-red hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drag and drop your file here, or{' '}
              <label className="text-allrentz-red hover:underline cursor-pointer">
                browse
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                />
              </label>
            </p>
            <p className="text-sm text-gray-500">
              Supports Excel (.xlsx, .xls) and CSV files up to 50MB
            </p>
            
            {uploadStatus === 'error' && (
              <div className="mt-4 flex items-center justify-center text-red-600">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">Invalid file type. Please upload Excel or CSV files only.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="border border-green-200 rounded-lg p-6 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="font-medium text-green-900">{selectedFile?.name}</p>
                  <p className="text-sm text-green-700">
                    {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {uploadStatus === 'uploading' && (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-allrentz-red"></div>
                  <span className="ml-2 text-sm text-gray-600">Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          File Requirements
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Include columns for: Equipment Name, Category, Model, Year, Condition</li>
          <li>• Optional: Location, Daily Rate, Photos, Specifications</li>
          <li>• Use consistent formatting for dates and numbers</li>
          <li>• Maximum 10,000 equipment entries per file</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
        >
          Back to Templates
        </button>
        
        <button
          onClick={processFile}
          disabled={!selectedFile || uploadStatus === 'uploading'}
          className={`industrial-button ${
            !selectedFile || uploadStatus === 'uploading' 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          {uploadStatus === 'uploading' ? 'Processing...' : 'Process File'}
        </button>
      </div>
    </div>
  );
};

export default BulkImportWizard;
