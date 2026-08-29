import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import PrescriptionCard from "./components/PrescriptionCard";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL;

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  try {
    return await axios.get(url, options);
  } catch (err) {
    if (axios.isCancel(err) || retries === 0) throw err;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

function SkeletonCard() {
  return (
    <div
      style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "1rem", width: "200px", height: "120px" }}
      className="animate-pulse"
    >
      <div style={{ background: "#e0e0e0", height: "1rem", marginBottom: "0.5rem" }} />
      <div style={{ background: "#e0e0e0", height: "1rem", width: "60%" }} />
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "#c62828" : "#2e7d32";
  return (
    <div
      role="status"
      style={{
        position: "fixed", top: "1rem", right: "1rem", background: bg, color: "white",
        padding: "0.75rem 1.25rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        cursor: "pointer", zIndex: 1000,
      }}
      onClick={onClose}
    >
      {toast.text}
    </div>
  );
}

// --- sessionStorage helpers (Enhancement #11) ---
function getStoredNumber(key, fallback) {
  const raw = sessionStorage.getItem(key);
  const n = Number(raw);
  return raw !== null && !Number.isNaN(n) ? n : fallback;
}

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipmentId, setShipmentId] = useState(() => getStoredNumber("shipmentId", 1));
  const [delayDays, setDelayDays] = useState(() => getStoredNumber("delayDays", 14));
  const [toast, setToast] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [executingOption, setExecutingOption] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Persist picker values across refresh (Enhancement #11)
  useEffect(() => {
    sessionStorage.setItem("shipmentId", String(shipmentId));
  }, [shipmentId]);

  useEffect(() => {
    sessionStorage.setItem("delayDays", String(delayDays));
  }, [delayDays]);

  // Debounced fetch
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      fetchWithRetry(
        `${API_BASE_URL}/prescribe/${shipmentId}?delay_days=${delayDays}`,
        { timeout: 8000, signal: controller.signal }
      )
        .then((res) => {
          setOptions(res.data.options);
          setBestOption(res.data.best_option);
        })
        .catch((err) => {
          if (axios.isCancel(err)) return;
          console.error("Failed to fetch prescriptions:", err);
          setError("Couldn't reach the server after several attempts.");
        })
        .finally(() => setLoading(false));
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [shipmentId, delayDays]);

  // Optimistic UI update (Enhancement #9)
  const handleExecute = (option) => {
    const confirmed = window.confirm(
      `Confirm decision: "${option.label}" — cost $${option.cost.toLocaleString()}, ` +
      `saves ${option.time_saved_days} days?`
    );
    if (!confirmed) return Promise.resolve();

    setExecutingOption(option.option);

    // Optimistically add to the recent-decisions list right away, marked "pending"
    const optimisticEntry = {
      option: option.option,
      label: option.label,
      cost: option.cost,
      time: new Date().toLocaleTimeString(),
      status: "pending",
    };
    setRecentDecisions((prev) => [optimisticEntry, ...prev].slice(0, 5));
    showToast("success", `Recording decision: option ${option.option}...`);

    return axios
      .post(`${API_BASE_URL}/execute-decision`, null, {
        params: {
          shipment_id: shipmentId,
          chosen_option: option.option,
          predicted_cost: option.cost,
          predicted_delay_days: delayDays,
        },
      })
      .then(() => {
        // Confirm the optimistic entry
        setRecentDecisions((prev) =>
          prev.map((d) =>
            d === optimisticEntry ? { ...d, status: "confirmed" } : d
          )
        );
        showToast("success", `Decision recorded: option ${option.option}`);
      })
      .catch(() => {
        // Roll back the optimistic entry on failure
        setRecentDecisions((prev) => prev.filter((d) => d !== optimisticEntry));
        showToast("error", "Failed to save decision — rolled back.");
      })
      .finally(() => setExecutingOption(null));
  };

  // Chart data for Recharts comparison (Enhancement #12)
  const chartData = options.map((o) => ({
    name: o.label,
    costPerDaySaved: o.cost_per_day_saved,
  }));

  return (
    <div style={{ padding: "1.5rem" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <h1>SupplyPrescript</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <label>
          Shipment ID:{" "}
          <input
            type="number"
            min="1"
            value={shipmentId}
            disabled={loading}
            onChange={(e) => setShipmentId(Number(e.target.value))}
          />
        </label>
        <label>
          Delay (days):{" "}
          <input
            type="number"
            min="0"
            value={delayDays}
            disabled={loading}
            onChange={(e) => setDelayDays(Number(e.target.value))}
          />
        </label>
        {recentDecisions.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: "0.9rem", color: "#555" }}>
            {recentDecisions.length} decision{recentDecisions.length > 1 ? "s" : ""} recorded this session
          </span>
        )}
      </div>

      {/* Cards — keyboard accessible (Enhancement #10) */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }} role="list">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <div>
            <p style={{ color: "red" }}>{error}</p>
            <button onClick={() => setDelayDays((d) => d)}>Retry</button>
          </div>
        )}

        {!loading && !error && options.length === 0 && (
          <p>No feasible options for this delay/budget combination.</p>
        )}

        {!loading &&
          !error &&
          options.map((o, i) => (
            <PrescriptionCard
              key={o.option}
              option={{ ...o, is_best: i === 0 }}
              onExecute={handleExecute}
              isExecuting={executingOption === o.option}
            />
          ))}
      </div>

      {/* Recharts comparison bar (Enhancement #12) */}
      {!loading && !error && chartData.length > 0 && (
        <div style={{ marginTop: "2rem", maxWidth: "600px" }}>
          <h3>Cost per day saved — comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={60} fontSize={12} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, "Cost/day saved"]} />
              <Bar dataKey="costPerDaySaved" fill="#2e7d32" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {recentDecisions.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Recently executed</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recentDecisions.map((d, idx) => (
              <li
                key={idx}
                style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", fontSize: "0.9rem" }}
              >
                <strong>{d.time}</strong> — Option {d.option} ({d.label}), $
                {d.cost.toLocaleString()}
                {d.status === "pending" && (
                  <span style={{ color: "#f57c00", marginLeft: "0.5rem" }}>(saving...)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;