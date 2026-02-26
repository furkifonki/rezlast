/** Puan seviyesi eşikleri (client-side tier hesaplama için). loyalty_tiers ile senkron tutulabilir. */
export const TIER_THRESHOLDS = [
  { id: 'bronze', min_points: 0, display_name: 'Bronz' },
  { id: 'silver', min_points: 100, display_name: 'Gümüş' },
  { id: 'gold', min_points: 500, display_name: 'Altın' },
  { id: 'platinum', min_points: 1500, display_name: 'Platin' },
] as const;

export type TierId = (typeof TIER_THRESHOLDS)[number]['id'];

export function getTierFromPoints(points: number): { id: TierId; displayName: string } {
  let current = TIER_THRESHOLDS[0];
  for (const t of TIER_THRESHOLDS) {
    if (points >= t.min_points) current = t;
  }
  return { id: current.id, displayName: current.display_name };
}

/** Bir sonraki seviyeye kalan puan. En üst seviyede null. */
export function getPointsToNextTier(points: number): number | null {
  const next = TIER_THRESHOLDS.find((t) => t.min_points > points);
  if (!next) return null;
  return next.min_points - points;
}

export function getTierDisplayName(tierId: string | null): string {
  if (!tierId) return 'Bronz';
  const t = TIER_THRESHOLDS.find((x) => x.id === tierId);
  return t?.display_name ?? tierId;
}
