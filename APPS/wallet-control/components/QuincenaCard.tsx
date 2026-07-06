import React from 'react';
import PeriodCard from '@/components/PeriodCard';
import { getBiweeklyPeriodInfo } from '@/lib/periodInfo';

export default function QuincenaCard() {
  return <PeriodCard info={getBiweeklyPeriodInfo()} />;
}
