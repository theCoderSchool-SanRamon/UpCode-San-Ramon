import argparse
import os
import tempfile
import pandas as pd
import geopandas as gpd
import requests
from typing import *
from statewise_fips import STATE_TO_FIPS

TIGER_ZIP_URL = "https://www2.census.gov/geo/tiger/TIGER2024/TRACT/tl_2024_{fips}_tract.zip"
# Census Variables: Income, 6 age brackets (Male/Female 5-17), and Bachelors degrees
ACS_URL = "https://api.census.gov/data/2022/acs/acs5?get=B19013_001E,B01001_004E,B01001_005E,B01001_006E,B01001_028E,B01001_029E,B01001_030E,B15003_022E&for=tract:*&in=state:{fips}&in=county:*"

def download(url: str, to: str) -> None:
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(to, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024**2):
                if chunk: f.write(chunk)

def fetch_census_data(fips: str) -> pd.DataFrame:
    try:
        r = requests.get(ACS_URL.format(fips=fips), timeout=60)
        r.raise_for_status()
        data = r.json()
        df = pd.DataFrame(data[1:], columns=data[0])
        
        # SUM THE AGE BRACKETS FOR 5-17
        age_cols = ['B01001_004E', 'B01001_005E', 'B01001_006E', 'B01001_028E', 'B01001_029E', 'B01001_030E']
        for col in age_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
        # We save this as B01001_003E so your OLD analyzer still works without changes
        df["B01001_003E"] = df[age_cols].sum(axis=1)
        df["GEOID"] = df["state"] + df["county"] + df["tract"]
        
        return df[['GEOID', 'B19013_001E', 'B01001_003E', 'B15003_022E']]
    except Exception as e:
        print(f"  [!] Census Error: {e}")
        return pd.DataFrame()

def main(states: Iterable[str], dir: str) -> None:
    os.makedirs(dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tempdir:
        for state in states:
            fips = state if state.isdigit() else STATE_TO_FIPS.get(state, state)
            out = os.path.join(dir, f"{state}.parquet")
            print(f"[{state}] Downloading 5-17 demographic data...")

            zip_to = os.path.join(tempdir, f"{state}.zip")
            download(TIGER_ZIP_URL.format(fips=fips), zip_to)
            gdf = gpd.read_file(f"zip://{zip_to}")
            
            df_vars = fetch_census_data(fips)
            if not df_vars.empty:
                gdf = gdf.merge(df_vars, on="GEOID", how="left")
            
            gdf.to_crs("EPSG:4326", inplace=True)
            gdf["centroid"] = gdf.to_crs("EPSG:3857").geometry.centroid.to_crs("EPSG:4326")
            gdf.to_parquet(out, index=False)
            print(f"  -> Saved {out}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=str, required=True)
    parser.add_argument("--states", type=str, default="CA")
    args = parser.parse_args()
    main(states=args.states.split(","), dir=args.path)