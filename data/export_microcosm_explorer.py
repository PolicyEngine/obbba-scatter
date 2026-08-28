"""Export the paper's certified Microcosm household results for the Explorer.

The OBBBA paper stores one household outcome frame for the TCJA-expiration
baseline and after each of 21 sequential provisions. This exporter reshapes
those committed frames into the legacy CSV schema consumed by the Svelte app.

It intentionally exports only the TCJA-expiration comparison. The paper does
not contain a corresponding Microcosm stack against a TCJA-extension baseline.

Run with the exact paper environment (policyengine.py 5.0.1):

    VIRTUAL_ENV=../obbba-paper/.venv-pe501 uv run --active --no-sync \
      python data/export_microcosm_explorer.py \
      --paper-root ../obbba-paper \
      --output static/household_tax_income_changes_microcosm_buildp.csv
"""

from __future__ import annotations

import argparse
import importlib.metadata as metadata
import json
from pathlib import Path

import numpy as np
import pandas as pd

YEAR = 2026
EXPECTED_POLICYENGINE_VERSION = "5.0.1"
EXPECTED_MODEL_VERSION = "1.764.6"
EXPECTED_BUILD_ID = "populace-us-2024-buildp-sparse-rmloss100-cae8640-20260728T011454Z"
EXPECTED_HOUSEHOLDS = 57_240

STEPS = [
    ("Tax rates", "Tax Rate Reform"),
    ("Standard deduction", "Standard Deduction Reform"),
    ("Personal exemption (continued suspension)", "Exemption Reform"),
    ("CTC SSN requirement", "CTC SSN Requirement"),
    ("CTC expansion", "CTC Expansion"),
    ("CDCC expansion", "CDCC Reform"),
    ("QBI deduction", "QBI Deduction Reform"),
    ("AMT", "AMT Reform"),
    ("Miscellaneous deductions", "Miscellaneous Reform"),
    ("Casualty loss repeal", "Casualty loss deduction repeal"),
    ("Other itemized deductions", "Other Itemized Deductions Reform"),
    (
        "Itemized deduction limitation",
        "Limitation on Itemized Deductions Reform",
    ),
    ("Estate tax", "Estate Tax Reform"),
    ("SALT cap", "SALT Cap Reform"),
    ("Tip exemption", "Tip Income Exemption"),
    ("Overtime exemption", "Overtime Exemption"),
    ("Senior deduction", "Senior Deduction"),
    ("Auto loan interest deduction", "Auto Loan Interest"),
    ("SNAP participation", "SNAP Takeup Reform"),
    ("ACA participation", "ACA Takeup Reform"),
    ("Medicaid participation", "Medicaid Takeup Reform"),
]

ACA_STEP_INDEX = next(
    i for i, (label, _) in enumerate(STEPS) if label == "ACA participation"
)


def _bundle_manifest() -> dict:
    distribution = metadata.distribution("policyengine")
    path = Path(distribution.locate_file("policyengine/data/bundle/manifest.json"))
    return json.loads(path.read_text())["data_releases"]["us"]


def check_environment() -> dict:
    """Fail if the export environment differs from the paper's certified stack."""

    pe_version = metadata.version("policyengine")
    model_version = metadata.version("policyengine-us")
    manifest = _bundle_manifest()
    build_id = manifest["build_id"]
    actual = (pe_version, model_version, build_id)
    expected = (
        EXPECTED_POLICYENGINE_VERSION,
        EXPECTED_MODEL_VERSION,
        EXPECTED_BUILD_ID,
    )
    if actual != expected:
        raise RuntimeError(
            "Exporter must run on the paper's certified stack. "
            f"Expected {expected}; found {actual}."
        )
    return manifest


