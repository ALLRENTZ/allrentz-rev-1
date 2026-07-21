import { Link } from 'react-router-dom';
import { ArrowRight, Search, FileText, CheckCircle, MapPin, DollarSign, Bell, Shield, Clock, Users, Calendar, Package, Wrench } from 'lucide-react';

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-allrentz-gray py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            How ALLRENTZ Works
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Two streamlined workflows designed for customers and vendors in the industrial equipment space.
          </p>
        </div>
      </section>

      {/* Customer Flow */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              For Industrial Customers
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Refineries, tank terminals, offshore platforms, and contractors
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <Search className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Browse Equipment</h3>
              <p className="text-gray-600 text-sm mb-4">
                Search through approved vendors and verified equipment. Filter by location, specs, and availability.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Pre-verified vendors</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Compliance documents</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Real-time availability</span>
                </div>
              </div>
            </div>

            {/* Step 2 - Enhanced */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <FileText className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Submit Requests</h3>
              <p className="text-gray-600 text-sm mb-4">
                Request individual equipment or complete turnaround packages with vendor matching.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Individual equipment quotes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Turnaround package builder</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Smart vendor matching</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <CheckCircle className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Confirm Rental</h3>
              <p className="text-gray-600 text-sm mb-4">
                Review quotes, confirm pricing, and schedule delivery with GPS tracking enabled.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Transparent pricing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Flexible scheduling</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Digital contracts</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                4
              </div>
              <MapPin className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Track & Manage</h3>
              <p className="text-gray-600 text-sm mb-4">
                Real-time tracking, rental extensions, document management, and easy returns.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>GPS tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Document storage</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Extension options</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link 
              to="/customer-onboarding"
              className="industrial-button inline-flex items-center space-x-2"
            >
              <span>Start as Customer</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Turnaround Planning Highlight */}
      <section className="py-16 bg-gradient-to-r from-allrentz-red to-allrentz-red-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Wrench className="h-16 w-16 text-white mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Specialized Turnaround Planning
            </h2>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto">
              Plan and execute complex maintenance turnarounds with our comprehensive package builder and coordination tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-center">
              <Package className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Equipment Bundling</h3>
              <p className="text-gray-100 text-sm">
                Pre-configured packages for common turnaround scenarios. Bundle compatible equipment with automated compatibility checking.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-center">
              <Calendar className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Timeline Coordination</h3>
              <p className="text-gray-100 text-sm">
                Gantt chart visualization, critical path management, and multi-vendor delivery coordination for complex projects.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-8 text-center">
              <Shield className="h-12 w-12 text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Compliance Ready</h3>
              <p className="text-gray-100 text-sm">
                Hot work permits, safety equipment bundling, and automated compliance documentation for industrial maintenance.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link 
              to="/customer-dashboard"
              className="bg-white text-allrentz-red hover:bg-gray-100 font-semibold py-3 px-6 rounded-md transition-colors duration-200 inline-flex items-center space-x-2"
            >
              <span>Explore Turnaround Planning</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Vendor Flow */}
      <section className="py-16 bg-allrentz-gray-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              For Equipment Vendors
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Rental companies, equipment dealers, and industrial suppliers
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <FileText className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">List Equipment</h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload equipment details, pricing, availability, and compliance documentation.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Easy equipment upload</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Photo management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Pricing controls</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <Bell className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Receive Requests</h3>
              <p className="text-gray-600 text-sm mb-4">
                Get instant notifications for quote requests that match your equipment inventory.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Real-time notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Smart matching</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Customer details</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <DollarSign className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Accept & Get Paid</h3>
              <p className="text-gray-600 text-sm mb-4">
                Review requests, send quotes, accept bookings, and receive payments securely.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Secure payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Automated invoicing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Fast payouts</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="industrial-card p-8 text-center relative">
              <div className="bg-allrentz-red text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                4
              </div>
              <MapPin className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-lg font-bold text-allrentz-gray mb-3">Track Assets</h3>
              <p className="text-gray-600 text-sm mb-4">
                Monitor equipment location, manage documents, and track rental performance.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>GPS tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Geofence alerts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Performance analytics</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link 
              to="/vendor-onboarding"
              className="industrial-button inline-flex items-center space-x-2"
            >
              <span>Start as Vendor</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features - Enhanced */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-allrentz-gray mb-4">
              Why Choose ALLRENTZ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Clock className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Built for Speed</h3>
              <p className="text-gray-600">
                SmartMatch, instant notifications, and real-time tracking eliminate delays and phone tag.
              </p>
            </div>

            <div className="text-center">
              <Shield className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Compliance Ready</h3>
              <p className="text-gray-600">
                Pre-verified vendors, automated document management, and industry-specific safety requirements.
              </p>
            </div>

            <div className="text-center">
              <Users className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Trusted Network</h3>
              <p className="text-gray-600">
                Vetted equipment providers with proven track records in refineries, terminals, and heavy industry.
              </p>
            </div>

            <div className="text-center">
              <Wrench className="h-12 w-12 text-allrentz-red mx-auto mb-4" />
              <h3 className="text-xl font-bold text-allrentz-gray mb-3">Turnaround Expertise</h3>
              <p className="text-gray-600">
                Specialized tools for complex maintenance planning with timeline coordination and equipment bundling.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
