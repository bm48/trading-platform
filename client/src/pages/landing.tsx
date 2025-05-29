import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Check, Clock, Users, DollarSign, FileText, Calendar, Download, ChevronRight } from 'lucide-react';
import ApplicationForm from '@/components/application-form';
import { scrollToElement } from '@/lib/utils';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Shield className="h-8 w-8 text-primary mr-3" />
                <span className="text-xl font-bold text-neutral-dark">TradeGuard AI</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => scrollToElement('how-it-works')}>
                How It Works
              </Button>
              <Button variant="ghost" onClick={() => scrollToElement('pricing')}>
                Pricing
              </Button>
              <Button onClick={() => window.location.href = '/api/login'}>
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

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
                Get Paid What You're Owed with AI-Powered Legal Support
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Stop letting payment disputes drain your business. Our AI platform helps you resolve unpaid work, variations, and contract disputes with confidence — no lawyers required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="btn-accent text-lg px-8 py-4"
                  onClick={() => scrollToElement('application')}
                >
                  Get Started - $299
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4"
                  onClick={() => scrollToElement('how-it-works')}
                >
                  Learn More
                </Button>
              </div>
              <div className="flex items-center mt-6 text-blue-100">
                <Check className="h-5 w-5 mr-2" />
                <span className="text-sm">Australian legal framework • No legal fees • 24-48hr strategy pack</span>
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

      {/* Trust Indicators */}
      <section className="bg-white py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-neutral-medium">Cases Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">$2.1M</div>
              <div className="text-sm text-neutral-medium">Recovered for Trades</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">94%</div>
              <div className="text-sm text-neutral-medium">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">24-48hr</div>
              <div className="text-sm text-neutral-medium">Strategy Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <ApplicationForm />

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-neutral-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">How TradeGuard AI Works</h2>
            <p className="text-lg text-neutral-medium">Simple, fast, and effective — designed specifically for Australian tradespeople</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Apply for Help</h3>
              <p className="text-neutral-medium text-sm">Fill out our simple form with your trade, location, and issue details</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Get Approved</h3>
              <p className="text-neutral-medium text-sm">Receive case approval and welcome pack within 2 hours via email</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Complete & Pay</h3>
              <p className="text-neutral-medium text-sm">Upload documents and pay $299 to proceed with detailed analysis</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl font-bold">4</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Get Results</h3>
              <p className="text-neutral-medium text-sm">Receive custom strategy pack with documents and step-by-step action plan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-dark mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-neutral-medium">No hourly fees, no surprise costs — just results</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* One-time Strategy Pack */}
            <Card className="bg-neutral-light border-2 border-transparent">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-neutral-dark mb-2">Strategy Pack</h3>
                  <div className="text-4xl font-bold text-primary mb-2">$299</div>
                  <p className="text-neutral-medium">One-time payment</p>
                </div>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">AI-powered case analysis</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">Custom legal strategy plan</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">All required legal documents</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">Step-by-step action timeline</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">Portal access for 12 months</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-success mr-3" />
                    <span className="text-neutral-dark">Document storage & management</span>
                  </li>
                </ul>

                <Button 
                  className="w-full btn-primary"
                  onClick={() => scrollToElement('application')}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Ongoing Support */}
            <Card className="gradient-accent text-white border-2 border-accent relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-white text-accent px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>

              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Strategy Pack + Support</h3>
                  <div className="text-4xl font-bold mb-2">$299 + $49</div>
                  <p className="text-orange-100">One-time + monthly</p>
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
                  onClick={() => scrollToElement('application')}
                >
                  Get Full Support
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-neutral-medium">
              <Shield className="h-5 w-5 text-success inline mr-2" />
              Money-back guarantee if we can't help with your case
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-accent mr-2" />
                <span className="text-lg font-bold">TradeGuard AI</span>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                AI-powered legal support for Australian tradespeople. Get clarity, get paid, get back to work.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Success Stories</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Legal Resources</a></li>
                <li><a href="#" className="hover:text-white">System Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Disclaimer</a></li>
                <li><a href="#" className="hover:text-white">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © 2024 TradeGuard AI. All rights reserved. | ABN: 12 345 678 901
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This platform provides information and document generation services. It does not provide legal advice. Always consult with a qualified lawyer for legal advice specific to your situation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
