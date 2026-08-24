import pandas as pd, numpy as np
np.random.seed(42)
n = 5000
df = pd.DataFrame({
    "origin": np.random.choice(["Shenzhen","Taipei","Penang"], n),
    "destination": np.random.choice(["LA","Rotterdam","Chicago"], n),
    "carrier": np.random.choice(["Maersk","FedEx","DHL"], n),
    "planned_lead_time": np.random.randint(10, 40, n),
    "current_transit_days": np.random.randint(5, 45, n),
    "port_congestion_index": np.random.uniform(0, 1, n),
})
df["is_delayed"] = (df["current_transit_days"] > df["planned_lead_time"]).astype(int)
df["delay_days"] = np.where(df["is_delayed"]==1,
                             df["current_transit_days"] - df["planned_lead_time"], 0)
df.to_csv("data/shipments.csv", index=False)
print("Done! Rows generated:", len(df))