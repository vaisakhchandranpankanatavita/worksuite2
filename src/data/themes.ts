/** Colour themes. The palettes themselves live in index.css as `[data-theme="<id>"]` blocks; this is the list the server validates against and Settings renders. */
export type IconFamily = 'classic' | 'modern'

export interface ThemeDef {
  id: string
  label: string
  blurb: string
  /** Icon glyph set used for navigation and dashboards. */
  icons: IconFamily
  /** Preview swatches: canvas, ink, then the four accents. */
  swatch: [string, string, string, string, string, string]
}

export const THEMES = [
  { id: 'meadow', label: 'Meadow', blurb: 'The original fresh green look', icons: 'classic', swatch: ['#eaede9', '#1a1d1b', '#aece52', '#6b92d8', '#5fa059', '#cd6a96'] },
  { id: 'ocean', label: 'Ocean', blurb: 'Cool blues with a deep navy anchor', icons: 'modern', swatch: ['#e6eef3', '#0f2a3d', '#2bb3c9', '#6577e0', '#3aa58b', '#d0638f'] },
  { id: 'sunset', label: 'Sunset', blurb: 'Warm cream, apricot and coral', icons: 'classic', swatch: ['#f5e9e0', '#3a1f1a', '#f08a3c', '#e5674f', '#a3a83a', '#d1527f'] },
  { id: 'royal', label: 'Royal', blurb: 'Deep indigo with violet accents', icons: 'modern', swatch: ['#ece8f5', '#241a3d', '#8b5cf6', '#4f7be8', '#3fa77a', '#d5509a'] },
  { id: 'rose', label: 'Rosé', blurb: 'Soft blush with plum depth', icons: 'modern', swatch: ['#f6e8ee', '#3d1a2a', '#e0589a', '#8e6ad8', '#4fa58a', '#d1527f'] },
  { id: 'noir', label: 'Noir', blurb: 'Graphite and gold, high contrast', icons: 'classic', swatch: ['#e9e9ea', '#111214', '#c9a227', '#6b7686', '#5d8c6a', '#b4566e'] },
] as const satisfies readonly ThemeDef[]

export type ThemeId = (typeof THEMES)[number]['id']
export const DEFAULT_THEME: ThemeId = 'meadow'
export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v)
