'use client';

/**
 * Admin Marketplace Dashboard: KPIs, Heatmap, Event Log, Controls
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  openRequestsNow: number;
  claimsPerHour24h: number;
  claims7d: number;
  avgTimeToClaimMs: number | null;
  avgSurgeMultiplier: number | null;
  prosOnlineNow: number;
};

type HeatmapCell = {
  cellKey: string;
  serviceSlug: string;
  openRequests: number;
  prosOnline: number;
  surgeMultiplier: number;
  updatedAt: string;
};

type MarketplaceEvent = {
  id: string;
  created_at: string;
  actor_type: string;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
};

type SurgeRules = {
  enabled?: boolean;
  maxMultiplier?: number;
  minMultiplier?: number;
  targetRequestsPerPro?: number;
  urgencyBoost?: Record<string, number>;
};

function KpiCard({
  title,
  value,
  sub,
  periodLabel,
}: {
  title: string;
  value: string | number;
  sub?: string;
  periodLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      {periodLabel ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{periodLabel}</p>
      ) : null}
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      <p className="text-sm text-muted">{title}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function formatServiceName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function MarketplaceDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapServiceFilter, setHeatmapServiceFilter] = useState('');
  const [heatmapRefreshing, setHeatmapRefreshing] = useState(false);

  const [events, setEvents] = useState<MarketplaceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsTypeFilter, setEventsTypeFilter] = useState('');

  const [settings, setSettings] = useState<{ surge_rules?: SurgeRules } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [surgeEnabled, setSurgeEnabled] = useState(true);
  const [maxMultiplier, setMaxMultiplier] = useState(1.3);
  const [targetRequestsPerPro, setTargetRequestsPerPro] = useState(2.5);
  const [urgencyNormal, setUrgencyNormal] = useState(1.0);
  const [urgencyPriority, setUrgencyPriority] = useState(1.05);
  const [urgencyEmergency, setUrgencyEmergency] = useState(1.1);

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/marketplace/stats', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.openRequestsNow !== undefined) setStats(data);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/admin/marketplace/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.surge_rules) {
          const sr = data.settings.surge_rules;
          setSurgeEnabled(sr.enabled ?? true);
          setMaxMultiplier(sr.maxMultiplier ?? 1.3);
          setTargetRequestsPerPro(sr.targetRequestsPerPro ?? 2.5);
          setUrgencyNormal(sr.urgencyBoost?.normal ?? 1.0);
          setUrgencyPriority(sr.urgencyBoost?.priority ?? 1.05);
          setUrgencyEmergency(sr.urgencyBoost?.emergency ?? 1.1);
        }
        setSettings(data.settings ?? {});
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  const loadHeatmap = useCallback(
    (refresh = false) => {
      setHeatmapLoading(true);
      const url = new URL('/api/admin/marketplace/heatmap', window.location.origin);
      if (refresh) url.searchParams.set('refresh', '1');
      if (heatmapServiceFilter) url.searchParams.set('service', heatmapServiceFilter);
      fetch(url, { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => setHeatmapCells(data.cells ?? []))
        .catch(() => {})
        .finally(() => {
          setHeatmapLoading(false);
          setHeatmapRefreshing(false);
        });
    },
    [heatmapServiceFilter]
  );

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  const loadEvents = () => {
    setEventsLoading(true);
    const url = new URL('/api/admin/marketplace/events', window.location.origin);
    url.searchParams.set('limit', '100');
    if (eventsTypeFilter) url.searchParams.set('event_type', eventsTypeFilter);
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [eventsTypeFilter]);

  async function handleSaveSettings() {
    setSettingsError(null);
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/admin/marketplace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surge_rules: {
            enabled: surgeEnabled,
            maxMultiplier,
            minMultiplier: 1.0,
            targetRequestsPerPro,
            urgencyBoost: {
              normal: urgencyNormal,
              priority: urgencyPriority,
              emergency: urgencyEmergency,
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSettingsError(json.error ?? 'Failed to save');
        return;
      }
      loadEvents();
    } catch {
      setSettingsError('Failed to save');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleSeed() {
    setSeedResult(null);
    setSeedLoading(true);
    try {
      const res = await fetch('/api/admin/seed-demand', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setSeedResult(`Seeded ${json.inserted ?? 20} fake demand requests.`);
        loadHeatmap(true);
        fetch('/api/admin/marketplace/stats', { cache: 'no-store' })
          .then((r) => r.json())
          .then((data) => data.openRequestsNow !== undefined && setStats(data));
      } else {
        setSeedResult(json.error ?? 'Seed failed');
      }
    } catch {
      setSeedResult('Seed failed');
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text">Marketplace Admin</h1>
        <Link className="text-sm text-muted hover:text-text" href="/admin">
          ← Admin home
        </Link>
      </div>

      {/* 1) KPI Cards */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">KPIs</h2>
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              title="Open requests now"
              value={stats?.openRequestsNow ?? 0}
              periodLabel="Current"
            />
            <KpiCard
              title="Claims per hour"
              value={(stats?.claimsPerHour24h ?? 0).toFixed(1)}
              periodLabel="Last 24h"
            />
            <KpiCard
              title="Claims total"
              value={stats?.claims7d ?? 0}
              periodLabel="Last 7d"
            />
            <KpiCard
              title="Avg time-to-claim"
              value={
                stats?.avgTimeToClaimMs != null
                  ? formatDuration(stats.avgTimeToClaimMs)
                  : '—'
              }
              periodLabel="Last 24h"
            />
            <KpiCard
              title="Avg surge multiplier"
              value={
                stats?.avgSurgeMultiplier != null
                  ? `×${stats.avgSurgeMultiplier.toFixed(2)}`
                  : '—'
              }
              periodLabel="Open requests"
            />
            <KpiCard
              title="Pros online now"
              value={stats?.prosOnlineNow ?? 0}
              periodLabel="Current"
            />
          </div>
        )}
      </section>

      {/* 2) Heatmap Table */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Heatmap</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Filter by service"
            value={heatmapServiceFilter}
            onChange={(e) => setHeatmapServiceFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
          <button
            type="button"
            onClick={() => {
              setHeatmapRefreshing(true);
              loadHeatmap(true);
            }}
            disabled={heatmapRefreshing}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface2 disabled:opacity-60"
          >
            {heatmapRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {heatmapLoading ? (
            <div className="p-8 text-center text-muted">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface2">
                    <th className="text-left p-3 font-medium text-text">Cell</th>
                    <th className="text-left p-3 font-medium text-text">Service</th>
                    <th className="text-right p-3 font-medium text-text">Open</th>
                    <th className="text-right p-3 font-medium text-text">Pros</th>
                    <th className="text-right p-3 font-medium text-text">Surge</th>
                    <th className="text-right p-3 font-medium text-text">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapCells.map((c, i) => (
                    <tr key={`${c.cellKey}-${c.serviceSlug}-${i}`} className="border-b border-border/50">
                      <td className="p-3 text-text">{c.cellKey}</td>
                      <td className="p-3 text-text">{formatServiceName(c.serviceSlug)}</td>
                      <td className="p-3 text-right text-text">{c.openRequests}</td>
                      <td className="p-3 text-right text-text">{c.prosOnline}</td>
                      <td className="p-3 text-right text-text">
                        ×{c.surgeMultiplier.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-muted text-xs">
                        {c.updatedAt
                          ? new Date(c.updatedAt).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {heatmapCells.length === 0 && !heatmapLoading && (
            <div className="p-8 text-center text-muted">
              No heatmap data. Click Refresh to aggregate from open requests.
            </div>
          )}
        </div>
      </section>

      {/* 3) Event Log */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Event Log</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Filter by event_type"
            value={eventsTypeFilter}
            onChange={(e) => setEventsTypeFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
          <button
            type="button"
            onClick={loadEvents}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface2"
          >
            Refresh
          </button>
        </div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden max-h-96 overflow-y-auto">
          {eventsLoading ? (
            <div className="p-8 text-center text-muted">Loading…</div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((ev) => (
                <EventRow key={ev.id} event={ev} />
              ))}
            </div>
          )}
          {events.length === 0 && !eventsLoading && (
            <div className="p-8 text-center text-muted">No events.</div>
          )}
        </div>
      </section>

      {/* 4) Controls */}
      <section>
        <h2 className="text-lg font-semibold text-text mb-4">Surge Controls</h2>
        {settingsLoading ? (
          <div className="rounded-xl border border-border bg-surface p-8 animate-pulse" />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            {settingsError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm">
                {settingsError}
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="surge-enabled"
                checked={surgeEnabled}
                onChange={(e) => setSurgeEnabled(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="surge-enabled" className="text-sm font-medium text-text">
                Surge pricing enabled
              </label>
            </div>
            <div>
              <label htmlFor="max-mult" className="block text-sm font-medium text-text mb-1">
                Max multiplier (1.0 – 2.0)
              </label>
              <input
                id="max-mult"
                type="range"
                min={1}
                max={2}
                step={0.05}
                value={maxMultiplier}
                onChange={(e) => setMaxMultiplier(parseFloat(e.target.value))}
                className="w-full max-w-xs"
              />
              <span className="ml-2 text-sm text-muted">×{maxMultiplier.toFixed(2)}</span>
            </div>
            <div>
              <label htmlFor="target-rpp" className="block text-sm font-medium text-text mb-1">
                Target requests per pro
              </label>
              <input
                id="target-rpp"
                type="number"
                min={0}
                step={0.5}
                value={targetRequestsPerPro}
                onChange={(e) => setTargetRequestsPerPro(parseFloat(e.target.value) || 2.5)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text w-24"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-2">Urgency boosts</p>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-xs text-muted">Normal</label>
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={urgencyNormal}
                    onChange={(e) => setUrgencyNormal(parseFloat(e.target.value) || 1)}
                    className="ml-1 rounded border border-border px-2 py-1 text-sm w-16"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Priority</label>
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={urgencyPriority}
                    onChange={(e) => setUrgencyPriority(parseFloat(e.target.value) || 1.05)}
                    className="ml-1 rounded border border-border px-2 py-1 text-sm w-16"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Emergency</label>
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={urgencyEmergency}
                    onChange={(e) => setUrgencyEmergency(parseFloat(e.target.value) || 1.1)}
                    className="ml-1 rounded border border-border px-2 py-1 text-sm w-16"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="rounded-lg bg-accent text-accent-contrast px-4 py-2 text-sm font-medium hover:opacity-95 disabled:opacity-60"
            >
              {settingsSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </section>

      {/* 5) Dev Seed (local only) */}
      {process.env.NODE_ENV === 'development' && (
        <section>
          <h2 className="text-lg font-semibold text-text mb-4">Dev Seed</h2>
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-sm text-muted mb-3">
              Seed ~20 fake demand_requests for local testing. Only available when NODE_ENV=development.
            </p>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedLoading}
              className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface disabled:opacity-60"
            >
              {seedLoading ? 'Seeding…' : 'Seed 20 fake requests'}
            </button>
            {seedResult && (
              <p className="mt-3 text-sm text-muted">{seedResult}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EventRow({ event }: { event: MarketplaceEvent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-3">
      <div
        className="flex items-center justify-between gap-2 cursor-pointer hover:bg-surface2/50 rounded"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="font-medium text-text">{event.event_type}</span>
          <span className="text-muted">{event.actor_type}</span>
          <span className="text-muted text-xs">
            {new Date(event.created_at).toLocaleString()}
          </span>
        </div>
        <span className="text-muted text-xs">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <pre className="mt-2 p-3 rounded-lg border border-border bg-surface2 text-xs text-muted overflow-x-auto">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}
