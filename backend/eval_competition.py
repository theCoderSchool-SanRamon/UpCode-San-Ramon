import os
import requests
import pydash as _
import pandas as pd

from dotenv import load_dotenv
load_dotenv()

API_KEY = os.environ.get("GOOGLE_API_KEY")
url = "https://places.googleapis.com/v1/places:searchText"

#https://developers.google.com/maps/documentation/places/web-service/data-fields
headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask": ','.join(f"places.{name}" for name in [
        "id",
        "addressComponents",
        "businessStatus",
        "location",
        "primaryType",
        "types"
    ])
}

M_PER_MI = 1609.344

def evaluate(context):
    payload = {
        "maxResultCount": 20,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": context["latitude"],
                    "longitude": context["longitude"]
                },
                "radius": context["range"] * M_PER_MI
            }
        },
        "textQuery": context["searchQuery"]
    }

    r = requests.post(url, headers=headers, json=payload)
    r.raise_for_status()
    data = r.json()

    context["competitor_candidates"] = data["places"]

    return context



evaluate_competition = evaluate
__all__ = ['evaluate_competition']

if __name__ == "__main__":
    print(evaluate({"latitude": 41.2, "longitude": -71.19, "range": 5, "searchQuery": "coding for kids"}))