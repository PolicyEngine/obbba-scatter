"""
Congressional district-level analysis for OBBBA impacts.
Separate from main analysis to preserve existing structure.
Uses state-level datasets for accurate congressional district identification.
"""

import pandas as pd
import numpy as np
from policyengine_us import Microsimulation


# At-large states (single congressional district) - use 00 in Census GEOID
AT_LARGE_STATES = {"AK", "DE", "MT", "ND", "SD", "VT", "WY"}

# State code to FIPS mapping
STATE_FIPS = {
    "AL": 1, "AK": 2, "AZ": 4, "AR": 5, "CA": 6, "CO": 8, "CT": 9, "DE": 10,
    "DC": 11, "FL": 12, "GA": 13, "HI": 15, "ID": 16, "IL": 17, "IN": 18,
    "IA": 19, "KS": 20, "KY": 21, "LA": 22, "ME": 23, "MD": 24, "MA": 25,
    "MI": 26, "MN": 27, "MS": 28, "MO": 29, "MT": 30, "NE": 31, "NV": 32,
    "NH": 33, "NJ": 34, "NM": 35, "NY": 36, "NC": 37, "ND": 38, "OH": 39,
    "OK": 40, "OR": 41, "PA": 42, "RI": 44, "SC": 45, "SD": 46, "TN": 47,
    "TX": 48, "UT": 49, "VT": 50, "VA": 51, "WA": 53, "WV": 54, "WI": 55,
    "WY": 56
}


def fix_at_large_geoid(geoid, state_code):
    """
    Fix GEOID for at-large states to match Census convention.
    Census uses XX00 for at-large, but policyengine uses XX01.
    """
    if state_code in AT_LARGE_STATES:
        state_fips = STATE_FIPS.get(state_code, 0)
        # Return XX00 format for at-large states
        return state_fips * 100
    return geoid


# All US states and DC
ALL_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
    "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
    "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]


def get_state_dataset_path(state_code):
    """Get the HuggingFace path for a state dataset."""
    return f"hf://policyengine/policyengine-us-data/states/{state_code.upper()}.h5"