def calculate_profile() -> pd.DataFrame:
    """Calculate display-only profile fields on the certified baseline data."""

    import policyengine as pe

    sim = pe.us.managed_microsimulation()

    household_variables = {
        "Household ID": "household_id",
        "State": "state_code",
        "Household Size": "household_size",
        "Employment Income": "irs_employment_income",
        "Self-Employment Income": "self_employment_income",
        "Capital Gains": "capital_gains",
        "Dividend Income": "dividend_income",
        "Farm Income": "farm_income",
        "Taxable Interest Income": "taxable_interest_income",
        "Rental Income": "rental_income",
        "Taxable Unemployment Compensation": "taxable_unemployment_compensation",
        "Miscellaneous Income": "miscellaneous_income",
        "Taxable Retirement Distributions": "taxable_retirement_distributions",
        "Taxable Pension Income": "taxable_pension_income",
        "Taxable Social Security": "taxable_social_security",
        "Property Taxes": "real_estate_taxes",
        "Tip Income": "tip_income",
        "Overtime Income": "fsla_overtime_premium",
        "Auto Loan Interest": "auto_loan_interest",
        "Social Security Benefits": "social_security",
        "Gross Income": "irs_gross_income",
        "Adjusted Gross Income": "adjusted_gross_income",
        "Market Income": "household_market_income",
    }
    profile = pd.DataFrame(
        {
            label: sim.calc(variable, map_to="household", period=YEAR).values
            for label, variable in household_variables.items()
        }
    )

    person = pd.DataFrame(
        {
            "household_id": sim.calc(
                "household_id", map_to="person", period=YEAR
            ).values,
            "tax_unit_id": sim.calc("tax_unit_id", map_to="person", period=YEAR).values,
            "age": sim.calc("age", map_to="person", period=YEAR).values,
            "is_head": sim.calc(
                "is_tax_unit_head", map_to="person", period=YEAR
            ).values.astype(bool),
            "is_spouse": sim.calc(
                "is_tax_unit_spouse", map_to="person", period=YEAR
            ).values.astype(bool),
            "is_dependent": sim.calc(
                "is_tax_unit_dependent", map_to="person", period=YEAR
            ).values.astype(bool),
            "is_married": sim.calc(
                "is_married", map_to="person", period=YEAR
            ).values.astype(bool),
        }
    )

    household_ids = profile["Household ID"].to_numpy()
    heads = person[person.is_head].sort_values(["household_id", "tax_unit_id"])
    first_tax_unit = heads.groupby("household_id").tax_unit_id.first()
    person["is_first_tax_unit"] = person.tax_unit_id.eq(
        person.household_id.map(first_tax_unit)
    )
    first = person[person.is_first_tax_unit]

    profile["Number of Tax Units"] = (
        heads.groupby("household_id")
        .tax_unit_id.nunique()
        .reindex(household_ids)
        .fillna(1)
        .to_numpy()
    )
    profile["Age of Head"] = (
        first[first.is_head]
        .groupby("household_id")
        .age.first()
        .reindex(household_ids)
        .to_numpy()
    )
    profile["Age of Spouse"] = (
        first[first.is_spouse]
        .groupby("household_id")
        .age.first()
        .reindex(household_ids)
        .to_numpy()
    )
    profile["Is Married"] = (
        first[first.is_head]
        .groupby("household_id")
        .is_married.first()
        .reindex(household_ids)
        .fillna(False)
        .to_numpy()
    )

    dependents = first[first.is_dependent].copy()
    dependents["rank"] = dependents.groupby("household_id").cumcount() + 1
    profile["Number of Dependents"] = (
        dependents.groupby("household_id")
        .size()
        .reindex(household_ids)
        .fillna(0)
        .to_numpy()
    )
    for rank in range(1, int(dependents["rank"].max()) + 1):
        profile[f"Age of Dependent {rank}"] = (
            dependents[dependents["rank"].eq(rank)]
            .set_index("household_id")
            .age.reindex(household_ids)
            .to_numpy()
        )
    return profile


def load_frames(paper_root: Path) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    """Load and reconstruct the paper's health-inclusive resource frames."""

    results = paper_root / "results" / "national_populace"
    meta = pd.read_parquet(results / "meta.parquet")
    raw = {
        "baseline": pd.read_parquet(results / "baseline.parquet"),
        **{
            f"step{i:02d}": pd.read_parquet(results / f"step{i:02d}.parquet")
            for i in range(len(STEPS))
        },
    }
    if len(meta) != EXPECTED_HOUSEHOLDS:
        raise ValueError(
            f"Expected {EXPECTED_HOUSEHOLDS:,} households; found {len(meta):,}."
        )
    if not all(len(frame) == len(meta) for frame in raw.values()):
        raise ValueError(
            "Paper result frames do not have a common household row count."
        )

    baseline_ptc = raw["baseline"]["assigned_aca_ptc"].to_numpy(dtype="float64")
    frames: dict[str, pd.DataFrame] = {}
    for name, frame in raw.items():
        frame = frame.astype("float64").copy()
        if name == "baseline":
            assigned_ptc = baseline_ptc
        else:
            index = int(name.removeprefix("step"))
            assigned_ptc = (
                frame["assigned_aca_ptc"].to_numpy()
                if index >= ACA_STEP_INDEX
                else baseline_ptc
            )
        frame["resource"] = (
            frame["net_income"] + frame["medicaid"] + frame["chip"] + assigned_ptc
        )
        frame["benefits_including_health"] = (
            frame["cash_benefits"] + frame["medicaid"] + frame["chip"] + assigned_ptc
        )
        frame["assigned_ptc_for_resource"] = assigned_ptc
        frames[name] = frame
    return meta, frames


