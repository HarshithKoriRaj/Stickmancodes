
import { useState, useRef, useCallback, useEffect } from 'react';
import { GameState, Point } from '../types';

const INITIAL_THROWS = 20;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const rectsOverlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) => {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
};

export const useGameLogic = (initialThrows: number = INITIAL_THROWS) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  const gameStateRef = useRef<GameState>({
    fire: 100,
    throwsLeft: initialThrows,
    projectiles: [],
    flames: [],
    steam: [],
    armAnim: 0,
    isRunning: true,
  });
  const [renderableGameState, setRenderableGameState] = useState<GameState>(gameStateRef.current);
  const [gameStatus, setGameStatus] = useState('Aim with mouse/touch. Extinguish the flames!');
  // FIX: Use `number` for setInterval return type in browser environments instead of `NodeJS.Timeout`.
  const autoTimerRef = useRef<number | null>(null);
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    mousePosRef.current = { x: canvas.width * 0.8, y: canvas.height * 0.6 };

    const handleMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mousePosRef.current.x = (e.clientX - r.left) * (canvas.width / r.width);
      mousePosRef.current.y = (e.clientY - r.top) * (canvas.height / r.height);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      mousePosRef.current.x = (t.clientX - r.left) * (canvas.width / r.width);
      mousePosRef.current.y = (t.clientY - r.top) * (canvas.height / r.height);
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const resetGame = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setIsAutoRunning(false);
    gameStateRef.current = {
      fire: 100,
      throwsLeft: initialThrows,
      projectiles: [],
      flames: [],
      steam: [],
      armAnim: 0,
      isRunning: true,
    };
    setGameStatus('Aim with mouse/touch. Extinguish the flames!');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThrows]);

  useEffect(() => {
    gameStateRef.current.throwsLeft = initialThrows;
    setRenderableGameState(prev => ({...prev, throwsLeft: initialThrows}));
    setGameStatus(`Bucket capacity set to ${initialThrows}. Press Auto to run your loop or throw manually.`);
  }, [initialThrows]);

  const throwWater = useCallback(() => {
    const state = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!state.isRunning || state.throwsLeft <= 0 || !canvas) return;

    const W = canvas.width;
    const H = canvas.height;
    const bucket = { x: W - 120, y: H - 140 };
    
    const mouseX = mousePosRef.current.x;
    const mouseY = mousePosRef.current.y;

    const start: Point = { x: bucket.x + 20, y: bucket.y - 30 };
    const dx = mouseX - start.x;
    const dy = mouseY - start.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = clamp(9 + dist / 40, 9, 17);
    const WIND = () => (Math.random() < 0.25 ? -0.12 - Math.random() * 0.12 : 0);
    const vx = (dx / dist) * speed + WIND();
    const vy = (dy / dist) * speed * 0.7 - 2;

    state.projectiles.push({ x: start.x, y: start.y, vx, vy, r: 6, life: 0 });
    state.throwsLeft--;
    state.armAnim = 12;
  }, []);

  const runFromCode = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.isRunning || autoTimerRef.current) return;
    
    let n = Math.min(state.throwsLeft, 200);
    if (n <= 0) {
        setGameStatus('No throws left. Submit code or Reset.');
        return;
    }
    
    setIsAutoRunning(true);
    const interval = 220;
    autoTimerRef.current = setInterval(() => {
      if (!gameStateRef.current.isRunning || n <= 0) {
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
        setIsAutoRunning(false);
        return;
      }
      throwWater();
      n--;
    }, interval);
  }, [throwWater]);

  useEffect(() => {
    const update = () => {
      const state = gameStateRef.current;
      if (!state.isRunning) return;

      const W = canvasRef.current?.width || 960;
      const H = canvasRef.current?.height || 540;
      const house = { x: 160, y: H - 200, w: 240, h: 160 };
      const roof = { x: house.x - 20, y: house.y - 70, w: house.w + 40, h: 70 };
      const GRAV = 0.28;
      const WIND = () => (Math.random() < 0.25 ? -0.12 - Math.random() * 0.12 : 0);

      if (state.armAnim > 0) state.armAnim -= 1;

      const spawnCount = Math.ceil(clamp(state.fire / 25, 0, 5));
      for (let i = 0; i < spawnCount; i++) {
        const fx = house.x + house.w * 0.4 + Math.random() * house.w * 0.2;
        const fy = house.y - 6;
        state.flames.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 0.6, vy: -(1.2 + Math.random() * 1.2), life: 40 + Math.random() * 40 });
      }

      for (let i = state.flames.length - 1; i >= 0; i--) {
        const p = state.flames[i];
        p.x += p.vx + WIND() * 0.2;
        p.y += p.vy;
        p.life -= 1;
        p.vy -= 0.01;
        if (p.life <= 0 || p.y < 40) state.flames.splice(i, 1);
      }
      
      for(let i=state.steam.length-1;i>=0;i--){
        const s = state.steam[i]; s.x += s.vx; s.y += s.vy; s.vy -= 0.015; s.life -= 1;
        if(s.life<=0) state.steam.splice(i,1);
      }

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const d = state.projectiles[i];
        d.vy += GRAV;
        d.x += d.vx;
        d.y += d.vy;
        d.life += 1;
        
        const hitRoof = rectsOverlap(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2, roof.x, roof.y, roof.w, roof.h);
        const hitFlameZone = rectsOverlap(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2, house.x, house.y - 70, house.w, 90);
        
        if (hitRoof || hitFlameZone) {
          for(let i=0;i<14;i++){
            state.steam.push({ x:d.x+(Math.random()*12-6), y:d.y+(Math.random()*8-4), vx:(Math.random()-.5)*0.8, vy:- (0.6+Math.random()*0.9), life: 30+Math.random()*20 });
          }
          const windPenalty = Math.random() < 0.25 ? -3 : 0;
          const effect = clamp(8 + Math.floor(Math.random() * 8) + windPenalty, 2, 14);
          state.fire = clamp(state.fire - effect, 0, 100);
          state.projectiles.splice(i, 1);
          continue;
        }
        if (d.x < -20 || d.x > W + 20 || d.y > H + 40) state.projectiles.splice(i, 1);
      }

      if (state.fire <= 0) {
        state.isRunning = false;
        setGameStatus('✅ You saved the house! (Reset to play again)');
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
        setIsAutoRunning(false);
      } else if (state.throwsLeft <= 0 && state.projectiles.length === 0) {
        state.isRunning = false;
        setGameStatus('❌ Out of water! The fire remains. (Reset to retry)');
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
        setIsAutoRunning(false);
      }
    };

    let animationFrameId: number;
    const gameLoop = () => {
      update();
      setRenderableGameState({ ...gameStateRef.current });
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
      }
    };
  }, [resetGame]);

  return {
    gameState: renderableGameState,
    gameStatus,
    canvasRef,
    mousePosRef,
    throwWater,
    runFromCode,
    resetGame,
    isAutoRunning,
  };
};
