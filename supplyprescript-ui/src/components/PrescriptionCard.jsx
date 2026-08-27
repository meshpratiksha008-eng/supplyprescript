import { useState } from "react";

export default function PrescriptionCard({ option, onExecute }) {
  const [executing, setExecuting] = useState(false);

  if (!option) return null;

  const cost = option.cost ?? 0;
  const days = option.time_saved_days ?? 0;
  const perDay = option.cost_per_day_saved ?? 0;

  const handleClick = () => {
    setExecuting(true);
    onExecute(option);
  };

  return (
    <div className={`border rounded-xl p-4 shadow-sm ${option.is_best ? "border-2 border-green-600" : ""}`}>
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
        disabled={executing}
        onClick={handleClick}
        className="mt-2 px-3 py-1 bg-black text-white rounded disabled:opacity-50"
      >
        {executing ? "Executing..." : "Execute Decision"}
      </button>
    </div>
  );
}