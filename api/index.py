from flask import Flask, jsonify, request

from backend.vercel_analysis import analyze_locations

app = Flask(__name__)


@app.route("/api/analyze", methods=["POST"])
def analyze() -> tuple[object, int] | object:
    payload = request.get_json(silent=True) or {}
    locations = payload.get("locations")
    if not isinstance(locations, list) or not locations:
        return jsonify({"error": "Missing required field: locations"}), 400

    weights = payload.get("weights")
    results = analyze_locations(locations, weights if isinstance(weights, dict) else None)
    return jsonify({"results": results})


@app.route("/api/health", methods=["GET"])
def health() -> object:
    return jsonify({"ok": True})
