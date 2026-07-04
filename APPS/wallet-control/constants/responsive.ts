import { useWindowDimensions } from 'react-native';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const scale = (size: number) => (width / BASE_WIDTH) * size;
  const verticalScale = (size: number) => (height / BASE_HEIGHT) * size;
  const moderateScale = (size: number, factor = 0.5) =>
    size + (scale(size) - size) * factor;
  const moderateVerticalScale = (size: number, factor = 0.5) =>
    size + (verticalScale(size) - size) * factor;

  return { width, height, scale, verticalScale, moderateScale, moderateVerticalScale };
}

const AUTO_SCALE_KEYS = new Set([
  'fontSize', 'lineHeight', 'borderRadius',
  'padding', 'paddingHorizontal', 'paddingVertical',
  'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'margin', 'marginHorizontal', 'marginVertical',
  'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'gap', 'width', 'height', 'top', 'left', 'right', 'bottom',
]);

export function scaledSheet<T extends Record<string, any>>(
  styles: T,
  moderateScale: (n: number) => number,
): T {
  const out: Record<string, any> = {};
  for (const [selector, rule] of Object.entries(styles)) {
    const scaled: Record<string, any> = { ...rule };
    for (const key of Object.keys(scaled)) {
      const value = scaled[key];
      if (typeof value === 'number' && AUTO_SCALE_KEYS.has(key)) {
        scaled[key] = moderateScale(value);
      }
    }
    out[selector] = scaled;
  }
  return out as T;
}
