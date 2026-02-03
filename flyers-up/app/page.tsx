'use client';

/**
 * Landing Page - Flyers Up Home
 * Explains what Flyers Up is and provides CTAs to sign in/up
 */

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg">
      {/* Header */}
      <header className="px-4 py-4 bg-surface/80 backdrop-blur-sm sticky top-0 z-50 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo size="md" linkToHome={false} />
          <div className="flex items-center gap-3">
            <Link 
              href="/signin" 
              className="px-4 py-2 text-sm font-medium text-text hover:text-accent transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface2 text-text rounded-lg transition-colors border border-border"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-surface2 text-text px-4 py-2 rounded-full text-sm font-medium mb-6 border border-border">
            <span className="w-2 h-2 bg-[hsl(var(--accent-customer))] rounded-full animate-pulse"></span>
            Now serving your local area
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text mb-6 leading-tight">
            Find Trusted Local Pros<br />
            <span className="text-[hsl(var(--accent-customer))]">For Any Home Service</span>
          </h1>
          <p className="text-xl text-muted mb-8 max-w-2xl mx-auto">
            Book background-checked professionals for cleaning, plumbing, lawn care, and more. 
            Get instant quotes and real-time job tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-[hsl(var(--accent-customer))] hover:opacity-95 text-text text-lg font-semibold rounded-xl shadow-card transition-all focus-ring"
            >
              Book a Service
            </Link>
            <Link 
              href="/signup?role=pro" 
              className="px-8 py-4 bg-transparent text-text text-lg font-semibold rounded-xl border-2 border-[hsl(var(--accent-pro))] transition-colors hover:bg-[hsl(var(--accent-pro)/0.10)] focus-ring"
            >
              Join as a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-text">
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1 text-[hsl(var(--accent-customer))]">500+</div>
              <div className="text-sm text-muted/70">Verified Pros</div>
              <div className="mx-auto mt-2 h-[2px] w-10 bg-[hsl(var(--accent-customer)/0.35)] rounded-full" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">4.9</div>
              <div className="text-sm text-muted/70">Average Rating</div>
              <div className="mx-auto mt-2 h-[2px] w-10 bg-[hsl(var(--border))] rounded-full" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">10K+</div>
              <div className="text-sm text-muted/70">Jobs Completed</div>
              <div className="mx-auto mt-2 h-[2px] w-10 bg-[hsl(var(--border))] rounded-full" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">24/7</div>
              <div className="text-sm text-muted/70">Support</div>
              <div className="mx-auto mt-2 h-[2px] w-10 bg-[hsl(var(--border))] rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.65)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">How Flyers Up Works</h2>
            </div>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Getting help with your home services has never been easier
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[hsl(var(--accent-customer)/0.10)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">1. Browse Pros</h3>
              <p className="text-muted">
                Search by service type, read reviews, and compare prices from verified professionals in your area.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[hsl(var(--accent-customer)/0.10)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">2. Book Online</h3>
              <p className="text-muted">
                Select your preferred date and time, add service details, and get instant confirmation.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-[hsl(var(--accent-customer)/0.10)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-text mb-2">3. Get It Done</h3>
              <p className="text-muted">
                Coordinate details in Messages and complete the job. Payment can be handled later (request-only launch).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.65)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">Services We Offer</h2>
            </div>
            <p className="text-muted text-lg">
              From routine maintenance to emergency repairs
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🧹', name: 'Cleaning', desc: 'Home & Office' },
              { icon: '🔧', name: 'Plumbing', desc: 'Repairs & Install' },
              { icon: '🌿', name: 'Lawn Care', desc: 'Mowing & Design' },
              { icon: '🔨', name: 'Handyman', desc: 'General Repairs' },
              { icon: '⚡', name: 'Electrical', desc: 'Home & Business' },
              { icon: '💈', name: 'Barber', desc: 'Mobile Service' },
              { icon: '📦', name: 'Moving', desc: 'Local & Long' },
              { icon: '🎨', name: 'Painting', desc: 'Interior & Ext' },
            ].map((service) => (
              <div 
                key={service.name}
                className="bg-surface rounded-xl p-6 text-center hover:shadow-lg transition-shadow border border-border"
              >
                <div className="text-4xl mb-3">{service.icon}</div>
                <h3 className="font-semibold text-text">{service.name}</h3>
                <p className="text-sm text-muted/70">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 text-center bg-[hsl(var(--accent-customer)/0.06)] border border-border shadow-card">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.75)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">Trust &amp; Verification</h2>
            </div>
            <p className="text-muted text-lg mb-8 max-w-2xl mx-auto">
              Flyers Up shows profile details and, when available, verification indicators to help you choose who to book. These indicators aren’t a guarantee of performance or licensing.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text mb-8">
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Verification visible
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Clear next steps
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Support when needed
              </div>
            </div>
            <Link
              href="/trust-verification"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 bg-surface hover:bg-surface2 text-text font-semibold border border-border transition-colors"
            >
              Read the explainer →
            </Link>
          </div>
        </div>
      </section>

      {/* For Pros Section */}
      <section className="py-20 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[hsl(var(--accent-pro)/0.10)] text-text px-3 py-1 rounded-full text-sm font-medium mb-4 border border-border">
                For Service Professionals
              </div>
              <div className="inline-flex items-center gap-3 mb-3">
                <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-pro)/0.75)]" aria-hidden />
                <h2 className="text-3xl sm:text-4xl font-bold text-text">Grow Your Business with Flyers Up</h2>
              </div>
              <p className="text-muted text-lg mb-6">
                Join thousands of pros who use Flyers Up to find new customers, 
                manage bookings, and get paid faster.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  Set your own rates and schedule
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  Get paid same-day or next-day
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  Built-in customer reviews & ratings
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  No monthly fees - only pay when you earn
                </li>
              </ul>
            <Link 
              href="/signup?role=pro" 
              className="inline-flex px-6 py-3 bg-transparent hover:bg-[hsl(var(--accent-pro)/0.10)] text-text font-semibold rounded-xl transition-colors border-2 border-[hsl(var(--accent-pro))] focus-ring"
            >
              Start Earning Today
            </Link>
            </div>
            <div className="rounded-3xl p-8 bg-surface border border-border shadow-card">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2 text-text">$1,200</div>
                <div className="text-muted mb-3">Average weekly earnings</div>
                <div className="mx-auto mb-6 h-[2px] w-14 bg-[hsl(var(--accent-pro)/0.45)] rounded-full" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-surface2 rounded-xl p-4 border border-border">
                    <div className="text-2xl font-bold text-text">95%</div>
                    <div className="text-muted/70">Pro satisfaction</div>
                  </div>
                  <div className="bg-surface2 rounded-xl p-4 border border-border">
                    <div className="text-2xl font-bold text-text">48h</div>
                    <div className="text-muted/70">Avg. first booking</div>
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
          <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted text-lg mb-8">
            Join thousands of happy customers and pros on Flyers Up
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-accent hover:opacity-95 text-accentContrast text-lg font-semibold rounded-xl shadow-md transition-all"
            >
              Book a Service
            </Link>
            <Link 
              href="/signup?role=pro" 
              className="px-8 py-4 bg-surface hover:bg-surface2 text-text text-lg font-semibold rounded-xl border-2 border-border transition-colors"
            >
              Become a Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface2 text-muted py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo size="sm" linkToHome={false} className="mb-4" />
              <p className="text-sm">
                Book trusted local pros for any home service.
              </p>
            </div>
            <div>
              <h4 className="text-text font-semibold mb-3">For Customers</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-text transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Browse Services</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Safety</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold mb-3">For Pros</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-text transition-colors">Join as Pro</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Pro Resources</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Pro Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-text transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2024 Flyers Up. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-text transition-colors">Privacy</a>
              <a href="#" className="hover:text-text transition-colors">Terms</a>
              <a href="#" className="hover:text-text transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
