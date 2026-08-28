import { useEffect, useState } from "react";
import axios from "axios";
import PrescriptionCard from "./components/PrescriptionCard";

function App() {
  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8000/prescribe/1?delay_days=14")
      .then(res => {
        setOptions(res.data.options);
        setBestOption(res.data.best_option);
      })
      .catch(err => console.error("Failed to fetch prescriptions:", err));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>SupplyPrescript</h1>
      <div style={{ display: "flex", gap: "1rem" }}>
        {options.map(o => (
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