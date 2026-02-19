from flaskr.data import query_acs as acs
from pathlib import Path

import pandas as pd

def evaluate(context):
    tracts = acs.get_tracts(context["latitude"], context["longitude"], context["range"], Path("./flaskr/data/tracts").resolve())
    print(tracts)
    query = acs.query_tracts(tracts, "B19013_001E,B19001_001E,B19001_017E,B25077_001E").astype(float)
    print(query)

    totals = query.sum()

    total_high_income = totals["B19001_017E"]
    total_households = totals["B19001_001E"]

    context["high_income"] = total_high_income / total_households
    return context

evaluate_wealth = evaluate

__all__ = ['evaluate_wealth']