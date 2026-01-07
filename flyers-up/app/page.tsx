'use client';

/**
 * Landing Page - Flyers Up Home
 * Explains what Flyers Up is and provides CTAs to sign in/up
 */

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      {/* Header */}
      <header className="px-4 py-4 bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-emerald-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" linkToHome={false} />
          <div className="flex items-center gap-3">
            <Link 
              href="/signin" 
              className="px-4 py-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Now serving your local area
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Find Trusted Local Pros<br />
            <span className="text-emerald-600">For Any Home Service</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Book background-checked professionals for cleaning, plumbing, lawn care, and more. 
            Get instant quotes and real-time job tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-300"
            >
              Book a Service
            </Link>
            <Link 
              href="/signup?role=pro" 
              className="px-8 py-4 bg-white hover:bg-gray-50 text-emerald-700 text-lg font-semibold rounded-xl border-2 border-emerald-200 transition-all"
            >
              Join as a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-emerald-600">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">500+</div>
              <div className="text-emerald-200 text-sm">Verified Pros</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">4.9</div>
              <div className="text-emerald-200 text-sm">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">10K+</div>
              <div className="text-emerald-200 text-sm">Jobs Completed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">24/7</div>
              <div className="text-emerald-200 text-sm">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How Flyers Up Works
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Getting help with your home services has never been easier
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Browse Pros</h3>
              <p className="text-gray-600">
                Search by service type, read reviews, and compare prices from verified professionals in your area.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Book Online</h3>
              <p className="text-gray-600">
                Select your preferred date and time, add service details, and get instant confirmation.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Get It Done</h3>
              <p className="text-gray-600">
                Your pro arrives on time, completes the job, and you pay securely through the app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Services We Offer
            </h2>
            <p className="text-gray-600 text-lg">
              From routine maintenance to emergency repairs
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🧹', name: 'Cleaning', desc: 'Home & Office' },
              { icon: '🔧', name: 'Plumbing', desc: 'Repairs & Install' },
              { icon: '🌿', name: 'Lawn Care', desc: 'Mowing & Design' },
              { icon: '🔨', name: 'Handyman', desc: 'General Repairs' },
              { icon: '⚡', name: 'Electrical', desc: 'Safe & Licensed' },
              { icon: '💈', name: 'Barber', desc: 'Mobile Service' },
              { icon: '📦', name: 'Moving', desc: 'Local & Long' },
              { icon: '🎨', name: 'Painting', desc: 'Interior & Ext' },
            ].map((service) => (
              <div 
                key={service.name}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="text-4xl mb-3">{service.icon}</div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-500">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-emerald-600 rounded-3xl p-8 sm:p-12 text-white text-center">
            <div className="text-5xl mb-6">🛡️</div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              The Flyers Up Guarantee
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
              Every pro on Flyers Up is background-checked and verified. 
              If you&apos;re not satisfied, we&apos;ll make it right or refund your money.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                Background Checked
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                Licensed & Insured
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                Money Back Guarantee
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-300">✓</span>
                24/7 Support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Pros Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
                For Service Professionals
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Grow Your Business with Flyers Up
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                Join thousands of pros who use Flyers Up to find new customers, 
                manage bookings, and get paid faster.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm">✓</span>
                  Set your own rates and schedule
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm">✓</span>
                  Get paid same-day or next-day
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm">✓</span>
                  Built-in customer reviews & ratings
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm">✓</span>
                  No monthly fees - only pay when you earn
                </li>
              </ul>
            <Link 
              href="/signup?role=pro" 
              className="inline-flex px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
            >
              Start Earning Today
            </Link>
            </div>
            <div className="bg-emerald-600 rounded-3xl p-8 text-white">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">$1,200</div>
                <div className="text-emerald-200 mb-6">Average weekly earnings</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-emerald-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">95%</div>
                    <div className="text-emerald-200">Pro satisfaction</div>
                  </div>
                  <div className="bg-emerald-500/30 rounded-xl p-4">
                    <div className="text-2xl font-bold">48h</div>
                    <div className="text-emerald-200">Avg. first booking</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Join thousands of happy customers and pros on Flyers Up
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-xl shadow-lg shadow-emerald-200 transition-all"
            >
              Book a Service
            </Link>
            <Link 
              href="/signup?role=pro" 
              className="px-8 py-4 bg-white hover:bg-gray-50 text-emerald-700 text-lg font-semibold rounded-xl border-2 border-emerald-200 transition-all"
            >
              Become a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo size="sm" linkToHome={false} className="brightness-0 invert mb-4" />
              <p className="text-sm">
                Book trusted local pros for any home service.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">For Customers</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Browse Services</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Safety</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">For Pros</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Join as Pro</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pro Resources</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pro Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2024 Flyers Up. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
