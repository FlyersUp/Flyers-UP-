'use client';

/**
 * Pixel-perfect PWA app icon preview.
 * Shows maskable icon in circle + squircle masks for validation.
 */
export function AppIconPreview() {
  const iconSizes = [
    { src: '/icons/maskable-512.png', label: 'Maskable 512', size: 512 },
    { src: '/icons/icon-512.png', label: 'Icon 512', size: 512 },
    { src: '/icons/icon-192.png', label: 'Icon 192', size: 192 },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-text">PWA App Icon Preview</h2>
        <p className="mt-1 text-xs text-muted">
          Safe zone: 10% padding, 80% center. Icons validated for circle and squircle masks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {iconSizes.map(({ src, label, size }) => (
          <div key={src} className="space-y-3">
            <p className="text-xs font-medium text-muted">{label}</p>
            <div className="flex flex-wrap items-end gap-6">
              {/* Raw icon */}
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Raw</p>
                <div
                  className="overflow-hidden rounded-xl border border-border bg-[#FAF9F6]"
                  style={{ width: Math.min(size, 160), height: Math.min(size, 160) }}
                >
                  <img
                    src={src}
                    alt={label}
                    width={Math.min(size, 160)}
                    height={Math.min(size, 160)}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              {/* Circle mask (Android) */}
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Circle</p>
                <div
                  className="overflow-hidden rounded-full border border-border bg-[#FAF9F6]"
                  style={{ width: Math.min(size, 120), height: Math.min(size, 120) }}
                >
                  <img
                    src={src}
                    alt={`${label} (circle)`}
                    width={Math.min(size, 120)}
                    height={Math.min(size, 120)}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
              {/* Squircle mask (iOS) */}
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Squircle</p>
                <div
                  className="overflow-hidden border border-border bg-[#FAF9F6]"
                  style={{
                    width: Math.min(size, 120),
                    height: Math.min(size, 120),
                    borderRadius: '26%',
                  }}
                >
                  <img
                    src={src}
                    alt={`${label} (squircle)`}
                    width={Math.min(size, 120)}
                    height={Math.min(size, 120)}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface2 p-3 text-xs text-muted">
        <strong className="text-text">Compliance:</strong> Solid #FAF9F6 background, no transparency. Main flyer within 80% safe zone. Accent &lt;10% of icon.
      </div>
    </section>
  );
}
