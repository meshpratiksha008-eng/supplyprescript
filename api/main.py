from fastapi import FastAPI, HTTPException
from api.db import Base, engine
from optimizer.solve import prescribe

app = FastAPI()
Base.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/prescribe/{shipment_id}")
def get_prescription(shipment_id: int, delay_days: float, budget_cap: float = 20000):
    if delay_days < 0:
        raise HTTPException(status_code=400, detail="delay_days cannot be negative")
    if budget_cap <= 0:
        raise HTTPException(status_code=400, detail="budget_cap must be positive")

    options = prescribe(delay_days, budget_cap)

    if not options:
        raise HTTPException(status_code=422, detail="No feasible options within this budget")

    rounded_options = [
        {**o, "cost": round(o["cost"], 2),
         "time_saved_days": round(o["time_saved_days"], 2),
         "cost_per_day_saved": round(o["cost_per_day_saved"], 2)}
        for o in options
    ]

    return {
        "shipment_id": shipment_id,
        "options": rounded_options,
        "best_option": options[0]["option"]
    }

@app.get("/prescribe/{shipment_id}/explain")
def explain_prescription(shipment_id: int, delay_days: float, budget_cap: float = 20000):
    if delay_days < 0:
        raise HTTPException(status_code=400, detail="delay_days cannot be negative")
    if budget_cap <= 0:
        raise HTTPException(status_code=400, detail="budget_cap must be positive")

    options = prescribe(delay_days, budget_cap)

    if not options:
        raise HTTPException(status_code=422, detail="No feasible options within this budget")

    top = options[0]
    return {
        "shipment_id": shipment_id,
        "recommended": top["label"],
        "reason": f"Lowest cost per day saved (${top['cost_per_day_saved']:.2f}/day) among {len(options)} feasible option(s)."
    }
    