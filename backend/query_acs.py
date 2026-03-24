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

_acs_url = "https://api.census.gov/data/2024/acs/acs5"

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

def query(geoids: list[str], tables: list[str]) -> Optional[DF]:
    if not geoids or not tables:
        return None

    geoids = list(dict.fromkeys(geoids))
    tables = list(dict.fromkeys(tables))

    for geoid in geoids:
        assert re.fullmatch(r"\d{11}", str(geoid)), geoid

    for table in tables:
        assert re.fullmatch(r"[BC]\d{5}[A-Z]?_\d{3}[EM]", table), table

    ucgids = [f"1400000US{geoid}" for geoid in geoids]

    resp = requests.get(
        _acs_url,
        params={
            "get": ",".join(["GEO_ID", *tables]),
            "ucgid": ",".join(ucgids),
        },
        timeout=30,
    )
    resp.raise_for_status()

    rows = resp.json()
    if not rows or len(rows) < 2:
        return None

    df = pd.DataFrame(rows[1:], columns=rows[0])

    if "GEO_ID" not in df.columns:
        return None

    df["GEOID"] = df["GEO_ID"].str.extract(r"1400000US(\d{11})$", expand=False)
    df = df.dropna(subset=["GEOID"]).drop(columns=["GEO_ID", "ucgid"])
    df = df.drop_duplicates(subset="GEOID").set_index("GEOID")

    return df.reindex(geoids)