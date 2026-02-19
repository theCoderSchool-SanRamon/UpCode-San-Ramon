import pandas as pd
import geopandas as gpd
from pathlib import Path
from flask import Flask, render_template

app = Flask(__name__, template_folder='reports_view')

def calculate_franchise_viability(lat, lng):
    WEIGHTS = {
        'wealth_pillar': 0.30, 
        'family_pillar': 0.25, 
        'education_pillar': 0.10, 
        'competition_pillar': 0.20, 
        'access_pillar': 0.15
    }
    
    try:
        data_path = Path("UpCode/flaskr/data/tracts/06.parquet")
        if not data_path.exists():
            return "Error: Census data file not found."
            
        ca_census_map = gpd.read_parquet(data_path)
        user_location_gdf = gpd.GeoDataFrame(geometry=gpd.points_from_xy([lng], [lat]), crs="EPSG:4326")
        
        # 5 mile search radius
        search_radius = user_location_gdf.to_crs("EPSG:3857").buffer(8046.72).to_crs(ca_census_map.crs)[0]
        nearby_tracts = ca_census_map[ca_census_map.intersects(search_radius)]
        
        if nearby_tracts.empty:
            return "Error: No data found within 5 miles."

        avg_income = pd.to_numeric(nearby_tracts['B19013_001E'], errors='coerce').mean() or 0
        total_students = pd.to_numeric(nearby_tracts['B01001_003E'], errors='coerce').sum() or 0
        avg_bachelors = pd.to_numeric(nearby_tracts['B15003_022E'], errors='coerce').mean() or 0

        score_wealth = min((float(avg_income) / 150000) * 100, 100)
        score_family = min((float(total_students) / 4000) * 100, 100)
        score_education = min((float(avg_bachelors) / 800) * 100, 100)

        score_competition, score_access = 75.0, 80.0

        final_score = (
            (score_wealth * WEIGHTS['wealth_pillar']) +
            (score_family * WEIGHTS['family_pillar']) +
            (score_education * WEIGHTS['education_pillar']) +
            (score_competition * WEIGHTS['competition_pillar']) +
            (score_access * WEIGHTS['access_pillar'])
        )

        return [
            f"Final Score: {round(final_score, 1)}/100",
            f"Student Count (5-17): {int(total_students):,}",
            f"Average Income: ${int(avg_income):,}",
            f"Family Score: {round(score_family, 1)}%",
            f"Wealth Score: {round(score_wealth, 1)}%",
            f"Education Score: {round(score_education, 1)}%"
        ]

    except Exception as e:
        return f"System Error: {str(e)}"

# Testing for San Ramon
@app.route('/reports_view')

def report():
    from analyzer import calculate_franchise_viability

    results = calculate_franchise_viability(37.7799, -121.9780)
    return render_template('report.html', data=results)

if __name__ == "__main__":
    app.run(debug=True)