"""
Packs all ACS data into duckdb
"""

import csv
import duckdb
import os
import time

from glob import glob
from typing import Optional
from warnings import warn
from contextlib import closing
from pathlib import Path
from bitarray import bitarray
from collections import Counter

ROOT = Path(__file__).resolve().parent
GEO_DENSE = [
    "GEO_ID", "NAME", "SUMLEVEL", "COMPONENT", "STUSAB", "STATE", "COUNTY",
    "TL_GEO_ID", "TRACT", "BLKGRP", "PLACE", "COUSUB"
]
GEO_SPARSE = [
    "ZCTA5","SLDL","AIANHH","CBSA","SDUNI","UA","SLDU","CDCURR","AIHHTLI","BTTR","PCI",
    "CSA","PUMA5","BTBG","SDELM","AITS","MEMI","SDSEC","METDIV","SUBMCD","UR","CONCIT",
    "DIVISION","REGION","US","ANRC"
]
THREADS = 8
MEM_LIMIT = "4GB"

def fmt(s: float) -> str:
    return f"{s:.1f}s" if s < 60 else f"{int(s//60)}m{int(s%60)}s"

def print_characteristics(path: str | Path) -> None:
    with open(path) as f:
        r = csv.reader(f, delimiter="|")
        headers = next(r)

        counter = Counter()

        print(headers)

        prev = None

        def characterize(entry: list[str]) -> bitarray:
            return bitarray(bool(s) for s in entry)
        
        for index, row in enumerate(r):
            character = characterize(row)
            counter[int(character.to01(), 2)] += 1
            if (prev == character): continue

            print(f"{index}: {'|'.join(row)}")
            prev = character

        print(str(counter))
        for k, v in sorted({h: sum(v for k, v in counter.items()
                      if (k >> (len(headers)-1-i)) & 1)
                      for i, h in enumerate(headers)
                      }.items(), key=lambda x:x[1], reverse=True):
            print(k, v)