def calculate_state_obbba_impacts(reforms, baseline_reform, year, state_code):
    """
    Calculate OBBBA impacts for a single state.

    Parameters:
    -----------
    reforms : dict
        Dictionary of reform names to Reform objects (OBBBA provisions)
    baseline_reform : Reform
        The counterfactual baseline (obbba_reversal or obbba_reversal + tcja)
    year : int
        Tax year to analyze
    state_code : str
        Two-letter state code (e.g., "CA", "TX")

    Returns:
    --------
    pd.DataFrame
        DataFrame with household impacts for this state
    """

    dataset_path = get_state_dataset_path(state_code)

    # Calculate baseline values (counterfactual - without OBBBA)
    print("Calculating baseline values (counterfactual)...")
    baseline = Microsimulation(reform=baseline_reform, dataset=dataset_path)

    # Get household-level baseline values
    baseline_income_tax = baseline.calculate(
        "income_tax", map_to="household", period=year
    ).values
    baseline_net_income = baseline.calculate(
        "household_net_income", map_to="household", period=year
    ).values

    # Get household-level characteristics
    household_id = baseline.calculate(
        "household_id", map_to="household", period=year
    ).values
    state = baseline.calculate("state_code", map_to="household", period=year).values
    congressional_district = baseline.calculate(
        "congressional_district_geoid", map_to="household", period=year
    ).values
    household_weight = baseline.calculate(
        "household_weight", map_to="household", period=year
    ).values
    household_size = baseline.calculate(
        "household_size", map_to="household", period=year
    ).values

    # Get income characteristics for scatter plot
    employment_income = baseline.calculate(
        "irs_employment_income", map_to="household", period=year
    ).values
    agi = baseline.calculate(
        "adjusted_gross_income", map_to="household", period=year
    ).values

    # Fix congressional district GEOID for at-large states
    # Census uses XX00 for at-large, policyengine uses XX01
    congressional_district_fixed = np.array([
        fix_at_large_geoid(int(geoid), state_code)
        for geoid, state_code in zip(congressional_district, state)
    ])

    # Initialize results dictionary
    results = {
        "Household ID": household_id,
        "State": state,
        "Congressional District": congressional_district_fixed,
        "Household Weight": household_weight,
        "Household Size": household_size,
        "Employment Income": employment_income,
        "Adjusted Gross Income": agi,
        "Baseline Federal Tax Liability": baseline_income_tax,
        "Baseline Net Income": baseline_net_income,
    }

    # Track cumulative values
    cumulative_reform = baseline_reform
    previous_income_tax = baseline_income_tax.copy()
    previous_net_income = baseline_net_income.copy()

    # Apply each reform sequentially (stacking OBBBA provisions)
    for reform_name, reform in reforms.items():
        print(f"Processing {reform_name}...")

        # Stack the reform
        cumulative_reform = (cumulative_reform, reform)

        # Calculate with cumulative reforms
        reformed = Microsimulation(reform=cumulative_reform, dataset=dataset_path)

        # Get reformed values
        reformed_income_tax = reformed.calculate(
            "income_tax", map_to="household", period=year
        ).values
        reformed_net_income = reformed.calculate(
            "household_net_income", map_to="household", period=year
        ).values

        # Calculate incremental changes (from previous state)
        tax_change = reformed_income_tax - previous_income_tax
        net_income_change = reformed_net_income - previous_net_income

        # Store results
        results[f"Change in federal tax after {reform_name}"] = tax_change
        results[f"Change in net income after {reform_name}"] = net_income_change

        # Update previous values for next iteration
        previous_income_tax = reformed_income_tax.copy()
        previous_net_income = reformed_net_income.copy()

    # Add final total changes (from baseline to fully reformed = full OBBBA impact)
    results["Final Federal Tax Liability"] = previous_income_tax
    results["Final Net Income"] = previous_net_income
    results["Total change in federal tax"] = previous_income_tax - baseline_income_tax
    results["Total change in net income"] = previous_net_income - baseline_net_income

    # Calculate percentage changes
    pct_tax_change = np.zeros_like(baseline_income_tax)
    mask = baseline_income_tax != 0
    pct_tax_change[mask] = (
        results["Total change in federal tax"][mask]
        / np.abs(baseline_income_tax[mask])
    ) * 100
    results["Percentage change in federal tax"] = pct_tax_change

    pct_net_income_change = np.zeros_like(baseline_net_income)
    mask = baseline_net_income != 0
    pct_net_income_change[mask] = (
        results["Total change in net income"][mask]
        / np.abs(baseline_net_income[mask])
    ) * 100
    results["Percentage change in net income"] = pct_net_income_change

    # Create DataFrame
    df = pd.DataFrame(results)

    # Add state code column for reference
    df["State Code"] = state_code

    return df


def calculate_district_obbba_impacts(reforms, baseline_reform, year, states=None):
    """
    Calculate OBBBA impacts across all states using state-level datasets.

    Parameters:
    -----------
    reforms : dict
        Dictionary of reform names to Reform objects (OBBBA provisions)
    baseline_reform : Reform
        The counterfactual baseline (obbba_reversal or obbba_reversal + tcja)
    year : int
        Tax year to analyze
    states : list, optional
        List of state codes to process. If None, processes all states.

    Returns:
    --------
    pd.DataFrame
        Combined DataFrame with household impacts from all states
    """

    if states is None:
        states = ALL_STATES

    all_results = []
    failed_states = []

    for i, state_code in enumerate(states, 1):
        print(f"\n{'='*60}")
        print(f"Processing {state_code} ({i}/{len(states)})")
        print(f"{'='*60}")

        try:
            df_state = calculate_state_obbba_impacts(
                reforms=reforms,
                baseline_reform=baseline_reform,
                year=year,
                state_code=state_code
            )
            all_results.append(df_state)
            print(f"  -> {len(df_state):,} households, "
                  f"{df_state['Congressional District'].nunique()} districts")
        except Exception as e:
            print(f"  -> ERROR: {e}")
            failed_states.append(state_code)
            continue

    if failed_states:
        print(f"\nWarning: Failed to process {len(failed_states)} states: {failed_states}")

    # Combine all state results
    if all_results:
        combined_df = pd.concat(all_results, ignore_index=True)
        print(f"\nCombined results: {len(combined_df):,} total households")
        print(f"Total districts: {combined_df['Congressional District'].nunique()}")
        return combined_df
    else:
        raise ValueError("No states were successfully processed")
