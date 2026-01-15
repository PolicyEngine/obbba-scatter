"""
OBBBA provision reforms for district-level analysis.

These reforms revert parameters from TCJA expiration (obbba_reversal baseline)
back to OBBBA/current law values. Stack these on top of obbba_reversal_reform()
to build up OBBBA impact incrementally.

Usage:
    baseline = obbba_reversal_reform()  # TCJA expiration
    reforms = get_obbba_provisions()     # Stack these to get back to OBBBA
"""

from policyengine_core.reforms import Reform


def obbba_tax_rate_reform():
    """
    OBBBA tax rate provisions.
    Reverts rates AND thresholds from TCJA expiration back to TCJA/OBBBA values.
    """
    return Reform.from_dict({
        # Tax rates
        "gov.irs.income.bracket.rates.2": {"2026-01-01.2100-12-31": 0.12},
        "gov.irs.income.bracket.rates.3": {"2026-01-01.2100-12-31": 0.22},
        "gov.irs.income.bracket.rates.4": {"2026-01-01.2100-12-31": 0.24},
        "gov.irs.income.bracket.rates.5": {"2026-01-01.2100-12-31": 0.32},
        "gov.irs.income.bracket.rates.7": {"2026-01-01.2100-12-31": 0.37},
        # Bracket thresholds - JOINT (from PolicyEngine 2026 defaults)
        "gov.irs.income.bracket.thresholds.1.JOINT": {"2026-01-01.2026-12-31": 24800},
        "gov.irs.income.bracket.thresholds.2.JOINT": {"2026-01-01.2026-12-31": 100800},
        "gov.irs.income.bracket.thresholds.3.JOINT": {"2026-01-01.2026-12-31": 211400},
        "gov.irs.income.bracket.thresholds.4.JOINT": {"2026-01-01.2026-12-31": 403550},
        "gov.irs.income.bracket.thresholds.5.JOINT": {"2026-01-01.2026-12-31": 512450},
        "gov.irs.income.bracket.thresholds.6.JOINT": {"2026-01-01.2026-12-31": 768700},
        # Bracket thresholds - SINGLE
        "gov.irs.income.bracket.thresholds.1.SINGLE": {"2026-01-01.2026-12-31": 12400},
        "gov.irs.income.bracket.thresholds.2.SINGLE": {"2026-01-01.2026-12-31": 50400},
        "gov.irs.income.bracket.thresholds.3.SINGLE": {"2026-01-01.2026-12-31": 105700},
        "gov.irs.income.bracket.thresholds.4.SINGLE": {"2026-01-01.2026-12-31": 201775},
        "gov.irs.income.bracket.thresholds.5.SINGLE": {"2026-01-01.2026-12-31": 256225},
        "gov.irs.income.bracket.thresholds.6.SINGLE": {"2026-01-01.2026-12-31": 640600},
        # Bracket thresholds - SEPARATE
        "gov.irs.income.bracket.thresholds.1.SEPARATE": {"2026-01-01.2026-12-31": 12400},
        "gov.irs.income.bracket.thresholds.2.SEPARATE": {"2026-01-01.2026-12-31": 50400},
        "gov.irs.income.bracket.thresholds.3.SEPARATE": {"2026-01-01.2026-12-31": 105700},
        "gov.irs.income.bracket.thresholds.4.SEPARATE": {"2026-01-01.2026-12-31": 201775},
        "gov.irs.income.bracket.thresholds.5.SEPARATE": {"2026-01-01.2026-12-31": 256225},
        "gov.irs.income.bracket.thresholds.6.SEPARATE": {"2026-01-01.2026-12-31": 384350},
        # Bracket thresholds - HEAD_OF_HOUSEHOLD
        "gov.irs.income.bracket.thresholds.1.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 17700},
        "gov.irs.income.bracket.thresholds.2.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 67450},
        "gov.irs.income.bracket.thresholds.3.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 105700},
        "gov.irs.income.bracket.thresholds.4.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 201750},
        "gov.irs.income.bracket.thresholds.5.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 256200},
        "gov.irs.income.bracket.thresholds.6.HEAD_OF_HOUSEHOLD": {"2026-01-01.2026-12-31": 640600},
        # Bracket thresholds - SURVIVING_SPOUSE
        "gov.irs.income.bracket.thresholds.1.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 24800},
        "gov.irs.income.bracket.thresholds.2.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 100800},
        "gov.irs.income.bracket.thresholds.3.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 211400},
        "gov.irs.income.bracket.thresholds.4.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 403550},
        "gov.irs.income.bracket.thresholds.5.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 512450},
        "gov.irs.income.bracket.thresholds.6.SURVIVING_SPOUSE": {"2026-01-01.2026-12-31": 768700},
    }, country_id="us")


