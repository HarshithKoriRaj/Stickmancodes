import React, { useState, useRef, useCallback } from 'react';
import { StickmanStackState } from '../types';

const MAX_SIZE = 7;
const POS_SOURCE = 20;
const POS_TOWER = 200;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const Stickman: React.FC<{ state: StickmanStackState }> = ({ state }) => {
    const { position, isWalking, isPeeking, carryingValue } = state;
    const left = position === 'source' ? POS_SOURCE : POS_TOWER;
    const bobClass = isWalking ? 'animate-[walk-bob_0.45s_ease-in-out_infinite]' : '';
    const peekClass = isPeeking ? 'animate-[nod_0.5s_ease-out]' : '';

    return (
        <div 
            className={`absolute bottom-0 w-10 h-[90px] transition-all duration-500 ease-in-out ${bobClass} ${peekClass}`} 
            style={{ left: `${left}px` }}
        >
            {/* Head */}
            <div className="w-[22px] h-[22px] rounded-full border-[3px] border-gray-800 mx-auto bg-white"></div>
            {/* Body */}
            <div className="w-1 h-8 bg-gray-800 mx-auto"></div>
            {/* Arm */}
            <div className="w-[26px] h-1 bg-gray-800 relative -top-[18px] left-[7px]"></div>
            {/* Legs */}
            <div className="w-[26px] h-[26px] relative mx-auto -top-1">
                <div className="absolute w-1 h-[26px] bg-gray-800 transform rotate-20 left-[6px]"></div>
                <div className="absolute w-1 h-[26px] bg-gray-800 transform -rotate-20 right-[6px]"></div>
            </div>
             {/* Carry Block */}
            <div className={`absolute w-10 h-6 bg-gradient-to-br from-[#e0b17f] to-[#c88a54] border border-[#8b5a2b] text-[#3a2410] text-xs font-bold rounded shadow-md bottom-[55px] left-0 -translate-x-1 items-center justify-center transition-opacity ${carryingValue ? 'flex' : 'hidden'}`}>
                {carryingValue}
            </div>
        </div>
    );
};


