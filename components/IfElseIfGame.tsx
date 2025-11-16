import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickmanIfElseIf, ObstacleV2 } from '../types';

const DEFAULT_CODE = `// Use variables: obstacleNear (true/false), obstacleType ('low' or 'high')
// Use functions: jump(), duck(), run()

if (obstacleNear && obstacleType === 'low') {
  jump();
} else if (obstacleNear && obstacleType === 'high') {
  duck();
} else {
  run();
}`;

export const IfElseIfGame: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [message, setMessage] = useState('Write IF / ELSE IF logic and click Run Code');
    const [code, setCode] = useState(DEFAULT_CODE);

    const gameLoopId = useRef<number | null>(null);
    const gameState = useRef<{
        stick: StickmanIfElseIf;
        obstacles: ObstacleV2[];
        spawnTimer: number;
        baseSpeed: number;
        score: number;
        gameOver: boolean;
        lastObstacleX: number;
        userFn: (obstacleNear: boolean, obstacleType: 'low' | 'high' | null, run: () => void, jump: () => void, duck: () => void) => void;
        lastTime: number;
    }>({
        stick: { x: 140, headY: 0, vy: 0, gravity: 1.2, jumpPower: -20, onGround: true, runPhase: 0, isDucking: false, duckingCooldown: 0, jumpCooldown: 0 },
        obstacles: [],
        spawnTimer: 0,
        baseSpeed: 4.5,
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
        const CEILING_HEIGHT = 60;

        // Draw background, ground, and ceiling (Canyon theme)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#fde68a'); // Sunny sky
        bgGrad.addColorStop(1, '#fde047');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#d97706'; // Canyon ground
        ctx.fillRect(0, baseline, canvas.width, 100);
        ctx.fillStyle = '#b45309'; // Canyon ceiling
        ctx.fillRect(0, 0, canvas.width, CEILING_HEIGHT);
        
        // Draw obstacles (stalagmites and stalactites)
        for (const ob of obstacles) {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            if (ob.type === 'low') { // Stalagmite
                ctx.moveTo(ob.x, ob.y + ob.height);
                ctx.lineTo(ob.x + ob.width / 2, ob.y);
                ctx.lineTo(ob.x + ob.width, ob.y + ob.height);
            } else { // Stalactite
                ctx.moveTo(ob.x, ob.y);
                ctx.lineTo(ob.x + ob.width / 2, ob.y + ob.height);
                ctx.lineTo(ob.x + ob.width, ob.y);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Draw stickman
        const px = stick.x;
        let headY = stick.headY;
        const phase = stick.runPhase;

        const isDucking = stick.isDucking;
        const bodyHeight = isDucking ? 15 : 30;
        const legHeight = isDucking ? 18 : 28;
        if(isDucking && stick.onGround) {
            headY += 25;
        }

        ctx.lineCap = 'round';
        ctx.fillStyle = '#2D3748'; 
        ctx.beginPath(); ctx.arc(px, headY + 12, 12, 0, Math.PI * 2); ctx.fill(); 
        
        const bodyTop = headY + 24, bodyBottom = bodyTop + bodyHeight;
        
        ctx.fillStyle = '#4299e1';
        ctx.fillRect(px - 6, bodyTop, 12, bodyHeight);
        
        ctx.strokeStyle = '#4299e1'; ctx.lineWidth = 4;
        const swing = Math.sin(phase * 0.15) * 0.5;
        ctx.beginPath(); ctx.moveTo(px, bodyTop + 6); ctx.lineTo(px - 20 * (0.6 + swing), bodyTop + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, bodyTop + 6); ctx.lineTo(px + 20 * (0.6 - swing), bodyTop + 10); ctx.stroke();
        
        ctx.strokeStyle = '#4A5568'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(px, bodyBottom); ctx.lineTo(px - 15 * (0.5 + Math.max(0, swing)), bodyBottom + legHeight); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, bodyBottom); ctx.lineTo(px + 15 * (0.5 + Math.max(0, -swing)), bodyBottom + legHeight); ctx.stroke();

    }, []);

    const startGame = useCallback(() => {
        const state = gameState.current;
        state.obstacles = [];
        state.spawnTimer = 100;
        state.baseSpeed = 5;
        state.score = 0;
        state.gameOver = false;
        state.lastObstacleX = 0;
        state.stick = { ...state.stick, vy: 0, onGround: true, runPhase: 0, isDucking: false, duckingCooldown: 0, jumpCooldown: 0 };
        
        const canvas = canvasRef.current;
        if(canvas) {
            const baseline = canvas.height - 100;
            const NORMAL_HEIGHT = 12 + 12 + 30 + 28;
            state.stick.headY = baseline - NORMAL_HEIGHT;
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
            const CEILING_HEIGHT = 60;
            const NORMAL_HEIGHT = 12 + 12 + 30 + 28;
            const DUCK_TOTAL_HEIGHT = 12 + 12 + 15 + 18;

            if(game.stick.duckingCooldown > 0) game.stick.duckingCooldown -= 1;
            if(game.stick.duckingCooldown <= 0) game.stick.isDucking = false;
            if(game.stick.jumpCooldown > 0) game.stick.jumpCooldown -= 1;

            game.spawnTimer -= dt * 0.08;
            if (game.spawnTimer <= 0) {
                const type = Math.random() > 0.5 ? 'low' : 'high';
                
                let width, height, y;
                
                if (type === 'high') {
                    width = 60 + Math.random() * 40;
                    const standingHeadTopY = baseline - NORMAL_HEIGHT;
                    const duckingHeadTopY = baseline - DUCK_TOTAL_HEIGHT;
                    const targetBottomY = standingHeadTopY + (duckingHeadTopY - standingHeadTopY) * 0.5;
                    y = CEILING_HEIGHT;
                    height = targetBottomY - y;

                } else {
                    width = 30 + Math.random() * 20;
                    height = 40 + Math.random() * 35;
                    y = baseline - height;
                }

                const minGap = 380;
                const spawnX = Math.max(canvas.width + 50, game.lastObstacleX + minGap + Math.random() * 150);
                game.obstacles.push({ x: spawnX, y, width, height, speed: 0, type });
                game.lastObstacleX = spawnX;
                game.spawnTimer = 80 + Math.random() * 40;
            }
            game.baseSpeed += 0.0004 * dt;

            for (let i = game.obstacles.length - 1; i >= 0; i--) {
                const ob = game.obstacles[i];
                ob.x -= game.baseSpeed;
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
            if (nearest && nearest.x + nearest.width > game.stick.x) {
                const distanceToObstacle = nearest.x - game.stick.x;
                
                if (nearest.type === 'low') {
                    const jumpDurationFrames = 2 * (-game.stick.jumpPower / game.stick.gravity);
                    const obstacleTravelDuringJump = game.baseSpeed * jumpDurationFrames;
                    const safetyBuffer = nearest.width + 25; 
                    const jumpTriggerDistance = obstacleTravelDuringJump + safetyBuffer;
                    if (distanceToObstacle < jumpTriggerDistance) obstacleNear = true;
                } else {
                    const duckTriggerDistance = 220;
                    if (distanceToObstacle < duckTriggerDistance) obstacleNear = true;
                }
            }

            const jump = () => { 
                if (game.stick.onGround && !game.gameOver && game.stick.jumpCooldown <= 0) {
                    game.stick.vy = game.stick.jumpPower; 
                    game.stick.onGround = false;
                    game.stick.jumpCooldown = 15;
                }
            };
            const run = () => { game.stick.runPhase += 1; };
            const duck = () => { if(game.stick.onGround) { game.stick.isDucking = true; game.stick.duckingCooldown = 25; } };

            try {
                game.userFn(!!obstacleNear, nearest?.type || null, run, jump, duck);
            } catch (err: any) {
                game.gameOver = true;
                setMessage("❌ Runtime Error: " + err.message);
                return;
            }

            game.stick.vy += game.stick.gravity;
            game.stick.headY += game.stick.vy;

            if (game.stick.headY >= baseline - NORMAL_HEIGHT) {
                game.stick.headY = baseline - NORMAL_HEIGHT;
                game.stick.vy = 0;
                game.stick.onGround = true;
            } else {
                game.stick.onGround = false;
            }
            
            const rectsIntersect = (ax:number,ay:number,aw:number,ah:number,bx:number,by:number,bw:number,bh:number) => ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
            const stickHeight = game.stick.isDucking ? DUCK_TOTAL_HEIGHT : NORMAL_HEIGHT;
            const stickYOffset = game.stick.isDucking && game.stick.onGround ? (NORMAL_HEIGHT - DUCK_TOTAL_HEIGHT) : 0;

            for (const ob of game.obstacles) {
                 const px = game.stick.x - 12, py = game.stick.headY + stickYOffset, pw = 24, ph = stickHeight;
                 if (rectsIntersect(px, py, pw, ph, ob.x, ob.y, ob.width, ob.height)) {
                     game.gameOver = true;
                     setMessage(ob.type === 'low' ? "💥 Hit a stalagmite! Game Over." : "💥 Hit a stalactite! Game Over.");
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
            const userFn = new Function("obstacleNear", "obstacleType", "run", "jump", "duck", `"use strict";\n${code}`) as (oN: boolean, oT: 'low'|'high'|null, r:()=>void, j:()=>void, d:()=>void) => void;
            userFn(false, null, () => {}, () => {}, () => {}); // Test compile
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
                <h2 className="text-lg font-bold text-amber-600 mb-2">IF/ELSE IF Logic Editor</h2>
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="flex-1 w-full bg-gray-50 text-gray-800 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none transition-shadow resize-none"
                />
                <button
                    onClick={handleRunCode}
                    className="mt-3 w-full bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
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