 import { useState, useRef, useEffect } from "react"; 
import axios from "axios"; 
 
 
const API_BASE_URL = import.meta.env.VITE_API_URL; 
 
export default function Login({ onLogin }) { 
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const usernameRef = useRef(null); 
  const [rememberMe, setRememberMe] = useState(true); 
 
  useEffect(() => { 
    usernameRef.current?.focus(); 
  }, []); 
 
 const handleSubmit = async (e) => { 
  e.preventDefault(); 
  setError(""); 
  setLoading(true); 
  try { 
    const form = new URLSearchParams(); 
    form.append("username", username); 
    form.append("password", password); 
    const res = await axios.post(`${API_BASE_URL}/login`, form); 
    onLogin(res.data.access_token, rememberMe, res.data.last_login); 
  } catch (err) { 
    if (err.response?.status === 429) { 
      setError(err.response.data.detail); 
    } else if (err.response?.status === 401) { 
      setError("Incorrect username or password."); 
    } else { 
      setError("Couldn't reach the server. Please try again."); 
    } 
  } finally { 
    setLoading(false); 
  } 
}; 
  return ( 
    <div style={styles.page}> 
      <div style={styles.card}> 
        <div style={styles.brand}> 
          <div style={styles.logoCircle}>SP</div> 
          <h1 style={styles.title}>SupplyPrescript</h1> 
          <p style={styles.subtitle}>Sign in to manage shipment decisions</p> 
        </div> 
 
        <form onSubmit={handleSubmit} style={styles.form}> 
          <div style={styles.field}> 
            <span style={styles.icon}>👤</span> 
            <input 
              ref={usernameRef} 
              placeholder="Username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={styles.input} 
              required 
              autoComplete="username" 
            /> 
          </div> 
 
          <div style={styles.field}> 
            <span style={styles.icon}>🔒</span> 
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ ...styles.input, paddingRight: "2.5rem" }} 
              required 
              autoComplete="current-password" 
            /> 
            <button 
              type="button" 
              onClick={() => setShowPassword((s) => !s)} 
              style={styles.toggleBtn} 
              tabIndex={-1} 
            > 
              {showPassword ? "Hide" : "Show"} 
            </button> 
          </div> 
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "#555" }}> 
         <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> 
         Keep me signed in 
          </label>  
 
          {error && ( 
            <div style={styles.errorBox}> 
              <span>⚠️</span> {error} 
            </div> 
          )} 
 
          <button type="submit" disabled={loading} style={styles.submitBtn}> 
            {loading ? <span style={styles.spinner} /> : "Log in"} 
          </button> 
        </form> 
      </div> 
    </div> 
  ); 
} 
 
const styles = { 
  page: { 
    minHeight: "100vh", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    background: "linear-gradient(135deg, #f4f7fb 0%, #e9eef5 100%)", 
    fontFamily: "'Segoe UI', system-ui, sans-serif", 
  }, 
  card: { 
    background: "#fff", 
    borderRadius: "16px", 
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)", 
    padding: "2.5rem 2.25rem", 
    width: "100%", 
    maxWidth: "360px", 
  }, 
  brand: { 
    textAlign: "center", 
    marginBottom: "2rem", 
  }, 
  logoCircle: { 
    width: "48px", 
    height: "48px", 
    borderRadius: "50%", 
    background: "#2e7d32", 
    color: "#fff", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontWeight: 700, 
    margin: "0 auto 1rem", 
    fontSize: "0.95rem", 
  }, 
  title: { 
    fontSize: "1.4rem", 
    margin: 0, 
    color: "#1a1a1a", 
  }, 
  subtitle: { 
    fontSize: "0.85rem", 
    color: "#777", 
    marginTop: "0.35rem", 
  }, 
  form: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "1rem", 
  }, 
  field: { 
    position: "relative", 
    display: "flex", 
    alignItems: "center", 
  }, 
  icon: { 
    position: "absolute", 
    left: "0.75rem", 
    fontSize: "0.9rem", 
    opacity: 0.6, 
  }, 
  input: { 
    width: "100%", 
    padding: "0.7rem 0.75rem 0.7rem 2.25rem", 
    borderRadius: "8px", 
    border: "1px solid #dde2e8", 
    fontSize: "0.95rem", 
    outline: "none", 
    boxSizing: "border-box", 
    transition: "border-color 0.15s", 
  }, 
  toggleBtn: { 
    position: "absolute", 
    right: "0.6rem", 
    background: "none", 
    border: "none", 
    fontSize: "0.75rem", 
    color: "#2e7d32", 
    cursor: "pointer", 
    fontWeight: 600, 
  }, 
  errorBox: { 
    display: "flex", 
    alignItems: "center", 
    gap: "0.4rem", 
    background: "#fdecea", 
    color: "#c62828", 
    fontSize: "0.85rem", 
    padding: "0.6rem 0.75rem", 
    borderRadius: "8px", 
  }, 
  submitBtn: { 
    padding: "0.75rem", 
    borderRadius: "8px", 
    border: "none", 
    background: "#2e7d32", 
    color: "#fff", 
    fontSize: "0.95rem", 
    fontWeight: 600, 
    cursor: "pointer", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    minHeight: "44px", 
  }, 
  spinner: { 
    width: "18px", 
    height: "18px", 
    border: "2px solid rgba(255,255,255,0.4)", 
    borderTopColor: "#fff", 
    borderRadius: "50%", 
    animation: "spin 0.7s linear infinite", 
  }, 
};      