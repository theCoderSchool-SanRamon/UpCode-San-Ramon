import requests
import pydash as py_

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

def format(response: requests.Response):
    data = response.json()
    return {
        "isUrban": len(data['features']) > 0,
        "area": {
            "name": py_.get(data, "features[0].attributes.NAME"),
            #"geometry": py_.get(data, "features[0].geometry.rings")
        }
        #front end uses this for the 'title' of our popup
    }

def format_err(response: requests.Response):
    return {"err": response.status_code, "msg": response.reason}


def evaluate(context):
    r = requests.get(_url, _params(context["latitude"], context["longitude"]))
    return {"morphology": format(r) if r.ok else format_err(r)} | context

eval_morphology = evaluate

__all__ = ['eval_morphology']