import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RoiChart() {
  const [data, setData] = useState([]);
  const [roi, setRoi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      axios.get(`${API_BASE_URL}/decisions`, { headers: getAuthHeaders() }),
      axios.get(`${API_BASE_URL}/decision-roi`, { headers: getAuthHeaders() }),
    ])
      .then(([decisionsRes, roiRes]) => {
        const evaluated = decisionsRes.data.filter(
          (d) => d.actual_cost !== null && d.actual_cost !== undefined
        );
        setData(evaluated);
        setRoi(roiRes.data);
      })
      .catch((err) => {
        console.error("Failed to load ROI data:", err);
        setError("Couldn't load ROI data.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ marginTop: "2rem" }}>Loading ROI chart...</p>;
  if (error) return <p style={{ marginTop: "2rem", color: "#c62828" }}>{error}</p>;

  if (data.length === 0) {
    return (
      <div style={{ marginTop: "2rem" }}>
        <h3>Prediction Accuracy (ROI)</h3>
        <p style={{ opacity: 0.7 }}>
          No evaluated decisions yet — execute a decision and run{" "}
          <code>python -m retrain.evaluate</code> to see accuracy here.
        </p>
      </div>
    );
  }

  const accuracy = roi?.accuracy_rate;
  const costWeightedAccuracy = roi?.cost_weighted_accuracy;
  const totalDollarError = roi?.total_dollar_error;
  const outlierCount = roi?.flagged_outliers;
  const breakdownByOption = roi?.breakdown_by_option || {};

  const accuracyColor = (rate) =>
    rate === null || rate === undefined ? "#999" : rate >= 0.7 ? "#2e7d32" : rate >= 0.4 ? "#f57c00" : "#c62828";

  const chartData = data.map((d) => ({
    ...d,
    label: d.executed_at ? new Date(d.executed_at).toLocaleTimeString() : `#${d.shipment_id}`,
    overrun: d.actual_cost - d.predicted_cost,
  }));

  const worstDecisions = roi?.worst_decisions || [];

  return (
    <div style={{ marginTop: "2rem", maxWidth: "760px" }}>
      <h3>Prediction Accuracy (ROI)</h3>

      {/* --- Headline summary row --- */}
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Accuracy (within 10%)</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: accuracyColor(accuracy) }}>
            {accuracy !== null && accuracy !== undefined ? `${(accuracy * 100).toFixed(0)}%` : "N/A"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Cost-weighted accuracy</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: accuracyColor(costWeightedAccuracy) }}>
            {costWeightedAccuracy !== null && costWeightedAccuracy !== undefined
              ? `${(costWeightedAccuracy * 100).toFixed(0)}%`
              : "N/A"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Total prediction error</div>
          <div
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              color: totalDollarError > 0 ? "#c62828" : "#2e7d32",
            }}
          >
            {totalDollarError !== null && totalDollarError !== undefined
              ? `${totalDollarError > 0 ? "+" : ""}$${Number(totalDollarError).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`
              : "N/A"}
          </div>
        </div>

        {outlierCount > 0 && (
          <div>
            <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Outliers flagged</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f57c00" }}>
              ⚠️ {outlierCount}
            </div>
          </div>
        )}
      </div>

      {/* --- Predicted vs Actual chart --- */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
          <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} height={60} fontSize={10} />
          <YAxis />
          <Tooltip
            formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name]}
            contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }}
          />
          <Legend />
          <Bar dataKey="predicted_cost" fill="#8884d8" name="Predicted" />
          <Bar dataKey="actual_cost" name="Actual">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.overrun > 0 ? "#c62828" : "#2e7d32"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* --- Per-option accuracy breakdown --- */}
      {Object.keys(breakdownByOption).length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4>Accuracy by option</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th style={{ padding: "0.4rem" }}>Option</th>
                <th style={{ padding: "0.4rem" }}>Decisions</th>
                <th style={{ padding: "0.4rem" }}>Accuracy</th>
                <th style={{ padding: "0.4rem" }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(breakdownByOption).map(([opt, v]) => (
                <tr key={opt} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem" }}>{opt}</td>
                  <td style={{ padding: "0.4rem" }}>{v.total}</td>
                  <td style={{ padding: "0.4rem", color: accuracyColor(v.accuracy_rate), fontWeight: 600 }}>
                    {(v.accuracy_rate * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: "0.4rem", textTransform: "capitalize" }}>
                    {v.recommendation?.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Worst decisions --- */}
      {worstDecisions.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4>Biggest prediction misses</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th style={{ padding: "0.4rem" }}>Shipment</th>
                <th style={{ padding: "0.4rem" }}>Option</th>
                <th style={{ padding: "0.4rem" }}>Predicted</th>
                <th style={{ padding: "0.4rem" }}>Actual</th>
                <th style={{ padding: "0.4rem" }}>Dollar error</th>
              </tr>
            </thead>
            <tbody>
              {worstDecisions.map((w) => (
                <tr key={w.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.4rem" }}>{w.shipment_id}</td>
                  <td style={{ padding: "0.4rem" }}>{w.chosen_option}</td>
                  <td style={{ padding: "0.4rem" }}>${Number(w.predicted_cost).toLocaleString()}</td>
                  <td style={{ padding: "0.4rem" }}>${Number(w.actual_cost).toLocaleString()}</td>
                  <td
                    style={{
                      padding: "0.4rem",
                      color: w.dollar_error > 0 ? "#c62828" : "#2e7d32",
                      fontWeight: 600,
                    }}
                  >
                    {w.dollar_error > 0 ? "+" : ""}${Number(w.dollar_error).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}