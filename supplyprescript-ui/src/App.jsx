import PrescriptionCard from "./components/PrescriptionCard";

function App() {
  const fakeOptions = [
    { option: "A", label: "Pay for Air Freight", cost: 5000, time_saved_days: 5, cost_per_day_saved: 1000, is_best: true },
    { option: "B", label: "Supplier Premium", cost: 3000, time_saved_days: 2, cost_per_day_saved: 1500 },
    { option: "C", label: "Do Nothing", cost: 0, time_saved_days: 0, cost_per_day_saved: 0 },
  ];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>SupplyPrescript</h1>
      <div style={{ display: "flex", gap: "1rem" }}>
        {fakeOptions.map(o => (
          <PrescriptionCard key={o.option} option={o} onExecute={(opt) => console.log("clicked", opt)} />
        ))}
      </div>
    </div>
  );
}

export default App;