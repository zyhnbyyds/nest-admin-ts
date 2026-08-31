/**
 * 颜色工具：从主色生成 lew-ui 完整派生色板
 * lew-ui 的 primary 色系由大量派生变量组成（hover/active/light/ghost-text 等），
 * 仅覆盖 --lew-color-primary 会导致按钮 light 态、标签、选中态等颜色不协调。
 * 这里基于主色统一生成，保证任意自定义色都能得到协调的完整色板。
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** #rrggbb / #rgb → {r,g,b} */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  if (Number.isNaN(num) || h.length !== 6) return { r: 26, g: 115, b: 232 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** 调整亮度（delta 为 -100~100 的百分比偏移） */
export function adjustLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.min(100, Math.max(0, hsl.l + delta));
  return rgbToHex(hslToRgb(hsl));
}

/** 调整饱和度 */
export function adjustSaturation(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.s = Math.min(100, Math.max(0, hsl.s + delta));
  return rgbToHex(hslToRgb(hsl));
}

/** 混合到白色（生成浅色背景） */
export function mixWithWhite(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (v: number) => Math.round(v + (255 - v) * ratio);
  return rgbToHex({ r: mix(r), g: mix(g), b: mix(b) });
}

/** 混合到黑色 */
export function mixWithBlack(hex: string, ratio: number): string {
  const { r, g, b } = hexToRgb(hex);
  const mix = (v: number) => Math.round(v * (1 - ratio));
  return rgbToHex({ r: mix(r), g: mix(g), b: mix(b) });
}

/** 计算文字对比度：浅色背景上应使用深色文字 */
export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  // 相对亮度（WCAG）
  const lum = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  return L > 0.4;
}

/**
 * 由主色生成 lew-ui 完整派生色板
 * 参考 lew-ui 默认色板（#1a73e8）的派生关系：
 *   hover   ≈ 主色变暗 8%
 *   active  ≈ 主色变暗 16%
 *   light   ≈ 主色与白混合 88%（浅色背景）
 *   light-text ≈ 主色变暗 30%（浅色背景上的文字）
 *   ghost-text ≈ 主色本身
 */
export interface PrimaryPalette {
  primary: string;
  hover: string;
  active: string;
  dark: string;
  light: string;
  lightHover: string;
  lightActive: string;
  lightText: string;
  lightTextHover: string;
  lightTextActive: string;
  ghostText: string;
  ghostTextHover: string;
  ghostTextActive: string;
  textText: string;
  textTextHover: string;
  textTextActive: string;
}

export function buildPrimaryPalette(hex: string): PrimaryPalette {
  const primary = hex;
  const hover = adjustLightness(hex, -8);
  const active = adjustLightness(hex, -16);
  const dark = adjustLightness(hex, -20);
  const light = mixWithWhite(hex, 0.88);
  const lightHover = mixWithWhite(hex, 0.8);
  const lightActive = mixWithWhite(hex, 0.7);
  const lightText = adjustLightness(hex, -30);
  const lightTextHover = adjustLightness(hex, -30);
  const lightTextActive = adjustLightness(hex, -40);
  const ghostText = hex;
  const ghostTextHover = hover;
  const ghostTextActive = active;
  const textText = hex;
  const textTextHover = hover;
  const textTextActive = active;
  return {
    primary,
    hover,
    active,
    dark,
    light,
    lightHover,
    lightActive,
    lightText,
    lightTextHover,
    lightTextActive,
    ghostText,
    ghostTextHover,
    ghostTextActive,
    textText,
    textTextHover,
    textTextActive,
  };
}
