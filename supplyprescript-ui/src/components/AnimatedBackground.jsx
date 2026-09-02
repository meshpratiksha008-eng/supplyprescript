import { useEffect, useRef } from "react";

export default function AnimatedBackground({ darkMode = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let width, height;

    const NODE_COUNT = 30;
    const CONNECT_DISTANCE = 170;
    const nodes = [];
    const packets = [];

    const colors = darkMode
      ? { node: "#4ade80", line: "74, 222, 128", packet: "#60a5fa" }
      : { node: "#2e7d32", line: "46, 125, 50", packet: "#1976d2" };

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // depth: 0 = far (small, dim, slow), 1 = near (large, bright, fast)
    for (let i = 0; i < NODE_COUNT; i++) {
      const depth = Math.random(); // 0..1
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        vx: (Math.random() - 0.5) * (0.08 + depth * 0.35),
        vy: (Math.random() - 0.5) * (0.08 + depth * 0.35),
        radius: 1 + depth * 3,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    // Draw far nodes first so near nodes visually sit "in front"
    nodes.sort((a, b) => a.depth - b.depth);

    function spawnPacket(a, b) {
      const depth = (a.depth + b.depth) / 2;
      packets.push({ a, b, t: 0, speed: 0.003 + depth * 0.006, depth });
    }

    let frame = 0;

    function draw() {
      frame++;
      ctx.clearRect(0, 0, width, height);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.pulse += 0.02 + n.depth * 0.03;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            const avgDepth = (a.depth + b.depth) / 2;
            const proximity = 1 - dist / CONNECT_DISTANCE;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colors.line}, ${proximity * (0.08 + avgDepth * 0.25)})`;
            ctx.lineWidth = 0.5 + avgDepth * 1.2;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            if (frame % 80 === 0 && Math.random() < 0.12 + avgDepth * 0.1) {
              spawnPacket(a, b);
            }
          }
        }
      }

      nodes.forEach((n) => {
        const glow = (Math.sin(n.pulse) + 1) / 2;
        const alpha = 0.25 + n.depth * 0.6 + glow * 0.15;
        ctx.beginPath();
        ctx.fillStyle = colors.node;
        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.arc(n.x, n.y, n.radius + glow * n.depth * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.beginPath();
        ctx.fillStyle = colors.packet;
        ctx.globalAlpha = 0.5 + p.depth * 0.5;
        ctx.arc(x, y, 1.5 + p.depth * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [darkMode]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -2,
          background: darkMode
            ? "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)"
            : "linear-gradient(135deg, #e8f5e9, #ffffff, #e0f2f1)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 18s ease infinite",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
    </>
  );
}