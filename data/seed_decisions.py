import requests, random

options = ["A", "B", "C"]
for i in range(1, 21):
    requests.post("http://localhost:8000/execute-decision", params={
        "shipment_id": i,
        "chosen_option": random.choice(options),
        "predicted_cost": random.uniform(500, 15000),
        "predicted_delay_days": random.uniform(1, 30),
    })
print("Seeded 20 decisions.")