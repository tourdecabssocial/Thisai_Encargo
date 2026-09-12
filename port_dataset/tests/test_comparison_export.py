import csv
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import build_comparison_rows, export_comparison_csv


def test_build_and_export_comparison_csv(tmp_path):
    rows = build_comparison_rows("Chennai", "Mumbai")

    assert rows[0]["origin"] == "Chennai"
    assert rows[0]["destination"] == "Mumbai"
    assert rows[0]["input"] == "Chennai to Mumbai"

    csv_path = tmp_path / "comparison.csv"
    export_comparison_csv(rows, str(csv_path))

    assert csv_path.exists()

    with open(csv_path, newline="", encoding="utf-8") as handle:
        data = list(csv.DictReader(handle))

    assert data[0]["origin"] == "Chennai"
    assert data[0]["destination"] == "Mumbai"
    assert data[0]["google_map_api"] == "Google Maps API result"
