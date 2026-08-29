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

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shipmentId, setShipmentId] = useState(1);
  const [delayDays, setDelayDays] = useState(14);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

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

    return () => controller.abort();
  }, [shipmentId, delayDays]);

  const handleExecute = (option) => {
    axios
      .post(`${API_BASE_URL}/execute-decision`, null, {
        params: {
          shipment_id: shipmentId,
          chosen_option: option.option,
          predicted_cost: option.cost,
          predicted_delay_days: delayDays,
        },
      })
      .then(() => alert(`Decision recorded: option ${option.option}`))
      .catch(() => alert("Failed to save decision — check the server."));
  };

  return (
    <div style={{ padding: "1.5rem" }}>
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
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && <p style={{ color: "red" }}>{error}</p>}

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
            />
          ))}
      </div>
    </div>
  );
}

export default App;