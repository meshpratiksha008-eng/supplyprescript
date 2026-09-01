export default function AnimatedBackground({ darkMode = false }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: -1,
        background: darkMode
          ? "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)"
          : "linear-gradient(135deg, #e8f5e9, #ffffff, #e0f2f1)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 18s ease infinite",
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0, opacity: darkMode ? 0.25 : 0.35 }}
      >
        {/* Shipment "route" lines */}
        <path
          d="M -10,100 Q 200,50 400,150 T 900,100"
          fill="none"
          stroke={darkMode ? "#4ade80" : "#2e7d32"}
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="route-line"
        />
        <path
          d="M -10,300 Q 250,400 500,280 T 1000,320"
          fill="none"
          stroke={darkMode ? "#60a5fa" : "#1976d2"}
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="route-line route-line-slow"
        />
        <path
          d="M -10,500 Q 300,450 600,550 T 1100,500"
          fill="none"
          stroke={darkMode ? "#fbbf24" : "#f57c00"}
          strokeWidth="1.5"
          strokeDasharray="6 8"
          className="route-line"
        />

        {/* Moving "package" dots traveling along routes */}
        <circle r="4" fill={darkMode ? "#4ade80" : "#2e7d32"}>
          <animateMotion
            dur="8s"
            repeatCount="indefinite"
            path="M -10,100 Q 200,50 400,150 T 900,100"
          />
        </circle>
        <circle r="4" fill={darkMode ? "#60a5fa" : "#1976d2"}>
          <animateMotion
            dur="11s"
            repeatCount="indefinite"
            path="M -10,300 Q 250,400 500,280 T 1000,320"
          />
        </circle>
        <circle r="4" fill={darkMode ? "#fbbf24" : "#f57c00"}>
          <animateMotion
            dur="9.5s"
            repeatCount="indefinite"
            path="M -10,500 Q 300,450 600,550 T 1100,500"
          />
        </circle>
      </svg>
    </div>
  );
}