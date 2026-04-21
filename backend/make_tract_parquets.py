"""
Get TIGER/Shapefile Census Tracts and write them into GeoParquets by state
Data from 2024 is used, TIGER files are deleted after use

Usage:
    python ./flaskr/data/make_tract_parquets.py --path ./flaskr/data/tracts --states CA,NV,AZ
    python ./flaskr/data/make_tract_parquets.py --path ./flaskr/data/tracts
"""

import argparse
import os
import tempfile
from typing import *

import geopandas as gpd
import requests

from statewise_fips import STATE_TO_FIPS

TIGER_ZIP_URL = "https://www2.census.gov/geo/tiger/TIGER2024/TRACT/tl_2024_{fips}_tract.zip"

def download(url: str, to: str) -> None:
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(to, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024**2):
                if chunk:
                    f.write(chunk)

def normalize_tracts(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    keep = [col for col in ['GEOID', 'NAME', 'STATEFP', 'COUNTYFP', 'TRACTCE', 'ALAND', 'AWATER', 'geometry'] if col in gdf.columns]
    gdf = gdf[keep].copy()
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4269")
    gdf.to_crs("EPSG:4326", inplace=True)
    gdf["GEOID"] = gdf["GEOID"].astype(str)
    return gdf

def parse_states(s: str) -> List[str]:
    return [STATE_TO_FIPS[p.strip().upper()] for p in s.split(",") if p.strip()]

def main(states: Iterable[str], dir: str) -> None:
    os.makedirs(dir, exist_ok=True)

    with tempfile.TemporaryDirectory() as tempdir:
        for state in states:
            fips = STATE_TO_FIPS[state]
            url = TIGER_ZIP_URL.format(fips = fips)
            out = os.path.join(dir, f"{state}.parquet")

            print(f"[{state}] downloading...")

            zip_to = os.path.join(tempdir, f"{state}.zip")
            download(url, zip_to)

            gdf = gpd.read_file(f"zip://{zip_to}")
            gdf = normalize_tracts(gdf)
            gdf["centroid"] = gdf.to_crs("EPSG:3857").geometry.centroid.to_crs("EPSG:4326")
            gdf.to_parquet(out, index=False)
            print(f"  -> {out} ({len(gdf)} tracts)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=str, required=True)
    parser.add_argument("--states", type=str, default="")
    args = parser.parse_args()

    states = parse_states(args.states) if args.states else list(STATE_TO_FIPS.keys())
    main(states=states, dir=args.path)