export const StackGame: React.FC = () => {
    const [stack, setStack] = useState<string[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' }>({
        text: "Use PUSH/POP buttons or write code. The stickman demonstrates LIFO (Last-In, First-Out).",
        type: 'info'
    });
    const [valueInput, setValueInput] = useState('');
    const [codeInput, setCodeInput] = useState('PUSH 5\nPUSH 8\nPOP');
    const [stickmanState, setStickmanState] = useState<StickmanStackState>({
        position: 'tower',
        isWalking: false,
        isPeeking: false,
        carryingValue: null
    });
    const [sideBlockValue, setSideBlockValue] = useState<string | null>(null);

    const showMessage = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
        setMessage({ text, type });
    };

    const triggerPeekAnimation = () => {
        setStickmanState(s => ({ ...s, isPeeking: true }));
        setTimeout(() => setStickmanState(s => ({ ...s, isPeeking: false })), 500);
    }
    
    const handlePush = async () => {
        if (isAnimating) return;
        const val = valueInput.trim();
        if (!val) {
            showMessage("Please enter a value to push.", "error");
            triggerPeekAnimation();
            return;
        }
        if (stack.length >= MAX_SIZE) {
            showMessage("Stack Overflow! The tower is full.", "error");
            triggerPeekAnimation();
            return;
        }

        setIsAnimating(true);
        setSideBlockValue(val);
        
        await sleep(100);
        setStickmanState(s => ({ ...s, isWalking: true, position: 'source' }));
        await sleep(500);

        setStickmanState(s => ({ ...s, isWalking: false, carryingValue: val }));
        setSideBlockValue(null);
        await sleep(200);

        setStickmanState(s => ({ ...s, isWalking: true, position: 'tower' }));
        await sleep(500);

        setStack(prev => [...prev, val]);
        setStickmanState(s => ({ ...s, isWalking: false, carryingValue: null }));
        showMessage(`Pushed "${val}" onto the stack.`, "success");
        setValueInput('');
        setIsAnimating(false);
    };
    
    const handlePop = async () => {
        if (isAnimating) return;
        if (stack.length === 0) {
            showMessage("Stack Underflow! The tower is empty.", "error");
            triggerPeekAnimation();
            return;
        }

        setIsAnimating(true);
        const val = stack[stack.length - 1];

        setStickmanState(s => ({ ...s, carryingValue: val }));
        setStack(prev => prev.slice(0, -1));
        await sleep(500);

        setStickmanState(s => ({ ...s, carryingValue: null }));
        showMessage(`Popped "${val}" from the stack.`, "success");
        setIsAnimating(false);
    };

    const handlePeek = () => {
        if (isAnimating) return;
        if (stack.length === 0) {
            showMessage("The stack is empty, nothing to peek.", "error");
            triggerPeekAnimation();
            return;
        }
        const val = stack[stack.length - 1];
        showMessage(`Peek() -> The top block is "${val}". It was not removed.`, "info");
        triggerPeekAnimation();
    };

    const handleReset = () => {
        if (isAnimating) return;
        setStack([]);
        showMessage("Stack cleared. Start building again!", "info");
    };

    const handleRunCode = () => {
        if(isAnimating) return;
        const lines = codeInput.split(/\r?\n/);
        let newStack = [...stack];
        let errorOccurred = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if(!trimmed) continue;
            const upper = trimmed.toUpperCase();
            if (upper.startsWith("PUSH")) {
                const match = trimmed.match(/PUSH\s*\(?\s*([^)]+)\)?/i);
                if (!match || !match[1]?.trim()) {
                    showMessage(`Invalid PUSH command: "${trimmed}"`, "error");
                    errorOccurred = true; break;
                }
                if (newStack.length >= MAX_SIZE) {
                    showMessage(`Stack Overflow on line: "${trimmed}"`, "error");
                    errorOccurred = true; break;
                }
                newStack.push(match[1].trim());
            } else if (upper.startsWith("POP")) {
                if (newStack.length === 0) {
                    showMessage(`Stack Underflow on line: "${trimmed}"`, "error");
                    errorOccurred = true; break;
                }
                newStack.pop();
            } else if (upper.startsWith("PEEK")) {
                // Peek has no logical effect on the stack state itself
            } else {
                showMessage(`Unknown command: "${trimmed}"`, "error");
                errorOccurred = true; break;
            }
        }
        setStack(newStack);
        if(!errorOccurred) {
            showMessage("Code executed successfully!", "success");
        }
    }
    
    const Button = useCallback(({ onClick, children, secondary=false, disabled=false }: React.PropsWithChildren<{onClick:() => void; secondary?: boolean; disabled?: boolean}>) => {
        const base = "px-3 py-2 rounded-lg font-semibold transition-transform duration-100 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none";
        const primary = "bg-[#c9854f] text-white hover:bg-[#b26f3a] active:translate-y-px";
        const sec = "bg-[#f4e3d1] text-[#64442a] hover:bg-[#ecd6c0] active:translate-y-px";
        return <button onClick={onClick} disabled={disabled || isAnimating} className={`${base} ${secondary ? sec : primary}`}>{children}</button>
    }, [isAnimating]);

    const messageColor = {
        info: 'text-gray-600',
        error: 'text-red-600',
        success: 'text-green-700'
    }[message.type];

    return (
       <div className="bg-white rounded-2xl shadow-lg border border-[#e0d2c0] p-6 max-w-5xl mx-auto">
           <p className="text-center text-sm text-gray-500 mb-4">
               The stickman demonstrates the <b>Stack</b> data structure (LIFO - Last-In, First-Out), like a tower of Jenga blocks.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               {/* Visual Area */}
               <div className="border-r border-gray-200 pr-6 flex flex-col items-center">
                   <div className="w-[260px] flex justify-between items-end mt-2">
                       {/* Block Source */}
                       <div className="w-[70px] h-[150px] rounded-xl border border-dashed border-[#cfb89b] bg-gradient-to-t from-[#fbf4e6] to-white p-2 flex flex-col items-center">
                           <span className="text-xs text-[#8b6b4b] mb-1">Shelf</span>
                            <div className={`w-[50px] h-[30px] rounded bg-gradient-to-br from-[#e0b17f] to-[#c88a54] border border-[#8b5a2b] text-[#3a2410] flex items-center justify-center font-bold shadow-md mt-2 transition-all duration-200 ${sideBlockValue ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                               {sideBlockValue}
                            </div>
                       </div>
                       {/* Tower */}
                       <div className="w-[170px] h-[280px] rounded-xl border-2 border-dashed border-[#cfb89b] bg-gradient-to-t from-[#faf1e3] to-white p-2 flex flex-col">
                           <div className="w-full h-full flex flex-col-reverse gap-1">
                               {Array.from({ length: MAX_SIZE }).map((_, i) => (
                                   <div key={i} className="flex-1 rounded border border-dashed border-[#e2cdb1]">
                                       {stack[i] && (
                                           <div className={`w-full h-full rounded bg-gradient-to-br from-[#e4b983] to-[#c9854f] border border-[#8b5a2b] text-[#3a2410] font-bold shadow-md flex items-center justify-center relative ${i === stack.length-1 ? 'outline outline-2 outline-yellow-400' : ''}`}>
                                               {stack[i]}
                                               {i === stack.length-1 && <span className="absolute -top-4 right-1 bg-yellow-400 text-yellow-800 text-[10px] px-1 rounded font-bold">TOP</span>}
                                           </div>
                                       )}
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
                   <span className="text-sm text-[#8b6b4b] mt-2">Tower (Stack)</span>
                   <div className="relative w-[260px] h-[140px] mt-4">
                       <Stickman state={stickmanState} />
                   </div>
               </div>

               {/* Controls Area */}
               <div className="flex flex-col gap-4 pl-2">
                    <div className="flex gap-2 items-center">
                        <label htmlFor="valueInput" className="font-medium text-gray-700">Value:</label>
                        <input id="valueInput" type="text" value={valueInput} onChange={e => setValueInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePush()} placeholder="e.g., A, 10, book" className="flex-1 px-3 py-1.5 border border-[#d5c2aa] rounded-lg text-sm bg-white" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={handlePush}>PUSH ⬆️</Button>
                        <Button onClick={handlePop}>POP ⬇️</Button>
                        <Button onClick={handlePeek} secondary>PEEK 👁</Button>
                        <Button onClick={handleReset} secondary>RESET 🔄</Button>
                    </div>

                    <div>
                        <label htmlFor="codeInput" className="font-medium text-gray-700 block mb-1">Or, write stack code:</label>
                        <textarea id="codeInput" value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="PUSH 5..." className="w-full min-h-[120px] p-2 border border-[#d5c2aa] rounded-lg text-sm bg-[#fbf6ee] font-mono resize-y"></textarea>
                        <div className="flex justify-between items-center mt-2">
                            <Button onClick={handleRunCode}>Run Code ▶️</Button>
                            <span className="text-xs text-gray-500">Supports: PUSH, POP, PEEK</span>
                        </div>
                    </div>
                    
                    <div className={`min-h-5 text-sm font-medium ${messageColor}`}>{message.text}</div>

                    <div className="text-sm bg-[#faf1e3] border border-[#e0d0b8] rounded-lg p-3 whitespace-pre-line">
                        {`Stack (top → bottom): ${JSON.stringify([...stack].reverse())}\nSize: ${stack.length}`}
                    </div>
               </div>
           </div>
       </div>
    );
};
