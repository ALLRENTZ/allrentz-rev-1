
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CheckCircle, Building2, MapPin, Phone, Mail, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

const CustomerOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    // Company Info
    companyName: '',
    industry: '',
    companySize: '',
    // Contact Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    // Location Info
    primaryLocation: '',
    operatingRegions: [] as string[],
    // Preferences
    equipmentTypes: [] as string[],
    rentalFrequency: '',
    notifications: {
      email: true,
      sms: false,
      weekly: false
    }
  });

  const industries = [
    'Oil & Gas Refinery',
    'Tank Terminal',
    'Offshore Platform',
    'Chemical Plant',
    'Power Generation',
    'Construction/Contractor',
    'Manufacturing',
    'Other'
  ];

  const companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ];

  const equipmentTypes = [
    'Steam Boilers',
    'Storage Tanks',
    'Generators',
    'Safety Equipment',
    'Construction Equipment',
    'Pressure Vessels',
    'Pumps & Compressors',
    'Cranes & Lifting'
  ];

  const operatingRegions = [
    'Gulf Coast',
    'Texas',
    'Louisiana',
    'Oklahoma',
    'California',
    'North Dakota',
    'Pennsylvania',
    'Offshore'
  ];

  const rentalFrequencies = [
    'Daily/Weekly',
    'Monthly',
    'Project-based',
    'Emergency/As-needed',
    'Seasonal'
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
    toast.success('Account setup complete. Welcome to ALLRENTZ.');
    window.location.href = '/customer-dashboard';
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: 'operatingRegions' | 'equipmentTypes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  return (
    <div className="min-h-screen bg-allrentz-gray-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-allrentz-gray">Customer Registration</h1>
            <p className="text-gray-600 mt-1">Set up your account to start renting industrial equipment</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep 
                      ? 'bg-allrentz-red text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
                  </div>
                  {step < 4 && (
                    <div className={`w-16 h-1 ml-2 ${
                      step < currentStep ? 'bg-allrentz-red' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">Company</span>
              <span className="text-xs text-gray-600">Contact</span>
              <span className="text-xs text-gray-600">Location</span>
              <span className="text-xs text-gray-600">Preferences</span>
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
                <p className="text-gray-600">Tell us about your organization</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="Gulf Coast Refinery LLC"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                  >
                    <option value="">Select your industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.companySize}
                    onChange={(e) => updateFormData('companySize', e.target.value)}
                  >
                    <option value="">Select company size</option>
                    {companySizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Contact Information</h2>
                <p className="text-gray-600">Primary contact details for your account</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="Smith"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="email" 
                      className="industrial-input pl-10 w-full" 
                      placeholder="john.smith@company.com"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                      type="tel" 
                      className="industrial-input pl-10 w-full" 
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="Operations Manager"
                    value={formData.jobTitle}
                    onChange={(e) => updateFormData('jobTitle', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <MapPin className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Location & Operations</h2>
                <p className="text-gray-600">Where do you operate and need equipment?</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Location *</label>
                  <input 
                    type="text" 
                    className="industrial-input w-full" 
                    placeholder="Houston, TX"
                    value={formData.primaryLocation}
                    onChange={(e) => updateFormData('primaryLocation', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Operating Regions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {operatingRegions.map(region => (
                      <label key={region} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={formData.operatingRegions.includes(region)}
                          onChange={() => toggleArrayField('operatingRegions', region)}
                        />
                        <span className="text-sm text-gray-700">{region}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <FileText className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
                <h2 className="text-xl font-bold text-allrentz-gray">Equipment Preferences</h2>
                <p className="text-gray-600">Help us customize your experience</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Equipment Types You Rent</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {equipmentTypes.map(type => (
                      <label key={type} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={formData.equipmentTypes.includes(type)}
                          onChange={() => toggleArrayField('equipmentTypes', type)}
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Typical Rental Frequency</label>
                  <select 
                    className="industrial-input w-full"
                    value={formData.rentalFrequency}
                    onChange={(e) => updateFormData('rentalFrequency', e.target.value)}
                  >
                    <option value="">Select frequency</option>
                    {rentalFrequencies.map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Notification Preferences</label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={formData.notifications.email}
                        onChange={(e) => updateFormData('notifications', {...formData.notifications, email: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">Email notifications for quotes and updates</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={formData.notifications.sms}
                        onChange={(e) => updateFormData('notifications', {...formData.notifications, sms: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">SMS alerts for delivery and pickup</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={formData.notifications.weekly}
                        onChange={(e) => updateFormData('notifications', {...formData.notifications, weekly: e.target.checked})}
                      />
                      <span className="text-sm text-gray-700">Weekly rental summary reports</span>
                    </label>
                  </div>
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
                <span>Complete Setup</span>
              </button>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@allrentz.com" className="text-allrentz-red hover:underline">
              support@allrentz.com
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

export default CustomerOnboarding;
