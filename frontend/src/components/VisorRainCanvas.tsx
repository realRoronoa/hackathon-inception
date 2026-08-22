import React, { useEffect, useRef } from 'react';

interface VisorRainCanvasProps {
  thrustLevel: number;
}

interface RainDrop {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
  angle: number;
}

export const VisorRainCanvas: React.FC<VisorRainCanvasProps> = ({ thrustLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<RainDrop[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Seed 45 initial raindrops
    const drops: RainDrop[] = [];
    for (let i = 0; i < 45; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2.2 + 1.2,
        opacity: Math.random() * 0.45 + 0.2,
        speed: Math.random() * 0.4 + 0.1,
        angle: Math.random() * Math.PI * 2,
      });
    }
    dropsRef.current = drops;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const isThrusting = thrustLevel > 0;
      const speedMultiplier = isThrusting ? 1 + (thrustLevel / 100) * 8 : 1;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (const drop of dropsRef.current) {
        if (isThrusting) {
          // Streak radially outward from center when thrusting forward
          const dx = drop.x - centerX;
          const dy = drop.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          const streakLength = Math.min(24, (thrustLevel / 100) * 20 + 4);

          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + nx * streakLength, drop.y + ny * streakLength);
          ctx.strokeStyle = `rgba(180, 220, 255, ${drop.opacity * 0.6})`;
          ctx.lineWidth = drop.radius * 0.7;
          ctx.stroke();

          drop.x += nx * drop.speed * speedMultiplier * 2;
          drop.y += ny * drop.speed * speedMultiplier * 2;

          // Wrap if out of screen
          if (
            drop.x < 0 ||
            drop.x > canvas.width ||
            drop.y < 0 ||
            drop.y > canvas.height
          ) {
            drop.x = centerX + (Math.random() - 0.5) * 200;
            drop.y = centerY + (Math.random() - 0.5) * 200;
          }
        } else {
          // Slow subtle trickle down the visor
          drop.y += drop.speed * 0.6;
          if (drop.y > canvas.height) {
            drop.y = 0;
            drop.x = Math.random() * canvas.width;
          }

          // Draw soft raindrop bead
          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 230, 255, ${drop.opacity})`;
          ctx.fill();

          // Highlight dot
          ctx.beginPath();
          ctx.arc(drop.x - drop.radius * 0.3, drop.y - drop.radius * 0.3, drop.radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 1.2})`;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [thrustLevel]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-15 opacity-60"
    />
  );
};
export default VisorRainCanvas;
