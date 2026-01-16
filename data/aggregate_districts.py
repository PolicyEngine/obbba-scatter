"""
Pre-aggregate household data to district-level summaries for fast map loading.
"""
import pandas as pd
import numpy as np
import sys

# Mapping for districts that differ between CSV and GeoJSON
CSV_TO_GEOJSON_MAP = {
    1101: 1198,  # DC delegate district
    3000: 3001,  # Montana at-large → district 1
}


def aggregate_districts(input_csv: str, output_csv: str):
    """
    Aggregate household-level data to district-level summaries.

    Computes weighted sums and percentages:
    - avgChange: (sum of weighted net income changes) / (sum of weighted baseline incomes) * 100
    - pctWinners: weighted % of households with change > 0.1%
    - pctLosers: weighted % of households with change < -0.1%
    - totalHouseholds: sum of household weights
    """
    print(f"Loading {input_csv}...")
    df = pd.read_csv(input_csv)
    print(f"  Loaded {len(df):,} households")

    # Key columns
    district_col = "Congressional District"
    weight_col = "Household Weight"
    pct_change_col = "Percentage change in net income"
    abs_change_col = "Total change in net income"
    baseline_income_col = "Baseline Net Income"

    # Verify columns exist
    for col in [district_col, weight_col, pct_change_col, abs_change_col, baseline_income_col]:
        if col not in df.columns:
            raise ValueError(f"Missing column: {col}")

    # Map district IDs to GeoJSON format
    df["GeoJSON_District"] = df[district_col].map(
        lambda x: CSV_TO_GEOJSON_MAP.get(x, x)
    )

    # Group by district and compute aggregates
    print("Computing district aggregates...")

    def compute_district_stats(group):
        weights = group[weight_col].values
        pct_changes = group[pct_change_col].values
        abs_changes = group[abs_change_col].values
        baseline_incomes = group[baseline_income_col].values

        total_weight = weights.sum()

        if total_weight == 0:
            return pd.Series({
                "avgChange": 0,
                "pctWinners": 0,
                "pctLosers": 0,
                "totalHouseholds": 0,
                "householdCount": len(group)
            })

        # Average change = total change in net income / total baseline income
        # Both are weighted sums
        total_change = (abs_changes * weights).sum()
        total_income = (baseline_incomes * weights).sum()
        avg_change = (total_change / total_income) * 100 if total_income != 0 else 0

        # Winners: change > 0.1% (use individual pct changes for classification)
        winners_weight = weights[pct_changes > 0.1].sum()
        pct_winners = (winners_weight / total_weight) * 100

        # Losers: change < -0.1%
        losers_weight = weights[pct_changes < -0.1].sum()
        pct_losers = (losers_weight / total_weight) * 100

        return pd.Series({
            "avgChange": avg_change,
            "pctWinners": pct_winners,
            "pctLosers": pct_losers,
            "totalHouseholds": total_weight,
            "householdCount": len(group)
        })

    aggregated = df.groupby("GeoJSON_District").apply(compute_district_stats).reset_index()
    aggregated.columns = ["district", "avgChange", "pctWinners", "pctLosers", "totalHouseholds", "householdCount"]

    # For Montana, duplicate the data for district 3002 (same data as 3001)
    mt_row = aggregated[aggregated["district"] == 3001]
    if len(mt_row) > 0:
        mt_3002 = mt_row.copy()
        mt_3002["district"] = 3002
        aggregated = pd.concat([aggregated, mt_3002], ignore_index=True)

    # Round for cleaner output
    aggregated["avgChange"] = aggregated["avgChange"].round(3)
    aggregated["pctWinners"] = aggregated["pctWinners"].round(2)
    aggregated["pctLosers"] = aggregated["pctLosers"].round(2)
    aggregated["totalHouseholds"] = aggregated["totalHouseholds"].round(0).astype(int)

    # Sort by district
    aggregated = aggregated.sort_values("district")

    print(f"  Computed {len(aggregated)} district aggregates")
    print(f"  Sample rows:")
    print(aggregated.head(10).to_string(index=False))

    # Summary stats
    print(f"\n  Overall stats:")
    print(f"    Avg change: {aggregated['avgChange'].mean():.2f}%")
    print(f"    Avg pct winners: {aggregated['pctWinners'].mean():.1f}%")
    print(f"    Avg pct losers: {aggregated['pctLosers'].mean():.1f}%")
    print(f"    Total households: {aggregated['totalHouseholds'].sum():,.0f}")

    # Save
    aggregated.to_csv(output_csv, index=False)
    print(f"\n  Saved to {output_csv}")

    return aggregated


if __name__ == "__main__":
    # Process both baseline files
    baselines = [
        ("district_obbba_impacts_current_law.csv", "district_aggregates_current_law.csv"),
        ("district_obbba_impacts.csv", "district_aggregates.csv"),
    ]

    static_dir = "/Users/pavelmakarchuk/obbba-household-by-household/static"

    for input_file, output_file in baselines:
        input_path = f"{static_dir}/{input_file}"
        output_path = f"{static_dir}/{output_file}"

        try:
            print(f"\n{'='*60}")
            print(f"Processing {input_file}")
            print('='*60)
            aggregate_districts(input_path, output_path)
        except Exception as e:
            print(f"  Error: {e}")
