import csv
import os
from html import escape
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse
from rapidfuzz import fuzz, process

# Initialize FastAPI application instance with metadata
app = FastAPI(
    title="UN/LOCODE Sea Ports & Airports API",
    description="High-performance FastAPI service to search Sea Ports, Airports, and Cities from UN/LOCODE dataset",
    version="1.0.0"
)

# Global in-memory storage structures for super-fast responses (<5ms)
locations_db = []
locations_by_code = {}
subdivisions_db = {}
fuzzy_search_choices = []
fuzzy_search_records = []
stats_summary = {
    "total_locations": 0,
    "total_sea_ports": 0,
    "total_airports": 0,
    "total_countries": 0
}

# Resolve directory paths for CSV data files
CSV_FOLDER = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(CSV_FOLDER, "csv")


def load_dataset():
    """Load UN/LOCODE CSV files into memory when the application starts."""
    global locations_db, locations_by_code, subdivisions_db, fuzzy_search_choices, fuzzy_search_records, stats_summary
    
    # Clear existing state for reloads
    locations_db.clear()
    locations_by_code.clear()
    subdivisions_db.clear()
    fuzzy_search_choices.clear()
    fuzzy_search_records.clear()
    
    countries_set = set()
    sea_ports_count = 0
    airports_count = 0

    # Lookup dictionaries for country names and subdivision codes
    country_names = {}
    subdivision_lookup = {}
    
    # -------------------------------------------------------------
    # 1. Load Subdivision Codes (SubdivisionCodes.csv)
    # -------------------------------------------------------------
    subdiv_file = os.path.join(CSV_PATH, "SubdivisionCodes.csv")
    if os.path.exists(subdiv_file):
        with open(subdiv_file, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 4:
                    country, sub_code, name, sub_type = row[0].strip(), row[1].strip(), row[2].strip(), row[3].strip()
                    if country not in subdivisions_db:
                        subdivisions_db[country] = []
                    sub_info = {
                        "subdivision_code": sub_code,
                        "name": name,
                        "type": sub_type
                    }
                    subdivisions_db[country].append(sub_info)
                    subdivision_lookup[(country, sub_code)] = sub_info

    # -------------------------------------------------------------
    # 2. Extract Full Country Names from Header Rows in CodeList CSVs
    # -------------------------------------------------------------
    parts = ["UNLOCODE CodeListPart1.csv", "UNLOCODE CodeListPart2.csv", "UNLOCODE CodeListPart3.csv"]
    for part_file in parts:
        file_path = os.path.join(CSV_PATH, part_file)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 4:
                        c_code = row[1].strip()
                        l_code = row[2].strip()
                        raw_name = row[3].strip()
                        # Header row for country (e.g. ,AD,,.ANDORRA,,,,,,,,)
                        if c_code and not l_code and raw_name.startswith("."):
                            country_names[c_code] = raw_name.lstrip(".").strip()

    # Function code to human-readable description mapper
    FUNC_DESCRIPTIONS = {
        '1': "Port (Maritime / Inland Waterway)",
        '2': "Rail Terminal",
        '3': "Road Terminal",
        '4': "Airport",
        '5': "Postal Exchange Office",
        '6': "Multimodal Function (Inland Clearance Depot)",
        '7': "Fixed Transport Installation",
        'B': "Border Crossing Point"
    }

    # -------------------------------------------------------------
    # 3. Load All Location Records with Details into memory DB
    # -------------------------------------------------------------
    for part_file in parts:
        file_path = os.path.join(CSV_PATH, part_file)
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 7:
                        change_flag = row[0].strip() if len(row) > 0 else ""
                        country = row[1].strip()
                        code = row[2].strip()
                        if not country or not code:
                            continue
                            
                        name = row[3].strip()
                        name_ascii = row[4].strip()
                        subdivision = row[5].strip()
                        func = row[6].strip()
                        status = row[7].strip() if len(row) > 7 else ""
                        date_val = row[8].strip() if len(row) > 8 else ""
                        iata = row[9].strip() if len(row) > 9 else ""
                        coords = row[10].strip() if len(row) > 10 else ""
                        remarks = row[11].strip() if len(row) > 11 else ""
                        
                        is_sea_port = '1' in func
                        is_air_port = '4' in func

                        if is_sea_port:
                            sea_ports_count += 1
                        if is_air_port:
                            airports_count += 1

                        countries_set.add(country)
                        
                        # Lookup subdivision details
                        sub_details = subdivision_lookup.get((country, subdivision), {})
                        
                        # Decode function string into readable list
                        decoded_funcs = [
                            FUNC_DESCRIPTIONS[char] 
                            for char in func 
                            if char in FUNC_DESCRIPTIONS
                        ]

                        unlocode_str = f"{country} {code}"
                        record = {
                            "unlocode": unlocode_str,
                            "country_code": country,
                            "country_name": country_names.get(country, country),
                            "location_code": code,
                            "port_name": name,
                            "name_ascii": name_ascii,
                            "subdivision_code": subdivision,
                            "subdivision_name": sub_details.get("name"),
                            "subdivision_type": sub_details.get("type"),
                            "is_sea_port": is_sea_port,
                            "is_air_port": is_air_port,
                            "is_rail_terminal": '2' in func,
                            "is_road_terminal": '3' in func,
                            "is_postal_exchange": '5' in func,
                            "is_multimodal": '6' in func,
                            "is_fixed_installation": '7' in func,
                            "is_border_crossing": 'B' in func,
                            "function_code": func,
                            "decoded_functions": decoded_funcs,
                            "status_code": status,
                            "date_added_updated": date_val,
                            "iata_code": iata,
                            "coordinates": coords,
                            "change_flag": change_flag,
                            "remarks": remarks
                        }
                        
                        locations_db.append(record)
                        locations_by_code[f"{country}_{code}"] = record
                        # print(f"Loaded: {unlocode_str} - {name} ({country_names.get(country, country)})")

    # -------------------------------------------------------------
    # 4. Build rapidfuzz-friendly search index with state and subdivision info
    # -------------------------------------------------------------
    fuzzy_search_choices = [
        " ".join(
            filter(
                None,
                [
                    loc["port_name"].lower(),
                    loc["name_ascii"].lower(),
                    (loc.get("subdivision_name") or "").lower(),
                    (loc.get("subdivision_code") or "").lower(),
                    loc["country_name"].lower(),
                    loc["country_code"].lower(),
                    loc["iata_code"].lower()
                ]
            )
        )
        for loc in locations_db
    ]
    fuzzy_search_records = list(locations_db)

    # Summarize dataset statistics
    stats_summary = {
        "total_locations": len(locations_db),
        "total_sea_ports": sea_ports_count,
        "total_airports": airports_count,
        "total_countries": len(countries_set)
    }
    print(f"[OK] Data Loaded Successfully! Total Locations: {len(locations_db)}")


# Automatically load dataset on module startup
load_dataset()


# -------------------------------------------------------------
# Root API Endpoint: Health Check and API Overview
# -------------------------------------------------------------
@app.get("/")
def home():
    """Health check and API overview."""
    return {
        "status": "online",
        "service": "UN/LOCODE Sea Ports & Airports API",
        "documentation": "/docs",
        "primary_endpoint": "/api/location?city_name=Chennai&country_code=IN&mode=AIR",
        "statistics": stats_summary
    }




# -------------------------------------------------------------
# Port Search Endpoint: Filter by city, country, and mode (purely from dataset)
# -------------------------------------------------------------
@app.get("/api/port")
def fetch_port(
    city_name: str = Query(..., description="Name of the city to search (e.g. 'Chennai', 'Mumbai', 'Dubai', 'London')"),
    country_code: Optional[str] = Query(None, description="Optional 2-letter ISO country code filter (e.g. 'IN', 'US', 'AE')"),
    mode: Optional[str] = Query(None, description="Optional transport mode filter: 'AIR' or 'SHIP' (leave empty to get all ports)")
):
    """
    Fetch ports directly from the UN/LOCODE dataset based on city_name, optional country_code, and optional mode ('AIR' or 'SHIP').
    When mode is omitted, returns all sea ports and airports for the city.
    """
    city_query = city_name.lower().strip()
    country_query = country_code.upper().strip() if country_code else None
    mode_upper = mode.upper().strip() if mode else None

    results = []

    for loc in locations_db:
        # Check 1: Country filter check
        if country_query and loc["country_code"] != country_query:
            continue

        # Check 2: Dynamic matching from dataset fields (city, state/subdivision, remarks)
        loc_name_lower = loc["port_name"].lower()
        loc_ascii_lower = loc["name_ascii"].lower()
        loc_remarks_lower = loc.get("remarks", "").lower()
        loc_state_lower = (loc.get("subdivision_name") or "").lower()
        loc_sub_code_lower = (loc.get("subdivision_code") or "").lower()

        matches_city = (
            (city_query in loc_name_lower) or
            (city_query in loc_ascii_lower) or
            (city_query in loc_remarks_lower) or
            (city_query == loc_state_lower or city_query in loc_state_lower) or
            (city_query == loc_sub_code_lower)
        )

        if not matches_city:
            continue

        # Check 3: Mode filter check (AIR or SHIP or ALL ports)
        if mode_upper == "AIR":
            if not loc["is_air_port"]:
                continue
        elif mode_upper == "SHIP":
            if not loc["is_sea_port"]:
                continue
        else:
            # When mode is not specified, return locations that are a sea port or an airport
            if not (loc["is_sea_port"] or loc["is_air_port"]):
                continue

        results.append(loc)

    # Format simplified response payload
    simplified_data = [
        {
            "unlocode": item["unlocode"],
            "country_code": item["country_code"],
            "country_name": item["country_name"],
            "state_name": item.get("subdivision_name"),
            "port_name": item["port_name"],
            "is_sea_port": item["is_sea_port"],
            "is_air_port": item["is_air_port"],
            "modes": [
                m for m, active in [("SHIP", item["is_sea_port"]), ("AIR", item["is_air_port"])] if active
            ]
        }
        for item in results
    ]

    return {
        "success": True,
        "message": "Port data fetched successfully.",
        "total_count": len(simplified_data),
        "mode_filter": mode_upper or "ALL",
        "data": simplified_data
    }




# -------------------------------------------------------------
# Helper Function: Check if record's state/subdivision matches state_query
# -------------------------------------------------------------
def check_state_match(state_query: str, sub_name: Optional[str], sub_code: Optional[str]) -> bool:
    """Verifies whether a record's subdivision name or code matches the queried state."""
    if not state_query:
        return True
    sq = state_query.strip().lower()
    sn = (sub_name or "").strip().lower()
    sc = (sub_code or "").strip().lower()

    # Exact subdivision code match (e.g. "TN" == "tn")
    if sc and sq == sc:
        return True
    # Name equality or substring match
    if sn and (sq == sn or sq in sn or sn in sq):
        return True
    # Fuzzy match on state name (>= 70)
    if sn and fuzz.WRatio(sq, sn) >= 70:
        return True
    # Fuzzy match on subdivision code (>= 80)
    if sc and len(sc) >= 2 and fuzz.WRatio(sq, sc) >= 80:
        return True
    return False


# -------------------------------------------------------------
# Helper Function: Auto-detect state name from query search term
# -------------------------------------------------------------
def detect_state_from_term(country_code: str, search_term: str):
    """
    Detects if search_term contains a state/subdivision name or code for country_code.
    Returns (detected_state_name_or_code, cleaned_search_term).
    """
    country_subdivisions = []
    seen = set()

    # Collect subdivisions from subdivisions_db for the given country
    for sub in subdivisions_db.get(country_code, []):
        code = (sub.get("subdivision_code") or "").strip()
        name = (sub.get("name") or "").strip()
        key = (code.upper(), name.lower())
        if key not in seen and (code or name):
            seen.add(key)
            country_subdivisions.append((code, name))

    # Also collect subdivisions from loaded locations for the given country
    for loc in locations_db:
        if loc["country_code"].upper() == country_code:
            code = (loc.get("subdivision_code") or "").strip()
            name = (loc.get("subdivision_name") or "").strip()
            key = (code.upper(), name.lower())
            if key not in seen and (code or name):
                seen.add(key)
                country_subdivisions.append((code, name))

    if not country_subdivisions:
        return None, search_term

    words = search_term.split()
    if not words:
        return None, search_term

    # Generate n-grams prioritizing multi-word and trailing state phrases
    n = len(words)
    phrases = []
    for length in range(n, 0, -1):
        for start in range(n - length, -1, -1):
            phrase = " ".join(words[start:start + length])
            phrases.append((phrase, start, length))

    # Check each phrase against known country subdivisions
    for phrase, start, length in phrases:
        p_clean = phrase.strip().lower()
        if not p_clean:
            continue

        for code, name in country_subdivisions:
            c_clean = code.lower()
            n_clean = name.lower()

            # Exact subdivision code match
            if c_clean and len(p_clean) >= 2 and p_clean == c_clean:
                rem = words[:start] + words[start + length:]
                cleaned = " ".join(rem).strip()
                return name or code, cleaned

            # State name match (exact or substring)
            if n_clean:
                if p_clean == n_clean or (len(p_clean) >= 4 and p_clean in n_clean):
                    rem = words[:start] + words[start + length:]
                    cleaned = " ".join(rem).strip()
                    return name, cleaned

                # Fuzzy state name match (threshold >= 80)
                if fuzz.WRatio(p_clean, n_clean) >= 80:
                    rem = words[:start] + words[start + length:]
                    cleaned = " ".join(rem).strip()
                    return name, cleaned

    return None, search_term


# -------------------------------------------------------------
# Main Fuzzy Search API Endpoint: High-performance search with RapidFuzz
# -------------------------------------------------------------
@app.get("/api/fuzzy-search")
def fuzzy_search(
    query: str = Query(
        ..., 
        description="Country code followed by city name or location code, e.g. 'IN Dharmapuri'"
    ),
    mode: Optional[str] = Query(
        None,
        description="Optional transport mode filter: 'AIR' or 'SHIP'"
    )
):
    """Fuzzy search using rapidfuzz over loaded UN/LOCODE records."""
    # Ensure search index is ready
    if not fuzzy_search_choices:
        raise HTTPException(status_code=503, detail="Search index is not initialized yet")

    # Step 1: Parse query into country code and search term
    parts = query.strip().split(maxsplit=1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=400,
            detail="Query must be in the format '<country_code> <city_name_or_code>'"
        )

    country_code, search_term = parts[0].upper(), parts[1].strip()
    if not country_code or not search_term:
        raise HTTPException(
            status_code=400,
            detail="Query must include both country code and city name or location code"
        )

    # Step 2: Auto-detect state name/code from the query search term
    detected_state, cleaned_term = detect_state_from_term(country_code, search_term)
    state_filter = detected_state

    mode_upper = mode.upper().strip() if mode else None

    # Step 3: Pre-filter candidate records by country code, mode, and detected state
    filtered_choices = []
    filtered_records = []
    for loc in fuzzy_search_records:
        # Country filter
        if loc["country_code"].upper() != country_code:
            continue

        # Mode filter (AIR or SHIP)
        if mode_upper == "AIR" and not loc["is_air_port"]:
            continue
        elif mode_upper == "SHIP" and not loc["is_sea_port"]:
            continue

        # State filter (strictly excludes ports from non-matching states)
        if state_filter:
            subdivision_name = loc.get("subdivision_name")
            subdivision_code = loc.get("subdivision_code")
            if not check_state_match(state_filter, subdivision_name, subdivision_code):
                continue

        # Build candidate choice text for RapidFuzz
        choice_text = " ".join(
            filter(
                None,
                [
                    loc["port_name"].lower(),
                    loc["name_ascii"].lower(),
                    (loc.get("subdivision_name") or "").lower(),
                    (loc.get("subdivision_code") or "").lower(),
                    loc["country_name"].lower(),
                    loc["iata_code"].lower(),
                    loc["location_code"].lower()
                ]
            )
        )
        filtered_choices.append(choice_text)
        filtered_records.append(loc)

    # Return empty response if no candidate records match initial filters
    if not filtered_choices:
        res = {
            "query": query,
            "total_results": 0,
            "matches": []
        }
        if mode is not None:
            res["mode"] = mode
        return res

    # Step 4: RapidFuzz score calculation across candidates
    results = process.extract(
        search_term.lower(),
        filtered_choices,
        scorer=fuzz.WRatio,
        score_cutoff=60,
        limit=len(filtered_choices)
    )

    # Helper function to format record output
    def simplify_record(record):
        return {
            "unlocode": record["unlocode"],
            "country_code": record["country_code"],
            "country_name": record["country_name"],
            "state_name": record.get("subdivision_name"),
            "subdivision_code": record.get("subdivision_code"),
            "port_name": record["port_name"]
        }

    # Step 5: Construct final API JSON response payload
    response = {
        "query": query,
        "total_results": len(results),
        "matches": [
            {
                "score": score,
                "record": simplify_record(filtered_records[index])
            }
            for _, score, index in results
        ]
    }
    if mode is not None:
        response["mode"] = mode

    return response


# -------------------------------------------------------------
# Application Entry Point: Run development server with Uvicorn
# -------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