def obbba_standard_deduction_reform():
    """
    OBBBA standard deduction provisions.
    Reverts to higher TCJA/OBBBA standard deduction amounts.
    """
    return Reform.from_dict({
        "gov.irs.deductions.standard.amount.JOINT": {
            "2026-01-01.2026-12-31": 32200,
        },
        "gov.irs.deductions.standard.amount.SINGLE": {
            "2026-01-01.2026-12-31": 16100,
        },
        "gov.irs.deductions.standard.amount.SEPARATE": {
            "2026-01-01.2026-12-31": 16100,
        },
        "gov.irs.deductions.standard.amount.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2026-12-31": 24175,
        },
        "gov.irs.deductions.standard.amount.SURVIVING_SPOUSE": {
            "2026-01-01.2026-12-31": 32200,
        },
    }, country_id="us")


def obbba_exemption_reform():
    """
    OBBBA personal exemption provisions.
    Sets exemption to 0 (TCJA eliminated personal exemptions).
    """
    return Reform.from_dict({
        "gov.irs.income.exemption.amount": {"2026-01-01.2100-12-31": 0},
    }, country_id="us")


def obbba_ctc_reform():
    """
    OBBBA Child Tax Credit provisions.
    Reverts to OBBBA CTC values including SSN requirement.
    """
    return Reform.from_dict({
        "gov.irs.credits.ctc.amount.base[0].amount": {
            "2026-01-01.2100-12-31": 2200
        },
        "gov.irs.credits.ctc.amount.adult_dependent": {
            "2026-01-01.2100-12-31": 500
        },
        "gov.irs.credits.ctc.phase_out.threshold.JOINT": {
            "2026-01-01.2100-12-31": 400000
        },
        "gov.irs.credits.ctc.phase_out.threshold.SINGLE": {
            "2026-01-01.2100-12-31": 200000
        },
        "gov.irs.credits.ctc.phase_out.threshold.SEPARATE": {
            "2026-01-01.2100-12-31": 200000
        },
        "gov.irs.credits.ctc.phase_out.threshold.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2100-12-31": 200000
        },
        "gov.irs.credits.ctc.phase_out.threshold.SURVIVING_SPOUSE": {
            "2026-01-01.2100-12-31": 400000
        },
        "gov.irs.credits.ctc.refundable.individual_max": {
            "2026-01-01.2026-12-31": 1800,
        },
        "gov.irs.credits.ctc.refundable.phase_in.threshold": {
            "2026-01-01.2100-12-31": 2500
        },
        # SSN requirement for CTC (OBBBA provision)
        "gov.irs.credits.ctc.adult_ssn_requirement_applies": {
            "2026-01-01.2100-12-31": True
        },
    }, country_id="us")


def obbba_cdcc_reform():
    """
    OBBBA Child and Dependent Care Credit provisions.
    Reverts to OBBBA CDCC values.
    """
    return Reform.from_dict({
        "gov.irs.credits.cdcc.phase_out.max": {
            "2026-01-01.2100-12-31": 0.5
        },
        "gov.irs.credits.cdcc.phase_out.min": {
            "2026-01-01.2100-12-31": 0.2
        },
        "gov.irs.credits.cdcc.phase_out.amended_structure.applies": {
            "2026-01-01.2100-12-31": True
        },
    }, country_id="us")


def obbba_qbi_reform():
    """
    OBBBA Qualified Business Income Deduction provisions.
    Reverts to TCJA/OBBBA QBI deduction including floor.
    """
    return Reform.from_dict({
        "gov.irs.deductions.qbi.max.rate": {"2026-01-01.2100-12-31": 0.2},
        "gov.irs.deductions.qbi.max.w2_wages.rate": {"2026-01-01.2100-12-31": 0.5},
        "gov.irs.deductions.qbi.max.w2_wages.alt_rate": {"2026-01-01.2100-12-31": 0.25},
        "gov.irs.deductions.qbi.max.business_property.rate": {"2026-01-01.2100-12-31": 0.025},
        # QBI deduction floor (OBBBA provision)
        "gov.irs.deductions.qbi.deduction_floor.amount[1].amount": {"2026-01-01.2100-12-31": 5000},
    }, country_id="us")


