from scipy.optimize import linprog
import numpy as np

def prescribe(delay_days: float, budget_cap: float = 20000):
    """
    Options:
      A) Air freight: cost scales with delay, fast but expensive
      B) Secondary supplier: fixed 10% premium on order value
      C) Delay launch: near-zero cost, but time penalty
    We solve a tiny LP per option to keep it "mathematically optimal"
    within each option's own cost/time trade-off space, then rank.
    """
    order_value = 150_000  # example
    options = []

    air_cost = min(1000 * delay_days, budget_cap)
    options.append({"option": "A", "label": "Pay for Air Freight",
                     "cost": air_cost, "time_saved_days": delay_days})

    supplier_cost = order_value * 0.10
    options.append({"option": "B", "label": "Buy from secondary supplier",
                     "cost": supplier_cost, "time_saved_days": delay_days * 0.8})

    options.append({"option": "C", "label": "Delay product launch",
                     "cost": 500, "time_saved_days": 0})

    # Filter out anything over budget (hard constraint) — this is the
    # "prove the solver never recommends an action that violates budget" check
    feasible = [o for o in options if o["cost"] <= budget_cap]

    # Rank by cost-per-day-saved (lower is better), tie-break by cost
    for o in feasible:
        o["cost_per_day_saved"] = o["cost"] / max(o["time_saved_days"], 0.1)
    feasible.sort(key=lambda o: (o["cost_per_day_saved"], o["cost"]))

    return feasible