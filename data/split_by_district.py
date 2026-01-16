#!/usr/bin/env python3
"""Split the large district impact files into per-district files for on-demand loading."""

import os
import csv
from collections import defaultdict

def split_by_district(input_csv: str, output_dir: str):
    """Split a CSV file into separate files per congressional district."""

    os.makedirs(output_dir, exist_ok=True)

    # Read and group by district
    districts = defaultdict(list)
    headers = None

    print(f"Reading {input_csv}...")
    with open(input_csv, 'r') as f:
        reader = csv.reader(f)
        headers = next(reader)

        # Find the Congressional District column
        cd_idx = headers.index('Congressional District')

        for row in reader:
            district = row[cd_idx]
            districts[district].append(row)

    print(f"Found {len(districts)} districts")

    # Write each district to a separate file
    for district, rows in districts.items():
        output_file = os.path.join(output_dir, f"district_{district}.csv")
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(rows)
        print(f"  District {district}: {len(rows)} households")

    print(f"\nWrote {len(districts)} district files to {output_dir}")


if __name__ == "__main__":
    # Split TCJA expiration baseline (obbba-vs-current-policy)
    print("=== Splitting TCJA Expiration (obbba-vs-current-policy) ===")
    split_by_district(
        "static/district_obbba_impacts.csv",
        "static/districts/tcja-expiration"
    )

    print("\n=== Splitting TCJA Extension (obbba-vs-current-law) ===")
    split_by_district(
        "static/district_obbba_impacts_current_law.csv",
        "static/districts/tcja-extension"
    )