def obbba_amt_reform():
    """
    OBBBA Alternative Minimum Tax provisions.
    Reverts to higher TCJA/OBBBA AMT exemptions.
    """
    return Reform.from_dict({
        "gov.irs.income.amt.exemption.amount.JOINT": {
            "2026-01-01.2026-12-31": 139100,
        },
        "gov.irs.income.amt.exemption.amount.SINGLE": {
            "2026-01-01.2026-12-31": 89400,
        },
        "gov.irs.income.amt.exemption.amount.SEPARATE": {
            "2026-01-01.2026-12-31": 69500,
        },
        "gov.irs.income.amt.exemption.amount.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2026-12-31": 89400,
        },
        "gov.irs.income.amt.exemption.amount.SURVIVING_SPOUSE": {
            "2026-01-01.2026-12-31": 139100,
        },
        "gov.irs.income.amt.exemption.phase_out.start.JOINT": {
            "2026-01-01.2026-12-31": 1271900,
        },
        "gov.irs.income.amt.exemption.phase_out.start.SINGLE": {
            "2026-01-01.2026-12-31": 635900,
        },
        "gov.irs.income.amt.exemption.phase_out.start.SEPARATE": {
            "2026-01-01.2026-12-31": 635900,
        },
        "gov.irs.income.amt.exemption.phase_out.start.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2026-12-31": 635900,
        },
        "gov.irs.income.amt.exemption.phase_out.start.SURVIVING_SPOUSE": {
            "2026-01-01.2026-12-31": 1271900,
        },
    }, country_id="us")


def obbba_salt_reform():
    """
    OBBBA SALT cap provisions.
    Reverts to OBBBA SALT cap (higher than TCJA $10K) with phase-out.
    """
    return Reform.from_dict({
        "gov.irs.deductions.itemized.salt_and_real_estate.cap.JOINT": {
            "2026-01-01.2100-12-31": 40000
        },
        "gov.irs.deductions.itemized.salt_and_real_estate.cap.SINGLE": {
            "2026-01-01.2100-12-31": 20000
        },
        "gov.irs.deductions.itemized.salt_and_real_estate.cap.SEPARATE": {
            "2026-01-01.2100-12-31": 20000
        },
        "gov.irs.deductions.itemized.salt_and_real_estate.cap.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2100-12-31": 20000
        },
        "gov.irs.deductions.itemized.salt_and_real_estate.cap.SURVIVING_SPOUSE": {
            "2026-01-01.2100-12-31": 40000
        },
        # SALT phase-out parameters (OBBBA provision)
        "gov.irs.deductions.itemized.salt_and_real_estate.phase_out.in_effect": {
            "2026-01-01.2100-12-31": True
        },
        "gov.irs.deductions.itemized.salt_and_real_estate.phase_out.floor.applies": {
            "2026-01-01.2100-12-31": True
        },
    }, country_id="us")


def obbba_tip_income_reform():
    """
    OBBBA tip income exemption.
    Sets tip income deduction cap (new OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.deductions.tip_income.cap": {
            "2026-01-01.2100-12-31": 25000
        },
    }, country_id="us")


def obbba_overtime_reform():
    """
    OBBBA overtime income exemption.
    Sets overtime income deduction cap (new OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.deductions.overtime_income.cap.JOINT": {
            "2026-01-01.2100-12-31": 25000
        },
        "gov.irs.deductions.overtime_income.cap.SINGLE": {
            "2026-01-01.2100-12-31": 25000
        },
        "gov.irs.deductions.overtime_income.cap.SEPARATE": {
            "2026-01-01.2100-12-31": 25000
        },
        "gov.irs.deductions.overtime_income.cap.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2100-12-31": 25000
        },
        "gov.irs.deductions.overtime_income.cap.SURVIVING_SPOUSE": {
            "2026-01-01.2100-12-31": 25000
        },
    }, country_id="us")


def obbba_senior_deduction_reform():
    """
    OBBBA senior standard deduction addition.
    Sets additional senior deduction (new OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.deductions.senior_deduction.amount": {
            "2026-01-01.2100-12-31": 6000
        },
    }, country_id="us")


def obbba_auto_loan_reform():
    """
    OBBBA auto loan interest deduction.
    Sets auto loan interest deduction cap (new OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.deductions.auto_loan_interest.cap": {
            "2026-01-01.2100-12-31": 10000
        },
    }, country_id="us")


