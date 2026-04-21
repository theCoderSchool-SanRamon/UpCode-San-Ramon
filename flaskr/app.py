
from flask import *
import pydash as py_
import requests
import json

from flaskr.evaluators.morphology import *
from flaskr.evaluators.wealth_distribution import *

app = Flask(__name__, static_folder="./static")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/eval")
def evaluate():
    pipe = py_.flow(
        lambda args: {
            "latitude": args.get("lat", type=float),
            "longitude": args.get("lng", type=float)
        },
        eval_morphology,
        #add more evaluators to this pipe
        lambda data: py_.assign(data, {
            "name": data.get("name", py_.get(data, "morphology.area.name"))
        }
        )
        )
    data = pipe(request.args)

    #app.logger.debug(json.dumps(data))
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)