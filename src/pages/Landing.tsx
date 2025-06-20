
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Shield, Users, Wrench, Gauge, MapPin, HardHat, FileCheck, Truck, Settings } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-allrentz-gray-dark to-allrentz-gray py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Simplify Equipment Rentals.
              <br />
              <span className="text-allrentz-red">Eliminate the Chaos.</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
              Fast. Compliant. Reliable. Built for the field — not the office.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/customer-onboarding"
                className="industrial-button text-lg px-8 py-4 inline-flex items-center space-x-2"
              >
                <span>Request a Quote</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link 
                to="/vendor-onboarding"
                className="border-2 border-white text-white hover:bg-white hover:text-allrentz-gray font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center space-x-2"
              >
                <span>List Your Equipment</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
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
            <div className="industrial-card p-8 text-center">
              <Clock className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Lightning Fast</h3>
              <p className="text-gray-600">
                Get quotes in minutes, not days. AI-powered matching connects you with the right equipment instantly.
              </p>
            </div>
            
            <div className="industrial-card p-8 text-center">
              <Shield className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Compliance First</h3>
              <p className="text-gray-600">
                All vendors pre-verified. Insurance, inspections, and safety docs handled automatically.
              </p>
            </div>
            
            <div className="industrial-card p-8 text-center">
              <Users className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Trusted Network</h3>
              <p className="text-gray-600">
                Vetted vendors with proven track records in refineries, terminals, and heavy industry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-allrentz-gray-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              Three Steps to Equipment Rental
            </h2>
            <Link 
              to="/how-it-works"
              className="text-allrentz-red font-semibold hover:underline inline-flex items-center space-x-1"
            >
              <span>See detailed workflows</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-allrentz-red text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Browse & Request</h3>
              <p className="text-gray-600">
                Search approved vendors, filter by location and specs, submit instant quote requests.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-allrentz-red text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Book & Confirm</h3>
              <p className="text-gray-600">
                Get matched with available equipment, confirm pricing, schedule delivery with GPS tracking.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-allrentz-red text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Track & Manage</h3>
              <p className="text-gray-600">
                Real-time location tracking, extend rentals, manage documents, schedule returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Equipment Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              Industrial Equipment Ready to Rent
            </h2>
            <p className="text-xl text-gray-600">
              From steam boilers to confined space gear — everything your operation needs.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="industrial-card p-6 hover:shadow-lg transition-shadow">
              <Gauge className="h-10 w-10 text-allrentz-red mb-4" />
              <h3 className="font-bold text-allrentz-gray mb-2">Steam Boilers</h3>
              <p className="text-sm text-gray-600">High-pressure, low-pressure, and specialty boiler systems</p>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-shadow">
              <MapPin className="h-10 w-10 text-allrentz-red mb-4" />
              <h3 className="font-bold text-allrentz-gray mb-2">Frac Tanks</h3>
              <p className="text-sm text-gray-600">Storage tanks for wastewater, chemicals, and fluids</p>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-shadow">
              <HardHat className="h-10 w-10 text-allrentz-red mb-4" />
              <h3 className="font-bold text-allrentz-gray mb-2">Safety Equipment</h3>
              <p className="text-sm text-gray-600">Confined space gear, gas monitors, safety systems</p>
            </div>
            
            <div className="industrial-card p-6 hover:shadow-lg transition-shadow">
              <Truck className="h-10 w-10 text-allrentz-red mb-4" />
              <h3 className="font-bold text-allrentz-gray mb-2">Heavy Machinery</h3>
              <p className="text-sm text-gray-600">Cranes, excavators, generators, and construction equipment</p>
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

      {/* CTA Section */}
      <section className="py-16 bg-allrentz-red">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Equipment Rentals?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Join the platform that's transforming how industrial operations rent equipment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/customer-onboarding"
              className="bg-white text-allrentz-red hover:bg-gray-100 font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center justify-center space-x-2"
            >
              <span>Get Started as Customer</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              to="/vendor-onboarding"
              className="border-2 border-white text-white hover:bg-white hover:text-allrentz-red font-semibold py-4 px-8 rounded-md transition-colors duration-200 inline-flex items-center justify-center space-x-2"
            >
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