def build_export(
    paper_root: Path,
    profile_cache: Path | None = None,
) -> pd.DataFrame:
    """Build the Explorer CSV and assert record-level accounting closure."""

    meta, frames = load_frames(paper_root)
    if profile_cache and profile_cache.exists():
        profile = pd.read_parquet(profile_cache)
    else:
        profile = calculate_profile()
        if profile_cache:
            profile_cache.parent.mkdir(parents=True, exist_ok=True)
            profile.to_parquet(profile_cache, index=False)

    if len(profile) != len(meta):
        raise ValueError("Profile and paper frames have different row counts.")
    if not np.array_equal(
        profile["Household ID"].to_numpy(), meta["household_id"].to_numpy()
    ):
        raise ValueError("Profile and paper frames have different household ordering.")

    baseline = frames["baseline"]
    output = profile.copy()
    output["Household Weight"] = meta["weight"].to_numpy()
    output["State Income Tax"] = baseline["state_tax"].to_numpy()
    output["Baseline Federal Tax Liability"] = baseline["federal_tax"].to_numpy()
    output["Baseline Net Income"] = baseline["resource"].to_numpy()
    output["Baseline Benefits"] = baseline["cash_benefits"].to_numpy()
    output["Baseline Medicaid"] = baseline["medicaid"].to_numpy()
    output["Baseline ACA PTC"] = baseline["assigned_ptc_for_resource"].to_numpy()
    output["Baseline CHIP"] = baseline["chip"].to_numpy()
    output["Baseline Total Benefits"] = baseline["benefits_including_health"].to_numpy()

    previous = baseline
    provision_columns: list[str] = []
    for index, (_, suffix) in enumerate(STEPS):
        current = frames[f"step{index:02d}"]
        changes = {
            f"Change in federal tax liability after {suffix}": (
                current["federal_tax"] - previous["federal_tax"]
            ),
            f"Change in state tax liability after {suffix}": (
                current["state_tax"] - previous["state_tax"]
            ),
            f"Change in benefits after {suffix}": (
                current["benefits_including_health"]
                - previous["benefits_including_health"]
            ),
            f"Change in net income after {suffix}": (
                current["resource"] - previous["resource"]
            ),
        }
        for column, values in changes.items():
            output[column] = values.to_numpy()
        provision_columns.append(f"Change in net income after {suffix}")
        previous = current

    # Defragment after adding the repeated provision columns so the final
    # summary columns and CSV serialization stay efficient.
    output = output.copy()
    output["Total change in federal tax liability"] = (
        previous["federal_tax"] - baseline["federal_tax"]
    ).to_numpy()
    output["Total change in state tax liability"] = (
        previous["state_tax"] - baseline["state_tax"]
    ).to_numpy()
    output["Total change in benefits"] = (
        previous["benefits_including_health"] - baseline["benefits_including_health"]
    ).to_numpy()
    output["Total change in net income"] = (
        previous["resource"] - baseline["resource"]
    ).to_numpy()

    baseline_resource = output["Baseline Net Income"].to_numpy()
    total_change = output["Total change in net income"].to_numpy()
    output["Percentage change in net income"] = np.divide(
        total_change * 100,
        np.abs(baseline_resource),
        out=np.full_like(total_change, np.nan),
        where=baseline_resource != 0,
    )

    rowwise_sum = output[provision_columns].sum(axis=1).to_numpy()
    max_error = float(np.abs(rowwise_sum - total_change).max())
    if max_error > 0.05:
        raise ValueError(
            f"Provision totals fail rowwise closure: max ${max_error:.2f}."
        )
    if not output["Household ID"].is_unique:
        raise ValueError("Household IDs are not unique.")
    return output


def summarize(frame: pd.DataFrame) -> dict[str, float | int]:
    """Return the paper headline checks for the generated artifact."""

    weight = frame["Household Weight"].to_numpy(dtype="float64")
    change = frame["Total change in net income"].to_numpy(dtype="float64")
    total_weight = weight.sum()
    return {
        "households": len(frame),
        "weighted_households": total_weight,
        "total_resource_change_billion": float((change * weight).sum() / 1e9),
        "average_resource_change": float((change * weight).sum() / total_weight),
        "percent_gaining": float(100 * weight[change > 1].sum() / total_weight),
        "percent_losing": float(100 * weight[change < -1].sum() / total_weight),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paper-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile-cache", type=Path)
    parser.add_argument("--manifest-output", type=Path)
    args = parser.parse_args()

    bundle = check_environment()
    frame = build_export(args.paper_root.resolve(), args.profile_cache)
    summary = summarize(frame)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output, index=False, float_format="%.8g")

    manifest = {
        "dataset": "populace_us_2024",
        "build_id": EXPECTED_BUILD_ID,
        "policyengine_version": EXPECTED_POLICYENGINE_VERSION,
        "policyengine_us_version": EXPECTED_MODEL_VERSION,
        "dataset_sha256": bundle["certified_data_artifact"]["sha256"],
        "year": YEAR,
        "baseline": "TCJA expiration",
        "resource_measure": (
            "Cash net income plus Medicaid, CHIP, and enrollee-assigned ACA "
            "premium tax credits at program cost"
        ),
        "provision_order": [label for label, _ in STEPS],
        **summary,
    }
    manifest_path = args.manifest_output or args.output.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))
    print(f"Wrote {args.output} ({args.output.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
