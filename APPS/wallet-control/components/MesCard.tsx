import React from 'react';
import PeriodCard from '@/components/PeriodCard';
import { getMonthlyPeriodInfo } from '@/lib/periodInfo';

export default function MesCard() {
  return <PeriodCard info={getMonthlyPeriodInfo()} />;
}
