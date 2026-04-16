'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { AnalyticsRevenuePoint, AnalyticsTimePoint } from '@/lib/admin/analytics/types';

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map((x) => Number(x));
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}`;
}

/** Recharts Tooltip value can be number, string, or nested; normalize for display. */
function tooltipNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    const n = typeof value[0] === 'number' ? value[0] : Number(value[0]);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function AnalyticsCharts({
  bookingsOverTime,
  revenueOverTime,
}: {
  bookingsOverTime: AnalyticsTimePoint[];
  revenueOverTime: AnalyticsRevenuePoint[];
}) {
  const bookingChart = bookingsOverTime.map((p) => ({
    ...p,
    label: formatDayLabel(p.date),
  }));
  const revenueChart = revenueOverTime.map((p) => ({
    ...p,
    label: formatDayLabel(p.date),
    gmv: Math.round(p.gmvCents / 100),
    platform: Math.round(p.platformCents / 100),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bookings volume</CardTitle>
          <p className="text-xs text-text3">Completed jobs per day</p>
        </CardHeader>
        <CardContent className="h-[280px] pt-0">
          {bookingChart.length === 0 ? (
            <p className="py-12 text-center text-sm text-text3">No completed bookings in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis width={32} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card-neutral))',
                  }}
                  formatter={(value) => [tooltipNumeric(value), 'Completed']}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { date?: string } | undefined;
                    return row?.date ?? '';
                  }}
                />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--trust))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card variant="elevated" className="border-border/80 bg-[hsl(var(--card-neutral))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue growth</CardTitle>
          <p className="text-xs text-text3">GMV (completed jobs, USD)</p>
        </CardHeader>
        <CardContent className="h-[280px] pt-0">
          {revenueChart.length === 0 ? (
            <p className="py-12 text-center text-sm text-text3">No revenue in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gmvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--action))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--action))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  width={44}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card-neutral))',
                  }}
                  formatter={(value, name) => {
                    const label = String(name) === 'gmv' ? 'GMV' : String(name);
                    return [`$${tooltipNumeric(value)}`, label];
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  name="GMV"
                  stroke="hsl(var(--action))"
                  strokeWidth={2}
                  fill="url(#gmvFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
