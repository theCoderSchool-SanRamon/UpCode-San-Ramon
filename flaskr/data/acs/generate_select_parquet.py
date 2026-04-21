import duckdb
from pathlib import Path

ACS_GEOS_PATH = Path("flaskr/data/acs/Geos20245YR.txt")
ACS_RAW_DIR = Path("flaskr/data/acs/raw")
OUT_PATH = Path("flaskr/data/acs/tract_income_2024.parquet")

FIELDS = ["B19001_E001", "B19001_E017"]
TABLE_PREFIX = FIELDS[0][:6].lower()  # b19001
ACS_TABLE_PATH = ACS_RAW_DIR / f"acsdt5y2024-{TABLE_PREFIX}.dat"


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect()

    fields_sql = ", ".join(f"TRY_CAST({f} AS BIGINT) AS {f}" for f in FIELDS)

    con.execute(f"""
        COPY (
            WITH tracts AS (
                SELECT DISTINCT
                    SUBSTR(GEO_ID, 10, 11) AS GEOID,
                    GEO_ID
                FROM read_csv(
                    '{ACS_GEOS_PATH.as_posix()}',
                    delim='|',
                    header=true,
                    all_varchar=true
                )
                WHERE SUMLEVEL = '140'
                  AND GEO_ID LIKE '1400000US___________'
            ),
            income AS (
                SELECT
                    GEO_ID,
                    {fields_sql}
                FROM read_csv(
                    '{ACS_TABLE_PATH.as_posix()}',
                    delim='|',
                    header=true,
                    all_varchar=true
                )
            )
            SELECT
                t.GEOID,
                i.{FIELDS[0]},
                i.{FIELDS[1]}
            FROM tracts t
            LEFT JOIN income i
                ON i.GEO_ID = t.GEO_ID
            ORDER BY t.GEOID
        )
        TO '{OUT_PATH.as_posix()}'
        (FORMAT PARQUET, COMPRESSION ZSTD, COMPRESSION_LEVEL 22);
    """)

    count = con.execute(f"""
        SELECT COUNT(*)
        FROM read_parquet('{OUT_PATH.as_posix()}')
    """).fetchone()[0]

    print(f"Wrote {count:,} tracts to {OUT_PATH}")


if __name__ == "__main__":
    main()