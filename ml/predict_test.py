import joblib, pandas as pd
bundle = joblib.load("ml/model.pkl")
clf, reg, enc = bundle["clf"], bundle["reg"], bundle["encoder"]

sample = pd.DataFrame([{
    "origin": "Shenzhen", "destination": "LA", "carrier": "Maersk",
    "planned_lead_time": 20, "current_transit_days": 34,
    "port_congestion_index": 0.8
}])
sample[["origin","destination","carrier"]] = enc.transform(sample[["origin","destination","carrier"]])
print("Delay probability:", clf.predict_proba(sample)[0][1])
print("Predicted delay days:", reg.predict(sample)[0])