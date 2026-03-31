'use client';

import {
  ArrowRight,
  Bolt,
  CheckCircle2,
  Hammer,
  Leaf,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
} from 'lucide-react';
import { Layout } from './Layout';

const categories = [
  { title: 'Cleaning', icon: Sparkles, blurb: 'Deep & recurring' },
  { title: 'Handyman', icon: Hammer, blurb: 'Repairs & installs' },
  { title: 'Lawn & garden', icon: Leaf, blurb: 'Outdoor care' },
  { title: 'Moving help', icon: Truck, blurb: 'Load & haul' },
  { title: 'Painting', icon: Paintbrush, blurb: 'Interior touch-ups' },
  { title: 'Assembly', icon: Wrench, blurb: 'Furniture & gear' },
];

const reviews = [
  {
    name: 'Maya R.',
    place: 'Portland',
    text: 'Found someone same-day for a tricky mount. Clear pricing, pro showed up on time.',
    rating: 5,
  },
  {
    name: 'James L.',
    place: 'Austin',
    text: 'Second booking this month. Love that I can see reviews before I commit.',
    rating: 5,
  },
  {
    name: 'Priya K.',
    place: 'Denver',
    text: 'Handled a last-minute move-out clean. Communication was excellent.',
    rating: 5,
  },
];

const stats = [
  { label: 'Jobs booked this week', value: '12k+' },
  { label: 'Avg. response', value: '< 2h' },
  { label: 'Pros vetted', value: '48k' },
];

/**
 * Warm marketplace landing: hero search, categories, trust/reviews, stat pills.
 */
export default function LandingPage() {
  return (
    <Layout mode="landing">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F2DCC4] via-[#EBCEAE] to-[#E8C9A8]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#F5B74E]/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-[#AAA06D]/20 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#5D695D]/10 bg-[#F8F4EE]/60 px-3 py-1 text-xs font-medium text-[#5D695D]/80 shadow-sm backdrop-blur-sm">
              <Bolt className="h-3.5 w-3.5 text-[#E48C35]" strokeWidth={2.5} />
              Local pros, booked in minutes
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#5D695D] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Home help,{' '}
              <span className="relative">
                handled
                <span
                  className="absolute -bottom-1 left-0 h-2 w-full rounded-full opacity-40"
                  style={{ background: 'linear-gradient(90deg, #F5B74E, #E48C35)' }}
                  aria-hidden
                />
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[#5D695D]/75">
              On Flyers Up, compare profiles, read real reviews, and book vetted service pros—without the runaround.
            </p>

            <div className="mx-auto mt-10 max-w-xl">
              <label htmlFor="svc-search" className="sr-only">
                What service do you need?
              </label>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#5D695D]/12 bg-[#F8F4EE]/85 p-2 shadow-[0_8px_30px_rgba(93,105,93,0.12)] backdrop-blur-sm sm:flex-row sm:items-stretch">
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-white/70 px-4 py-3 ring-1 ring-[#5D695D]/8">
                  <Sparkles className="h-5 w-5 shrink-0 text-[#E48C35]" strokeWidth={2} />
                  <input
                    id="svc-search"
                    type="search"
                    placeholder="What service do you need?"
                    className="w-full bg-transparent text-base text-[#5D695D] placeholder:text-[#5D695D]/45 outline-none"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:brightness-105 active:scale-[0.99] sm:min-w-[140px]"
                  style={{
                    backgroundColor: '#E48C35',
                    boxShadow: '0 6px 20px rgba(228, 140, 53, 0.38)',
                  }}
                >
                  Search
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 sm:w-auto"
                style={{ backgroundColor: '#E48C35' }}
              >
                Browse popular tasks
              </button>
              <button
                type="button"
                className="w-full rounded-xl border border-[#5D695D]/18 bg-[#F8F4EE]/50 px-6 py-3 text-sm font-semibold text-[#5D695D] shadow-sm transition hover:border-[#5D695D]/28 hover:bg-[#F8F4EE]/80 sm:w-auto"
              >
                See how pricing works
              </button>
            </div>

            {/* Stat pills */}
            <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-full border border-[#5D695D]/10 bg-[#F8F4EE]/55 px-4 py-2 text-left shadow-sm backdrop-blur-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-[#5D695D]/55">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums text-[#5D695D]">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="relative border-t border-[#5D695D]/8 bg-[#E0AF70]/35 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#5D695D] sm:text-3xl">Curated categories</h2>
              <p className="mt-2 max-w-lg text-[#5D695D]/72">Jump in with tasks homeowners book most—tap a card to explore pros near you.</p>
            </div>
            <button
              type="button"
              className="self-start rounded-xl text-sm font-semibold text-[#E48C35] underline-offset-4 hover:underline"
            >
              View all services
            </button>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map(({ title, icon: Icon, blurb }) => (
              <li key={title}>
                <button
                  type="button"
                  className="group flex w-full flex-col rounded-2xl border border-[#5D695D]/10 bg-[#F8F4EE]/75 p-6 text-left shadow-[0_4px_20px_rgba(93,105,93,0.08)] transition hover:-translate-y-0.5 hover:border-[#E48C35]/35 hover:shadow-[0_12px_32px_rgba(93,105,93,0.12)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5D695D]/8 text-[#5D695D] transition group-hover:bg-[#E48C35]/12 group-hover:text-[#C55F1A]">
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="mt-4 text-lg font-semibold text-[#5D695D]">{title}</span>
                  <span className="mt-1 text-sm text-[#5D695D]/65">{blurb}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#E48C35]">
                    Find pros
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reviews */}
      <section className="relative py-20 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EBCEAE] via-[#E5CBB0] to-[#EBCEAE]" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#AAA06D]/25 text-[#5D695D]">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#5D695D] sm:text-3xl">Loved by busy households</h2>
              <p className="mt-1 text-[#5D695D]/70">
                Real reviews from verified Flyers Up bookings—sage accents for trust, not decoration.
              </p>
            </div>
          </div>

          <ul className="mt-12 grid gap-6 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.name}>
                <blockquote className="flex h-full flex-col rounded-2xl border border-[#AAA06D]/35 bg-[#F8F4EE]/80 p-6 shadow-md backdrop-blur-sm">
                  <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#AAA06D] text-[#AAA06D]" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#5D695D]/88">&ldquo;{r.text}&rdquo;</p>
                  <footer className="mt-6 flex items-center gap-2 border-t border-[#AAA06D]/25 pt-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#AAA06D]/20 text-xs font-bold text-[#5D695D]">
                      {r.name.charAt(0)}
                    </span>
                    <div>
                      <cite className="not-italic text-sm font-semibold text-[#5D695D]">{r.name}</cite>
                      <p className="text-xs text-[#5D695D]/55">{r.place}</p>
                    </div>
                    <CheckCircle2 className="ml-auto h-5 w-5 text-[#AAA06D]" strokeWidth={2} aria-hidden />
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Layout>
  );
}
