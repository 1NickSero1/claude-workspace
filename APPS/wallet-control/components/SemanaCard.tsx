import React from 'react';
import PeriodCard from '@/components/PeriodCard';
import { getWeeklyPeriodInfo } from '@/lib/periodInfo';

export default function SemanaCard() {
  return <PeriodCard info={getWeeklyPeriodInfo()} />;
}
