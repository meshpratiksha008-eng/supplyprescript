import { useEffect, useState } from "react";
import axios from "axios";
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
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "1rem",
        width: "200px",
        height: "120px",
      }}
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
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        background: bg,
        color: "white",
        padding: "0.75rem 1.25rem",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        cursor: "pointer",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {toast.text}
    </div>
  );
}

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipmentId, setShipmentId] = useState(1);
  const [delayDays, setDelayDays] = useState(14);
  const [toast, setToast] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [executingOption, setExecutingOption] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounced fetch — waits 400ms after the user stops changing inputs
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

  const handleExecute = (option) => {
    const confirmed = window.confirm(
      `Confirm decision: "${option.label}" — cost $${option.cost.toLocaleString()}, ` +
      `saves ${option.time_saved_days} days?`
    );
    if (!confirmed) return Promise.resolve();

    setExecutingOption(option.option);

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
        showToast("success", `Decision recorded: option ${option.option}`);
        setRecentDecisions((prev) =>
          [
            {
              option: option.option,
              label: option.label,
              cost: option.cost,
              time: new Date().toLocaleTimeString(),
            },
            ...prev,
          ].slice(0, 5)
        );
      })
      .catch(() => {
        showToast("error", "Failed to save decision — check the server.");
      })
      .finally(() => setExecutingOption(null));
  };

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

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
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

      {recentDecisions.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Recently executed</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recentDecisions.map((d, idx) => (
              <li
                key={idx}
                style={{
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #eee",
                  fontSize: "0.9rem",
                }}
              >
                <strong>{d.time}</strong> — Option {d.option} ({d.label}), $
                {d.cost.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;