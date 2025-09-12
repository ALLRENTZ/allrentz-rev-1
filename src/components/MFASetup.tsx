
import React, { useState } from 'react';
import { Shield, Smartphone, Key, QrCode, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const MFASetup = () => {
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const handleVerification = () => {
    // Simulate MFA verification
    if (verificationCode.length === 6) {
      setIsVerified(true);
      setStep(3);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="industrial-button flex items-center space-x-2">
          <Shield className="h-4 w-4" />
          <span>Setup Enterprise MFA</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Multi-Factor Authentication Setup</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {step === 1 && (
            <div className="text-center">
              <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Enterprise Security Required</h3>
              <p className="text-gray-600 mb-6">
                Enable multi-factor authentication to secure high-value equipment transactions
              </p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <Smartphone className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-xs font-medium">Authenticator App</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Key className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-medium">Hardware Token</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <QrCode className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs font-medium">QR Code</p>
                </div>
              </div>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full industrial-button"
              >
                Continue Setup
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <QrCode className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
              <p className="text-gray-600 mb-4">
                Scan this code with your authenticator app, then enter the 6-digit code below
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              
              <button 
                onClick={handleVerification}
                disabled={verificationCode.length !== 6}
                className="w-full industrial-button disabled:opacity-50"
              >
                Verify Code
              </button>
            </div>
          )}

          {step === 3 && isVerified && (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">MFA Enabled Successfully!</h3>
              <p className="text-gray-600 mb-6">
                Your account is now protected with enterprise-grade multi-factor authentication
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-green-900 mb-2">Security Features Activated:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Hardware token authentication</li>
                  <li>• Biometric verification backup</li>
                  <li>• Session anomaly detection</li>
                  <li>• Emergency lockdown protocols</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MFASetup;
