
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { HardHat, Zap, Truck, ArrowRight, Shield, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, profile, loading: authLoading, signIn, signUp, loginAsDemo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (authLoading) return null;

  if (user) {
    if (!profile) return null;
    if (profile.role_type === 'vendor') {
      return <Navigate to="/vendor-dashboard" replace />;
    }
    return <Navigate to="/customer-dashboard" replace />;
  }

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }
    setLoading(false);
  };

  const handleDemoLogin = async (type: 'customer' | 'vendor') => {
    setLoading(true);
    try {
      await loginAsDemo(type);
      navigate(type === 'customer' ? '/customer-dashboard' : '/vendor-dashboard');
    } catch (error) {
      toast({ title: 'Login failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Marketing */}
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <HardHat className="h-10 w-10 text-allrentz-red" />
            <span className="text-3xl font-bold text-allrentz-gray">ALLRENTZ</span>
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-allrentz-gray mb-4">
              Rent Equipment in Minutes.
              <br />
              <span className="text-allrentz-red">Not Days.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Built for the field. Fast. Compliant. Trusted.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-allrentz-red" />
              <div>
                <h3 className="font-semibold text-sm">Compliance-First</h3>
                <p className="text-xs text-gray-600">Pre-verified vendors</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-allrentz-red" />
              <div>
                <h3 className="font-semibold text-sm">Instant Quotes</h3>
                <p className="text-xs text-gray-600">Minutes not hours</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-allrentz-red" />
              <div>
                <h3 className="font-semibold text-sm">Trusted Network</h3>
                <p className="text-xs text-gray-600">500+ verified vendors</p>
              </div>
            </div>
          </div>

          {/* Demo CTA */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
            <h3 className="font-bold text-lg mb-2">Try the Demo Experience</h3>
            <p className="text-gray-600 mb-4 text-sm">
              See how ALLRENTZ works with realistic data and complete workflows
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => handleDemoLogin('customer')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 flex items-center space-x-2"
              >
                <Zap className="h-4 w-4" />
                <span>Customer Demo</span>
              </Button>
              <Button
                type="button"
                onClick={() => handleDemoLogin('vendor')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              >
                <Truck className="h-4 w-4" />
                <span>Vendor Demo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Your Account</CardTitle>
            <CardDescription>
              Sign in to your existing account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleSignIn} disabled={loading} className="w-full">
                  {loading ? 'Signing in...' : 'Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleSignUp} disabled={loading} className="w-full">
                  {loading ? 'Creating account...' : 'Create Account'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
