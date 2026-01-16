#!/usr/bin/env python3
"""
Congressional district-level OBBBA impact analysis.

This script calculates OBBBA impacts by congressional district,
comparing against both Current Policy (TCJA Expiration) and
Current Law (TCJA Extension) baselines.

Uses state-level datasets from HuggingFace for accurate district identification.
Outputs CSV files for the district explorer visualization.
"""

from datetime import datetime
from reforms import obbba_reversal_reform, tcja_reform
from obbba_reforms import get_obbba_provisions
from district_analysis import calculate_district_obbba_impacts, ALL_STATES


def main():
    print("=" * 60)
    print("Congressional District OBBBA Impact Analysis")
    print("=" * 60)
    print(f"Analysis year: 2026")
    print(f"Dataset: State-level datasets from policyengine-us-data")
    print(f"States to process: {len(ALL_STATES)}")
    print(f"Starting analysis at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Get OBBBA reform provisions to stack
    reforms = get_obbba_provisions()

    print(f"OBBBA provisions to stack ({len(reforms)} total):")
    for i, reform_name in enumerate(reforms.keys(), 1):
        print(f"  {i}. {reform_name}")
    print()

    # =========================================================================
    # Analysis 1: OBBBA vs Current Policy (TCJA Expiration)
    # =========================================================================
    print("=" * 60)
    print("ANALYSIS 1: OBBBA vs Current Policy (TCJA Expiration)")
    print("=" * 60)
    print("Baseline: TCJA Expiration (what happens if Congress did nothing)")
    print("Reform: Stack OBBBA provisions to show full OBBBA impact")
    print()

    # Baseline = TCJA Expiration
    current_policy_baseline = obbba_reversal_reform()

    df_vs_current_policy = calculate_district_obbba_impacts(
        reforms=reforms,
        baseline_reform=current_policy_baseline,
        year=2026
    )

    # Save results
    output_file_1 = "district_obbba_vs_tcja_expiration.csv"
    df_vs_current_policy.to_csv(output_file_1, index=False)
    print(f"\nSaved to '{output_file_1}'")
    print(f"Total households: {len(df_vs_current_policy):,}")
    print(f"Districts with data: {df_vs_current_policy['Congressional District'].nunique()}")

    # =========================================================================
    # Analysis 2: OBBBA vs Current Law (TCJA Extension)
    # =========================================================================
    print("\n" + "=" * 60)
    print("ANALYSIS 2: OBBBA vs Current Law (TCJA Extension)")
    print("=" * 60)
    print("Baseline: TCJA Extension (TCJA extended without new OBBBA provisions)")
    print("Reform: Stack OBBBA provisions to show NEW provision impacts only")
    print()

    # Baseline = TCJA Expiration + TCJA Extension = TCJA Extended
    current_law_baseline = (obbba_reversal_reform(), tcja_reform())

    df_vs_current_law = calculate_district_obbba_impacts(
        reforms=reforms,
        baseline_reform=current_law_baseline,
        year=2026
    )

    # Save results
    output_file_2 = "district_obbba_vs_tcja_extension.csv"
    df_vs_current_law.to_csv(output_file_2, index=False)
    print(f"\nSaved to '{output_file_2}'")
    print(f"Total households: {len(df_vs_current_law):,}")
    print(f"Districts with data: {df_vs_current_law['Congressional District'].nunique()}")

    # =========================================================================
    # Summary
    # =========================================================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Generated 2 CSV files:")
    print(f"  1. {output_file_1}")
    print(f"     OBBBA vs TCJA Expiration (total impact)")
    print(f"  2. {output_file_2}")
    print(f"     OBBBA vs TCJA Extension (new provisions only)")
    print(f"\nAnalysis completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
