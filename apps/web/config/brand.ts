/**
 * Product branding. This is the single place to change the product name,
 * logo and accent colour; every screen, the report cover and page titles read from here.
 */
export const brand = {
  productName: 'Dark Pattern Assessment Tool',
  shortName: 'DPAT',
  tagline: 'Assess digital journeys against the CCPA Dark Patterns Guidelines, 2023',
  /** Path under /public. Use an SVG that works on light and dark backgrounds. */
  logoPath: '/brand/logo.svg',
  /** Accent hue (OKLCH hue angle, 0-360). Neutral slate-blue by default. */
  accentHue: 250,
} as const;

export type Brand = typeof brand;
