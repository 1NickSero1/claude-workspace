import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';
import { formatCOP } from '@/lib/expenseParser';

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const o1 = polarToCartesian(cx, cy, outerR, startAngle);
  const o2 = polarToCartesian(cx, cy, outerR, endAngle);
  const i1 = polarToCartesian(cx, cy, innerR, endAngle);
  const i2 = polarToCartesian(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

export interface DonutSlice {
  id: string;
  color: string;
  amount: number;
}

interface Props {
  data: DonutSlice[];
  total: number;
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  centerValueColor?: string;
  emptyLabel?: string;
  emptyHint?: string;
}

export default function DonutChart({ data, total, size, centerLabel, centerValue, centerValueColor, emptyLabel, emptyHint }: Props) {
  const COLORS = useColors();
  const { width, moderateScale } = useResponsive();
  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    totalAmt: { fontSize: FONT.xl, fontWeight: '700' },
    totalLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    empty: {
      backgroundColor: COLORS.card,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
    },
    emptyText: { color: COLORS.textMuted, fontSize: FONT.base, fontWeight: '600' },
    emptyHint: { color: COLORS.textDim, fontSize: FONT.sm, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  }, moderateScale)), [COLORS, moderateScale]);

  const defaultSize = Math.min(width - 64, 220);
  const S = size ?? defaultSize;
  const cx = S / 2;
  const cy = S / 2;
  const outerR = S / 2 - 4;
  const innerR = outerR * 0.58;

  if (!data.length || total === 0) {
    return (
      <View style={[{ width: S, height: S, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }, styles.empty]}>
        <Text style={styles.emptyText}>{emptyLabel ?? 'Sin datos'}</Text>
        <Text style={styles.emptyHint}>{emptyHint ?? 'Toca + para registrar tu primer gasto'}</Text>
      </View>
    );
  }

  let angle = 0;
  const slices = data.filter(d => d.amount > 0).map(d => {
    const span = (d.amount / total) * 360;
    const s = angle;
    angle += span;
    return { ...d, start: s, end: angle - 0.5 };
  });

  const displayValue = centerValue ?? formatCOP(total);
  const displayLabel = centerLabel ?? 'Total mes';
  const valueColor = centerValueColor ?? COLORS.text;

  return (
    <View style={{ width: S, height: S, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Svg width={S} height={S}>
        {slices.map(s => (
          <Path key={s.id} d={arcPath(cx, cy, outerR, innerR, s.start, s.end)} fill={s.color} />
        ))}
        <Circle cx={cx} cy={cy} r={innerR - 2} fill={COLORS.bg} />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.totalAmt, { color: valueColor }]}>{displayValue}</Text>
        <Text style={styles.totalLabel}>{displayLabel}</Text>
      </View>
    </View>
  );
}
