
'use client';

/**
 * Converts an HSL color value (from HSL string) to a HEX string.
 */
export function hslStringToHex(hslString?: string | null): string {
  if (!hslString) return '#000000';
  const hslMatch = hslString.match(/(\d+)\s(\d+)%\s(\d+)%/);
  if (!hslMatch) return '#000000';

  let h = parseInt(hslMatch[1], 10);
  let s = parseInt(hslMatch[2], 10);
  let l = parseInt(hslMatch[3], 10);

  s /= 100;
  l /= 100;

  let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c/2,
      r = 0,
      g = 0,
      b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  // Having obtained RGB, convert channels to hex
  let rStr = Math.round((r + m) * 255).toString(16);
  let gStr = Math.round((g + m) * 255).toString(16);
  let bStr = Math.round((b + m) * 255).toString(16);

  if (rStr.length == 1) rStr = "0" + rStr;
  if (gStr.length == 1) gStr = "0" + gStr;
  if (bStr.length == 1) bStr = "0" + bStr;

  return `#${rStr}${gStr}${bStr}`;
}

/**
 * Converts a HEX color string to an HSL string "h s% l%".
 */
export function hexToHslString(hex?: string | null): string {
  if (!hex) return '';
  hex = hex.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

/**
 * Determines whether black or white text should be used on a given background color.
 */
export function getContrastColor(backgroundColor?: string | null): 'black' | 'white' {
  if (!backgroundColor) return 'black';

  // Handle named colors by creating a temporary mapping for common ones
  // or default to a safe value. For a more robust solution, we'd need a full list.
  const namedColors: Record<string, string> = {
    'white': '#ffffff',
    'black': '#000000',
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'silver': '#c0c0c0',
    'gray': '#808080',
    'maroon': '#800000',
    'olive': '#808000',
    'purple': '#800080',
    'teal': '#008080',
    'navy': '#000080',
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'gold': '#ffd700',
    'brown': '#a52a2a',
    'lime': '#00ff00',
  };

  let hex = backgroundColor.toLowerCase();
  if (namedColors[hex]) {
    hex = namedColors[hex];
  }

  // If it's not a hex color, try to see if it's already hex
  if (!hex.startsWith('#')) {
    // If it's 3 or 6 hex chars without #
    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
      hex = '#' + hex;
    } else {
      // If it's still not hex, we can't easily determine
      // Default to black for light-ish colors, but here we'll just return black if unsure
      // or assume it might be a dark color if it's not white.
      return hex === 'white' ? 'black' : (hex === 'transparent' ? 'black' : 'white');
    }
  }

  hex = hex.replace('#', '');
  
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return 'black';
  }

  // Using the YIQ formula which is often preferred for contrast
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}
