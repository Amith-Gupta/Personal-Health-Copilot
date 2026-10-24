import pytest

from app.services.regex_cleaner import (
    compute_flag, normalize_frequency, parse_number, parse_reference_range, split_medication_form,
)


@pytest.mark.parametrize("raw,expected", [
    ("13,800", 13800.0), ("<0.5", 0.5), ("7.9 H", 7.9), ("  92 ", 92.0), ("nil", None), (None, None),
])
def test_parse_number(raw, expected):
    assert parse_number(raw) == expected


@pytest.mark.parametrize("raw,expected", [
    ("70 - 99", (70, 99)), ("4,000-11,000", (4000, 11000)), ("12.0 to 15.5", (12.0, 15.5)),
    ("< 6", (None, 6)), (">= 40", (40, None)), ("up to 200", (None, 200)), ("negative", None), ("", None),
])
def test_parse_reference_range(raw, expected):
    assert parse_reference_range(raw) == expected


def test_hyphen_is_a_separator_not_a_minus_sign():
    # A naive parser reads "0.4-4.0" as 0.4 and -4.0 and flags every TSH as high.
    assert parse_reference_range("0.4-4.0") == (0.4, 4.0)
    assert compute_flag("3.4", "0.4-4.0") == "NORMAL"


@pytest.mark.parametrize("value,rng,flag", [
    ("9.6", "12.0 - 15.5", "LOW"), ("13,800", "4,000-11,000", "HIGH"), ("48", "< 6", "HIGH"),
    ("92", "70 - 99", "NORMAL"), ("99", "70 - 99", "NORMAL"), ("Positive", "Negative", None), ("5", None, None),
])
def test_compute_flag(value, rng, flag):
    assert compute_flag(value, rng) == flag


@pytest.mark.parametrize("raw,expected", [
    ("1-0-1", "1-0-1 (1 morning, 1 night)"),
    ("0-1-0 after lunch", "0-1-0 (1 afternoon) after lunch"),
    ("½-0-½", "½-0-½ (½ morning, ½ night)"),
    ("BD", "BD (twice daily)"), ("SOS", "SOS (only when needed)"), ("once a week", "once a week"), ("", ""),
])
def test_normalize_frequency(raw, expected):
    assert normalize_frequency(raw) == expected


def test_split_medication_form():
    assert split_medication_form("Tab. Levothyroxine") == ("Levothyroxine", "Tablet")
    assert split_medication_form("Cap Cholecalciferol") == ("Cholecalciferol", "Capsule")
    assert split_medication_form("Metformin SR") == ("Metformin SR", None)
