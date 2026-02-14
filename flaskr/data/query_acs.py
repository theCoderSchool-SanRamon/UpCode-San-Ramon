import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
from pyproj import Geod
from glob import glob

import requests

from typing import *
from pathlib import Path

DF = pd.DataFrame
GDF = gpd.GeoDataFrame

_acs_url = "https://api.census.gov/data/2024/acs/acs5?get={fields}&for=tract:{tract}&in=state:{state} county:{county}"

M_PER_MI = 1609.344

WGS84 = Geod(ellps="WGS84")

def geodesic_circle(lat, lon, r, n=180):
    az = np.linspace(0, 360, n, endpoint=False)
    lons, lats, _ = WGS84.fwd(np.full_like(az, lon), np.full_like(az, lat), az, np.full_like(az, r))
    return Polygon(zip(lons, lats))

def get_tracts(lat: float, lng: float, radius: float, parquets: Path) -> GDF | None:
    circle = geodesic_circle(lat, lng, radius * M_PER_MI)

    minx, miny, maxx, maxy = circle.bounds
    parts = []
    for path in glob(str(parquets / "*.parquet")):
        gdf = gpd.read_parquet(path)
        gdf = gdf.cx[minx:maxx, miny:maxy]
        if len(gdf):
            parts.append(gdf)

    if not parts: return None

    tracts = GDF(pd.concat(parts, ignore_index=True)).to_crs("EPSG:4326")
    return tracts[tracts.intersects(circle)]

def query_tracts(tracts: GDF, fields = List[str] | str) -> DF:
    fields = ",".join(fields) if isinstance(fields, list) else fields

    def fetch(geoid: str) -> dict:
        state, county, tract = geoid[:2], geoid[2:5], geoid[5:]
        header, values = requests.get(_acs_url.format(fields=fields, tract=tract, state=state, county=county))
        row = dict(zip(header, values))
        row["GEOID"] = geoid
        return row
    
    return DF(fetch(tract) for tract in tracts["GEOID"])