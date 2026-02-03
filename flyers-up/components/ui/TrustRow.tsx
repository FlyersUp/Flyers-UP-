'use client';

import React from 'react';

export interface TrustRowProps {
  className?: string;
}

/**
 * Compact, repeated trust scaffold. Keeps tone warm + predictable.
 * Use in settings headers to reinforce “no surprises” and next-step clarity.
 */
export function TrustRow({ className = '' }: TrustRowProps) {
  // Intentionally hidden for the barebones build.
  // Keeping the component (returning null) avoids touching many pages.
  void className;
  return null;
}

