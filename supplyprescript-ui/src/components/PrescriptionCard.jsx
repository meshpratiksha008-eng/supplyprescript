import { useState } from "react";

function getIconForLabel(label = "") {
  const l = label.toLowerCase();
  if (l.includes("air")) return "✈️";
  if (l.includes("secondary") || l.includes("supplier")) return "🏭";
  if (l.includes("delay")) return "⏳";
  if (l.includes("freight") || l.includes("ship")) return "🚢";
  return "📦";
}

function getTier(perDay) {
  if (perDay <= 1200) return { color: "#2e7d32", label: "Efficient" };
  if (perDay <= 4000) return { color: "#f57c00", label: "Moderate" };
  return { color: "#c62828", label: "Costly" };
}

export default function PrescriptionCard({ option, onExecute, isExecuting }) {
  if (!option) return null;

  const cost = option.cost ?? 0;
  const days = option.time_saved_days ?? 0;
  const perDay = option.cost_per_day_saved ?? 0;
  const icon = getIconForLabel(option.label);
  const tier = getTier(perDay);

  const handleClick = () => {
    Promise.resolve(onExecute(option));
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isExecuting) {
      e.preventDefault();
      handleClick();
    }
  };

  // NEW — hover handlers for the card lift effect
  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = "scale(1.02)";
    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)";
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.06)";
  };

  return (
    <div
      className={`border rounded-xl p-4 shadow-sm ${
        option.is_best ? "border-2 border-green-600" : ""
      }`}
      style={{
        width: "220px",
        position: "relative",
        outline: "none",
        borderLeft: `5px solid ${tier.color}`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease", // NEW
        cursor: "pointer", // NEW
      }}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}   // NEW
      onMouseLeave={handleMouseLeave}   // NEW
      aria-label={`${option.label}, cost $${cost.toLocaleString()}, saves ${days.toFixed(1)} days${
        option.is_best ? ", recommended option" : ""
      }`}
    >
      {option.is_best && (
        <span className="text-xs font-semibold bg-green-600 text-white px-2 py-0.5 rounded-full">
          RECOMMENDED
        </span>
      )}
      <h3 className="font-bold mt-1">
        <span style={{ marginRight: "0.4rem" }}>{icon}</span>
        {option.label}
      </h3>
      <p>Cost: ${cost.toLocaleString()}</p>
      <p>Time saved: {days.toFixed(1)} days</p>
      <p>
        Cost / day saved: ${perDay.toFixed(0)}{" "}
        <span style={{ color: tier.color, fontSize: "0.75rem", fontWeight: 600 }}>
          ({tier.label})
        </span>
      </p>
      <button
        aria-label={`Execute decision: ${option.label}`}
        disabled={isExecuting}
        onClick={handleClick}
        className="mt-2 px-3 py-1 bg-black text-white rounded disabled:opacity-50 execute-button" // NEW: added execute-button class
      >
        {isExecuting ? "Executing..." : "Execute Decision"}
      </button>
    </div>
  );
}