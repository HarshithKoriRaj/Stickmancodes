import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stickman } from '../types';

// --- Constants ---
const W = 1200, H = 560;
const groundY = H - 90;
const MAX_SLOTS = 24;
const ITEM_MAP = { book: '📘', pencil: '✏️', apple: '🍎' };
type ItemKey = keyof typeof ITEM_MAP;

// --- Helper & Drawing Functions ---
const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    if (fill) ctx.fill(); else ctx.stroke();
};

const drawStickman = (ctx: CanvasRenderingContext2D, man: Stickman) => {
    ctx.save();
    ctx.translate(man.x, man.y);
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 3;

    ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();

    const leg = Math.sin(man.phase / 4) * 6;
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(-8 - leg, 30);
    ctx.moveTo(0, 14); ctx.lineTo(8 + leg, 30);
    ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-14, 6); ctx.stroke();

    const ang = (man.carrying ? -0.1 : -0.3) - (Math.sin(man.phase / 3) * 0.2);
    const len = 18;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(Math.cos(ang) * len, -8 + Math.sin(ang) * len);
    ctx.stroke();

    ctx.restore();
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const StickmanArrays: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [capacity, setCapacity] = useState(0);
    const [items, setItems] = useState<string[]>([]);
    const [selectedItemKey, setSelectedItemKey] = useState<ItemKey>('book');
    const [code, setCode] = useState('');
    const [banner, setBanner] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

    const manRef = useRef<Stickman>({
        x: 80, y: groundY - 20, destX: 80, speed: 6, phase: 0, busy: false, carrying: false
    });
    const animationFrameId = useRef<number | null>(null);

    const showBanner = (type: 'ok' | 'err', message: string, duration = 2500) => {
        setBanner({ type, message });
        window.setTimeout(() => setBanner(null), duration);
    };

    const handleSampleCode = () => {
        const k = selectedItemKey;
        setCode(`# Arrays hold similar items only — here: ${k}
bag = [${k}] * 4
add 2 ${k}
for i in range(3): add ${k}
# total = 9`);
    };

    const parseToCount = (text: string, allowedKey: ItemKey): number => {
        const rawLines = (text || '').split(/\r?\n/);
        let count = 0;
        for (let idx = 0; idx < rawLines.length; idx++) {
            const lineNo = idx + 1;
            const line = rawLines[idx].trim();
            if (!line || line.startsWith('#')) continue;
            let m;
            m = line.match(/^bag\s*=\s*\[\s*([a-z]+)\s*\]\s*\*\s*(\d+)\s*$/i);
            if (m) {
                if (m[1].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: Expected "${allowedKey}" but saw "${m[1]}".`);
                count += parseInt(m[2], 10); continue;
            }
            m = line.match(/^bag\s*=\s*\[(.+)\]$/i);
            if (m) {
                const tokens = m[1].split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
                if (tokens.some(t => t !== allowedKey)) throw new Error(`Line ${lineNo}: Expected only "${allowedKey}" items.`);
                count += tokens.length; continue;
            }
            m = line.match(/^bag\s*=\s*array\s*\(\s*(\d+)\s*,\s*([a-z]+)\s*\)\s*$/i);
            if (m) {
                if (m[2].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: Use only "${allowedKey}".`);
                count += parseInt(m[1], 10); continue;
            }
            m = line.match(/^add\s+(\d+)\s+([a-z]+)\s*$/i);
            if (m) {
                if (m[2].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: "${m[2]}" doesn’t match "${allowedKey}".`);
                count += parseInt(m[1], 10); continue;
            }
            m = line.match(/^add\s+([a-z]+)\s*$/i);
            if(m) {
                if(m[1].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: Only "${allowedKey}" can go in this bag.`);
                count += 1; continue;
            }
            m = line.match(/^for\s+[a-zA-Z_]\w*\s+in\s+range\(\s*(\d+)\s*\)\s*:\s*add\s+([a-z]+)\s*$/i);
            if (m) {
                if (m[2].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: All items must be "${allowedKey}".`);
                count += parseInt(m[1], 10); continue;
            }
            m = line.match(/^repeat\s+(\d+)\s*:\s*add\s+([a-z]+)\s*$/i);
            if (m) {
                if (m[2].toLowerCase() !== allowedKey) throw new Error(`Line ${lineNo}: Repeat should add "${allowedKey}" only.`);
                count += parseInt(m[1], 10); continue;
            }
            if (/^bag\s*=\s*\[\s*\]\s*$/.test(line)) continue;
            throw new Error(`Line ${lineNo}: I don’t understand this line.`);
        }
        return count;
    };

    const handleRun = async () => {
        if (manRef.current.busy) return;
        const key = selectedItemKey;
        try {
            const n = parseToCount(code, key);
            if (n <= 0) {
                showBanner('err', `I didn’t find any items to pack. Add at least one ${key}.`);
                return;
            }
            const visualN = Math.min(n, MAX_SLOTS);
            if (n > MAX_SLOTS) {
                showBanner('err', `You created ${n} items. I’ll show the first ${MAX_SLOTS} to keep it readable.`);
            }
            
            const newItems = new Array(visualN).fill(ITEM_MAP[key]);
            setItems(newItems);
            setCapacity(visualN);

            manRef.current.busy = true;
            await walkTo(150, groundY - 20);
            manRef.current.carrying = true;
            await sleep(220);
            await walkTo(W - 80, groundY - 20);
            manRef.current.carrying = false;
            await walkTo(W - 200, groundY - 20);
            manRef.current.busy = false;
            
            showBanner('ok', `Packed ${n} ${key}${n > 1 ? 's' : ''} and left for school!`, 2000);

        } catch (e: any) {
            showBanner('err', e.message || 'Error reading your code.');
        }
    };
    
    const handleReset = () => {
        setItems([]);
        setCapacity(0);
        manRef.current = { ...manRef.current, x: 80, destX: 80, carrying: false, busy: false };
    };

    const walkTo = (x: number, y: number) => {
        return new Promise<void>(resolve => {
            manRef.current.destX = x;
            const checkCompletion = () => {
                if (Math.abs(manRef.current.destX - manRef.current.x) < 1) {
                    manRef.current.x = manRef.current.destX;
                    resolve();
                } else {
                    requestAnimationFrame(checkCompletion);
                }
            };
            checkCompletion();
        });
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#edf2f7'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#cbd5e0'; roundedRect(ctx, 60, groundY, W - 120, 14, 7, true);
        
        ctx.fillStyle = '#4a5568'; ctx.font = '14px system-ui';
        ctx.fillText('Array = collection of similar items (same type), stored at indices 0..N-1. N comes from your code.', 30, 32);

        const bag = { x: 180, y: 210, w: 840, h: 120, pad: 10 };
        ctx.fillStyle = '#ffffff'; roundedRect(ctx, bag.x, bag.y, bag.w, bag.h, 16, true);
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; roundedRect(ctx, bag.x, bag.y, bag.w, bag.h, 16, false);
        ctx.fillStyle = '#4a5568'; ctx.font = '13px system-ui';
        ctx.fillText('Bag (array of similar items)', bag.x, bag.y - 8);

        if (capacity === 0) {
            ctx.fillStyle = '#718096';
            ctx.fillText('Type code and press Run — I’ll size the array from your logic.', bag.x + 12, bag.y + bag.h / 2 + 4);
        } else {
            const slotH = 64;
            const slots = Math.max(capacity, 1);
            const slotW = Math.floor((bag.w - (slots + 1) * bag.pad) / slots);
            for (let i = 0; i < capacity; i++) {
                const x = bag.x + bag.pad + i * (slotW + bag.pad);
                const y = bag.y + (bag.h - slotH) / 2;
                ctx.fillStyle = '#edf2f7'; roundedRect(ctx, x, y, slotW, slotH, 10, true);
                ctx.strokeStyle = '#e2e8f0'; roundedRect(ctx, x, y, slotW, slotH, 10, false);
                ctx.fillStyle = '#2d3748'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                ctx.fillText(String(i), x + slotW / 2, y + slotH + 6);
                if (i < items.length) {
                    ctx.font = '26px system-ui'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a202c';
                    ctx.fillText(items[i], x + slotW / 2, y + slotH / 2 + 1);
                }
            }
        }
        
        if (manRef.current.carrying) {
            const x=manRef.current.x - 40, y=groundY - 100, w = 120, h = 70;
            ctx.fillStyle='#ffffff'; roundedRect(ctx, x, y, w, h, 12, true);
            ctx.strokeStyle='#e2e8f0'; roundedRect(ctx, x, y, w, h, 12, false);
            ctx.strokeStyle='#a0aec0'; ctx.lineWidth=3;
            ctx.beginPath(); ctx.moveTo(x+16,y); ctx.quadraticCurveTo(x+w/2,y-16,x+w-16,y); ctx.stroke();
            ctx.font='20px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#2d3748';
            const preview = items.slice(0,4);
            let ox = x + 20;
            for (const em of preview){ ctx.fillText(em, ox, y + h/2); ox += 24; }
        }

        drawStickman(ctx, manRef.current);

    }, [capacity, items]);


    useEffect(() => {
        const gameLoop = () => {
            const man = manRef.current;
            const dx = man.destX - man.x;
            if (Math.abs(dx) > 0.5) {
                man.x += Math.sign(dx) * Math.min(Math.abs(dx), man.speed);
                man.phase = (man.phase + 1) % 60;
            }
            draw();
            animationFrameId.current = requestAnimationFrame(gameLoop);
        };
        gameLoop();
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [draw]);

    const RadioButton = ({ value, label }: {value: ItemKey, label: string}) => (
        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded-lg cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-400">
            <input type="radio" name="item" value={value} checked={selectedItemKey === value} onChange={(e) => setSelectedItemKey(e.target.value as ItemKey)} className="accent-blue-500" />
            {label}
        </label>
    );

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <p className="mb-4 text-gray-600">
                Pick a single item type, write simple setup code, and the stickman will pack exactly that many into the array. <b>No stack/LIFO</b> — just indices <code>0..N-1</code> and “same-type items only”.
            </p>

            <div className="flex gap-4 items-center flex-wrap my-4">
                <span className="inline-block px-3 py-1.5 rounded-full border border-gray-200 bg-gray-100 text-gray-700 text-sm">Length: <b>{items.length}</b></span>
                <span className="inline-block px-3 py-1.5 rounded-full border border-gray-200 bg-gray-100 text-gray-700 text-sm">Capacity (from code): <b>{capacity}</b></span>
                <span className="inline-block px-3 py-1.5 rounded-full border border-gray-200 bg-gray-100 text-gray-700 text-sm">Indices: <b>0 … N-1</b></span>
            </div>

            <div className="flex gap-3 items-center flex-wrap mb-3">
                <div className="flex gap-2 items-center flex-wrap" role="radiogroup">
                    <RadioButton value="book" label="📘 Book" />
                    <RadioButton value="pencil" label="✏️ Pencil" />
                    <RadioButton value="apple" label="🍎 Apple" />
                </div>
                <button onClick={handleSampleCode} className="px-4 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">Insert Sample Code</button>
                <button onClick={handleRun} disabled={manRef.current.busy} className="px-4 py-2.5 rounded-xl font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">Run</button>
                <button onClick={handleReset} className="px-4 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">Reset</button>
            </div>

            <p className="text-sm text-gray-500 mb-3 space-x-2">
                <b>Examples:</b>
                <kbd className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md">bag = [book, book]</kbd>
                <kbd className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md">bag = [book] * 7</kbd>
                <kbd className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-md">add 3 book</kbd>
            </p>

            <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`bag = [book] * 7
# or
bag = array(5, book)
# or
for i in range(3): add book`}
                className="w-full min-h-[160px] bg-gray-50 text-gray-800 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow mb-4"
            />

            <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto block rounded-2xl shadow-lg bg-gray-200" />

            {banner && (
                <div className={`mt-4 p-3 rounded-xl font-bold border ${banner.type === 'ok' ? 'bg-green-500/10 border-green-500/40 text-green-700' : 'bg-red-500/10 border-red-500/40 text-red-700'}`}>
                    {banner.type === 'ok' ? '✅ ' : '❌ '} {banner.message}
                </div>
            )}
        </div>
    );
};