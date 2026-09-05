import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PendingApprovals() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);

  const load = () => {
    axios.get(`${API_BASE_URL}/decisions/pending-approval`, { headers: getAuthHeaders() })
      .then(res => { setPending(res.data); setError(null); })
      .catch(err => {
        if (err.response?.status === 403) setError("Admin access required to view approvals.");
        else setError("Couldn't load pending approvals.");
      });
  };

  useEffect(load, []);

  const handleDecision = (id, approve) => {
    axios.post(`${API_BASE_URL}/decisions/${id}/approve`, null, {
      params: { approve },
      headers: getAuthHeaders(),
    }).then(load).catch(() => setError("Couldn't record approval decision."));
  };

  if (error) return <p className="error">{error}</p>;
  if (pending.length === 0) return <p>No decisions awaiting approval.</p>;

  return (
    <table className="pending-approvals">
      <thead>
        <tr>
          <th>Shipment</th><th>Option</th><th>Cost</th><th>Requested By</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {pending.map(p => (
          <tr key={p.id}>
            <td>{p.shipment_id}</td>
            <td>{p.chosen_option}</td>
            <td>${p.predicted_cost.toFixed(2)}</td>
            <td>{p.decided_by}</td>
            <td>
              <button onClick={() => handleDecision(p.id, true)}>Approve</button>
              <button onClick={() => handleDecision(p.id, false)}>Reject</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}