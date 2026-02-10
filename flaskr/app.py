
from flask import *
import pydash as py_
import requests
import json

app = Flask(__name__, static_folder="./static")

@app.route("/")
def home():
    return render_template("index.html")

def urbanness(lat, lng):
    url = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Urban/MapServer/7/query"
    params = {
        "where": "1=1",
        "geometry": f"{lng},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": 4326,
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "BASENAME,NAME,UA,GEOID,LSADC",
        "returnGeometry": "true",
        "f": "pjson"
    }

    r = requests.get(url, params)
    r.raise_for_status()
    return r.json()

@app.route("/eval")
def evaluate():
    args = request.args
    lat = args.get("lat", type=float)
    lng = args.get("lng", type=float)
    if lat is None or lng is None:
        return jsonify({"error": "missing lat/lng"}), 400
    
    urban = urbanness(lat, lng)
    
    data = {
        "info" : {
            "lat" : lat,
            "lng" : lng,
            "morphology" : "Urban" if len(urban['features']) > 0 else "Rural"
        },
        "name" : py_.get(urban, "features[0].attributes.NAME"),
        "urbanArea" : py_.get(urban, "features[0].geometry.rings", default=[]),
    }

    app.logger.debug(json.dumps(data))
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)