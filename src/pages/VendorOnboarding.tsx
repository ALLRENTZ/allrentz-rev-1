
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CheckCircle, Building2, FileText, CreditCard, Package, Upload, Shield } from 'lucide-react';

const VendorOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  const [formData, setFormData] = useState({
    // Company Info
    companyName: '',
    businessType: '',
    yearsInBusiness: '',
    website: '',
    // Contact & License
    contactName: '',
    email: '',
    phone: '',
    businessLicense: '',
    taxId: '',
    // Documents
    insurance: null,
    businessLicense: null,
    safetyDocs: null,
    // Equipment
    equipmentCategories: [],
    inventorySize: '',
    // Payout
    bankAccount: '',
    routingNumber: '',
    taxDocuments: null
  });

  const businessTypes = [
    'Equipment Rental Company',
    'Construction Contractor',
    'Industrial Equipment Dealer',
    'Manufacturing Company',
    'Service Provider',
    'Other'
  ];

  const equipmentCategories = [
    'Steam Boilers',
    'Storage Tanks',
    'Generators',
    'Safety Equipment',
    'Construction Equipment',
    'Pressure Vessels',
    'Pumps & Compressors',
    'Cranes & Lifting Equipment',
    'Specialty Tools',
    'Testing Equipment'
  ];

  const inventorySizes = [
    '1-10 pieces',
    '11-50 pieces',
    '51-100 pieces',
    '100+ pieces'
  ];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = () => {
    // In a real app, this would save the data and redirect
    window.location.href = '/vendor-dashboard';
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const handleFileUpload = (field: string, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
  };

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-allrentz-gray">Vendor Registration</h1>
            <p className="text-gray-600 mt-1">Join our network of trusted equipment providers</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep 
                      ? 'bg-allrentz-red text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
                  </div>
                  {step < 5 && (
                    <div className={`w-12 h-1 ml-2 ${
                      step < currentStep ? 'bg-allrentz-red' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Company</span>
              <span>Verification</span>
              <span>Documents</span>
              <span>Equipment</span>
              <span>Payout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="industrial-card p-8">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Building2 className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Company Information</h2>
                <p className="text-gray-600">Tell us about your business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="Gulf Coast Equipment Rentals"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.businessType}
                    onChange={(e) => updateFormData('businessType', e.target.value)}
                  >
                    <option value="">Select business type</option>
                    {businessTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years in Business *</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.yearsInBusiness}
                    onChange={(e) => updateFormData('yearsInBusiness', e.target.value)}
                  >
                    <option value="">Select range</option>
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input 
                    type="url" 
                    className="industrial-input w-full" 
                    placeholder="https://yourcompany.com"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Business Verification */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Shield className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Business Verification</h2>
                <p className="text-gray-600">Contact information and business credentials</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact Name *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="John Smith"
                    value={formData.contactName}
                    onChange={(e) => updateFormData('contactName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Email *</label>
                  <input 
                    type="email" 
                    className="industrial-input w-full" 
                    placeholder="contact@company.com"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone *</label>
                  <input 
                    type="tel" 
                    className="industrial-input w-full" 
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business License Number *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="BL-123456789"
                    value={formData.businessLicense}
                    onChange={(e) => updateFormData('businessLicense', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Federal Tax ID (EIN) *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="12-3456789"
                    value={formData.taxId}
                    onChange={(e) => updateFormData('taxId', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Document Upload */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <FileText className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Required Documents</h2>
                <p className="text-gray-600">Upload compliance and verification documents</p>
              </div>

              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-allrentz-gray mb-3 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    General Liability Insurance *
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Minimum $1M coverage required. Must include industrial equipment rental coverage.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-allrentz-red transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="text-allrentz-red hover:underline cursor-pointer">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-allrentz-gray mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Business License *
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Current and valid business license or incorporation documents.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-allrentz-red transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="text-allrentz-red hover:underline cursor-pointer">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-allrentz-gray mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Safety & Compliance Certificates
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    OSHA compliance, equipment safety certificates, inspection records.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-allrentz-red transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="text-allrentz-red hover:underline cursor-pointer">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 10MB each</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Equipment Information */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Package className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Equipment Information</h2>
                <p className="text-gray-600">Tell us about your equipment inventory</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Equipment Categories *</label>
                  <p className="text-sm text-gray-600 mb-4">Select all categories that apply to your inventory</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {equipmentCategories.map(category => (
                      <label key={category} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={formData.equipmentCategories.includes(category)}
                          onChange={() => toggleArrayField('equipmentCategories', category)}
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inventory Size</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.inventorySize}
                    onChange={(e) => updateFormData('inventorySize', e.target.value)}
                  >
                    <option value="">Select inventory size</option>
                    {inventorySizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
                  <p className="text-sm text-blue-800">
                    After completing registration, you'll be able to add individual equipment items to your inventory with photos, specifications, and pricing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payout Information */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CreditCard className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Payout Information</h2>
                <p className="text-gray-600">Connect your bank account for payments</p>
              </div>

              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Secure Payment Processing
                  </h3>
                  <p className="text-sm text-green-800">
                    We use Stripe for secure payment processing. Your banking information is encrypted and never stored on our servers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number *</label>
                    <input 
                      type="text" 
                      className="industrial-input w-full" 
                      placeholder="Account number"
                      value={formData.bankAccount}
                      onChange={(e) => updateFormData('bankAccount', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number *</label>
                    <input 
                      type="text" 
                      className="industrial-input w-full" 
                      placeholder="Routing number"
                      value={formData.routingNumber}
                      onChange={(e) => updateFormData('routingNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-allrentz-gray mb-3">Tax Documents</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload W-9 or other tax documentation for 1099 reporting.
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-allrentz-red transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="text-allrentz-red hover:underline cursor-pointer">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF only, up to 10MB</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Schedule</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Payments processed weekly on Fridays</li>
                    <li>• 2-3 business day transfer time</li>
                    <li>• 5% platform fee on all transactions</li>
                    <li>• Detailed earnings reports available in dashboard</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={prevStep}
              className={`flex items-center space-x-2 px-6 py-3 rounded-md font-medium ${
                currentStep === 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="industrial-button inline-flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                className="industrial-button inline-flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Complete Registration</span>
              </button>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Questions about vendor requirements?{' '}
            <a href="mailto:vendors@allrentz.com" className="text-allrentz-red hover:underline">
              Contact our vendor team
            </a>{' '}
            or call{' '}
            <a href="tel:1-800-ALLRENTZ" className="text-allrentz-red hover:underline">
              1-800-ALLRENTZ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorOnboarding;
