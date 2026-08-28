export const HOUSEHOLD_WEIGHT_FIELD = 'Household Weight';

const LEGACY_HOUSEHOLD_WEIGHT_FIELD = 'Household weight';

/**
 * Read a household's survey weight, accepting the legacy lowercase field at
 * the CSV boundary while exposing one canonical field everywhere else.
 */
export function getHouseholdWeight(household, fallback = 1) {
  const rawWeight =
    household?.[HOUSEHOLD_WEIGHT_FIELD] ?? household?.[LEGACY_HOUSEHOLD_WEIGHT_FIELD];

  if (rawWeight === undefined || rawWeight === null || rawWeight === '') {
    return fallback;
  }

  const weight = Number(rawWeight);
  return Number.isFinite(weight) && weight >= 0 ? weight : fallback;
}

/**
 * Return a row with a numeric canonical weight and no legacy weight alias.
 */
export function normalizeHouseholdWeight(household, fallback = 1) {
  const normalized = {
    ...household,
    [HOUSEHOLD_WEIGHT_FIELD]: getHouseholdWeight(household, fallback)
  };

  delete normalized[LEGACY_HOUSEHOLD_WEIGHT_FIELD];
  return normalized;
}

function householdKey(household, index) {
  return String(household?.id ?? household?.householdId ?? household?.['Household ID'] ?? index);
}

function deterministicUnitInterval(household, index) {
  const key = householdKey(household, index);
  let hash = 2166136261;

  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) + 1) / 4294967297;
}

/**
 * Deterministic weighted reservoir sample without replacement.
 *
 * Higher-weight households are more likely to survive a rendering cap. The
 * deterministic score keeps canvas points stable across animation frames.
 */
export function selectWeightedHouseholds(
  households,
  maxHouseholds,
  { pinnedIds = [], unitInterval = deterministicUnitInterval } = {}
) {
  if (!Array.isArray(households) || households.length === 0) return [];

  const limit = Math.max(0, Math.floor(maxHouseholds));
  if (limit === 0) return [];
  if (households.length <= limit) return households;

  const pinnedIdSet = new Set(pinnedIds.filter(Boolean).map(String));
  const pinned = [];
  const candidates = [];

  households.forEach((household, index) => {
    const key = householdKey(household, index);
    const item = { household, index, key };

    if (pinnedIdSet.has(key)) {
      pinned.push(item);
      return;
    }

    const weight = getHouseholdWeight(household);
    if (weight <= 0) return;

    const rawUnitValue = Number(unitInterval(household, index));
    const unitValue = Number.isFinite(rawUnitValue)
      ? Math.min(Math.max(rawUnitValue, Number.EPSILON), 1 - Number.EPSILON)
      : deterministicUnitInterval(household, index);

    // Efraimidis-Spirakis priority: larger (closer to zero) ranks first.
    candidates.push({
      ...item,
      priority: Math.log(unitValue) / weight
    });
  });

  const selectedPinned = pinned.slice(0, limit);
  const remaining = limit - selectedPinned.length;

  candidates.sort((left, right) => right.priority - left.priority || left.index - right.index);

  return [...selectedPinned, ...candidates.slice(0, remaining)]
    .sort((left, right) => left.index - right.index)
    .map(({ household }) => household);
}
