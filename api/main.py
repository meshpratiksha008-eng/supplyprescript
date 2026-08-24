from fastapi import FastAPI
from api.db import Base, engine

app = FastAPI()
Base.metadata.create_all(engine)

@app.get("/health")
def health():
    return {"status": "ok"}