import pandas as pd
import geopandas as gpd
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

def calculate_franchise_viability(location, weights):
    lat = location.get('lat')
    lng = location.get('lng')
    # Default to medium if we can't calculate
    score_competition, score_access = 75.0, 80.0 
    
    try:
        base_dir = Path(__file__).resolve().parent
        data_path = base_dir / "06.parquet"
        
        if not data_path.exists():
            raise FileNotFoundError(f"Census data file not found at {data_path}")
            
        ca_census_map = gpd.read_parquet(data_path)
        user_location_gdf = gpd.GeoDataFrame(geometry=gpd.points_from_xy([lng], [lat]), crs="EPSG:4326")
        
        search_radius = user_location_gdf.to_crs("EPSG:3857").buffer(8046.72).to_crs(ca_census_map.crs)[0]
        nearby_tracts = ca_census_map[ca_census_map.intersects(search_radius)]
        
        if nearby_tracts.empty:
            raise ValueError("No data found within 5 miles.")

        avg_income = pd.to_numeric(nearby_tracts['B19013_001E'], errors='coerce').mean() or 0
        total_students = pd.to_numeric(nearby_tracts['B01001_003E'], errors='coerce').sum() or 0
        avg_bachelors = pd.to_numeric(nearby_tracts['B15003_022E'], errors='coerce').mean() or 0

        score_wealth = min((float(avg_income) / 150000) * 100, 100)
        score_family = min((float(total_students) / 4000) * 100, 100)
        score_education = min((float(avg_bachelors) / 800) * 100, 100)

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
            "medianIncome": f"${int(avg_income):,}",
            "competition": "Medium",
            "rationale": f"Calculated based on a 5-mile radius containing {int(total_students):,} students and an average income of ${int(avg_income):,}.",
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
