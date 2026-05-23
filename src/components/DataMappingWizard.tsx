
import { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface DataMappingWizardProps {
  file: File;
  onNext: () => void;
  onBack: () => void;
}

const DataMappingWizard = ({ file, onNext, onBack }: DataMappingWizardProps) => {
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<{
    total: number;
    valid: number;
    warnings: string[];
  }>({ total: 0, valid: 0, warnings: [] });
  const [isProcessing, setIsProcessing] = useState(false);

  const systemFields = [
    { id: 'name', label: 'Equipment Name', required: true },
    { id: 'category', label: 'Category', required: true },
    { id: 'manufacturer', label: 'Manufacturer', required: false },
    { id: 'model', label: 'Model', required: false },
    { id: 'year', label: 'Year', required: false },
    { id: 'condition', label: 'Condition', required: true },
    { id: 'daily_rate', label: 'Daily Rate', required: true },
    { id: 'weekly_rate', label: 'Weekly Rate', required: false },
    { id: 'monthly_rate', label: 'Monthly Rate', required: false },
    { id: 'location', label: 'Location', required: false },
    { id: 'specifications', label: 'Specifications', required: false },
    { id: 'serial_number', label: 'Serial Number', required: false }
  ];

  useEffect(() => {
    // Simulate reading file headers
    const mockColumns = [
      'Equipment_Name',
      'Category',
      'Make',
      'Model_Number',
      'Year_Manufactured',
      'Condition_Rating',
      'Daily_Rental_Rate',
      'Weekly_Rate',
      'Current_Location',
      'Specifications',
      'Serial_No'
    ];
    setFileColumns(mockColumns);

    // Auto-map similar column names
    const autoMappings: Record<string, string> = {};
    mockColumns.forEach(column => {
      const lowercaseColumn = column.toLowerCase().replace(/[_\s]/g, '');
      
      if (lowercaseColumn.includes('equipmentname') || lowercaseColumn.includes('name')) {
        autoMappings['name'] = column;
      } else if (lowercaseColumn.includes('category')) {
        autoMappings['category'] = column;
      } else if (lowercaseColumn.includes('make') || lowercaseColumn.includes('manufacturer')) {
        autoMappings['manufacturer'] = column;
      } else if (lowercaseColumn.includes('model')) {
        autoMappings['model'] = column;
      } else if (lowercaseColumn.includes('year')) {
        autoMappings['year'] = column;
      } else if (lowercaseColumn.includes('condition')) {
        autoMappings['condition'] = column;
      } else if (lowercaseColumn.includes('dailyrate') || lowercaseColumn.includes('daily')) {
        autoMappings['daily_rate'] = column;
      } else if (lowercaseColumn.includes('weekly')) {
        autoMappings['weekly_rate'] = column;
      } else if (lowercaseColumn.includes('location')) {
        autoMappings['location'] = column;
      } else if (lowercaseColumn.includes('spec')) {
        autoMappings['specifications'] = column;
      } else if (lowercaseColumn.includes('serial')) {
        autoMappings['serial_number'] = column;
      }
    });
    
    setMappings(autoMappings);
  }, [file]);

  const handleMappingChange = (systemField: string, fileColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [systemField]: fileColumn
    }));
  };

  const validateMappings = () => {
    setIsProcessing(true);
    
    // Simulate validation process
    setTimeout(() => {
      const requiredFields = systemFields.filter(f => f.required);
      const mappedRequiredFields = requiredFields.filter(f => mappings[f.id]);
      
      const warnings = [];
      if (mappedRequiredFields.length < requiredFields.length) {
        const missing = requiredFields.filter(f => !mappings[f.id]).map(f => f.label);
        warnings.push(`Missing required fields: ${missing.join(', ')}`);
      }
      
      if (!mappings['weekly_rate'] && !mappings['monthly_rate']) {
        warnings.push('Consider mapping weekly or monthly rates for better pricing options');
      }
      
      setValidationResults({
        total: 150, // Mock total rows
        valid: 145,  // Mock valid rows
        warnings
      });
      
      setIsProcessing(false);
    }, 2000);
  };

  const canProceed = () => {
    const requiredFields = systemFields.filter(f => f.required);
    return requiredFields.every(f => mappings[f.id]);
  };

  return (
    <div className="industrial-card p-8">
      <div className="text-center mb-8">
        <Database className="h-16 w-16 text-allrentz-red mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-allrentz-gray">Data Mapping</h2>
        <p className="text-gray-600 mt-2">Map your file columns to our system fields</p>
      </div>

      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">File: {file.name}</h3>
          <p className="text-sm text-blue-800">
            Found {fileColumns.length} columns. Map them to our system fields below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {systemFields.map(field => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={mappings[field.id] || ''}
              onChange={(e) => handleMappingChange(field.id, e.target.value)}
              className="industrial-input w-full"
            >
              <option value="">Select a column...</option>
              {fileColumns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {Object.keys(mappings).length > 0 && (
        <div className="mb-8">
          <button
            onClick={validateMappings}
            disabled={isProcessing}
            className="industrial-button w-full"
          >
            {isProcessing ? 'Validating Data...' : 'Validate Mapping'}
          </button>
        </div>
      )}

      {validationResults.total > 0 && (
        <div className="mb-8 space-y-4">
          <p className="text-xs text-gray-500">Sample validation results — demo mode.</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="font-medium text-green-900">
                {validationResults.valid} of {validationResults.total} rows are valid
              </span>
            </div>
          </div>

          {validationResults.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-900 mb-2">Warnings:</p>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {validationResults.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-md font-medium"
        >
          Back to Import
        </button>
        
        <button
          onClick={onNext}
          disabled={!canProceed() || validationResults.total === 0}
          className={`industrial-button inline-flex items-center space-x-2 ${
            !canProceed() || validationResults.total === 0
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
        >
          <span>Import Equipment</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default DataMappingWizard;
