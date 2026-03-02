/**
 * Theme utilities for dynamic restaurant theming.
 * Converts HEX colors to HSL and injects CSS variables into the DOM.
 */

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** Validate a hex color string */
export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex);
}

/** Convert HEX (#RRGGBB) to HSL string "H S% L%" (Tailwind format, no hsl() wrapper) */
export function hexToHSL(hex: string): string {
  if (!isValidHex(hex)) return '0 0% 0%';

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(l * 100)}%`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Determine if a color is light (for calculating foreground) */
function isLightColor(hex: string): boolean {
  if (!isValidHex(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
}

/** Lighten or darken an HSL string by adjusting lightness */
function adjustLightness(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.max(0, Math.min(100, parseInt(parts[3]) + amount));
  return `${h} ${s}% ${l}%`;
}

export interface RestaurantTheme {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
}

export const DEFAULT_THEME: RestaurantTheme = {
  primary: '#E63946',
  secondary: '#1D3557',
  background: '#FFFFFF',
  foreground: '#1A1A2E',
};

// CSS variable names to inject
const THEME_VARS = [
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--border', '--ring',
  '--popover', '--popover-foreground',
];

/** Apply theme CSS variables to document root */
export function applyTheme(theme: RestaurantTheme): void {
  const root = document.documentElement;

  const primaryHSL = hexToHSL(theme.primary);
  const secondaryHSL = hexToHSL(theme.secondary);
  const bgHSL = hexToHSL(theme.background);
  const fgHSL = hexToHSL(theme.foreground);

  // Primary
  root.style.setProperty('--primary', primaryHSL);
  root.style.setProperty('--primary-foreground', isLightColor(theme.primary) ? '0 0% 10%' : '0 0% 98%');

  // Secondary
  root.style.setProperty('--secondary', adjustLightness(secondaryHSL, 60));
  root.style.setProperty('--secondary-foreground', secondaryHSL);

  // Background & Foreground
  root.style.setProperty('--background', bgHSL);
  root.style.setProperty('--foreground', fgHSL);

  // Card (same as background)
  root.style.setProperty('--card', bgHSL);
  root.style.setProperty('--card-foreground', fgHSL);

  // Popover
  root.style.setProperty('--popover', bgHSL);
  root.style.setProperty('--popover-foreground', fgHSL);

  // Muted (derived from background, slightly darker/lighter)
  root.style.setProperty('--muted', isLightColor(theme.background)
    ? adjustLightness(bgHSL, -5)
    : adjustLightness(bgHSL, 10));
  root.style.setProperty('--muted-foreground', adjustLightness(fgHSL, 30));

  // Accent (derived from primary, very light)
  root.style.setProperty('--accent', adjustLightness(primaryHSL, 35));
  root.style.setProperty('--accent-foreground', fgHSL);

  // Border & Ring
  root.style.setProperty('--border', isLightColor(theme.background)
    ? adjustLightness(bgHSL, -12)
    : adjustLightness(bgHSL, 15));
  root.style.setProperty('--ring', primaryHSL);
}

/** Remove all injected theme CSS variables */
export function removeTheme(): void {
  const root = document.documentElement;
  THEME_VARS.forEach(v => root.style.removeProperty(v));
}
