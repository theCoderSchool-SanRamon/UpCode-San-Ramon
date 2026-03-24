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
    # Default placeholders for uncalculated pillars
    score_competition, score_access = 75.0, 80.0 
    
    try:
        base_dir = Path(__file__).resolve().parent
        map_path = base_dir / "06.parquet"
        data_path = base_dir / "tract_income_2024.parquet"
        
        if not map_path.exists():
            raise FileNotFoundError(f"Map data file not found at {map_path}")
        if not data_path.exists():
            raise FileNotFoundError(f"Income data file not found at {data_path}")
            
        # 1. Load the map shapes (GeoPandas)
        ca_census_map = gpd.read_parquet(map_path)
        
        # 2. Load the income data (Standard Pandas)
        income_data = pd.read_parquet(data_path)
        
        # 3. Merge them together using the GEOID column
        ca_census_map = ca_census_map.merge(income_data, on='GEOID', how='left')

        # Create user point and find intersecting 5-mile radius
        user_location_gdf = gpd.GeoDataFrame(geometry=gpd.points_from_xy([lng], [lat]), crs="EPSG:4326")
        search_radius = user_location_gdf.to_crs("EPSG:3857").buffer(8046.72).to_crs(ca_census_map.crs)[0]
        nearby_tracts = ca_census_map[ca_census_map.intersects(search_radius)]
        
        if nearby_tracts.empty:
            raise ValueError("No data found within 5 miles.")

        # NEW WEALTH CALCULATION
        # B19001_E001 = Total Households | B19001_E017 = Households making $200,000+
        total_hh_series = pd.to_numeric(nearby_tracts['B19001_E001'], errors='coerce')
        rich_hh_series = pd.to_numeric(nearby_tracts['B19001_E017'], errors='coerce')
        
        total_hh = total_hh_series[total_hh_series > 0].sum()
        rich_hh = rich_hh_series[rich_hh_series >= 0].sum()

        if total_hh > 0:
            percent_wealthy = (rich_hh / total_hh) * 100
        else:
            percent_wealthy = 0
            
        # Score Wealth: 25% of the area making $200k+ is a perfect 100/100 score
        score_wealth = min((percent_wealthy / 25.0) * 100, 100)

        # MISSING DATA PLACEHOLDERS (Student & Education data is missing from new parquet)
        total_students = 2500 
        score_family = 50.0   
        score_education = 50.0 

        # Calculate Final Weighted Score
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
            "estimatedFamilies": f"{int(total_students):,} (Est.)",
            "medianIncome": f"{round(percent_wealthy, 1)}% >$200k",
            "competition": "Medium",
            "rationale": f"Calculated based on a 5-mile radius where {round(percent_wealthy, 1)}% of households make over $200k. Student and Education data is simulated.",
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