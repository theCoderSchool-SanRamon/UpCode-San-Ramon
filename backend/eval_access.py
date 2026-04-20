import os

import requests
import pydash as _
import geopandas as gpd
from shapely.geometry import shape
import query_acs as acs
from pathlib import Path

_isochrone_url = "https://api.mapbox.com/isochrone/v1/mapbox/driving-traffic/"

from dotenv import load_dotenv
load_dotenv()

_mapbox_key = os.environ.get("MAPBOX_KEY")

def evaluate(context):
    response = requests.get(
        _isochrone_url + f"{context["longitude"]},{context["latitude"]}",
        params={
            "contours_minutes": context["max_drive_time"],
            "denoise": 1,
            "polygons": "true",
            "access_token": _mapbox_key
        }
    )

    response.raise_for_status()
    geom = shape(_.get(response.json(), 'features[0].geometry'))

    tracts = acs.get_tracts_from_geom(geom, (Path(__file__).resolve().parent.parent / "static").resolve())

    query = acs.query(tracts["GEOID"].to_list(), ["B01003_001E"]).astype(float)

    pop = query.sum()["B01003_001E"]

    context["population_in_drive_time"] = pop
    return context

evaluate_accessability = evaluate

__all__ = ['evaluate_accessability']

if __name__ == "__main__":
    print(evaluate({"latitude": 41.2, "longitude": -71.19, "max_drive_time": 30}))