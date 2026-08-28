import { useEffect, useState } from "react";
import axios from "axios";
import PrescriptionCard from "./components/PrescriptionCard";

const API_BASE_URL = "http://localhost:8000";

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const shipmentId = 1;
  const delayDays = 14;

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/prescribe/${shipmentId}?delay_days=${delayDays}`, {
        timeout: 8000,
      })
      .then((res) => {
        setOptions(res.data.options);
        setBestOption(res.data.best_option);
      })
      .catch((err) => {
        console.error("Failed to fetch prescriptions:", err);
        setError("Couldn't reach the server. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [shipmentId, delayDays]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading prescriptions...</div>;
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