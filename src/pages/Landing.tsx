
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Shield, Users, Wrench, Gauge, MapPin, HardHat, FileCheck, Truck, Settings, Zap, Bell, Award } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-allrentz-gray-dark to-allrentz-gray py-20 lg:py-32 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="text-center text-white">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 animate-fade-in">
              Rent Equipment in Minutes.
              <br />
              <span className="text-allrentz-red">Not Days.</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-4 text-gray-200 max-w-4xl mx-auto font-medium">
              Built for the field. Fast. Compliant. Trusted.
            </p>
            <p className="text-lg lg:text-xl mb-8 text-gray-300 max-w-3xl mx-auto">
              Amazon-speed meets Palantir-trust for the refinery rental world. Built by someone who knows the pain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/customer-onboarding"
                className="industrial-button text-lg px-8 py-4 inline-flex items-center space-x-2 bg-allrentz-red hover:bg-allrentz-red/90"
              >
                <Zap className="h-5 w-5" />
                <span>Request a Quote</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                to="/vendor-onboarding"
                className="border-2 border-white text-white hover:bg-white hover:text-allrentz-gray font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <Truck className="h-5 w-5" />
                <span>List Your Equipment</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Logos */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 mb-8 font-medium">Trusted by Industrial Leaders</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-6 mb-2">
                <Gauge className="h-8 w-8 text-allrentz-red mx-auto" />
              </div>
              <span className="text-sm font-semibold text-gray-700">REFINING</span>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-6 mb-2">
                <MapPin className="h-8 w-8 text-allrentz-red mx-auto" />
              </div>
              <span className="text-sm font-semibold text-gray-700">MIDSTREAM</span>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-6 mb-2">
                <Settings className="h-8 w-8 text-allrentz-red mx-auto" />
              </div>
              <span className="text-sm font-semibold text-gray-700">PETROCHEM</span>
            </div>
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-6 mb-2">
                <HardHat className="h-8 w-8 text-allrentz-red mx-auto" />
              </div>
              <span className="text-sm font-semibold text-gray-700">EPC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              Built for Industrial Operations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop wasting time on phone calls, paperwork, and vendor hunting. Get the equipment you need, when you need it.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="industrial-card p-8 text-center border-l-4 border-allrentz-red">
              <Shield className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Compliance-First</h3>
              <p className="text-gray-600 mb-4">
                All vendors pre-verified. Insurance, inspections, and safety docs handled automatically.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">ATEX-Ready</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Verified Vendor</span>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Turnaround Certified</span>
              </div>
            </div>
            
            <div className="industrial-card p-8 text-center border-l-4 border-allrentz-red">
              <Users className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Trusted Network</h3>
              <p className="text-gray-600 mb-4">
                Vetted vendors with proven track records in refineries, terminals, and heavy industry.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">500+ Vendors</span>
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">98% On-Time</span>
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">24/7 Support</span>
              </div>
            </div>
            
            <div className="industrial-card p-8 text-center border-l-4 border-allrentz-red">
              <MapPin className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Real-Time Tracking</h3>
              <p className="text-gray-600 mb-4">
                GPS tracking, geofence alerts, and digital docs eliminate downtime and "Where is it?" calls.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">GPS Tracking</span>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Geofence Alerts</span>
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Digital Binder</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industrial Equipment Cards */}
      <section className="py-16 bg-allrentz-gray-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              Critical Equipment Ready to Rent
            </h2>
            <p className="text-xl text-gray-600">
              From steam boilers to confined space gear — everything your operation needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <Gauge className="h-10 w-10 text-allrentz-red" />
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">SmartMatch Available</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Steam Boilers</h3>
              <p className="text-sm text-gray-600 mb-3">High-pressure, low-pressure, and specialty boiler systems</p>
              <div className="text-sm text-gray-500">Starting at $850/day</div>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <MapPin className="h-10 w-10 text-allrentz-red" />
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Hot Swap Available</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Frac Tanks</h3>
              <p className="text-sm text-gray-600 mb-3">Storage tanks for wastewater, chemicals, and fluids</p>
              <div className="text-sm text-gray-500">Starting at $125/day</div>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <HardHat className="h-10 w-10 text-allrentz-red" />
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">15 min away</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Safety Equipment</h3>
              <p className="text-sm text-gray-600 mb-3">Confined space gear, gas monitors, safety systems</p>
              <div className="text-sm text-gray-500">Starting at $95/day</div>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <Settings className="h-10 w-10 text-allrentz-red" />
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">SmartMatch Available</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Pressure Vessels</h3>
              <p className="text-sm text-gray-600 mb-3">ASME certified vessels for turnaround projects</p>
              <div className="text-sm text-gray-500">Starting at $450/day</div>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <Truck className="h-10 w-10 text-allrentz-red" />
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Recently Returned</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Heavy Machinery</h3>
              <p className="text-sm text-gray-600 mb-3">Cranes, excavators, generators, and construction equipment</p>
              <div className="text-sm text-gray-500">Starting at $1,200/day</div>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-all hover:border-allrentz-red/30">
              <div className="flex items-center justify-between mb-4">
                <Zap className="h-10 w-10 text-allrentz-red" />
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Nearby</span>
              </div>
              <h3 className="font-bold text-allrentz-gray mb-2">Power Generation</h3>
              <p className="text-sm text-gray-600 mb-3">Generators, UPS systems, and temporary power solutions</p>
              <div className="text-sm text-gray-500">Starting at $650/day</div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Link 
              to="/browse"
              className="industrial-button inline-flex items-center space-x-2"
            >
              <span>Browse All Equipment</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* SmartMatch Demo Teaser */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 lg:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Zap className="h-4 w-4" />
                <span>AI-Powered SmartMatch</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
                See SmartMatch in Action
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Watch how our AI instantly connects you with the right equipment and vendors based on your exact needs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Clock className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Instant Matching</h3>
                <p className="text-sm text-gray-600">AI analyzes 50+ factors to find perfect equipment matches in seconds</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Award className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Vendor Scoring</h3>
                <p className="text-sm text-gray-600">Real-time performance ratings based on compliance, delivery, and quality</p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Bell className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Live Notifications</h3>
                <p className="text-sm text-gray-600">Instant alerts to vendors with immediate response tracking</p>
              </div>
            </div>
            
            <div className="text-center">
              <Link 
                to="/how-it-works"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-md transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <span>Try SmartMatch Demo</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-allrentz-red">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Eliminate Equipment Downtime?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Join the platform that's transforming how industrial operations rent critical equipment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/customer-onboarding"
              className="bg-white text-allrentz-red hover:bg-gray-100 font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center justify-center space-x-2"
            >
              <Zap className="h-5 w-5" />
              <span>Get Started as Customer</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              to="/vendor-onboarding"
              className="border-2 border-white text-white hover:bg-white hover:text-allrentz-red font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center justify-center space-x-2"
            >
              <Truck className="h-5 w-5" />
              <span>Join as Vendor</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
