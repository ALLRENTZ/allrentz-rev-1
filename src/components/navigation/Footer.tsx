
import { Link } from 'react-router-dom';
import { HardHat, MapPin, Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer id="footer" className="bg-allrentz-gray-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-allrentz-red" />
              <span className="text-2xl font-bold">ALLRENTZ</span>
            </div>
            <p className="text-gray-300 text-sm">
              The industrial equipment rental marketplace built for refineries, tank terminals, and large-scale contractors.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4" />
              <span>Houston, TX</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Platform</h3>
            <div className="space-y-2 text-sm">
              <Link to="/how-it-works" className="block text-gray-300 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link to="/browse" className="block text-gray-300 hover:text-white transition-colors">
                Browse Equipment
              </Link>
              <Link to="/customer-onboarding" className="block text-gray-300 hover:text-white transition-colors">
                Request Quote
              </Link>
              <Link to="/vendor-onboarding" className="block text-gray-300 hover:text-white transition-colors">
                List Equipment
              </Link>
            </div>
          </div>

          {/* Equipment Categories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Equipment</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>Steam Boilers</p>
              <p>Frac Tanks</p>
              <p>Confined Space Gear</p>
              <p>Construction Equipment</p>
              <p>Pressure Vessels</p>
              <p>Safety Equipment</p>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="h-4 w-4" />
                <span>1-800-ALLRENTZ</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="h-4 w-4" />
                <span>support@allrentz.com</span>
              </div>
              <Link to="/terms" className="block text-gray-300 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="block text-gray-300 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 ALLRENTZ. Built for the field, not the office.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
