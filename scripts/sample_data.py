import csv
import json
import os
import random

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(BASE_DIR, '..', 'public', 'household_tax_income_changes_senate_current_law_baseline.csv')
OUTPUT_JSON = os.path.join(BASE_DIR, '..', 'public', 'household_tax_income_changes_sample.json')
SAMPLE_FRACTION = 0.25

# Columns to keep
KEEP_COLS = {
    'Gross Income': 'income',
    'Percentage Change in Net Income': 'pct_change',
    'Total Change in Net Income': 'net_change'
}

def main():
    random.seed(42)
    sample = []
    with open(INPUT_CSV, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if random.random() <= SAMPLE_FRACTION:
                item = {}
                for col, new_key in KEEP_COLS.items():
                    value = row[col]
                    # Convert to float if possible
                    try:
                        value = float(value)
                    except ValueError:
                        value = None
                    item[new_key] = value
                sample.append(item)

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(sample, f, separators=(',', ':'))
    print(f"Wrote {len(sample)} rows to {OUTPUT_JSON}")

if __name__ == '__main__':
    main()