def main(geos: str, shells: str, dir: str):
    assert os.path.isfile(ROOT / geos)
    assert os.path.isfile(ROOT / shells)
    assert os.path.isdir(ROOT / dir)

    with closing(duckdb.connect(ROOT / "acs.duckdb")) as con:
        con.execute(f"PRAGMA threads={THREADS};")
        if MEM_LIMIT: con.execute(f"PRAGMA memory_limit='{MEM_LIMIT}';")

        #geography table
        t0 = time.time()
        con.execute(f"""--sql
        DROP TABLE IF EXISTS geo;
        DROP TABLE IF EXISTS geo_attr;

        CREATE TABLE geo (
            geokey INTEGER PRIMARY KEY,
            geoid TEXT UNIQUE,
            name TEXT,
            sumlevel SMALLINT,
            component SMALLINT,
            stusab TEXT,
            state TEXT,
            county TEXT,
            tl_geoid TEXT,
            tract TEXT,
            blkgrp TEXT,
            place TEXT,
            cousub TEXT
        );
        
        CREATE TABLE geo_attr (
            geokey INTEGER,
            key TEXT,
            value TEXT
        );
        
        CREATE OR REPLACE TEMP VIEW geo_raw AS
        SELECT * FROM read_csv('{str(ROOT / geos)}', delim='|', header=true,
            quote='', escape='', nullstr='', all_varchar=true);
        """)

        for col in set(GEO_DENSE + GEO_SPARSE) - {r[0] for r in con.execute("DESCRIBE geo_raw").fetchall()}:
            warn(f"Missing column '{col}' in geos file")

        con.execute("""--sql
        INSERT INTO geo
        SELECT
            row_number() OVER (ORDER BY GEO_ID) - 1 AS geokey,
            GEO_ID AS geoid,
            NAME   AS name,
            try_cast(SUMLEVEL  AS SMALLINT) AS sumlevel,
            try_cast(COMPONENT AS SMALLINT) AS component,
            STUSAB AS stusab,
            STATE  AS state,
            COUNTY AS county,
            TL_GEO_ID AS tl_geoid,
            TRACT  AS tract,
            BLKGRP AS blkgrp,
            PLACE  AS place,
            COUSUB AS cousub
        FROM geo_raw
        WHERE GEO_ID IS NOT NULL;
                    
        CREATE OR REPLACE TABLE geo_map AS
        SELECT geoid, geokey FROM geo;
        """)

        sparse = ",\n".join([f"('{c}', \"{c}\")" for c in GEO_SPARSE])
        con.execute(f"""--sql
        INSERT INTO geo_attr
        SELECT gm.geokey, v.k, v.val
        FROM geo_raw gr
        JOIN geo_map gm ON gm.geoid = gr.GEO_ID
        CROSS JOIN (VALUES {sparse}) AS v(k, val)
        WHERE v.val IS NOT NULL AND v.val <> '';

        CREATE INDEX geo_geoid_idx ON geo(geoid);
        CREATE INDEX geo_attr_gk_key_idx ON geo_attr(geokey, key);
        """)
        geo_n = con.execute("SELECT count(*) FROM geo").fetchone()[0]
        attr_n = con.execute("SELECT count(*) FROM geo_attr").fetchone()[0]
        print(f"[geo] geo={geo_n} attr={attr_n} ({fmt(time.time()-t0)})")

        #shell table
        t0 = time.time()
        con.execute(f"""--sql
        DROP TABLE IF EXISTS shell;
        DROP TABLE IF EXISTS uid_map;
        
        CREATE TABLE shell (
            uidkey INTEGER PRIMARY KEY,
            unique_id TEXT,
            table_id TEXT,
            line INTEGER,
            indent SMALLINT,
            label TEXT,
            title TEXT,
            universe TEXT,
            type TEXT
        );
        
        CREATE OR REPLACE TEMP VIEW shell_raw AS
        SELECT * FROM read_csv('{ROOT / shells}', delim='|', header=true,
            quote='', escape='', nullstr='', all_varchar=true);
        """)
        
        for col in set(["Table ID","Line","Indent","Unique ID","Label","Title","Universe","Type"]) \
              - {r[0] for r in con.execute("DESCRIBE shell_raw").fetchall()}:
            warn(f"Missing column '{col}' in shells file")

        con.execute("""--sql
        INSERT INTO shell
        SELECT
            row_number() OVER (ORDER BY "Table ID", try_cast("Line" AS INTEGER), "Label") - 1 AS uidkey,
            nullif("Unique ID",'') AS unique_id,
            "Table ID" AS table_id,
            try_cast("Line" AS INTEGER) AS line,
            try_cast("Indent" AS SMALLINT) AS indent,
            "Label" AS label,
            "Title" AS title,
            "Universe" AS universe,
            "Type" AS type
        FROM shell_raw;
                    
        CREATE TABLE uid_map AS
        SELECT unique_id, uidkey FROM shell WHERE unique_id IS NOT NULL;
        CREATE INDEX shell_unique_id_idx ON shell(unique_id);
        """)
        shell_n = con.execute("SELECT count(*) FROM shell").fetchone()[0]
        print(f"[shell] rows={shell_n} ({fmt(time.time()-t0)})")

        #fact table
        t0 = time.time()
        con.execute("""--sql
        DROP TABLE IF EXISTS acs_value;
        CREATE TABLE acs_value (geokey INTEGER, uidkey INTEGER, est DOUBLE, moe DOUBLE);
        """)

        files = sorted(glob(str(ROOT / dir / "*.dat")))
        assert files

        for i, file in enumerate(files):
            con.execute(f"""--sql
            CREATE OR REPLACE TEMP VIEW t AS
            SELECT * FROM read_csv('{file}', delim='|', header=true,
                quote='', escape='', nullstr='', all_varchar=true)
            """)
            cols = [r[0] for r in con.execute("DESCRIBE t").fetchall()]
            if "GEO_ID" not in cols:
                warn(f"GEO_ID missing from {file}")
                continue
            data = [col for col in cols if col != "GEO_ID"]
            assert data

            vals = ",\n".join([f"('{c}', \"{c}\")" for c in data])

            con.execute(f"""--sql
                INSERT INTO acs_value
                WITH u AS (
                    SELECT
                        t.GEO_ID as geoid,
                        v.col AS col,
                        v.val AS val,
                        regexp_extract(v.col, '^(.*)_[EM](\\d+)$', 1) || '_' ||
                            lpad(regexp_extract(v.col, '^(.*)_[EM](\\d+)$', 2), 3, '0') AS unique_id,
                        regexp_extract(v.col, '^.*_([EM])\\d+$', 1) AS kind
                    FROM t
                    CROSS JOIN (VALUES {vals}) AS v(col, val)
                    WHERE v.col ~ '^(.*)_[EM]\\d+$'
                ),
                joined AS (
                    SELECT gm.geokey, um.uidkey, kind, try_cast(val AS DOUBLE) AS dval
                    FROM u
                    JOIN geo_map gm ON gm.geoid = u.geoid
                    JOIN uid_map um ON um.unique_id = u.unique_id
                ),
                agg AS (
                    SELECT geokey, uidkey,
                        max(CASE WHEN kind='E' THEN dval END) AS est,
                        max(CASE WHEN kind='M' THEN dval END) AS moe
                    FROM joined
                    GROUP BY geokey, uidkey
                )
                SELECT * FROM agg
                WHERE est IS NOT NULL OR moe IS NOT NULL;
            """)

            n = con.execute("SELECT count(*) FROM acs_value").fetchone()[0]
            print(f"[fact] {i:03d}/{len(files)} row={n}")
        
        con.execute("""--sql
        CREATE INDEX acs_value_gk_uid_idx ON acs_value(geokey, uidkey);
        ANALYZE;
        VACUUM;
        """)
        print(f"[done] {ROOT / "acs.duckdb"} ({fmt(time.time()-t0)} fact stage)")
        

if __name__ == '__main__':
    main("Geos20245YR.txt", "ACS20245YR_Table_Shells.txt", "raw")