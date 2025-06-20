import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Check, Clock, Users, DollarSign, FileText, Calendar, Download, ChevronRight, X, Brain, Lock, Mail, Search, Star, Plus, LogOut } from 'lucide-react';
import ApplicationForm from '@/components/application-form';
import LoginModal from '@/components/login-modal';
import { scrollToElement } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { authHelpers } from '@/lib/supabase';
import AdminLogin from './admin-login'

export default function Landing() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin]=useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await authHelpers.signOut();
      if (error) throw error;
      
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
                  <Button variant="outline" onClick={setShowAdminLogin(true)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="relative">
            <button onClick={() => setShowAdminLogin(false)} className="absolute top-2 right-2 text-gray-500 text-2xl" aria-label='Close admin login'>
              x
            </button>
            <AdminLogin />
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

      {/* Application Form */}
      <ApplicationForm />

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Simple. Fast. Legally backed.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Apply for help</h3>
              <p className="text-neutral-medium text-sm">Briefly describe your issue. We'll assess if we can help.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Get your custom plan</h3>
              <p className="text-neutral-medium text-sm">Pay $299 to receive your full case PDF, documents, next steps, and portal login.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Start resolving your issue</h3>
              <p className="text-neutral-medium text-sm">Use the step-by-step timeline, contract templates, and guidance to take action and move on.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">4</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Stay protected with ongoing support</h3>
              <p className="text-neutral-medium text-sm">Subscribe for just $49/month to access unlimited case creation, contract generation, document storage, deadline tracking, and expert support — so you're always ready, no matter what comes up.</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Straightforward pricing. No surprises.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* One-time Strategy Pack */}
            <Card className="bg-white border-2 border-transparent">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h3 className="text-xl font-bold text-neutral-dark mb-2">$299 one-time</h3>
                  <p className="text-neutral-medium">Case Plan, PDF, Letters + Portal Access</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-neutral-dark">AI-powered case analysis</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-neutral-dark">Custom strategy plan with documents</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-neutral-dark">Step-by-step action timeline</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-neutral-dark">Portal access for 12 months</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <span className="text-neutral-dark">Document storage & management</span>
                  </li>
                </ul>

                <Button 
                  className="w-full btn-primary"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                      setIsSignUpMode(false);
                    } else {
                      scrollToElement('application');
                    }
                  }}
                >
                  Start Here - Apply Now
                </Button>
              </CardContent>
            </Card>

            {/* Ongoing Support */}
            <Card className="gradient-accent text-white border-2 border-accent relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-white text-accent px-4 py-1 rounded-full text-sm font-medium">After Initial Payment</span>
              </div>

              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-8 w-8 mr-1" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">$49/month</h3>
                  <p className="text-orange-100">Unlimited case files, contracts, storage & support</p>
                  <div className="bg-orange-200 text-orange-800 px-3 py-2 rounded text-sm mt-2">
                    Requires $299 initial sign-up fee first
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>Everything in Strategy Pack, plus:</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>Monthly strategy reviews</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>New document generation</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>Email support (48hr response)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>Additional case support</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 mr-3" />
                    <span>Contract generation tools</span>
                  </li>
                </ul>

                <Button 
                  className="w-full bg-white text-accent hover:bg-gray-100"
                  onClick={() => {
                    alert("First complete the $299 Strategy Pack application above, then you can upgrade to monthly billing.");
                    scrollToElement('application');
                  }}
                >
                  Upgrade After Initial Payment
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <div className="bg-white p-4 rounded-lg shadow-sm inline-block">
              <p className="text-sm text-gray-700">
                <strong>Bonus:</strong> First 20 users receive a private access code to unlock exclusive support.
              </p>
            </div>
          </div>
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
                setIsSignUpMode(false);
              } else {
                scrollToElement('application');
              }
            }}
          >
            Apply for Help Now
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