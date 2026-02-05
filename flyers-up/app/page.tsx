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
              href="/signup?role=customer"
              className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface2 text-text rounded-lg transition-colors border border-border"
            >
              Request a Service (Free)
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text mb-6 leading-tight">
            Hire local service pros without getting ripped off, ghosted, or disappointed.
          </h1>
          <p className="text-xl text-muted mb-8 max-w-2xl mx-auto">
            Verified profiles, clear expectations, and platform accountability—before they step into your home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-[hsl(var(--accent-customer))] hover:opacity-95 text-text text-lg font-semibold rounded-xl shadow-card transition-all focus-ring"
            >
              Request a Service (Free)
            </Link>
            <a
              href="#pros"
              className="px-2 py-4 text-text text-lg font-semibold underline underline-offset-4 decoration-border hover:decoration-text transition-colors"
            >
              I’m a Service Pro
            </a>
          </div>
        </div>
      </section>

      {/* Risk Kill Zone */}
      <section className="py-12 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.65)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">
                Why Flyers Up feels safer than random referrals
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              "See real profiles, work history, and reviews—not anonymous listings.",
              "Know the job details and price expectations before you agree.",
              "Accountability is built in—so disputes don’t become personal.",
            ].map((text) => (
              <div
                key={text}
                className="bg-surface rounded-xl p-6 border border-border shadow-card"
              >
                <p className="text-text font-semibold">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="py-20 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.65)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">The difference is accountability</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-card">
              <h3 className="text-xl font-semibold text-text mb-4">Before Flyers Up</h3>
              <ul className="space-y-3 text-muted">
                <li className="flex gap-3">
                  <span className="text-muted/70">•</span>
                  <span>Texting strangers and hoping they show up</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-muted/70">•</span>
                  <span>No-shows and price surprises</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-muted/70">•</span>
                  <span>Awkward disputes with no paper trail</span>
                </li>
              </ul>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-border shadow-card">
              <h3 className="text-xl font-semibold text-text mb-4">After Flyers Up</h3>
              <ul className="space-y-3 text-muted">
                <li className="flex gap-3">
                  <span className="text-[hsl(var(--accent-customer))]">•</span>
                  <span>Clear requests and documented expectations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[hsl(var(--accent-customer))]">•</span>
                  <span>Messaging + scheduling in one place</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[hsl(var(--accent-customer))]">•</span>
                  <span>Platform accountability and a clean record</span>
                </li>
              </ul>
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
              <h2 className="text-3xl sm:text-4xl font-bold text-text">How it works</h2>
            </div>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              A fast flow built for clarity before anyone agrees to a job.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: '📝', title: '1. Request', desc: 'Describe the job and what “done” means.' },
              { icon: '🤝', title: '2. Match', desc: 'Review pros based on fit and history.' },
              { icon: '💬', title: '3. Message', desc: 'Confirm details in writing, in one place.' },
              { icon: '📅', title: '4. Schedule', desc: 'Lock in timing and expectations.' },
            ].map((step) => (
              <div key={step.title} className="text-center p-6">
                <div className="w-16 h-16 bg-[hsl(var(--accent-customer)/0.10)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-text mb-2">{step.title}</h3>
                <p className="text-muted">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/signup?role=customer"
              className="inline-flex items-center justify-center px-8 py-4 bg-[hsl(var(--accent-customer))] hover:opacity-95 text-text text-lg font-semibold rounded-xl shadow-card transition-all focus-ring"
            >
              Request a Service (Free)
            </Link>
          </div>
        </div>
      </section>

      {/* Proof (no fabricated testimonials) */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl p-8 sm:p-12 text-center bg-[hsl(var(--accent-customer)/0.06)] border border-border shadow-card">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-customer)/0.75)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">
                Built for real-world service problems
              </h2>
            </div>
            <p className="text-muted text-lg mb-8 max-w-2xl mx-auto">
              No hype. Just the stuff that reduces no-shows, miscommunication, and “he said / she said”.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text mb-8">
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Designed to reduce no-shows and miscommunication
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Optimized for clarity before anyone agrees to a job
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[hsl(var(--accent-customer))]">✓</span>
                Focused on accountability, not hype
              </div>
            </div>
            <Link
              href="/trust-verification"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 bg-surface hover:bg-surface2 text-text font-semibold border border-border transition-colors"
            >
              Read what “verification” means →
            </Link>
          </div>
        </div>
      </section>

      {/* For Pros Section */}
      <section id="pros" className="py-20 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[hsl(var(--accent-pro)/0.10)] text-text px-3 py-1 rounded-full text-sm font-medium mb-4 border border-border">
                For Service Professionals
              </div>
              <div className="inline-flex items-center gap-3 mb-3">
                <span className="h-6 w-[3px] rounded-full bg-[hsl(var(--accent-pro)/0.75)]" aria-hidden />
                <h2 className="text-3xl sm:text-4xl font-bold text-text">Are you a service professional?</h2>
              </div>
              <p className="text-muted text-lg mb-6">
                Bring your skills—not a marketing budget. Get clearer requests and repeat customers.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  Clearer requests and fewer time-wasters
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  Everything documented in one thread
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  A clean record of work, reviews, and disputes
                </li>
                <li className="flex items-center gap-3 text-text">
                  <span className="w-6 h-6 bg-[hsl(var(--accent-pro)/0.12)] rounded-full flex items-center justify-center text-[hsl(var(--accent-pro))] text-sm border border-border">✓</span>
                  No hype—just a better workflow
                </li>
              </ul>
            <Link 
              href="/signup?role=pro" 
              className="inline-flex px-6 py-3 bg-transparent hover:bg-[hsl(var(--accent-pro)/0.10)] text-text font-semibold rounded-xl transition-colors border-2 border-[hsl(var(--accent-pro))] focus-ring"
            >
              Join as a Pro
            </Link>
            </div>
            <div className="rounded-3xl p-8 bg-surface border border-border shadow-card">
              <div className="text-center">
                <div className="text-2xl font-bold mb-2 text-text">More clarity. Less chaos.</div>
                <div className="text-muted mb-6">
                  Flyers Up is built to reduce miscommunication and help great pros stand out with a clean record.
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm text-left">
                  {[
                    'Requests are structured—so you know what you’re walking into.',
                    'Messaging, expectations, and scheduling stay in one place.',
                    'Disputes are handled through the platform—not personal drama.',
                  ].map((t) => (
                    <div key={t} className="bg-surface2 rounded-xl p-4 border border-border">
                      {t}
                    </div>
                  ))}
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
            Ready to request a service without the stress?
          </h2>
          <p className="text-muted text-lg mb-8">
            Clear expectations up front. A cleaner record after.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup?role=customer" 
              className="px-8 py-4 bg-accent hover:opacity-95 text-accentContrast text-lg font-semibold rounded-xl shadow-md transition-all"
            >
              Request a Service (Free)
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
                Hire local pros with clearer expectations.
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
