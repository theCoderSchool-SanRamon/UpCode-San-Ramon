"""
Convert .dat files into .parquet files with maximum compression

Usage:
    python ./flaskr/data/acs/make_acs_parquets.py --path ./flaskr/data/acs/raw
"""
import pandas as pd
import argparse
from pathlib import Path
from tqdm import tqdm

def to_parquet(path: Path) -> None:
    pd.read_csv(path,  delimiter='|') \
    .replace(r'^\s*$', pd.NA, regex=True) \
    .dropna(axis=1, how="all") \
    .to_parquet(
        path.with_suffix(".parquet"),
        engine="pyarrow",
        compression="zstd",
        compression_level=22
    )


def main(dir: Path):
    assert dir.is_dir()

    files = list(dir.glob("*.dat"))
    for file in tqdm(files, total=len(files), desc="Converting", unit="file"):
        to_parquet(file)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=str, required=True)
    args = parser.parse_args()

    main(Path(args.path))