import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Plus className="h-8 w-8 text-primary mr-3" />
                <span className="text-xl font-bold text-neutral-dark">Project Resolve AI</span>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/">Home</Link>
              </Button>
              <Button asChild>
                <Link href="/api/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Terms Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Project Resolve AI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-700 mb-4">
                Project Resolve AI provides AI-powered legal support and document generation services specifically designed for Australian tradespeople. Our platform offers:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Case analysis and strategy development</li>
                <li>Legal document generation and templates</li>
                <li>Timeline management and deadline tracking</li>
                <li>Payment dispute resolution guidance</li>
                <li>Contract management tools</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>Important:</strong> Project Resolve AI provides information services and AI-generated content. This is not legal advice and should not be considered as such.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Payment Terms</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Initial Strategy Pack Fee</h3>
              <p className="text-gray-700 mb-4">
                Access to the platform requires a one-time payment of $299 AUD for your initial strategy pack. This fee includes:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>AI-powered case analysis</li>
                <li>Custom strategy development</li>
                <li>Legal document generation</li>
                <li>Timeline and action plan</li>
                <li>Initial case setup and consultation</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Monthly Subscription</h3>
              <p className="text-gray-700 mb-4">
                After your initial strategy pack, you may subscribe to our monthly service for $49 AUD per month, which includes:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Unlimited case creation and management</li>
                <li>Ongoing AI support and updates</li>
                <li>Additional document generation</li>
                <li>Platform feature access and updates</li>
              </ul>
              
              <p className="text-gray-700 mb-4">
                All payments are processed securely through Stripe. Subscriptions can be cancelled at any time through your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Responsibilities</h2>
              <p className="text-gray-700 mb-4">You agree to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Provide accurate and truthful information</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not share your account credentials with others</li>
                <li>Comply with all applicable Australian laws and regulations</li>
                <li>Seek professional legal advice for complex matters</li>
                <li>Not use the service to harass, abuse, or harm others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Limitations and Disclaimers</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Not Legal Advice</h3>
                <p className="text-yellow-700">
                  Project Resolve AI provides information services and AI-generated content only. The information provided is not legal advice and should not be relied upon as such. Always consult with qualified legal professionals for specific legal matters.
                </p>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Service Availability</h3>
              <p className="text-gray-700 mb-4">
                While we strive to maintain 99.9% uptime, we cannot guarantee uninterrupted service availability. We reserve the right to perform maintenance and updates as necessary.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Generated Content</h3>
              <p className="text-gray-700 mb-4">
                Our AI system generates content based on patterns and training data. While we strive for accuracy, AI-generated content may contain errors or may not be suitable for all situations. Users should review and verify all generated content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                We are committed to protecting your privacy and personal information. Our data practices include:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Secure encryption of all personal and case data</li>
                <li>Limited data collection for service provision only</li>
                <li>No sharing of personal information with third parties without consent</li>
                <li>Compliance with Australian Privacy Principles</li>
                <li>Right to access, correct, or delete your personal information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Refund Policy</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Initial Strategy Pack</h3>
              <p className="text-gray-700 mb-4">
                Due to the personalized nature of our AI-generated strategy packs, refunds are generally not available once your strategy pack has been delivered. However, we may consider refunds on a case-by-case basis within 7 days of payment if:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>There was a technical error preventing strategy pack delivery</li>
                <li>The service was not delivered as described</li>
                <li>You experienced technical issues preventing platform access</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Monthly Subscriptions</h3>
              <p className="text-gray-700 mb-4">
                Monthly subscriptions can be cancelled at any time. No refunds are provided for partial months, but you will retain access until the end of your current billing period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Project Resolve AI platform, including its design, functionality, and AI algorithms, is protected by intellectual property laws. You may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Copy, reproduce, or distribute our platform or content</li>
                <li>Reverse engineer or attempt to extract our AI algorithms</li>
                <li>Use our branding, logos, or trademarks without permission</li>
                <li>Create derivative works based on our platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to terminate or suspend your account at any time for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Violation of these terms of service</li>
                <li>Fraudulent or illegal activity</li>
                <li>Misuse of the platform or services</li>
                <li>Non-payment of fees</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You may terminate your account at any time by contacting our support team or through your account settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by Australian law, Project Resolve AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.
              </p>
              <p className="text-gray-700 mb-4">
                Our total liability to you for any claims arising from or related to the service shall not exceed the amount you have paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These terms shall be governed by and construed in accordance with the laws of Australia. Any disputes arising from these terms or your use of the service shall be subject to the exclusive jurisdiction of Australian courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or platform notification. Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700"><strong>Project Resolve AI Support</strong></p>
                <p className="text-gray-700">Email: support@projectresolve.ai</p>
                <p className="text-gray-700">Phone: 1300 RESOLVE (1300 737 658)</p>
                <p className="text-gray-700">Website: www.projectresolve.ai</p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-dark text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-bold">Project Resolve AI</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2024 Project Resolve AI. This platform provides information services, not legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}