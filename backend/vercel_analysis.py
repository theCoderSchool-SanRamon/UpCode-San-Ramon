import json
import math
import os
from typing import Any

import requests

ACS_5Y_2024_URL = "https://api.census.gov/data/2024/acs/acs5"
TIGERWEB_TRACTS_QUERY_URL = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/"
    "TIGERweb/Tracts_Blocks/MapServer/7/query"
)
MAPBOX_ISOCHRONE_URL = (
    "https://api.mapbox.com/isochrone/v1/mapbox/driving-traffic/"
)
GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

EARTH_RADIUS_M = 6_371_008.8
M_PER_MI = 1_609.344
TRACT_QUERY_FIELDS = "GEOID"
ACS_BATCH_SIZE = 200
HTTP_TIMEOUT = 30
COMPETITION_RADIUS_MILES = 5.0
COMPETITION_SEARCH_QUERIES = (
    "coding school",
    "tutoring service",
    "STEM program",
)

DEFAULT_WEIGHTS = {
    "wealth": 0.30,
    "family": 0.25,
    "education": 0.10,
    "competition": 0.20,
    "accessibility": 0.15,
}

session = requests.Session()


def normalize_weights(input_weights: dict[str, Any] | None) -> dict[str, float]:
    merged = {
        key: float((input_weights or {}).get(key, default))
        for key, default in DEFAULT_WEIGHTS.items()
    }
    total = sum(merged.values())
    if not math.isfinite(total) or total <= 0:
        return DEFAULT_WEIGHTS.copy()
    return {key: value / total for key, value in merged.items()}


def _to_float(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed >= 0 else 0.0


def _destination_point(
    lat_deg: float, lng_deg: float, bearing_deg: float, distance_m: float
) -> tuple[float, float]:
    lat1 = math.radians(lat_deg)
    lng1 = math.radians(lng_deg)
    bearing = math.radians(bearing_deg)
    angular_distance = distance_m / EARTH_RADIUS_M

    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    lng2 = lng1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )
    lng2 = (lng2 + math.pi) % (2 * math.pi) - math.pi
    return math.degrees(lat2), math.degrees(lng2)


def _build_geodesic_circle(
    lat: float, lng: float, radius_miles: float, steps: int = 72
) -> dict[str, Any]:
    radius_m = radius_miles * M_PER_MI
    ring: list[list[float]] = []
    for step in range(steps):
        bearing = step * (360.0 / steps)
        point_lat, point_lng = _destination_point(lat, lng, bearing, radius_m)
        ring.append([point_lng, point_lat])
    ring.append(ring[0])
    return {"type": "Polygon", "coordinates": [ring]}


def _geojson_to_arcgis_polygon(geometry: dict[str, Any]) -> dict[str, Any]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "Polygon" and coordinates:
        rings = coordinates
    elif geometry_type == "MultiPolygon" and coordinates:
        rings = [ring for polygon in coordinates for ring in polygon]
    else:
        raise ValueError(f"Unsupported geometry type for tract query: {geometry_type}")

    return {
        "rings": rings,
        "spatialReference": {"wkid": 4326},
    }


