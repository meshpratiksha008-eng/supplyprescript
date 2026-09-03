   import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
   import { useEffect, useState } from "react";
   import axios from "axios";

   export default function RoiChart() {
     const [data, setData] = useState([]);
     const [accuracy, setAccuracy] = useState(null);

     useEffect(() => {
       axios.get("http://localhost:8000/decisions").then(res => setData(res.data));
       axios.get("http://localhost:8000/decision-roi").then(res => setAccuracy(res.data.accuracy_rate));
     }, []);

     return (
       <div>
         <h2>Accuracy: {accuracy !== null ? `${(accuracy * 100).toFixed(0)}%` : "..."}</h2>
         <BarChart width={600} height={300} data={data}>
           <XAxis dataKey="shipment_id" />
           <YAxis />
           <Tooltip />
           <Legend />
           <Bar dataKey="predicted_cost" fill="#8884d8" name="Predicted" />
           <Bar dataKey="actual_cost" fill="#82ca9d" name="Actual" />
         </BarChart>
       </div>
     );
   }
   