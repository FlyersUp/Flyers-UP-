'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProWorkPhoto } from '@/lib/profileData';

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border border-hairline bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      {text}
    </span>
  );
}

function BeforeAfter({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [pct, setPct] = useState(50);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
      <div className="relative w-full aspect-square sm:aspect-[4/3]">
        {/* Before */}
        <img src={beforeUrl} alt="Before" className="absolute inset-0 h-full w-full object-cover" />
        {/* After (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          aria-hidden
        >
          <img src={afterUrl} alt="" className="h-full w-full object-cover" />
        </div>
        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow"
          style={{ left: `calc(${pct}% - 1px)` }}
          aria-hidden
        />
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Before / After</div>
          <div className="text-xs text-muted">{pct}%</div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="mt-2 w-full"
          aria-label="Before after slider"
        />
      </div>
    </div>
  );
}

export function PhotoModal({
  open,
  photo,
  onClose,
}: {
  open: boolean;
  photo: ProWorkPhoto | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const title = useMemo(() => photo?.jobTitle ?? 'Work photo', [photo]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose]);

  if (!photo) return null;

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(720px,92vw)] rounded-2xl p-0 border border-hairline shadow-xl bg-white text-text"
      aria-label={title}
      onClose={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
        <div className="text-sm font-semibold truncate">{title}</div>
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 rounded-full border border-hairline bg-white hover:shadow-sm transition-shadow"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="p-4">
        {'beforeUrl' in photo && photo.beforeUrl && photo.afterUrl ? (
          <BeforeAfter beforeUrl={photo.beforeUrl} afterUrl={photo.afterUrl} />
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-hairline bg-white shadow-sm">
            <img
              src={photo.imageUrl}
              alt={photo.jobTitle ?? 'Work photo'}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {photo.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {photo.tags.map((t) => (
              <Chip key={t} text={t} />
            ))}
          </div>
        ) : null}

        {photo.jobTitle ? (
          <div className="mt-3 text-sm text-muted">
            <span className="font-semibold text-text">Job:</span> {photo.jobTitle}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

