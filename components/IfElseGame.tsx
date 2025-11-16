import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickmanRunner, Obstacle } from '../types';

const DEFAULT_CODE = `// Use variable 'obstacleNear' (true/false)
// Use functions: jump(); and run();

if (obstacleNear) {
  jump();
} else {
  run();
}`;

export const IfElseGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState('Write IF-ELSE logic and click Run Code');
    const [code, setCode] = useState(DEFAULT_CODE);

    const gameLoopId = useRef<number | null>(null);
    const gameState = useRef<{
        stick: StickmanRunner;
        obstacles: Obstacle[];
        spawnTimer: number;
        baseSpeed: number;
        score: number;
        gameOver: boolean;
        lastObstacleX: number;
        userFn: (obstacleNear: boolean, run: () => void, jump: () => void) => void;
        lastTime: number;
    }>({
        stick: { x: 140, headY: 0, vy: 0, gravity: 1.2, jumpPower: -18, onGround: true, runPhase: 0 },
        obstacles: [],
        spawnTimer: 0,
        baseSpeed: 4,
        score: 0,
        gameOver: true,
        lastObstacleX: 0,
        userFn: () => {},
        lastTime: performance.now(),
    });

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { stick, obstacles } = gameState.current;
        const baseline = canvas.height - 100;

        // Draw background
        ctx.fillStyle = '#f0f9ff'; // Light blue sky
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e2e8f0'; // Light gray ground
        ctx.fillRect(0, baseline, canvas.width, 100);
        ctx.fillStyle = '#90cdf4'; // Blue ground line
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0, baseline, canvas.width, 3);
        ctx.globalAlpha = 1;

        // Draw obstacles
        for (const ob of obstacles) {
            const grad = ctx.createLinearGradient(ob.x, ob.y, ob.x + ob.width, ob.y + ob.height);
            grad.addColorStop(0, '#f56565');
            grad.addColorStop(1, '#c53030');
            ctx.fillStyle = grad;
            ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        }

        // Draw stickman
        const px = stick.x;
        const headY = stick.headY;
        const phase = stick.runPhase;
        ctx.lineCap = 'round';
        ctx.fillStyle = '#2D3748'; 
        ctx.beginPath(); ctx.arc(px, headY + 12, 12, 0, Math.PI * 2); ctx.fill(); 
        ctx.fillStyle = '#4299e1';
        const bodyTop = headY + 24, bodyBottom = bodyTop + 30;
        ctx.fillRect(px - 6, bodyTop, 12, 30);
        ctx.strokeStyle = '#4299e1'; ctx.lineWidth = 4;
        const swing = Math.sin(phase * 0.15) * 0.5;
        ctx.beginPath(); ctx.moveTo(px, bodyTop + 6); ctx.lineTo(px - 20 * (0.6 + swing), bodyTop + 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, bodyTop + 6); ctx.lineTo(px + 20 * (0.6 - swing), bodyTop + 18); ctx.stroke();
        ctx.strokeStyle = '#4A5568'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(px, bodyBottom); ctx.lineTo(px - 15 * (0.5 + Math.max(0, swing)), bodyBottom + 28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, bodyBottom); ctx.lineTo(px + 15 * (0.5 + Math.max(0, -swing)), bodyBottom + 28); ctx.stroke();

    }, []);

    const startGame = useCallback(() => {
        const state = gameState.current;
        state.obstacles = [];
        state.spawnTimer = 80;
        state.baseSpeed = 4;
        state.score = 0;
        state.gameOver = false;
        state.lastObstacleX = 0;
        state.stick.vy = 0;
        state.stick.onGround = true;
        state.stick.runPhase = 0;
        const canvas = canvasRef.current;
        if(canvas) {
            const baseline = canvas.height - 100;
            state.stick.headY = baseline - (12 + 12 + 30 + 28);
        }
        setScore(0);

        const loop = (now: number) => {
            if (gameState.current.gameOver) {
                 if(gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
                 return;
            }
            
            const game = gameState.current;
            const dt = Math.min(40, now - game.lastTime);
            game.lastTime = now;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const baseline = canvas.height - 100;

            game.spawnTimer -= dt * 0.08;
            if (game.spawnTimer <= 0) {
                const size = 25 + Math.random() * 15;
                const minGap = 180;
                const spawnX = Math.max(canvas.width + 50, game.lastObstacleX + minGap);
                game.obstacles.push({ x: spawnX, y: baseline - size, width: size, height: size, speed: game.baseSpeed + Math.random() * 0.5 });
                game.lastObstacleX = spawnX;
                game.spawnTimer = 80 + Math.random() * 60;
            }
            game.baseSpeed += 0.0003 * dt;

            for (let i = game.obstacles.length - 1; i >= 0; i--) {
                const ob = game.obstacles[i];
                ob.x -= ob.speed + game.baseSpeed * 0.02;
                if (ob.x + ob.width < -10) {
                    game.obstacles.splice(i, 1);
                    game.score++;
                    setScore(game.score);
                }
            }

            let nearest = null;
            for (const ob of game.obstacles) {
                if (ob.x + ob.width > game.stick.x - 20) {
                    if (!nearest || ob.x < nearest.x) nearest = ob;
                }
            }
            
            let obstacleNear = false;
            if (nearest && nearest.x > game.stick.x) {
                const obstacleSpeed = nearest.speed + game.baseSpeed * 0.02;
                const jumpFrames = 2 * (-game.stick.jumpPower / game.stick.gravity);
                const requiredDistance = (obstacleSpeed * jumpFrames) + (game.stick.x / 4);
                if ((nearest.x - game.stick.x) < requiredDistance) {
                    obstacleNear = true;
                }
            }

            const jump = () => { if (game.stick.onGround && !game.gameOver) { game.stick.vy = game.stick.jumpPower; game.stick.onGround = false; } };
            const run = () => { game.stick.runPhase += 1; };

            try {
                game.userFn(obstacleNear, run, jump);
            } catch (err: any) {
                game.gameOver = true;
                setMessage("❌ Runtime Error: " + err.message);
                return;
            }

            game.stick.vy += game.stick.gravity;
            game.stick.headY += game.stick.vy;
            const stickHeight = 12 + 12 + 30 + 28;
            if (game.stick.headY >= baseline - stickHeight) {
                game.stick.headY = baseline - stickHeight;
                game.stick.vy = 0;
                game.stick.onGround = true;
            } else {
                game.stick.onGround = false;
            }

            const rectsIntersect = (ax:number,ay:number,aw:number,ah:number,bx:number,by:number,bw:number,bh:number) => ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
            for (const ob of game.obstacles) {
                const px = game.stick.x - 12, py = game.stick.headY, pw = 24, ph = stickHeight + 6;
                if (rectsIntersect(px, py, pw, ph, ob.x, ob.y, ob.width, ob.height)) {
                    game.gameOver = true;
                    setMessage("💥 Game Over — click Run Code to try again");
                    return;
                }
            }
            
            draw();
            gameLoopId.current = requestAnimationFrame(loop);
        };
        
        if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
        gameLoopId.current = requestAnimationFrame(loop);
    }, [draw]);

    const handleRunCode = () => {
        try {
            const userFn = new Function("obstacleNear", "run", "jump", `"use strict";\n${code}`) as (obstacleNear: boolean, run: () => void, jump: () => void) => void;
            userFn(false, () => {}, () => {}); // Test compile
            gameState.current.userFn = userFn;
            setMessage("✔ Code loaded successfully! Starting game...");
            startGame();
        } catch (err: any) {
            gameState.current.gameOver = true;
            setMessage("❌ Syntax Error: " + err.message);
        }
    };
    
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = canvas?.parentElement;
        if(canvas && container) {
            canvas.width = container.clientWidth;
            canvas.height = Math.max(400, container.clientHeight);
            const baseline = canvas.height - 100;
            gameState.current.stick.headY = baseline - (12 + 12 + 30 + 28);
            if(gameState.current.gameOver) draw();
        }
    }, [draw]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if(gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
        };
    }, [resizeCanvas]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 h-[calc(100vh-150px)]">
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col shadow-sm">
                <h2 className="text-lg font-bold text-blue-600 mb-2">IF-ELSE Logic Editor</h2>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 w-full bg-gray-50 text-gray-800 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none"
                />
                <button
                    onClick={handleRunCode}
                    className="mt-3 w-full bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                    Run Code
                </button>
            </div>
            <div className="lg:col-span-7 relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <canvas ref={canvasRef} className="w-full h-full block" />
                <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm text-gray-800 px-4 py-2 rounded-lg font-bold text-xl border border-gray-200">
                    Score: {score}
                </div>
                <div className="absolute bottom-4 left-4 bg-white/70 backdrop-blur-sm text-gray-700 px-3 py-1.5 rounded-lg text-sm border border-gray-200">
                   {message}
                </div>
            </div>
        </div>
    );
};