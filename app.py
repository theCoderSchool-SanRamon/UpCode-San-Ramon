import pandas as pd
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
# Import your new backend modules!
from backend import query_acs as acs
from backend.eval_access import evaluate_accessability

app = Flask(__name__)
CORS(app) 

STATIC_DIR = (Path(__file__).resolve().parent / "static")

def calculate_franchise_viability(location, weights):
    lat = location.get('lat')
    lng = location.get('lng')
    
    try:
        # 1. Get all census tracts within a 5-mile radius
        tracts = acs.get_tracts(lat, lng, 5.0, STATIC_DIR)
        
        if tracts is None or tracts.empty:
            raise ValueError("No census tracts found. Make sure you generated the parquets in the static folder.")

        # 2. LIVE CENSUS API QUERY
        # We fetch all required variables in one single API call to save time
        census_vars = [
            "B19001_001E", # Total Households
            "B19001_017E", # HH making $200k+
            "B01001_003E", # Students/Kids 
            "B15003_022E", # Bachelor's Degrees
            "B19013_001E"  # Median Income
        ]
        
        query_df = acs.query(tracts["GEOID"].to_list(), census_vars).astype(float)
        
        if query_df is None or query_df.empty:
            raise ValueError("Failed to fetch data from the US Census API.")

        # Clean negative placeholder values
        query_df = query_df.where(query_df >= 0, 0)

        # Aggregate the data
        totals = query_df.sum()
        means = query_df.mean()

        total_hh = totals["B19001_001E"]
        rich_hh = totals["B19001_017E"]
        total_students = totals["B01001_003E"]
        avg_bachelors = means["B15003_022E"]
        avg_income = means["B19013_001E"]

        percent_wealthy = (rich_hh / total_hh * 100) if total_hh > 0 else 0

        # 3. LIVE MAPBOX ISOCHRONE QUERY (Accessibility)
        access_context = evaluate_accessability({
            "latitude": lat,
            "longitude": lng,
            "max_drive_time": 15 # 15 minute drive radius
        })
        drive_time_pop = access_context.get("population_in_drive_time", 0)

        # 4. CALCULATE SCORES
        score_wealth = min((percent_wealthy / 25.0) * 100, 100)
        score_family = min((total_students / 4000) * 100, 100)
        score_education = min((avg_bachelors / 800) * 100, 100)
        score_access = min((drive_time_pop / 50000) * 100, 100) # Perfect score if 50k people are within a 15-min drive
        score_competition = 75.0 # Still hardcoded for now

        final_score = (
            (score_wealth * weights.get('wealth', 0.3)) +
            (score_family * weights.get('family', 0.25)) +
            (score_education * weights.get('education', 0.10)) +
            (score_competition * weights.get('competition', 0.20)) +
            (score_access * weights.get('accessibility', 0.15))
        )

        return {
            "name": location.get("name", "Unknown Location"),
            "score": round(final_score),
            "estimatedFamilies": f"{int(total_students):,}",
            "medianIncome": f"{round(percent_wealthy, 1)}% >$200k",
            "competition": "Medium",
            "rationale": f"Calculated using US Census API data. {int(drive_time_pop):,} total people live within a 15-minute drive of this location.",
            "rawScores": {
                "wealth": score_wealth,
                "family": score_family,
                "education": score_education,
                "competition": score_competition,
                "accessibility": score_access
            }
        }

    except Exception as e:
        return {
            "name": location.get("name", "Error Location"),
            "score": 0,
            "estimatedFamilies": "Error",
            "medianIncome": "Error",
            "competition": "High",
            "rationale": f"System Error: {str(e)}",
            "rawScores": { "wealth": 0, "family": 0, "education": 0, "competition": 0, "accessibility": 0 }
        }

@app.route('/api/analyze', methods=['POST'])
def analyze_locations():
    data = request.json
    locations = data.get('locations', [])
    weights = data.get('weights', {})

    results = []
    for loc in locations:
        result = calculate_franchise_viability(loc, weights)
        results.append(result)

    results.sort(key=lambda x: x['score'], reverse=True)

    return jsonify({"results": results})

if __name__ == "__main__":
    app.run(port=5000, debug=True)