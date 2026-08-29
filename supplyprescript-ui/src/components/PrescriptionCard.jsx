import { useState } from "react";

export default function PrescriptionCard({ option, onExecute, isExecuting }) {
  if (!option) return null;

  const cost = option.cost ?? 0;
  const days = option.time_saved_days ?? 0;
  const perDay = option.cost_per_day_saved ?? 0;

  const handleClick = () => {
    Promise.resolve(onExecute(option));
  };

  // Keyboard accessibility (Enhancement #10):
  // pressing Enter or Space while the card is focused triggers execute,
  // same as clicking the button.
  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isExecuting) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={`border rounded-xl p-4 shadow-sm ${
        option.is_best ? "border-2 border-green-600" : ""
      }`}
      style={{ width: "220px", position: "relative", outline: "none" }}
      role="listitem"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`${option.label}, cost $${cost.toLocaleString()}, saves ${days.toFixed(1)} days${
        option.is_best ? ", recommended option" : ""
      }`}
    >
      {option.is_best && (
        <span className="text-xs font-semibold bg-green-600 text-white px-2 py-0.5 rounded-full">
          RECOMMENDED
        </span>
      )}
      <h3 className="font-bold mt-1">{option.label}</h3>
      <p>Cost: ${cost.toLocaleString()}</p>
      <p>Time saved: {days.toFixed(1)} days</p>
      <p>Cost / day saved: ${perDay.toFixed(0)}</p>
      <button
        aria-label={`Execute decision: ${option.label}`}
        disabled={isExecuting}
        onClick={handleClick}
        className="mt-2 px-3 py-1 bg-black text-white rounded disabled:opacity-50"
      >
        {isExecuting ? "Executing..." : "Execute Decision"}
      </button>
    </div>
  );
}