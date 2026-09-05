import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useEffect, useState } from "react";
import Login from "./components/Login";
import axios from "axios";
import PrescriptionCard from "./components/PrescriptionCard";
import "./App.css";
import AnimatedBackground from "./components/AnimatedBackground";
import AnimatedNumber from "./components/AnimatedNumber";
import RoiChart from "./components/RoiChart";
import PendingApprovals from "./components/PendingApprovals";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function getStoredNumber(key, fallback) {
  const raw = sessionStorage.getItem(key);
  const n = Number(raw);
  return raw !== null && !Number.isNaN(n) ? n : fallback;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || sessionStorage.getItem("token"));
  const [userRole, setUserRole] = useState(null);

  const [options, setOptions] = useState([]);
  const [bestOption, setBestOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [shipmentIdInput, setShipmentIdInput] = useState(() => String(getStoredNumber("shipmentId", 1)));
  const [delayDaysInput, setDelayDaysInput] = useState(() => String(getStoredNumber("delayDays", 14)));

  const shipmentId = Number(shipmentIdInput) || 0;
  const delayDays = Number(delayDaysInput) || 0;

  const [toast, setToast] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [executingOption, setExecutingOption] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch the logged-in user's role whenever the token changes
  useEffect(() => {
    if (!token) {
      setUserRole(null);
      return;
    }
    axios.get(`${API_BASE_URL}/me`, { headers: getAuthHeaders() })
      .then(res => setUserRole(res.data.role))
      .catch(() => setUserRole(null));
  }, [token]);

  const handleLogin = (newToken, rememberMe, lastLogin) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("token", newToken);
    setToken(newToken);
    if (lastLogin) {
      showToast("success", `Welcome back — last login ${new Date(lastLogin).toLocaleString()}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setToken(null);
  };

  useEffect(() => {
    sessionStorage.setItem("shipmentId", String(shipmentId));
  }, [shipmentId]);

  useEffect(() => {
    sessionStorage.setItem("delayDays", String(delayDays));
  }, [delayDays]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.body.style.background = darkMode ? "#121212" : "#fff";
    document.body.style.color = darkMode ? "#eee" : "#111";
  }, [darkMode]);

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const msUntilExpiry = payload.exp * 1000 - Date.now();
      const warnAt = msUntilExpiry - 60000;
      if (warnAt <= 0) return;
      const timer = setTimeout(() => {
        showToast("error", "Your session expires in 1 minute.");
      }, warnAt);
      return () => clearTimeout(timer);
    } catch {
      // malformed token, ignore
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
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
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [shipmentId, delayDays]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const handleExecute = (option) => {
    const confirmed = window.confirm(
      `Confirm decision: "${option.label}" — cost $${option.cost.toLocaleString()}, ` +
      `saves ${option.time_saved_days} days?`
    );
    if (!confirmed) return Promise.resolve();

    setExecutingOption(option.option);

    const optimisticEntry = {
      option: option.option,
      label: option.label,
      cost: option.cost,
      time: new Date().toLocaleTimeString(),
      status: "pending",
    };
    setRecentDecisions((prev) => [optimisticEntry, ...prev].slice(0, 5));
    showToast("success", `Recording decision: option ${option.option}...`);

    const idempotencyKey = crypto.randomUUID();

    return axios
      .post(`${API_BASE_URL}/execute-decision`, null, {
        params: {
          shipment_id: shipmentId,
          chosen_option: option.option,
          predicted_cost: option.cost,
          predicted_delay_days: delayDays,
          budget_cap: 20000,
          idempotency_key: idempotencyKey,
        },
        headers: getAuthHeaders(),
      })
      .then((res) => {
        setRecentDecisions((prev) =>
          prev.map((d) => (d === optimisticEntry ? { ...d, status: "confirmed" } : d))
        );
        if (res.data.requires_approval) {
          showToast("success", `Sent for approval — over $${res.data.approval_threshold.toLocaleString()} needs admin sign-off.`);
        } else {
          showToast("success", `Decision recorded: option ${option.option}`);
        }
      })
      .catch((err) => {
        setRecentDecisions((prev) => prev.filter((d) => d !== optimisticEntry));
        const detail = err.response?.data?.detail;
        showToast("error", detail || "Failed to save decision — rolled back.");
      })
      .finally(() => setExecutingOption(null));
  };

  const getTierColor = (perDay) => {
    if (perDay <= 1200) return "#2e7d32";
    if (perDay <= 4000) return "#f57c00";
    return "#c62828";
  };

  const chartData = options.map((o) => ({
    name: o.label,
    costPerDaySaved: o.cost_per_day_saved,
    fill: getTierColor(o.cost_per_day_saved),
  }));

  if (!token) {
    return (
      <>
        <AnimatedBackground darkMode={darkMode} />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <AnimatedBackground darkMode={darkMode} />
      <div style={{ padding: "1.5rem" }}>
        <Toast toast={toast} onClose={() => setToast(null)} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: darkMode
              ? "linear-gradient(135deg, #1f2937 0%, #374151 100%)"
              : "linear-gradient(135deg, #0f5132 0%, #2e7d32 100%)",
            color: "#fff",
            padding: "1rem 1.5rem",
            borderRadius: "10px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              SP
            </div>
            <h1 style={{ margin: 0, fontSize: "1.3rem" }}>SupplyPrescript</h1>
          </div>
          <div>
            <button
              onClick={() => setDarkMode((d) => !d)}
              style={{ marginRight: "0.5rem", padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none", cursor: "pointer" }}
            >
              Log out
            </button>
          </div>
        </div>

        {userRole === "admin" && (
          <div className="pending-approvals-section" style={{ marginBottom: "1.5rem" }}>
            <h3>Pending Approvals</h3>
            <PendingApprovals />
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center" }}>
          <label>
            📦 Shipment ID:{" "}
            <input
              type="number"
              min="1"
              value={shipmentIdInput}
              onChange={(e) => setShipmentIdInput(e.target.value)}
            />
          </label>
          <label>
            ⏱️ Delay (days):{" "}
            <input
              type="number"
              min="0"
              value={delayDaysInput}
              onChange={(e) => setDelayDaysInput(e.target.value)}
            />
          </label>
          {recentDecisions.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: "0.9rem", color: "#555" }}>
              {recentDecisions.length} decision{recentDecisions.length > 1 ? "s" : ""} recorded this session
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }} role="list">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
          {!loading && !error && options.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem 2rem", opacity: 0.85, width: "100%" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📭</div>
              <p style={{ fontSize: "1rem", fontWeight: 500, margin: 0 }}>
                No feasible options for this delay/budget combination.
              </p>
              <p style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "0.25rem" }}>
                Try adjusting the shipment ID or delay days above.
              </p>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: "center", padding: "1rem" }}>
              <div style={{ fontSize: "1.8rem" }}>🚫</div>
              <p style={{ color: "red" }}>{error}</p>
              <button onClick={() => setDelayDaysInput((d) => d)}>Retry</button>
            </div>
          )}
          {!loading &&
            !error &&
            options.map((o, i) => (
              <div
                key={o.option}
                style={{
                  animation: "fadeSlideIn 0.4s ease forwards",
                  animationDelay: `${i * 0.08}s`,
                  opacity: 0,
                }}
              >
                <PrescriptionCard
                  option={{ ...o, is_best: i === 0 }}
                  onExecute={handleExecute}
                  isExecuting={executingOption === o.option}
                />
              </div>
            ))}
        </div>

        {!loading && !error && chartData.length > 0 && (
          <div style={{ marginTop: "2rem", maxWidth: "600px" }}>
            <h3>Cost per day saved — comparison</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={60} fontSize={12} />
                <YAxis scale="log" domain={["auto", "auto"]} allowDataOverflow />
                <Tooltip
                  formatter={(value) => [`$${value}`, "Cost/day saved"]}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                />
                <Bar dataKey="costPerDaySaved" isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <RoiChart />
        </div>

        {recentDecisions.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3>Recently executed</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recentDecisions.map((d, idx) => (
                <li key={idx} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", fontSize: "0.9rem" }}>
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
    </>
  );
}

export default App;