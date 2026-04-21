import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
from pyproj import Geod
from glob import glob

import requests
import re

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

def get_tracts(lat: float, lng: float, radius: float, parquets: Path) -> Optional[GDF]:
    circle = geodesic_circle(lat, lng, radius * M_PER_MI)

    parts = []
    for path in glob(str(parquets / "*.parquet")):
        gdf = gpd.read_parquet(path)
        centroids: gpd.GeoSeries = gdf["centroid"]
        idx = centroids.sindex.query(circle, predicate="intersects")
        gdf = gdf.iloc[idx]
        if len(gdf):
            parts.append(gdf)

    if not parts: return None

    tracts = GDF(pd.concat(parts, ignore_index=True)).to_crs("EPSG:4326")
    return tracts

def lookup_local(geoid: str, table: str) -> Optional[str]:
    assert re.fullmatch(r"1400000US\d{11}", geoid)
    assert re.fullmatch(r"[BC]\d{5}[A-Z]?_[EM]\d{3}", table)
    with open(f"flaskr/data/acs/raw/acsdt5y2024-{table[:6].lower()}.dat") as f:
        header = f.readline().split("|")
        i = header.index(table)
        for line in f:
            if line.startswith(geoid):
                values = line.split("|")
                return values[i]

    return None

def query_tracts(tracts: GDF, fields: List[str] | str) -> DF:
    fields = fields.split(",") if isinstance(fields, str) else fields

    from time import perf_counter

    query_tracts.t = perf_counter()

    def fetch(geoid: str) -> dict:
        values = [lookup_local(f"1400000US{geoid}", field) for field in fields]
        row = dict(zip(fields, values))
        row["GEOID"] = geoid
        print(f"fetched: [{geoid}] in {perf_counter() - query_tracts.t}s")
        query_tracts.t = perf_counter()
        return row
    
    return DF(fetch(tract) for tract in tracts["GEOID"]).set_index("GEOID")