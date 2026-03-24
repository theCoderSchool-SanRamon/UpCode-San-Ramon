import pandas as pd
df = pd.read_parquet("tract_income_2024.parquet")
print(df.columns.tolist())