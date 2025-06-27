
import React from 'react';

const HowItWorksSection: React.FC = () => {
  return (
    <div className="mt-12 bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-xl font-bold mb-4">How SmartMatch Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-purple-600 font-bold">1</span>
          </div>
          <h3 className="font-semibold mb-2">Smart Analysis</h3>
          <p className="text-sm text-gray-600">AI analyzes your requirements against our vendor network</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-blue-600 font-bold">2</span>
          </div>
          <h3 className="font-semibold mb-2">Instant Matching</h3>
          <p className="text-sm text-gray-600">Get ranked matches based on distance, compliance, and availability</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 font-bold">3</span>
          </div>
          <h3 className="font-semibold mb-2">Direct Connection</h3>
          <p className="text-sm text-gray-600">Vendors are notified instantly and can respond in real-time</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksSection;
