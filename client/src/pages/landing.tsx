import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Check, Clock, Users, DollarSign, FileText, Calendar, Download, ChevronRight, X, Brain, Lock, Mail, Search, Star, Plus, LogOut } from 'lucide-react';

import LoginModal from '@/components/login-modal';
import ApplicationForm from '@/components/application-form';
import { scrollToElement } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const { user, isAuthenticated, signInWithGoogle, signOut } = useAuth();
  const { loginAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('hello@projectresolveai.com');
  const [adminPassword, setAdminPassword] = useState('helloresolveaiproject');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      
      // Clear all cached queries
      queryClient.clear();
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user || typeof user !== 'object' || !('email' in user) || !user.email || typeof user.email !== 'string') return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const openLoginModal = () => {
    setIsSignUpMode(false);
    setShowLoginModal(true);
  };

  const openSignUpModal = () => {
    setIsSignUpMode(true);
    setShowLoginModal(true);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    try {
      const success = await loginAdmin(adminEmail, adminPassword);

      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome to the admin panel",
        });
        setShowAdminLogin(false);
        // Small delay to ensure state is updated, then redirect
        setTimeout(() => {
          setLocation('/admin');
        }, 100);
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Unable to connect to server",
        variant: "destructive",
      });
    } finally {
      setAdminLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Plus className="h-8 w-8 text-primary mr-3" />
                <span className="text-xl font-bold text-neutral-dark">Resolve AI</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => scrollToElement('how-it-works')}>
                How It Works
              </Button>
              <Button variant="ghost" onClick={() => scrollToElement('pricing')}>
                Pricing
              </Button>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <Avatar 
                    className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    <AvatarFallback className="bg-primary text-white text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    className="flex items-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button variant="outline" onClick={() => setShowAdminLogin(true)}>
                    Admin
                  </Button>
                  <Button variant="outline" onClick={openLoginModal}>
                    Login
                  </Button>
                  <Button onClick={openSignUpModal}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative w-full max-w-md mx-4">
            <button 
              onClick={() => setShowAdminLogin(false)} 
              className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 text-xl font-bold"
              aria-label='Close admin login'
            >
              ×
            </button>
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
                <p className="text-gray-600 mt-2">Access the Project Resolve AI admin panel</p>
              </div>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="admin-email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      id="admin-email"
                      type="email"
                      placeholder="hello@projectresolveai.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="admin-password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      id="admin-password"
                      type="password"
                      placeholder="Enter password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium"
                  disabled={adminLoading}
                >
                  {adminLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-4">
                  Authorized personnel only
                </p>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="gradient-primary text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <span className="bg-accent text-white px-3 py-1 rounded-full text-sm font-medium">
                  For Australian Tradespeople
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Project Resolve AI: Get Paid What You're Owed
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Stop letting payment disputes drain your business. Our AI platform helps you resolve unpaid work, variations, and contract disputes with confidence — no lawyers required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="btn-accent text-lg px-8 py-4"
                  onClick={() => scrollToElement('application')}
                >
                  Apply for Help Now
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-white border-white bg-white/10 hover:bg-white hover:text-primary backdrop-blur-sm"
                  onClick={() => scrollToElement('how-it-works')}
                >
                  See How It Works
                </Button>
              </div>
            </div>
            <div className="relative">
              <Card className="shadow-2xl">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-dark font-semibold">Case Status</span>
                      <span className="case-status-active">Active</span>
                    </div>
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-lg font-semibold text-neutral-dark">Unpaid Invoices - $47,500</h3>
                      <p className="text-neutral-medium text-sm">Electrical contractor vs. Main contractor</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-accent mr-3" />
                        <span className="text-sm text-neutral-dark">Payment claim generated</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-accent mr-3" />
                        <span className="text-sm text-neutral-dark">Response due: 15 business days</span>
                      </div>
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 text-success mr-3" />
                        <span className="text-sm text-neutral-dark">SOPA protection activated</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">You're not alone. Every tradie hits these walls.</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">Not getting paid after the job's done</span>
            </div>
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">No contract, and don't know where you stand</span>
            </div>
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">Builders dragging their feet for months</span>
            </div>
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">Clients demanding variations for free</span>
            </div>
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">No idea what letters to send or laws that apply</span>
            </div>
            <div className="flex items-start space-x-3">
              <X className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
              <span className="text-gray-700">And no one giving you a straight answer on what to do next</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xl font-semibold text-neutral-dark">
              This platform is for tradies who want answers — not legal bills.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Here's how Resolve — For Tradies helps you win.</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <Card className="text-center p-6">
              <CardContent>
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Step-by-step case plan</h3>
                <p className="text-gray-600 text-sm">A timeline that shows exactly what to do and when</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent>
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI-generated letters & contracts</h3>
                <p className="text-gray-600 text-sm">Built from real laws, tailored to your job</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent>
                <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Your own client dashboard</h3>
                <p className="text-gray-600 text-sm">Track everything, store documents, never miss a deadline</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent>
                <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Email + calendar integration</h3>
                <p className="text-gray-600 text-sm">Get reminders before it's too late</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent>
                <Search className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Optional review by human expert</h3>
                <p className="text-gray-600 text-sm">Approve letters before they're sent</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent>
                <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">You're Back in Charge — Without Paying Lawyers</h3>
                <p className="text-gray-600 text-sm">For a fraction of what you'd pay a solicitor, Resolve gives you the tools, support, and clarity to stand your ground and get paid.</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <p className="text-lg text-gray-700 italic">
              We're not lawyers. We've lived the frustration, spent the money, and learned the hard way — now we're making sure you don't have to.
            </p>
          </div>
        </div>
      </section>

      {/* Why Trades Are Jumping On Board */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Why Trades Are Jumping On Board With Resolve — For Tradies</h2>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Point 1 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-dark mb-2">1. A Legal Game Plan — Without the Lawyer Price Tag</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get a step-by-step action plan built for your exact situation. Whether you're owed money, kicked off-site, or stuck in a contract mess, Resolve shows you what to do next — backed by real Australian building laws like SOPA. No confusion, no courtrooms, no $10k lawyer bills.
                </p>
              </div>
            </div>

            {/* Point 2 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-dark mb-2">2. Letters & Contracts That Actually Hold Up</h3>
                <p className="text-gray-600 leading-relaxed">
                  Tired of sending texts or dodgy invoices that get ignored? Resolve generates professional, legally strong documents — from payment demands to contract templates — all customised to your trade, job, and state. Download in Word format, edit as needed, and send with confidence.
                </p>
              </div>
            </div>

            {/* Point 3 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-dark mb-2">3. Your Own Jobsite Command Centre</h3>
                <p className="text-gray-600 leading-relaxed">
                  Everything in one place: timelines, documents, contracts, photos, and deadlines. The Dashboard keeps you on top of every project and every dispute — no more scrambling for emails or missing key dates. Connect your calendar and email to stay synced automatically.
                </p>
              </div>
            </div>

            {/* Point 4 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-dark mb-2">4. 24/7 Support That Has Your Back</h3>
                <p className="text-gray-600 leading-relaxed">
                  Resolve's AI assistant is ready whenever you are — helping you write letters, update contracts, or work out your next move. Plus, our team reviews and approves everything before it's sent. You stay in control, with real support behind the scenes.
                </p>
              </div>
            </div>

            {/* Point 5 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-dark mb-2">5. Keep Your Cash — Stop Paying Legal Middlemen</h3>
                <p className="text-gray-600 leading-relaxed">
                  Forget giving away 40% to debt collectors or paying $400 an hour to a lawyer. For just $299 once (and $49/month for unlimited access), you get a full legal-grade system designed for tradies — without the middleman.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button 
              className="btn-primary px-8 py-3 text-lg"
              onClick={() => {
                if (!isAuthenticated) {
                  setShowLoginModal(true);
                  setIsSignUpMode(false);
                } else {
                  scrollToElement('application');
                }
              }}
            >
              Get Your Game Plan Now
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Simple. Fast. Legally backed.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Sign up & subscribe</h3>
              <p className="text-neutral-medium text-sm">Start your $49/month subscription and access your complete legal dashboard</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Create your case</h3>
              <p className="text-neutral-medium text-sm">Describe your issue and get AI-powered legal analysis with custom strategy documents</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Take action & track progress</h3>
              <p className="text-neutral-medium text-sm">Use timelines, store documents, sync calendars, and get ongoing AI support</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white p-6 rounded-lg shadow-sm inline-block">
              <p className="text-lg italic text-gray-700">
                "Feels like having a lawyer in your pocket — without the cost."
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Straightforward pricing. No surprises.</h2>
          </div>

          {/* Monthly Subscription Plan */}
          <Card className="bg-white border-2 border-blue-200 shadow-xl">
            <CardContent className="p-10">
              <div className="text-center mb-8">
                <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-4xl font-bold text-blue-900 mb-3">$49/month</h3>
                <p className="text-blue-700 text-xl">Complete legal support for Australian tradespeople</p>
              </div>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Unlimited case creation & management</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">AI-powered legal analysis & strategy development</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Custom PDF document generation based on RESOLVE template</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Timeline tracking & deadline management</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Secure document & photo storage</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Calendar integration (Gmail/Outlook)</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">Email logging & communication tracking</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-neutral-dark font-medium">AI message assistant for ongoing support</span>
                </li>
              </ul>

              <Button 
                className="w-full btn-primary text-xl py-4"
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginModal(true);
                    setIsSignUpMode(true);
                  } else {
                    window.location.href = '/checkout';
                  }
                }}
              >
                Start Your Subscription
              </Button>
            </CardContent>
          </Card>
          
          <div className="text-center mt-8">
            <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
              <p className="text-sm text-gray-700">
                <strong>Bonus:</strong> First 20 users receive a private access code to unlock exclusive support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form Section */}
      <section id="application" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-6">Get Your Personalized Legal Strategy</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tell us about your situation and we'll create a customized action plan to get you paid. 
              Takes just 2 minutes to complete.
            </p>
          </div>
          
          <ApplicationForm />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-neutral-dark mb-6">Ready to take control? Apply now.</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-gray-700">No lawyer required</span>
            </div>
            <div className="flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-gray-700">No legal jargon</span>
            </div>
            <div className="flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600 mr-2" />
              <span className="text-gray-700">No more being ignored or underpaid</span>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className="btn-accent text-lg px-8 py-4"
            onClick={() => {
              if (!isAuthenticated) {
                setShowLoginModal(true);
                setIsSignUpMode(true);
              } else {
                window.location.href = '/checkout';
              }
            }}
          >
            Start Your Subscription
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center mb-4">
                <Plus className="h-8 w-8 text-primary mr-3" />
                <span className="text-xl font-bold">Project Resolve AI</span>
              </div>
              <p className="text-gray-300 mb-4">
                AI-powered legal support platform designed specifically for Australian tradespeople. 
                Get paid what you're owed without the legal fees.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="#how-it-works" className="text-gray-300 hover:text-white">How It Works</a></li>
                <li><a href="#pricing" className="text-gray-300 hover:text-white">Pricing</a></li>
                <li><a href="/api/login" className="text-gray-300 hover:text-white">Login</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><span className="text-gray-300">Privacy Policy</span></li>
                <li><a href="/terms-of-service" className="text-gray-300 hover:text-white">Terms of Service</a></li>
                <li><span className="text-gray-300">Disclaimer</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Project Resolve AI. This platform provides information services, not legal advice. 
              Always consult with qualified legal professionals for complex matters.
            </p>
            <div className="mt-4">
              <a 
                href="/admin-login" 
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Admin Access
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        initialMode={isSignUpMode ? 'signup' : 'login'}
      />
    </div>
  );
}