import type { Period } from '@/lib/finance/credit-card';

/**
 * Indexed access under `noUncheckedIndexedAccess`.
 *
 * Tests need to reach into a schedule by position; the compiler correctly
 * insists that might be `undefined`. Failing loudly here beats a non-null
 * assertion, because a missing period means the schedule is the wrong length
 * and that is exactly what the assertion would hide.
 */
export function periodAt(schedule: readonly Period[], index: number): Period {
  const period = schedule[index];
  if (period === undefined) {
    throw new Error(
      `expected a period at index ${index}, but the schedule has ${schedule.length}`,
    );
  }
  return period;
}

/** The last period of a schedule. */
export function lastPeriod(schedule: readonly Period[]): Period {
  return periodAt(schedule, schedule.length - 1);
}
