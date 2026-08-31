import logging
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from api.db import Base, engine, SessionLocal, Decision
from optimizer.solve import prescribe
from fastapi.security import OAuth2PasswordRequestForm
from api.auth import verify_password, create_token, get_current_user, User
from api.db import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("supplyprescript")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

Base.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/prescribe/{shipment_id}")
def get_prescription(shipment_id: int, delay_days: float, budget_cap: float = 20000):
    logger.info(f"Prescription requested: shipment_id={shipment_id}, delay_days={delay_days}, budget_cap={budget_cap}")
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
@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    user = db.query(User).filter(User.username == form.username).first()
    db.close()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return {"access_token": create_token(user.username), "token_type": "bearer"}

@app.get("/me")
def me(current_user: str = Depends(get_current_user)):
    return {"username": current_user}

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
        "reason": f"Lowest cost per day saved (${top['cost_per_day_saved']:.2f}/day) among {len(options)} options"
    }

@app.post("/execute-decision")
def execute_decision(shipment_id: int, chosen_option: str, predicted_cost: float, predicted_delay_days: float):
    db = SessionLocal()
    d = Decision(shipment_id=shipment_id, chosen_option=chosen_option,
                 predicted_cost=predicted_cost, predicted_delay_days=predicted_delay_days)
    db.add(d); db.commit(); db.refresh(d)
    db.close()
    return {"status": "written", "decision_id": d.id}