import { DateTime, Interval } from 'luxon';

function endpoints(iv: Interval): { s: DateTime; e: DateTime } | null {
  const s = iv.start;
  const e = iv.end;
  if (!s || !e || !iv.isValid) return null;
  return { s, e };
}

/** Merge overlapping / adjacent intervals (same zone). */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const withEnds = intervals.map((iv) => ({ iv, ep: endpoints(iv) })).filter((x): x is { iv: Interval; ep: { s: DateTime; e: DateTime } } => x.ep != null);
  if (withEnds.length === 0) return [];
  const sorted = [...withEnds].sort((a, b) => a.ep.s.toMillis() - b.ep.s.toMillis());
  const out: Interval[] = [];
  let curIv = sorted[0]!.iv;
  let cur = sorted[0]!.ep;
  for (let i = 1; i < sorted.length; i++) {
    const nextIv = sorted[i]!.iv;
    const next = sorted[i]!.ep;
    if (next.s <= cur.e) {
      const end = cur.e > next.e ? cur.e : next.e;
      cur = { s: cur.s, e: end };
      curIv = Interval.fromDateTimes(cur.s, cur.e);
    } else {
      out.push(curIv);
      cur = next;
      curIv = nextIv;
    }
  }
  out.push(curIv);
  return out;
}

/** Subtract union of `cuts` from each interval in `base`. */
export function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  if (base.length === 0) return [];
  const mergedCuts = mergeIntervals(cuts.filter((c) => c.isValid && c.length('milliseconds') > 0));
  if (mergedCuts.length === 0) return mergeIntervals(base);

  let pieces: Interval[] = mergeIntervals(base);
  for (const cut of mergedCuts) {
    const cutEp = endpoints(cut);
    if (!cutEp) continue;
    const nextPieces: Interval[] = [];
    for (const p of pieces) {
      const pEp = endpoints(p);
      if (!pEp) continue;
      if (cutEp.e <= pEp.s || cutEp.s >= pEp.e) {
        nextPieces.push(p);
        continue;
      }
      if (cutEp.s > pEp.s) {
        const rightBound = cutEp.s < pEp.e ? cutEp.s : pEp.e;
        const left = Interval.fromDateTimes(pEp.s, rightBound);
        if (left.isValid && left.length('milliseconds') > 0) nextPieces.push(left);
      }
      if (cutEp.e < pEp.e) {
        const leftBound = cutEp.e > pEp.s ? cutEp.e : pEp.s;
        const right = Interval.fromDateTimes(leftBound, pEp.e);
        if (right.isValid && right.length('milliseconds') > 0) nextPieces.push(right);
      }
    }
    pieces = nextPieces;
  }
  return mergeIntervals(pieces);
}

export function intervalFromUtcIso(startIso: string, endIso: string): Interval | null {
  const s = DateTime.fromISO(startIso, { zone: 'utc' });
  const e = DateTime.fromISO(endIso, { zone: 'utc' });
  if (!s.isValid || !e.isValid || e <= s) return null;
  return Interval.fromDateTimes(s, e);
}
