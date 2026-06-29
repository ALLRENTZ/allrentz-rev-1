
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, HardHat, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-allrentz-red" />
              <span className="text-2xl font-bold text-allrentz-gray">ALLRENTZ</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                to="/how-it-works" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/how-it-works') ? 'text-allrentz-red' : 'text-gray-700 hover:text-allrentz-red'
                }`}
              >
                How It Works
              </Link>
              <Link 
                to="/browse" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/browse') ? 'text-allrentz-red' : 'text-gray-700 hover:text-allrentz-red'
                }`}
              >
                Browse Equipment
              </Link>
              {user && profile?.role_type === 'customer' && (
                <Link
                  to="/customer-dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/customer-dashboard') ? 'text-allrentz-red' : 'text-gray-700 hover:text-allrentz-red'
                  }`}
                >
                  Customer Portal
                </Link>
              )}
              {user && profile?.role_type === 'vendor' && (
                <Link
                  to="/vendor-dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/vendor-dashboard') ? 'text-allrentz-red' : 'text-gray-700 hover:text-allrentz-red'
                  }`}
                >
                  Vendor Portal
                </Link>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">{user.email?.split('@')[0]}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={profile?.role_type === 'vendor' ? '/vendor-dashboard' : '/customer-dashboard'}>Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/customer-onboarding">Request Quote</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button 
                    variant="ghost"
                    onClick={() => setShowLoginModal(true)}
                    className="text-sm"
                  >
                    Sign In
                  </Button>
                  <Link 
                    to="/customer-onboarding" 
                    className="industrial-button-secondary text-sm"
                  >
                    Request Quote
                  </Link>
                  <Link 
                    to="/vendor-onboarding" 
                    className="industrial-button text-sm"
                  >
                    List Equipment
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-allrentz-red hover:bg-gray-100"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3">
                <Link 
                  to="/how-it-works" 
                  className="text-sm font-medium text-gray-700 hover:text-allrentz-red px-4 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  How It Works
                </Link>
                <Link 
                  to="/browse" 
                  className="text-sm font-medium text-gray-700 hover:text-allrentz-red px-4 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Browse Equipment
                </Link>
                {user && profile?.role_type === 'customer' && (
                  <Link
                    to="/customer-dashboard"
                    className="text-sm font-medium text-gray-700 hover:text-allrentz-red px-4 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Customer Portal
                  </Link>
                )}
                {user && profile?.role_type === 'vendor' && (
                  <Link
                    to="/vendor-dashboard"
                    className="text-sm font-medium text-gray-700 hover:text-allrentz-red px-4 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Vendor Portal
                  </Link>
                )}
                <div className="px-4 py-2 space-y-2">
                  {user ? (
                    <Button 
                      onClick={() => {
                        signOut();
                        setIsOpen(false);
                      }}
                      variant="outline"
                      className="w-full text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setShowLoginModal(true);
                          setIsOpen(false);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Sign In
                      </Button>
                      <Link 
                        to="/customer-onboarding" 
                        className="block w-full industrial-button-secondary text-sm text-center"
                        onClick={() => setIsOpen(false)}
                      >
                        Request Quote
                      </Link>
                      <Link 
                        to="/vendor-onboarding" 
                        className="block w-full industrial-button text-sm text-center"
                        onClick={() => setIsOpen(false)}
                      >
                        List Equipment
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
    </>
  );
};

export default Navigation;
