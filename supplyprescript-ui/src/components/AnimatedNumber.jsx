import { useState, useEffect } from "react";

export default function AnimatedNumber({ value, prefix = "", decimals = 0, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    const from = 0;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value, duration]);
  return <span>{prefix}{display.toFixed(decimals)}</span>;
}