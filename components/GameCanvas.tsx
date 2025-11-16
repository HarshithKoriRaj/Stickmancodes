import React, { useEffect, forwardRef } from 'react';
import { GameState, Point } from '../types';

interface GameCanvasProps {
  width: number;
  height: number;
  gameState: GameState;
  mousePosRef: React.RefObject<Point>;
}

// Drawing utility functions
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
};

const drawStickman = (ctx: CanvasRenderingContext2D, x: number, y: number, anim: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#4A5568'; // Darker for light bg
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI * 2); ctx.stroke(); // head
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke(); // body
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(-8, 30); ctx.moveTo(0, 14); ctx.lineTo(8, 30); ctx.stroke(); // legs
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-14, 6); ctx.stroke(); // left arm
    const angle = -0.3 - (anim > 0 ? (anim / 12) * 0.9 : 0);
    const len = 18;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(Math.cos(angle) * len, -8 + Math.sin(angle) * len); ctx.stroke(); // right arm
    ctx.restore();
};

const drawBucket = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(40, 0); ctx.lineTo(34, 42); ctx.lineTo(-14, 42); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'; ctx.fillRect(-14, 10, 48, 24);
    ctx.lineWidth = 4; ctx.strokeStyle = '#60a5fa';
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(10, -18, 40, 0); ctx.stroke();
    ctx.restore();
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));


export const GameCanvas = forwardRef<HTMLCanvasElement, GameCanvasProps>(({ width, height, gameState, mousePosRef }, ref) => {

  useEffect(() => {
    const canvas = (ref as React.RefObject<HTMLCanvasElement>)?.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mousePos = mousePosRef.current;
    
    // --- Draw ---
    ctx.clearRect(0, 0, width, height);
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#a7e4ff');
    bgGradient.addColorStop(1, '#d0f0ff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, height - 120, width, 120);
    
    const house = { x: 160, y: height - 200, w: 240, h: 160 };
    const roof = { x: house.x - 20, y: house.y - 70, w: house.w + 40, h: 70 };
    ctx.fillStyle = '#718096';
    roundRect(ctx, house.x, house.y, house.w, house.h, 8);
    ctx.fillStyle = '#4A5568';
    ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
    
    ctx.fillStyle = '#f0f9ff';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(house.x + 18, house.y + 24, 48, 48);
    ctx.fillRect(house.x + house.w - 66, house.y + 24, 48, 48);
    ctx.globalAlpha = 1;
    
    for (const p of gameState.flames) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18);
        g.addColorStop(0, '#ffd166'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, 'rgba(249,115,22,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 18, 0, Math.PI * 2); ctx.fill();
    }

    for(const s of gameState.steam){
      ctx.globalAlpha = clamp(s.life/40,0,0.6);
      ctx.fillStyle = '#A0AEC0';
      ctx.beginPath(); ctx.arc(s.x,s.y,6,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    const bucket = { x: width - 120, y: height - 140 };
    drawStickman(ctx, bucket.x - 34, bucket.y + 12, gameState.armAnim);
    drawBucket(ctx, bucket.x, bucket.y);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bucket.x + 20, bucket.y - 30); ctx.lineTo(mousePos.x, mousePos.y); ctx.stroke();
    
    ctx.fillStyle = '#3b82f6';
    for (const d of gameState.projectiles) {
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    
    // HUD
    const x = 20, y = 20, w = 240, h = 18;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 10);
    const grd = ctx.createLinearGradient(x, y, x + w, y);
    grd.addColorStop(0, '#ef4444'); grd.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grd; roundRect(ctx, x, y, (w * gameState.fire / 100), h, 8);
    ctx.fillStyle = '#2D3748'; ctx.font = 'bold 14px system-ui';
    ctx.fillText(`Fire: ${Math.round(gameState.fire)}%`, x, y + h + 16);
    ctx.fillText(`Throws left: ${gameState.throwsLeft}`, x, y + h + 36);

  }, [gameState, width, height, ref, mousePosRef]);

  return <canvas ref={ref} width={width} height={height} className="w-full h-auto rounded-2xl shadow-lg block bg-blue-100" />;
});

GameCanvas.displayName = "GameCanvas";