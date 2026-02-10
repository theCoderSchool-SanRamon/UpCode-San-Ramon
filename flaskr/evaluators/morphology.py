import requests

_url = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Urban/MapServer/7/query"
_params = lambda lat,lng: {
    "where": "1=1",
    "geometry": f"{lng},{lat}",
    "geometryType": "esriGeometryPoint",
    "inSR": 4326,
    "spatialRel": "esriSpatialRelIntersects",
    "outFields": "BASENAME,NAME,UA,GEOID,LSADC",
    "returnGeometry": "true",
    "f": "pjson"
}

def format(response: any):
    pass

def format_err(response: requests.Response):


def evaluate(context):
    r = requests.get(_url, _params)
    context[__name__] = {"err": r.status_code, "msg":  }