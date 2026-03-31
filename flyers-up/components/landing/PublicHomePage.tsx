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
import {
  HeroSplitIllustration,
  BeforeChaosIllustration,
  AfterClarityIllustration,
  DigitalPaperTrailIllustration,
} from '@/components/landing/illustrations';
import { RequestIcon, MatchIcon, MessageIcon, ScheduleIcon } from '@/components/Icons';

type Occupation = { id: string; name: string; slug: string; icon: string | null; featured: boolean };

export default function PublicHomePage() {
  const [featuredOccupations, setFeaturedOccupations] = useState<Occupation[]>([]);
  const [proClosedBanner, setProClosedBanner] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('fu_pro_account_closed')) {
        sessionStorage.removeItem('fu_pro_account_closed');
        setProClosedBanner(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch('/api/occupations?featured=true', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setFeaturedOccupations(data.occupations ?? []))
      .catch(() => {});
  }, []);
  return (
    <div className="min-h-screen bg-[#FAF6F0]" style={{ '--accent-customer': '111 91% 82%' } as React.CSSProperties}>
      {proClosedBanner ? (
        <div
          className="px-4 py-3 text-center text-sm text-[#2C2825] border-b border-[#2C2825]/15 bg-[#E8F4E8]"
          role="status"
        >
          Your account has been closed. You’ve been signed out.
          <button
            type="button"
            onClick={() => setProClosedBanner(false)}
            className="ml-3 underline text-[#2C2825]/80 hover:text-[#2C2825]"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between h-16 md:h-[72px] px-6 md:px-6 border-b border-[#2C2825]/10 transition-all duration-200 ease-out"
        style={{
          backgroundColor: 'rgba(250, 246, 240, 0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 0 rgba(44, 40, 37, 0.06)',
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

      {/* Hero — cream shell, apricot + sage story */}
      <section
        className="relative py-16 md:py-24 px-4 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 78% 52% at 50% -8%, rgba(255, 200, 168, 0.22), transparent 55%),
            radial-gradient(ellipse 50% 42% at 92% 28%, rgba(197, 222, 184, 0.2), transparent 48%),
            radial-gradient(ellipse 42% 34% at 6% 58%, rgba(240, 196, 168, 0.12), transparent 45%),
            #FAF6F0
          `,
        }}
      >
        <div className="max-w-6xl mx-auto text-center relative z-[1]">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#B85C38] mb-3">
            Accountability-first matching
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#2C2825] mb-5 leading-tight tracking-tight">
            Book a trusted pro in under 2 minutes.
          </h1>
          <p className="text-xl text-[#2C2825]/75 mb-3 max-w-2xl mx-auto">
            Most NYC requests accepted in under 10 minutes—with a handshake-clear match in the middle.
          </p>
          <p className="text-lg text-[#2C2825]/60 mb-8 max-w-xl mx-auto">
            Verified local pros in your zip.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <span className="text-sm text-[#2C2825] rounded-full px-4 py-2 bg-white/90 border border-[#2C2825]/12 shadow-sm">
              12 pros available in your zip
            </span>
            <span className="text-sm text-[#2C2825] rounded-full px-4 py-2 bg-white/90 border border-[#E4ECD9] shadow-sm">
              Next job starts in 18 minutes
            </span>
            <span className="text-sm text-[#2C2825] rounded-full px-4 py-2 bg-white/90 border border-[#F0D4C0] shadow-sm">
              Avg job booked today: $142
            </span>
          </div>

          <div className="landing-grain rounded-3xl border border-[#2C2825]/12 bg-[#FFF9F4]/95 shadow-[0_20px_50px_-12px_rgba(44,40,37,0.1)] px-4 py-6 md:px-8 md:py-10 mb-10 max-w-5xl mx-auto">
            <p className="text-sm text-[#2C2825]/65 mb-4 md:mb-6 font-medium">
              Customer → matched profiles → verified pro
            </p>
            <HeroSplitIllustration className="w-full h-auto max-h-[min(280px,42vw)] md:max-h-[320px] mx-auto select-none" />
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
      <section className="py-4 px-4 bg-[#FFF9F4]/90 border-y border-[#2C2825]/10">
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
      <section className="py-16 px-4 bg-[#F3EDE4]/90">
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

      {/* Accountability — digital paper trail */}
      <section className="py-16 md:py-20 bg-white border-y border-[#2C2825]/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5F7163] mb-2">
              Proof, not promises
            </p>
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-0.5 rounded-full bg-[#8FAD84]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2C2825]">
                A digital paper trail for every job
              </h2>
            </div>
            <p className="text-[#2C2825]/70 text-lg">
              See how a booking moves from agreed details to a protected payment—without the “he said / she said.”
            </p>
          </div>

          <div className="landing-grain rounded-[var(--radius-2xl)] border border-[#2C2825]/10 bg-[#E4ECD9]/40 p-6 md:p-10 shadow-sm">
            <DigitalPaperTrailIllustration />
          </div>

          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[#2C2825]/85">
            <li className="rounded-2xl bg-[#FAF6F0] border border-[#2C2825]/10 px-4 py-3">
              Real profiles, history, and reviews—not anonymous listings.
            </li>
            <li className="rounded-2xl bg-[#FAF6F0] border border-[#2C2825]/10 px-4 py-3">
              Job details and price expectations before you agree.
            </li>
            <li className="rounded-2xl bg-[#FAF6F0] border border-[#2C2825]/10 px-4 py-3">
              Platform accountability so disputes stay professional.
            </li>
          </ul>
        </div>
      </section>

      {/* Before vs After — muddy chaos vs sage + apricot clarity */}
      <section className="py-20 md:py-24 px-4 bg-[#F0EBE3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#8A8275] mb-2">Before / After</p>
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-0.5 rounded-full bg-[#C4B8A0]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2C2825]">The difference is accountability</h2>
            </div>
            <p className="text-[#2C2825]/70 max-w-xl mx-auto">
              Same city. Same skills. A clearer record when everything lives in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <article className="landing-grain flex flex-col rounded-[var(--radius-2xl)] border-2 border-[#2C2825]/20 bg-[#EDE8D0]/80 p-6 md:p-8 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-[#D9D0B8] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2C2825]/80 border border-[#2C2825]/15">
                  Before
                </span>
                <span className="text-[#6B6560] text-sm">Chaos & guesswork</span>
              </div>
              <div className="rounded-2xl border-2 border-[#2C2825]/12 mb-6 overflow-hidden bg-[#FFF9F4]">
                <BeforeChaosIllustration className="w-full h-auto max-h-[200px] md:max-h-[220px] object-contain" />
              </div>
              <ul className="space-y-3 text-[#2C2825]/75 text-[15px]">
                <li className="flex gap-3">
                  <span className="text-[#A8A090] shrink-0">•</span>
                  <span>Texting strangers and hoping they show up</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#A8A090] shrink-0">•</span>
                  <span>No-shows and price surprises</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#A8A090] shrink-0">•</span>
                  <span>Awkward disputes with no paper trail</span>
                </li>
              </ul>
            </article>

            <article className="landing-grain flex flex-col rounded-[var(--radius-2xl)] border-2 border-[#8FAD84]/50 bg-[#E4ECD9]/70 p-6 md:p-8 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-[#C5DEB8]/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#3D4A38] border border-[#2C2825]/12">
                  After
                </span>
                <span className="text-[#5F7163] text-sm">Clarity & record</span>
              </div>
              <div className="rounded-2xl border-2 border-[#2C2825]/12 mb-6 overflow-hidden bg-[#FAF6F0]">
                <AfterClarityIllustration className="w-full h-auto max-h-[200px] md:max-h-[220px] object-contain" />
              </div>
              <ul className="space-y-3 text-[#2C2825]/85 text-[15px]">
                <li className="flex gap-3">
                  <span className="text-[#5F7163] shrink-0 font-bold">✓</span>
                  <span>Clear requests and documented expectations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#5F7163] shrink-0 font-bold">✓</span>
                  <span>Messaging and scheduling in one place</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#B85C38] shrink-0 font-bold">✓</span>
                  <span>Platform accountability and a clean record</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* How It Works — icons in soft sage circles */}
      <section id="how-it-works" className="py-20 md:py-24 px-4 bg-[#FFFCFA]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5F7163] mb-2">How it works</p>
            <div className="inline-flex items-center gap-3 mb-3">
              <span className="h-6 w-0.5 rounded-full bg-[#A8C99E]" aria-hidden />
              <h2 className="text-3xl sm:text-4xl font-bold text-[#2C2825]">Four steps. Full clarity.</h2>
            </div>
            <p className="text-[#2C2825]/70 text-lg max-w-2xl mx-auto">
              A fast flow built for clarity before anyone agrees to a job.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {(
              [
                { Icon: RequestIcon, title: '1. Request', desc: 'Describe the job and what “done” means.' },
                { Icon: MatchIcon, title: '2. Match', desc: 'Review pros based on fit and history.' },
                { Icon: MessageIcon, title: '3. Message', desc: 'Confirm details in writing, in one place.' },
                { Icon: ScheduleIcon, title: '4. Schedule', desc: 'Lock in timing and expectations.' },
              ] as const
            ).map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="landing-grain text-center p-6 rounded-2xl border border-[#2C2825]/10 bg-[#FAF6F0]/90 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mx-auto mb-4 flex h-fit w-fit items-center justify-center rounded-full bg-[#E4ECD9] p-4 ring-1 ring-[#2C2825]/8 transition-transform duration-200 hover:scale-105">
                  <Icon className="h-11 w-11 sm:h-12 sm:w-12 text-[#2C2825]" />
                </div>
                <h3 className="text-lg font-semibold text-[#2C2825] mb-2">{title}</h3>
                <p className="text-[#2C2825]/70 text-sm leading-relaxed">{desc}</p>
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
      <section className="py-24 px-4 bg-[#F3EDE4]/80">
        <div className="max-w-6xl mx-auto">
          <div className="landing-grain rounded-[var(--radius-2xl)] p-8 sm:p-12 text-center bg-white border border-[#2C2825]/10 shadow-sm">
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
      <section id="pros" className="py-20 px-4 bg-[#E8E2D9]/60">
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
      <section className="py-24 px-4 bg-[#FAF6F0]">
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
      <footer className="bg-[#EDE8E0] text-[#2C2825]/65 py-16 border-t border-[#2C2825]/10">
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
