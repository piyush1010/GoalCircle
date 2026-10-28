/** Minutes from a Focus Room session for a batch today, so the batch check-in can fill them in. */
export function focusMinutesKey(circleId: string, day: string) {
  return `goalyaar-focus-${circleId}-${day}`
}
