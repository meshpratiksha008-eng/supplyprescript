import { useEffect, useState } from "react";
import axios from "axios";
import PrescriptionCard from "./components/PrescriptionCard";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function SkeletonCard() {
  return (
    <div className="border rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
}

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  try {
    return await axios.get(url, options);
  } catch (err) {
    if (axios.isCancel(err) || retries === 0) throw err;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shipmentId = 1;
  const delayDays = 14;

  useEffect(() => {
    const controller = new AbortController();

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

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>SupplyPrescript</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;
  }

  if (options.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        No feasible prescription options found for this shipment.
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>SupplyPrescript</h1>
      <div style={{ display: "flex", gap: "1rem" }}>
        {options.map((o) => (
          <PrescriptionCard
            key={o.option}
            option={{ ...o, is_best: o.option === bestOption }}
            onExecute={(opt) => console.log("clicked", opt)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;