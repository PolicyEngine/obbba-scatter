import { getHouseholdWeight } from './householdWeight.js';

export function calculateSectionStats(sectionData, includeMedian = false, sectionId = null) {
  if (!sectionData || sectionData.length === 0) return null;

  let totalWeight = 0;
  let positiveWeight = 0;
  let negativeWeight = 0;
  let affectedWeight = 0;
  const percentChanges = [];

  sectionData.forEach((household) => {
    const weight = getHouseholdWeight(household);
    const resourceChange =
      Number(
        household['Total change in net income'] || household['Change in Household Net Income']
      ) || 0;
    const percentChange = Number(household['Percentage change in net income']) || 0;

    totalWeight += weight;
    if (resourceChange > 1) {
      positiveWeight += weight;
      affectedWeight += weight;
    } else if (resourceChange < -1) {
      negativeWeight += weight;
      affectedWeight += weight;
    }

    if (includeMedian) {
      percentChanges.push({ change: percentChange, weight });
    }
  });

  const positivePercent = totalWeight > 0 ? Math.round((positiveWeight / totalWeight) * 100) : 0;
  const negativePercent = totalWeight > 0 ? Math.round((negativeWeight / totalWeight) * 100) : 0;
  const affectedPercent = totalWeight > 0 ? Math.round((affectedWeight / totalWeight) * 100) : 0;

  const totalMillions = totalWeight / 1_000_000;
  const totalFormatted =
    sectionId === 'highest-income'
      ? totalMillions.toFixed(1)
      : Math.round(totalMillions).toString();

  const stats = {
    total: totalFormatted,
    totalRaw: totalWeight,
    positivePercent,
    negativePercent,
    affectedPercent
  };

  if (includeMedian && percentChanges.length > 0 && totalWeight > 0) {
    percentChanges.sort((left, right) => left.change - right.change);

    let cumulativeWeight = 0;
    const halfWeight = totalWeight / 2;
    let medianChange = 0;

    for (const item of percentChanges) {
      cumulativeWeight += item.weight;
      if (cumulativeWeight >= halfWeight) {
        medianChange = item.change;
        break;
      }
    }

    stats.medianChange = medianChange.toFixed(1);
  }

  return stats;
}
