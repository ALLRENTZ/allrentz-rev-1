
import { Download, FileText, Star, Building2 } from 'lucide-react';

interface TemplateDownloaderProps {
  onNext: () => void;
}

const TemplateDownloader = ({ onNext }: TemplateDownloaderProps) => {
  const templates = [
    {
      id: 'standard',
      name: 'Standard Equipment Template',
      description: 'Basic equipment listing with essential fields',
      fields: ['Equipment Name', 'Category', 'Model', 'Year', 'Condition', 'Daily Rate'],
      recommended: false,
      icon: FileText
    },
    {
      id: 'industrial',
      name: 'Industrial Equipment Template',
      description: 'Comprehensive template for industrial equipment rentals',
      fields: ['Equipment Name', 'Category', 'Subcategory', 'Manufacturer', 'Model', 'Year', 'Serial Number', 'Condition', 'Specifications', 'Daily Rate', 'Weekly Rate', 'Monthly Rate', 'Location', 'Availability', 'Compliance Certificates'],
      recommended: true,
      icon: Building2
    },
    {
      id: 'construction',
      name: 'Construction Equipment Template',
      description: 'Specialized for construction and heavy equipment',
      fields: ['Equipment Name', 'Category', 'Type', 'Make', 'Model', 'Year', 'Hours', 'Weight', 'Dimensions', 'Fuel Type', 'Operator Required', 'Transport Requirements', 'Daily Rate', 'Delivery Fee'],
      recommended: false,
      icon: Building2
    }
  ];

  const downloadTemplate = (templateId: string) => {
    // In a real implementation, this would generate and download the actual template file
    console.log(`Downloading template: ${templateId}`);
    
    // Create a sample CSV content
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const csvHeader = template.fields.join(',');
      const csvContent = `${csvHeader}\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="industrial-card p-8">
      <div className="text-center mb-8">
        <FileText className="h-16 w-16 text-allrentz-red mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-allrentz-gray">Choose Your Template</h2>
        <p className="text-gray-600 mt-2">Download a pre-formatted template to organize your equipment data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {templates.map((template) => {
          const Icon = template.icon;
          
          return (
            <div
              key={template.id}
              className={`border rounded-lg p-6 relative ${
                template.recommended 
                  ? 'border-allrentz-red bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {template.recommended && (
                <div className="absolute -top-2 -right-2 bg-allrentz-red text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </div>
              )}
              
              <div className="text-center mb-4">
                <Icon className={`h-12 w-12 mx-auto mb-3 ${
                  template.recommended ? 'text-allrentz-red' : 'text-gray-500'
                }`} />
                <h3 className="font-semibold text-allrentz-gray">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Included Fields:</p>
                <div className="text-xs text-gray-600 space-y-1">
                  {template.fields.slice(0, 6).map((field, index) => (
                    <div key={index}>• {field}</div>
                  ))}
                  {template.fields.length > 6 && (
                    <div className="text-gray-500">... and {template.fields.length - 6} more</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => downloadTemplate(template.id)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium ${
                  template.recommended
                    ? 'bg-allrentz-red text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Download className="h-4 w-4" />
                <span>Download Template</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-yellow-900 mb-3">Template Usage Tips</h3>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>• Fill out as many fields as possible for better matching accuracy</li>
          <li>• Use consistent formatting for equipment categories and conditions</li>
          <li>• Include high-quality photos if possible (separate upload after import)</li>
          <li>• Validate all pricing information before uploading</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="industrial-button"
        >
          Continue to Import
        </button>
      </div>
    </div>
  );
};

export default TemplateDownloader;