def _lookup_tract_geoids(geometry: dict[str, Any]) -> list[str]:
    arcgis_geometry = _geojson_to_arcgis_polygon(geometry)
    response = session.post(
        TIGERWEB_TRACTS_QUERY_URL,
        data={
            "f": "json",
            "where": "1=1",
            "geometryType": "esriGeometryPolygon",
            "geometry": json.dumps(arcgis_geometry),
            "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "returnGeometry": "false",
            "outFields": TRACT_QUERY_FIELDS,
        },
        timeout=HTTP_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("error"):
        raise RuntimeError(payload["error"].get("message", "TIGERweb query failed"))

    geoids = []
    for feature in payload.get("features", []):
        geoid = str((feature.get("attributes") or {}).get("GEOID", "")).strip()
        if len(geoid) == 11 and geoid.isdigit():
            geoids.append(geoid)
    return sorted(set(geoids))


def get_tract_geoids_for_radius(lat: float, lng: float, radius_miles: float) -> list[str]:
    return _lookup_tract_geoids(_build_geodesic_circle(lat, lng, radius_miles))


def get_tract_geoids_for_geometry(geometry: dict[str, Any]) -> list[str]:
    return _lookup_tract_geoids(geometry)


def _chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def query_acs(geoids: list[str], variables: list[str]) -> dict[str, dict[str, float]]:
    if not geoids or not variables:
        return {}

    unique_geoids = list(dict.fromkeys(geoids))
    unique_variables = list(dict.fromkeys(variables))
    rows_by_geoid: dict[str, dict[str, float]] = {}

    for geoid_batch in _chunked(unique_geoids, ACS_BATCH_SIZE):
        response = session.get(
            ACS_5Y_2024_URL,
            params={
                "get": ",".join(["GEO_ID", *unique_variables]),
                "ucgid": ",".join(f"1400000US{geoid}" for geoid in geoid_batch),
            },
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        if len(payload) < 2:
            continue

        headers = payload[0]
        for raw_row in payload[1:]:
            row = dict(zip(headers, raw_row))
            geo_id = str(row.get("GEO_ID", ""))
            geoid = geo_id.removeprefix("1400000US")
            if len(geoid) != 11 or not geoid.isdigit():
                continue
            rows_by_geoid[geoid] = {
                variable: _to_float(row.get(variable)) for variable in unique_variables
            }

    for geoid in unique_geoids:
        rows_by_geoid.setdefault(
            geoid, {variable: 0.0 for variable in unique_variables}
        )

    return rows_by_geoid


def _sum_variable(rows_by_geoid: dict[str, dict[str, float]], variable: str) -> float:
    return sum(row.get(variable, 0.0) for row in rows_by_geoid.values())


def evaluate_accessibility(
    lat: float, lng: float, max_drive_time_minutes: int
) -> tuple[float, str | None]:
    token = os.getenv("MAPBOX_TOKEN")
    if not token:
        return 0.0, "MAPBOX_TOKEN is not configured"

    response = session.get(
        f"{MAPBOX_ISOCHRONE_URL}{lng},{lat}",
        params={
            "contours_minutes": max_drive_time_minutes,
            "denoise": 1,
            "polygons": "true",
            "access_token": token,
        },
        timeout=HTTP_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    features = payload.get("features") or []
    if not features:
        raise RuntimeError("Mapbox returned no isochrone geometry")

    geometry = (features[0] or {}).get("geometry")
    if not geometry:
        raise RuntimeError("Mapbox response is missing geometry")

    tract_geoids = get_tract_geoids_for_geometry(geometry)
    if not tract_geoids:
        return 0.0, "No census tracts intersect the Mapbox isochrone"

    rows = query_acs(tract_geoids, ["B01003_001E"])
    return _sum_variable(rows, "B01003_001E"), None


def _competition_level_from_count(competitor_count: int) -> str:
    if competitor_count >= 9:
        return "High"
    if competitor_count >= 4:
        return "Medium"
    return "Low"


def _competition_score_from_count(competitor_count: int) -> float:
    # Lower nearby competition should yield a higher score.
    return max(0.0, min(100.0, 100.0 - (competitor_count / 12.0) * 100.0))


def evaluate_competition(
    lat: float, lng: float, radius_miles: float
) -> tuple[float, str, int, str | None]:
    token = os.getenv("GOOGLE_API_KEY")
    if not token:
        return 50.0, "Medium", 0, "GOOGLE_API_KEY is not configured"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": token,
        "X-Goog-FieldMask": "places.id,places.businessStatus",
    }

    place_ids: set[str] = set()

    for search_query in COMPETITION_SEARCH_QUERIES:
        response = session.post(
            GOOGLE_PLACES_SEARCH_URL,
            headers=headers,
            json={
                "maxResultCount": 20,
                "locationBias": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": radius_miles * M_PER_MI,
                    }
                },
                "textQuery": search_query,
            },
            timeout=HTTP_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()

        for place in payload.get("places", []):
            place_id = str(place.get("id", "")).strip()
            status = str(place.get("businessStatus", "")).strip().upper()
            if place_id and (not status or status == "OPERATIONAL"):
                place_ids.add(place_id)

    competitor_count = len(place_ids)
    competition_level = _competition_level_from_count(competitor_count)
    competition_score = _competition_score_from_count(competitor_count)
    return competition_score, competition_level, competitor_count, None


def analyze_location(location: dict[str, Any], weights: dict[str, float]) -> dict[str, Any]:
    lat = float(location.get("lat"))
    lng = float(location.get("lng"))
    warnings: list[str] = []

    tract_geoids = get_tract_geoids_for_radius(lat, lng, 5.0)
    if not tract_geoids:
        raise RuntimeError("No census tracts found within the 5-mile study area")

    census_rows = query_acs(
        tract_geoids,
        [
            "B19001_001E",
            "B19001_017E",
            "B01001_003E",
            "B15003_022E",
            "B19013_001E",
        ],
    )

    total_households = _sum_variable(census_rows, "B19001_001E")
    wealthy_households = _sum_variable(census_rows, "B19001_017E")
    total_students = _sum_variable(census_rows, "B01001_003E")
    bachelors_total = _sum_variable(census_rows, "B15003_022E")
    income_total = _sum_variable(census_rows, "B19013_001E")
    tract_count = max(len(census_rows), 1)

    wealthy_share = (
        (wealthy_households / total_households) * 100.0 if total_households > 0 else 0.0
    )
    avg_bachelors = bachelors_total / tract_count
    avg_income = income_total / tract_count

    drive_time_pop, access_warning = evaluate_accessibility(lat, lng, 15)
    if access_warning:
        warnings.append(access_warning)

    (
        score_competition,
        competition_level,
        competitor_count,
        competition_warning,
    ) = evaluate_competition(lat, lng, COMPETITION_RADIUS_MILES)
    if competition_warning:
        warnings.append(competition_warning)

    score_wealth = min((wealthy_share / 25.0) * 100.0, 100.0)
    score_family = min((total_students / 4000.0) * 100.0, 100.0)
    score_education = min((avg_bachelors / 800.0) * 100.0, 100.0)
    score_access = min((drive_time_pop / 50000.0) * 100.0, 100.0)

    final_score = (
        score_wealth * weights["wealth"]
        + score_family * weights["family"]
        + score_education * weights["education"]
        + score_competition * weights["competition"]
        + score_access * weights["accessibility"]
    )

    rationale_parts = [
        f"{int(round(drive_time_pop)):,} people are estimated inside the 15-minute drive-time isochrone.",
        f"{len(tract_geoids)} census tracts intersect the 5-mile study area.",
        f"Average tract median income is approximately ${int(round(avg_income)):,}.",
        f"{competitor_count} nearby competitor locations were found across coding school, tutoring, and STEM program searches.",
    ]
    if warnings:
        rationale_parts.append(f"Warnings: {'; '.join(warnings)}.")

    return {
        "name": location.get("name", "Unknown Location"),
        "score": round(final_score),
        "estimatedFamilies": f"{int(round(total_students)):,}",
        "medianIncome": f"{round(wealthy_share, 1)}% >$200k",
        "competition": competition_level,
        "rationale": " ".join(rationale_parts),
        "rawScores": {
            "wealth": round(score_wealth, 2),
            "family": round(score_family, 2),
            "education": round(score_education, 2),
            "competition": round(score_competition, 2),
            "accessibility": round(score_access, 2),
        },
        "scoreMetrics": {
            "tractCount": len(tract_geoids),
            "totalHouseholds": int(round(total_households)),
            "wealthyHouseholds": int(round(wealthy_households)),
            "wealthyShare": round(wealthy_share, 2),
            "schoolAgeChildren": int(round(total_students)),
            "bachelorsEstimate": int(round(bachelors_total)),
            "averageTractMedianIncome": int(round(avg_income)),
            "driveTimePopulation": int(round(drive_time_pop)),
            "competitorCount": competitor_count,
            "warnings": warnings,
            "censusVariables": {
                "B19001_001E": "Total households",
                "B19001_017E": "Households with income of $200,000 or more",
                "B01001_003E": "Male population under 5 years; used here as the app's child-density proxy",
                "B15003_022E": "Population 25+ with bachelor's degree",
                "B19013_001E": "Median household income",
            },
        },
    }


def analyze_locations(
    locations: list[dict[str, Any]], input_weights: dict[str, Any] | None
) -> list[dict[str, Any]]:
    weights = normalize_weights(input_weights)
    results = []
    for location in locations:
        try:
            results.append(analyze_location(location, weights))
        except Exception as exc:
            results.append(
                {
                    "name": location.get("name", "Error Location"),
                    "score": 0,
                    "estimatedFamilies": "Error",
                    "medianIncome": "Error",
                    "competition": "High",
                    "rationale": f"System Error: {exc}",
                    "rawScores": {
                        "wealth": 0,
                        "family": 0,
                        "education": 0,
                        "competition": 0,
                        "accessibility": 0,
                    },
                    "scoreMetrics": {
                        "warnings": [str(exc)],
                    },
                }
            )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results
