import PrescriptionCard from "./components/PrescriptionCard";

function App() {
  const fakeOption = {
    option: "A",
    label: "Pay for Air Freight",
    cost: 5000,
    time_saved_days: 5,
    cost_per_day_saved: 1000,
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>SupplyPrescript</h1>
      <PrescriptionCard
        option={fakeOption}
        onExecute={(o) => console.log("clicked", o)}
      />
    </div>
  );
}

export default App;