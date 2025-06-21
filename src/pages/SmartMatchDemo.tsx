
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, MapPin, Clock, Shield, Award, Bell, CheckCircle, AlertCircle } from 'lucide-react';

interface MatchedVendor {
  id: number;
  name: string;
  distance: string;
  compliance: number;
  performance: number;
  price: string;
  responseTime: string;
  status: 'responding' | 'quoted' | 'available';
}

const SmartMatchDemo = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    equipment: '',
    location: '',
    urgency: ''
  });

  const mockVendors: MatchedVendor[] = [
    {
      id: 1,
      name: "GulfCoast Safety Solutions",
      distance: "2.3 miles",
      compliance: 98,
      performance: 4.9,
      price: "$125/day",
      responseTime: "2 mins",
      status: 'quoted'
    },
    {
      id: 2,
      name: "Refinery Equipment Co.",
      distance: "5.7 miles",
      compliance: 95,
      performance: 4.7,
      price: "$135/day",
      responseTime: "4 mins",
      status: 'quoted'
    },
    {
      id: 3,
      name: "Industrial Safety Group",
      distance: "8.1 miles",
      compliance: 92,
      performance: 4.8,
      price: "$140/day",
      responseTime: "6 mins",
      status: 'responding'
    }
  ];

  const handleStartDemo = () => {
    if (!formData.equipment || !formData.location || !formData.urgency) return;
    
    setIsMatching(true);
    setShowResults(false);
    
    // Simulate AI matching process
    setTimeout(() => {
      setIsMatching(false);
      setShowResults(true);
    }, 3000);
  };

  const resetDemo = () => {
    setIsMatching(false);
    setShowResults(false);
    setFormData({ equipment: '', location: '', urgency: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-allrentz-gray-dark to-allrentz-gray py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>Interactive Demo</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            Experience SmartMatch
            <br />
            <span className="text-allrentz-red">AI in Action</span>
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            See how our AI instantly connects you with the right equipment and vendors based on your exact needs.
          </p>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Demo Form */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-allrentz-gray mb-4">Try SmartMatch Demo</h2>
                <p className="text-gray-600 mb-6">Fill out this mock request to see our AI matching in action</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type</label>
                  <select 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-allrentz-red focus:border-transparent"
                    value={formData.equipment}
                    onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                  >
                    <option value="">Select equipment...</option>
                    <option value="safety">Confined Space Safety Equipment</option>
                    <option value="process">Process Equipment & Vessels</option>
                    <option value="cleaning">Tank Cleaning Systems</option>
                    <option value="storage">Temporary Storage Solutions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input 
                    type="text"
                    placeholder="Houston, TX Refinery District"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-allrentz-red focus:border-transparent"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency Level</label>
                  <select 
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-allrentz-red focus:border-transparent"
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                  >
                    <option value="">Select urgency...</option>
                    <option value="emergency">Emergency (15-30 min response)</option>
                    <option value="standard">Standard (2-4 hours)</option>
                    <option value="planned">Planned (24+ hours)</option>
                  </select>
                </div>

                <button
                  onClick={handleStartDemo}
                  disabled={!formData.equipment || !formData.location || !formData.urgency || isMatching}
                  className="w-full bg-allrentz-red hover:bg-allrentz-red/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isMatching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>AI Matching in Progress...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Start SmartMatch Demo</span>
                    </>
                  )}
                </button>

                {showResults && (
                  <button
                    onClick={resetDemo}
                    className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Try Another Request
                  </button>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-gray-50 rounded-xl p-6">
              {!isMatching && !showResults && (
                <div className="text-center py-16">
                  <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-500 mb-2">Ready to Match</h3>
                  <p className="text-gray-400">Fill out the form to see SmartMatch in action</p>
                </div>
              )}

              {isMatching && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-allrentz-red border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-allrentz-gray mb-2">AI Analyzing Your Request</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Analyzing location and proximity...</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Checking vendor compliance records...</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Evaluating performance history...</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Sending instant notifications...</span>
                    </div>
                  </div>
                </div>
              )}

              {showResults && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h3 className="text-xl font-semibold text-allrentz-gray">3 Vendors Matched</h3>
                    <p className="text-sm text-gray-600">Ranked by AI scoring algorithm</p>
                  </div>

                  <div className="space-y-4">
                    {mockVendors.map((vendor) => (
                      <div key={vendor.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-allrentz-gray">{vendor.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{vendor.distance} away</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-allrentz-red">{vendor.price}</div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              vendor.status === 'quoted' ? 'bg-green-100 text-green-800' : 
                              vendor.status === 'responding' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {vendor.status === 'quoted' ? 'Quote Ready' : 
                               vendor.status === 'responding' ? 'Responding...' : 'Available'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Shield className="h-3 w-3 text-green-600" />
                              <span className="font-medium">{vendor.compliance}%</span>
                            </div>
                            <div className="text-xs text-gray-500">Compliance</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Award className="h-3 w-3 text-blue-600" />
                              <span className="font-medium">{vendor.performance}</span>
                            </div>
                            <div className="text-xs text-gray-500">Rating</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1 mb-1">
                              <Clock className="h-3 w-3 text-purple-600" />
                              <span className="font-medium">{vendor.responseTime}</span>
                            </div>
                            <div className="text-xs text-gray-500">Response</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-800 font-medium mb-3">Ready to try the real platform?</p>
                    <Link 
                      to="/browse"
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      <span>Try It Live</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-allrentz-gray-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-allrentz-gray mb-8">How SmartMatch Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">AI Analysis</h3>
              <p className="text-sm text-gray-600">Our AI analyzes 50+ factors including location, compliance, performance, and availability</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Instant Notifications</h3>
              <p className="text-sm text-gray-600">Qualified vendors receive immediate alerts and can respond within minutes</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Smart Ranking</h3>
              <p className="text-sm text-gray-600">Results ranked by AI scoring with real-time competitive pricing</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SmartMatchDemo;
