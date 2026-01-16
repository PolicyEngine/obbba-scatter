"""
Aggregate provision-level impacts by congressional district.
Computes weighted absolute impact for each provision per district.
"""
import pandas as pd
import json

# Provision names (from column headers)
PROVISIONS = [
    "Tax Rate Reform",
    "Standard Deduction Reform",
    "Exemption Reform",
    "CTC SSN Requirement",
    "CTC Expansion",
    "CDCC Reform",
    "QBI Deduction Reform",
    "AMT Reform",
    "Miscellaneous Reform",
    "Casualty Loss Repeal",
    "Other Itemized Deductions Reform",
    "Limitation on Itemized Deductions Reform",
    "Estate Tax Reform",
    "SALT Cap Reform",
    "Tip Income Exemption",
    "Overtime Exemption",
    "Senior Deduction",
    "Auto Loan Interest",
    "SNAP Takeup Reform",
    "ACA Takeup Reform",
    "Medicaid Takeup Reform",
]

# Short names for display
PROVISION_SHORT_NAMES = {
    "Tax Rate Reform": "Tax Rates",
    "Standard Deduction Reform": "Std Deduction",
    "Exemption Reform": "Exemptions",
    "CTC SSN Requirement": "CTC SSN Req",
    "CTC Expansion": "CTC Expansion",
    "CDCC Reform": "CDCC",
    "QBI Deduction Reform": "QBI Deduction",
    "AMT Reform": "AMT",
    "Miscellaneous Reform": "Misc",
    "Casualty Loss Repeal": "Casualty Loss",
    "Other Itemized Deductions Reform": "Other Itemized",
    "Limitation on Itemized Deductions Reform": "Itemized Limit",
    "Estate Tax Reform": "Estate Tax",
    "SALT Cap Reform": "SALT Cap",
    "Tip Income Exemption": "Tip Exemption",
    "Overtime Exemption": "Overtime Exemption",
    "Senior Deduction": "Senior Deduction",
    "Auto Loan Interest": "Auto Loan Int",
    "SNAP Takeup Reform": "SNAP Takeup",
    "ACA Takeup Reform": "ACA Takeup",
    "Medicaid Takeup Reform": "Medicaid Takeup",
}

# Mapping for districts that differ between CSV and GeoJSON
CSV_TO_GEOJSON_MAP = {
    1101: 1198,  # DC delegate district
    3000: 3001,  # Montana at-large → district 1
}


def aggregate_provisions(input_csv: str, output_json: str):
    """
    Aggregate provision impacts by district.

    For each district and provision, computes:
    - totalImpact: sum of (change * weight) - total $ impact
    - avgImpact: totalImpact / sum(weights) - avg $ per household
    """
    print(f"Loading {input_csv}...")
    df = pd.read_csv(input_csv)
    print(f"  Loaded {len(df):,} households")

    # Key columns
    district_col = "Congressional District"
    weight_col = "Household Weight"

    # Map district IDs to GeoJSON format
    df["GeoJSON_District"] = df[district_col].map(
        lambda x: CSV_TO_GEOJSON_MAP.get(x, x)
    )

    # Build provision column mapping
    provision_cols = {}
    for provision in PROVISIONS:
        col_name = f"Change in net income after {provision}"
        if col_name in df.columns:
            provision_cols[provision] = col_name
        else:
            print(f"  Warning: Column not found: {col_name}")

    print(f"  Found {len(provision_cols)} provision columns")

    # Group by district and compute aggregates
    print("Computing provision aggregates by district...")

    results = {}

    for district, group in df.groupby("GeoJSON_District"):
        district = int(district)
        weights = group[weight_col].values
        total_weight = weights.sum()

        if total_weight == 0:
            continue

        provision_impacts = []

        for provision, col in provision_cols.items():
            changes = group[col].values

            # Total weighted impact (sum of change * weight)
            total_impact = (changes * weights).sum()

            # Average impact per household
            avg_impact = total_impact / total_weight

            provision_impacts.append({
                "name": provision,
                "shortName": PROVISION_SHORT_NAMES.get(provision, provision),
                "totalImpact": round(total_impact),
                "avgImpact": round(avg_impact, 2),
            })

        # Sort by absolute average impact (largest first)
        provision_impacts.sort(key=lambda x: abs(x["avgImpact"]), reverse=True)

        results[district] = provision_impacts

    # Handle Montana duplication
    if 3001 in results:
        results[3002] = results[3001]

    print(f"  Computed provision impacts for {len(results)} districts")

    # Show sample
    sample_district = list(results.keys())[0]
    print(f"\n  Sample (District {sample_district}):")
    for p in results[sample_district][:5]:
        print(f"    {p['shortName']}: ${p['avgImpact']:+,.0f}/household")

    # Save as JSON
    with open(output_json, 'w') as f:
        json.dump(results, f)

    print(f"\n  Saved to {output_json}")

    return results


if __name__ == "__main__":
    static_dir = "/Users/pavelmakarchuk/obbba-household-by-household/static"

    # Process both baselines
    baselines = [
        ("district_obbba_impacts.csv", "provision_impacts.json"),
        ("district_obbba_impacts_current_law.csv", "provision_impacts_current_law.json"),
    ]

    for input_file, output_file in baselines:
        input_path = f"{static_dir}/{input_file}"
        output_path = f"{static_dir}/{output_file}"

        try:
            print(f"\n{'='*60}")
            print(f"Processing {input_file}")
            print('='*60)
            aggregate_provisions(input_path, output_path)
        except Exception as e:
            print(f"  Error: {e}")