def obbba_misc_reform():
    """
    OBBBA miscellaneous itemized deductions.
    Disables misc itemized deductions and casualty deductions (TCJA/OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.deductions.itemized.misc.applies": {
            "2026-01-01.2100-12-31": False
        },
        # Casualty deduction disabled under TCJA/OBBBA
        "gov.irs.deductions.itemized.casualty.active": {
            "2026-01-01.2100-12-31": False
        },
    }, country_id="us")


def obbba_other_item_reform():
    """
    OBBBA other itemized deduction provisions.
    Mortgage interest cap and charity deductions for non-itemizers (all filing statuses).
    """
    return Reform.from_dict({
        "gov.irs.deductions.itemized.interest.mortgage.cap.JOINT": {
            "2026-01-01.2100-12-31": 750000
        },
        "gov.irs.deductions.itemized.interest.mortgage.cap.SINGLE": {
            "2026-01-01.2100-12-31": 750000
        },
        "gov.irs.deductions.itemized.interest.mortgage.cap.SEPARATE": {
            "2026-01-01.2100-12-31": 375000
        },
        "gov.irs.deductions.itemized.interest.mortgage.cap.SURVIVING_SPOUSE": {
            "2026-01-01.2100-12-31": 750000
        },
        "gov.irs.deductions.itemized.interest.mortgage.cap.HEAD_OF_HOUSEHOLD": {
            "2026-01-01.2100-12-31": 750000
        },
        # Charity non-itemizers - all filing statuses
        "gov.irs.deductions.itemized.charity.non_itemizers_amount.JOINT": {
            "2025-01-01.2028-12-31": 300
        },
        "gov.irs.deductions.itemized.charity.non_itemizers_amount.SINGLE": {
            "2025-01-01.2028-12-31": 150
        },
        "gov.irs.deductions.itemized.charity.non_itemizers_amount.SEPARATE": {
            "2025-01-01.2028-12-31": 150
        },
        "gov.irs.deductions.itemized.charity.non_itemizers_amount.HEAD_OF_HOUSEHOLD": {
            "2025-01-01.2028-12-31": 150
        },
        "gov.irs.deductions.itemized.charity.non_itemizers_amount.SURVIVING_SPOUSE": {
            "2025-01-01.2028-12-31": 300
        },
    }, country_id="us")


def obbba_limitation_on_itemized_reform():
    """
    OBBBA limitation on itemized deductions.
    Uses standard parameter to disable Pease limitation (which was repealed under TCJA).
    """
    return Reform.from_dict({
        "gov.irs.deductions.itemized.reduction.applies": {
            "2026-01-01.2100-12-31": False
        },
        "gov.irs.deductions.itemized.reduction.amended_structure.applies": {
            "2026-01-01.2100-12-31": True
        },
    }, country_id="us")


def obbba_estate_tax_reform():
    """
    OBBBA estate tax provisions.
    Sets estate tax base to $15M (OBBBA provision).
    """
    return Reform.from_dict({
        "gov.irs.credits.estate.base": {
            "2026-01-01.2026-12-31": 15000000,
        },
    }, country_id="us")


def snap_takeup_reform():
    """
    SNAP program takeup rate adjustment.
    """
    return Reform.from_dict({
        "gov.usda.snap.takeup_rate": {"2026-01-01.2028-12-31": 0.775},
    }, country_id="us")


def aca_takeup_reform():
    """
    ACA program takeup rate adjustment.
    """
    return Reform.from_dict({
        "gov.aca.takeup_rate": {"2026-01-01.2028-12-31": 0.63},
    }, country_id="us")


def medicaid_takeup_reform():
    """
    Medicaid program takeup rate adjustment.
    """
    return Reform.from_dict({
        "gov.hhs.medicaid.takeup_rate": {"2026-01-01.2028-12-31": 0.92},
    }, country_id="us")


def get_obbba_provisions():
    """
    Get dictionary of all OBBBA provision reforms.
    Stack these on top of obbba_reversal_reform() baseline.

    This matches get_all_reforms() in reforms.py for consistency with national analysis.
    Includes all parameters needed to restore OBBBA from TCJA expiration baseline.
    """
    return {
        "Tax Rate Reform": obbba_tax_rate_reform(),
        "Standard Deduction Reform": obbba_standard_deduction_reform(),
        "Exemption Reform": obbba_exemption_reform(),
        "CTC Reform": obbba_ctc_reform(),
        "CDCC Reform": obbba_cdcc_reform(),
        "QBI Deduction Reform": obbba_qbi_reform(),
        "AMT Reform": obbba_amt_reform(),
        "Miscellaneous Reform": obbba_misc_reform(),
        "Other Itemized Deductions Reform": obbba_other_item_reform(),
        "Limitation on Itemized Deductions Reform": obbba_limitation_on_itemized_reform(),
        "Estate Tax Reform": obbba_estate_tax_reform(),
        "SALT Cap Reform": obbba_salt_reform(),
        "Tip Income Exemption": obbba_tip_income_reform(),
        "Overtime Exemption": obbba_overtime_reform(),
        "Senior Deduction": obbba_senior_deduction_reform(),
        "Auto Loan Interest": obbba_auto_loan_reform(),
        "SNAP Takeup Reform": snap_takeup_reform(),
        "ACA Takeup Reform": aca_takeup_reform(),
        "Medicaid Takeup Reform": medicaid_takeup_reform(),
    }
