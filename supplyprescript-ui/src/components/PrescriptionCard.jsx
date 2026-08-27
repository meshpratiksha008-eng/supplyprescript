export default function PrescriptionCard({ option, onExecute }) {
  return (
    <div className="border rounded-xl p-4 shadow-sm">
      <h3 className="font-bold">{option.label}</h3>
      <p>Cost: ${option.cost.toLocaleString()}</p>
      <p>Time saved: {option.time_saved_days.toFixed(1)} days</p>
      <p>Cost / day saved: ${option.cost_per_day_saved.toFixed(0)}</p>
      <button
        onClick={() => onExecute(option)}
        className="mt-2 px-3 py-1 bg-black text-white rounded"
      >
        Execute Decision
      </button>
    </div>
  );
}