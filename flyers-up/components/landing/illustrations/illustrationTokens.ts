/**
 * Unified landing illustration language: flat editorial, anchor stroke, soft pastels.
 * Use across Hero + Before/After + optional timelines.
 */
export const L = {
  outline: '#2C2825',
  stroke: 2.5,
  strokeInner: 2,
  cream: '#FFF9F4',
  creamDeep: '#FAF6F0',
  sand: '#EDE8D0',
  sandMuted: '#E8E0D4',
  sage: '#C5DEB8',
  sageSoft: '#E4ECD9',
  sageDeep: '#8FAD84',
  apricot: '#FFDCC4',
  apricotSoft: '#F8E8D8',
  apricotDeep: '#F0C4A8',
  orangeAccent: '#E8A882',
  white: '#FFFCFA',
  greyLine: '#C9C2AE',
  /** Muted label text (no alpha) */
  textMuted: '#5C564E',
  panelRx: 20,
  frameRx: 16,
} as const;

/** Hero triptych panel geometry (viewBox 960×260) */
export const HERO = {
  panelW: 300,
  panelH: 212,
  y: 24,
  gap: 10,
  x1: 20,
  x2: 20 + 300 + 10,
  x3: 20 + 300 + 10 + 300 + 10,
} as const;

/** Before/After shared artboard (viewBox 400×220) */
export const BA = {
  frameX: 10,
  frameY: 10,
  frameW: 380,
  frameH: 200,
  frameRx: 16,
  pad: 20,
} as const;
