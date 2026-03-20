'use client';

/**
 * Landing Page - Flyers Up Home
 * Featured occupations + CTAs
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { HeaderBrand } from '@/components/HeaderBrand';
import { OccupationGrid } from '@/components/occupations/OccupationGrid';

type Occupation = { id: string; name: string; slug: string; icon: string | null; featured: boolean };

export default function HomePage() {
  const [featuredOccupations, setFeaturedOccupations] = useState<Occupation[]>([]);

  useEffect(() => {
    fetch('/api/occupations?featured=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setFeaturedOccupations(data.occupations ?? []))
      .catch(() => {});
  }, []);
  return (
    <div className="min-h-screen bg-[#F7F5F0]" style={{ '--accent-customer': '111 91% 82%' } as React.CSSProperties}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between h-16 md:h-[72px] px-6 md:px-6 border-b border-[rgba(0,0,0,0.04)] transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'rgba(247, 245, 240, 0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        }}
      >
        <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between px-6">
          <HeaderBrand />
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:text-[hsl(var(--accent-customer))] transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/signup?role=customer"
              className="btn-press px-4 py-2 text-sm font-medium bg-[hsl(var(--accent-customer))] hover:brightness-95 text-[hsl(var(--accent-contrast))] rounded-lg transition-all duration-200 border border-[hsl(var(--accent-customer)/0.7)] shadow-[var(--shadow-1)]"
            >
              Book a Pro
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - radial gradient + dynamic feel */}
      <section
        className="relative py-24 px-4 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(156, 167, 100, 0.12), transparent 60%),
            radial-gradient(ellipse 60% 40% at 90% 30%, rgba(229, 156, 92, 0.08), transparent 50%),
            radial-gradient(ellipse 50% 30% at 10% 60%, rgba(156, 167, 100, 0.06), transparent 45%),
            #F7F5F0
          `,
        }}
      >
        <div className="max-w-6xl mx-auto text-center relative">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-text mb-6 leading-tight tracking-tight">
            Book a trusted pro in under 2 minutes.
          </h1>
          <p className="text-xl text-muted mb-4 max-w-2xl mx-auto">
            Most NYC requests accepted in under 10 minutes.
          </p>
          <p className="text-lg text-muted mb-8 max-w-xl mx-auto">
            Verified local pros in your zip.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <span className="text-sm text-text/90 rounded-full px-4 py-2 bg-white/80 border border-[rgba(156,167,100,0.3)] shadow-sm">
              12 pros available in your zip
            </span>
            <span className="text-sm text-text/90 rounded-full px-4 py-2 bg-white/80 border border-[rgba(156,167,100,0.3)] shadow-sm">
              Next job starts in 18 minutes
            </span>
            <span className="text-sm text-text/90 rounded-full px-4 py-2 bg-white/80 border border-[rgba(156,167,100,0.3)] shadow-sm">
              Avg job booked today: $142
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link
              href="/signup?role=customer"
              className="btn-press px-8 py-4 bg-[hsl(var(--accent-customer))] hover:brightness-95 text-[hsl(var(--accent-contrast))] text-lg font-medium rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] border border-[hsl(var(--accent-customer)/0.7)] transition-all duration-200 focus-ring"
            >
              Book a Pro (Free)
            </Link>
            <Link
              href="#pros"
              className="btn-press px-8 py-4 bg-[hsl(var(--accent-pro))] hover:brightness-95 text-[hsl(var(--accent-contrast))] text-lg font-medium rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] border border-[hsl(var(--accent-pro)/0.7)] transition-all duration-200 focus-ring"
            >
              I'm a Service Pro
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
            <Link href="/occupations" className="text-muted hover:text-[hsl(var(--accent-customer))] transition-colors duration-200">
              See pros near you
            </Link>
            <Link href="/#how-it-works" className="text-muted hover:text-[hsl(var(--accent-customer))] transition-colors duration-200">
              How pricing works
            </Link>
            <Link href="/trust-verification" className="text-muted hover:text-[hsl(var(--accent-customer))] transition-colors duration-200">
              Trust & verification
            </Link>
          </div>
        </div>
      </section>

      {/* Live Activity Strip */}
      <section className="py-4 px-4 bg-white/60 border-y border-[rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-text/80">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-customer))] animate-pulse" />
              3 jobs booked in last 10 minutes
            </span>
            <span className="flex items-center gap-2 text-text/80">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-customer))]" />
              8 pros just came online
            </span>
            <span className="flex items-center gap-2 text-text/80">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-customer))]" />
              2 urgent requests nearby
            </span>
          </div>
        </div>
      </section>

      {/* Browse Occupations */}
      <section className="py-16 px-4 bg-[#F5F0E8]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-6 text-center">
            Browse Occupations
          </h2>
          <OccupationGrid occupations={featuredOccupations} variant="featured" />
          <div className="mt-8 text-center">
            <Link
              href="/occupations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-black/5 text-zinc-900 font-medium shadow-[0_10px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all"
            >
              More Occupations →
            </Link>
          </div>
        </div>
      </section>

      {/* Risk Kill Zone */}
      <section className="py-12 bg-[#F0EBE3] border-y border-[var(--hairline)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[2px] rounded-full bg-[hsl(var(--accent-customer)/0.4)]" aria-hidden />
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
                className="card-hover bg-surface rounded-[var(--radius-lg)] p-6 border border-[var(--hairline)] shadow-card transition-all duration-200"
              >
                <p className="text-text font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="py-24 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[2px] rounded-full bg-[hsl(var(--accent-customer)/0.4)]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-text">The difference is accountability</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-hover bg-surface rounded-[var(--radius-xl)] p-6 border border-[var(--hairline)] shadow-card transition-all duration-200">
              <h3 className="text-xl font-medium text-text mb-4">Before Flyers Up</h3>
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

            <div className="card-hover bg-surface rounded-[var(--radius-xl)] p-6 border border-[var(--hairline)] shadow-card transition-all duration-200">
              <h3 className="text-xl font-medium text-text mb-4">After Flyers Up</h3>
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
      <section id="how-it-works" className="py-24 px-4 bg-[#F7F5F0]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-[2px] rounded-full bg-[hsl(var(--accent-customer)/0.4)]" aria-hidden />
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
              <div key={step.title} className="card-hover text-center p-6 rounded-xl transition-all duration-200">
                <div className="w-16 h-16 bg-surface2 rounded-[var(--radius-xl)] flex items-center justify-center mx-auto mb-4 border border-[var(--hairline)]">
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
              className="btn-press inline-flex items-center justify-center px-8 py-4 bg-[hsl(var(--accent-customer))] hover:brightness-95 text-[hsl(var(--accent-contrast))] text-lg font-medium rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] border border-[hsl(var(--accent-customer)/0.7)] transition-all duration-200 focus-ring"
            >
              Request a Service (Free)
            </Link>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="py-24 px-4 bg-[#F5F0E8]">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-[var(--radius-2xl)] p-8 sm:p-12 text-center bg-surface border border-[var(--hairline)] shadow-card">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="h-6 w-[2px] rounded-full bg-[hsl(var(--accent-customer)/0.4)]" aria-hidden />
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
              className="btn-press inline-flex items-center justify-center rounded-[var(--radius-lg)] px-6 py-3 bg-surface hover:bg-surface2 text-text font-medium border border-[var(--hairline)] transition-all duration-200"
            >
              Read what “verification” means →
            </Link>
          </div>
        </div>
      </section>

      {/* For Pros Section - sell the opportunity */}
      <section id="pros" className="py-20 px-4 bg-surface2">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-surface2 text-text px-3 py-1 rounded-full text-sm font-medium mb-4 border border-[var(--hairline)]">
                For Service Professionals
              </div>
              <div className="inline-flex items-center gap-3 mb-3">
                <span className="h-6 w-[2px] rounded-full bg-[hsl(var(--accent-pro)/0.4)]" aria-hidden />
                <h2 className="text-3xl sm:text-4xl font-bold text-text">Earn more. No monthly fee.</h2>
              </div>
              <p className="text-muted text-lg mb-4">
                NYC pros in top categories earn $800–$1,400/week.
              </p>
              <p className="text-muted mb-6">
                Only pay when you get paid. No monthly subscription.
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
              className="btn-press inline-flex px-6 py-3 bg-transparent hover:bg-[hsl(var(--accent-pro)/0.10)] text-text font-semibold rounded-xl transition-all duration-200 border-2 border-[hsl(var(--accent-pro))] focus-ring"
            >
              Join as a Pro
            </Link>
            </div>
            <div className="rounded-[var(--radius-2xl)] p-8 bg-surface border border-[var(--hairline)] shadow-card">
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
                    <div key={t} className="bg-surface2 rounded-[var(--radius-lg)] p-4 border border-[var(--hairline)]">
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
      <section className="py-24 px-4 bg-[#F7F5F0]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-text mb-4">
            Ready to request a service without the stress?
          </h2>
          <p className="text-muted text-lg mb-8">
            Clear expectations up front. A cleaner record after.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?role=customer"
              className="btn-press px-8 py-4 bg-[hsl(var(--accent-customer))] hover:brightness-95 text-[hsl(var(--accent-contrast))] text-lg font-medium rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] border border-[hsl(var(--accent-customer)/0.7)] transition-all duration-200 focus-ring"
            >
              Request a Service (Free)
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface2 text-muted py-16 border-t border-[var(--hairline)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo size="sm" linkToHome={false} className="mb-4" />
              <p className="text-sm">
                Hire local pros with clearer expectations.
              </p>
            </div>
            <div>
              <h4 className="text-text font-medium mb-3">For Customers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#how-it-works" className="hover:text-text transition-colors duration-200">How It Works</Link></li>
                <li><Link href="/occupations" className="hover:text-text transition-colors duration-200">Browse Services</Link></li>
                <li><Link href="/trust-verification" className="hover:text-text transition-colors duration-200">Safety</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-medium mb-3">For Pros</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup?role=pro" className="hover:text-text transition-colors duration-200">Join as Pro</Link></li>
                <li><Link href="/legal/independent-contractor" className="hover:text-text transition-colors duration-200">Pro Resources</Link></li>
                <li><Link href="/signin?role=pro" className="hover:text-text transition-colors duration-200">Pro Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-text font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/community-guidelines" className="hover:text-text transition-colors duration-200">About Us</Link></li>
                <li><Link href="/signin" className="hover:text-text transition-colors duration-200">Contact</Link></li>
                <li><Link href="/#pros" className="hover:text-text transition-colors duration-200">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2024 Flyers Up. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="hover:text-text transition-colors duration-200">Privacy</Link>
              <Link href="/terms" className="hover:text-text transition-colors duration-200">Terms</Link>
              <Link href="/privacy#cookies" className="hover:text-text transition-colors duration-200">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
