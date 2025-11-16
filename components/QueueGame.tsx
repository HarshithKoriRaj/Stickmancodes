import React, { useState, useRef, useEffect } from 'react';
import { Customer } from '../types';

const defaultNames = ["Alex", "Bella", "Charlie", "Dina", "Eshan", "Fatima", "George", "Hana", "Ivan", "Jenny"];

const SmallStickman: React.FC<{ name: string }> = ({ name }) => (
  <div className="relative w-8 h-14">
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[0.7rem] text-gray-700 bg-white/90 rounded-lg px-2 py-0.5 border border-[#c7d0f3] whitespace-nowrap">
      {name}
    </div>
    <div className="w-6 h-6 rounded-full border-[3px] border-gray-800 mx-auto bg-white"></div>
    <div className="w-[3px] h-10 bg-gray-800 mx-auto"></div>
    <div className="w-7 h-[3px] bg-gray-800 relative -top-5 left-2.5"></div>
    <div className="w-7 h-7 relative mx-auto -top-0.5">
      <div className="absolute w-[3px] h-7 bg-gray-800 transform rotate-20 left-[7px]"></div>
      <div className="absolute w-[3px] h-7 bg-gray-800 transform -rotate-20 right-[7px]"></div>
    </div>
  </div>
);

const EntranceWalker: React.FC<{ name: string; onArrival: () => void }> = ({ name, onArrival }) => {
  const walkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const walker = walkerRef.current;
    if (!walker) return;

    requestAnimationFrame(() => {
      walker.style.transform = 'translateX(calc(100vw - 600px))';
    });

    const timer = setTimeout(onArrival, 1650);
    return () => clearTimeout(timer);
  }, [onArrival]);

  return (
    <div
      ref={walkerRef}
      className="absolute bottom-0 w-12 h-28 -translate-x-16 transition-transform duration-[1600ms] ease-out"
      style={{ animation: 'walk-bob-small 0.55s ease-in-out infinite' }}
    >
      <SmallStickman name={name} />
    </div>
  );
};

const BaristaStickman: React.FC<{ isWalking: boolean; isNodding: boolean }> = ({ isWalking, isNodding }) => (
  <div
    className={`absolute bottom-0 w-15 h-32 left-10 transition-all duration-400 ${
      isWalking ? 'animate-[walk-bob_0.6s_ease-in-out_infinite]' : ''
    } ${isNodding ? 'animate-[nod_0.6s_ease-out]' : ''}`}
  >
    <div className="w-[30px] h-[30px] rounded-full border-4 border-gray-800 mx-auto bg-white"></div>
    <div className="w-1 h-12 bg-gray-800 mx-auto"></div>
    <div className="w-[34px] h-1 bg-gray-800 relative -top-6 left-[11px]"></div>
    <div className="w-[34px] h-[34px] relative mx-auto -top-1">
      <div className="absolute w-1 h-8 bg-gray-800 transform rotate-20 left-[6px]"></div>
      <div className="absolute w-1 h-8 bg-gray-800 transform -rotate-20 right-[6px]"></div>
    </div>
  </div>
);

export const QueueGame: React.FC = () => {
  const [queue, setQueue] = useState<Customer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isServing, setIsServing] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);
  const [pendingArrivals, setPendingArrivals] = useState<Customer[]>([]);
  const [message, setMessage] = useState({ text: "Click 'Let Stickman Enter' to watch a customer walk in!", type: 'info' as 'info' | 'error' | 'success' });
  const [nameInput, setNameInput] = useState('');
  const [nextId, setNextId] = useState(1);
  const [defaultNameIndex, setDefaultNameIndex] = useState(0);
  const [baristaState, setBaristaState] = useState({ isWalking: false, isNodding: false });
  const [showServingIndicator, setShowServingIndicator] = useState(false);
  const [shakingIndex, setShakingIndex] = useState<number | null>(null);

  const spawnNextArrival = () => {
    if (pendingArrivals.length === 0) {
      setIsSpawning(false);
      return;
    }

    setIsSpawning(true);
    const [customer, ...rest] = pendingArrivals;
    setPendingArrivals(rest);

    // Customer will be added after walking animation completes
    setTimeout(() => {
      setQueue((prev) => [...prev, customer]);
      setMessage({ text: `${customer.name} walked into the restaurant and joined the queue at the back.`, type: 'success' });
      setIsSpawning(false);
    }, 1650);
  };

  useEffect(() => {
    if (!isSpawning && pendingArrivals.length > 0) {
      spawnNextArrival();
    }
  }, [isSpawning, pendingArrivals.length]);

  const addCustomer = () => {
    if (isServing) return;

    let name = nameInput.trim();
    if (!name) {
      name = defaultNames[defaultNameIndex % defaultNames.length];
      setDefaultNameIndex(defaultNameIndex + 1);
    }

    const customer: Customer = { id: nextId, name };
    setNextId(nextId + 1);
    setNameInput('');

    setPendingArrivals((prev) => [...prev, customer]);
  };

  const animateServe = async (customer: Customer, onDone: () => void) => {
    setIsServing(true);
    setShowServingIndicator(true);

    // Barista walks to counter
    setBaristaState({ isWalking: true, isNodding: false });
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Barista nods (preparing coffee)
    setBaristaState({ isWalking: false, isNodding: true });
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Back to idle
    setBaristaState({ isWalking: false, isNodding: false });
    setShowServingIndicator(false);
    setIsServing(false);
    onDone();
  };

  const serveSelected = async () => {
    if (isServing || isSpawning) return;

    if (queue.length === 0) {
      setMessage({ text: 'The queue is empty. No customer to serve!', type: 'error' });
      setBaristaState({ isWalking: false, isNodding: true });
      setTimeout(() => setBaristaState({ isWalking: false, isNodding: false }), 500);
      return;
    }

    if (selectedIndex === null || selectedIndex === undefined) {
      setMessage({ text: 'Click on a customer in the queue to select who you want to serve.', type: 'error' });
      return;
    }

    const selected = queue[selectedIndex];
    const front = queue[0];

    if (selectedIndex !== 0) {
      setMessage({
        text: `Wrong! You tried to serve ${selected.name}, but ${front.name} is at the front. In a queue (FIFO), the first to arrive must be served first.`,
        type: 'error',
      });
      setShakingIndex(selectedIndex);
      setTimeout(() => setShakingIndex(null), 400);
      setSelectedIndex(0);
      return;
    }

    // Correct person
    await animateServe(front, () => {
      setQueue((prev) => prev.slice(1)); // dequeue
      setSelectedIndex(null);
      setMessage({ text: `Correct! You served ${front.name} first. That's exactly how FIFO queues work.`, type: 'success' });
    });
  };

  const autoServeFront = async () => {
    if (isServing || isSpawning) return;

    if (queue.length === 0) {
      setMessage({ text: 'The queue is empty. No customer to serve!', type: 'error' });
      setBaristaState({ isWalking: false, isNodding: true });
      setTimeout(() => setBaristaState({ isWalking: false, isNodding: false }), 500);
      return;
    }

    const front = queue[0];
    setSelectedIndex(0);

    await animateServe(front, () => {
      setQueue((prev) => prev.slice(1));
      setSelectedIndex(null);
      setMessage({ text: `You automatically served ${front.name} (front of the queue). FIFO respected.`, type: 'success' });
    });
  };

  const resetGame = () => {
    if (isServing || isSpawning) return;
    setQueue([]);
    setPendingArrivals([]);
    setSelectedIndex(null);
    setMessage({ text: "Queue cleared. Let the customers enter again!", type: 'info' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <style>{`
        @keyframes walk-bob {
          0% { bottom: 0; }
          50% { bottom: 10px; }
          100% { bottom: 0; }
        }
        @keyframes walk-bob-small {
          0% { bottom: 0; }
          50% { bottom: 8px; }
          100% { bottom: 0; }
        }
        @keyframes nod {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl p-6 border border-[#d0dbff]">
        <h2 className="text-3xl font-bold text-center mb-1">Queue Game – Stickman Barista (FIFO)</h2>
        <p className="text-center text-[#4d5f84] text-sm mb-5">
          Customers walk into the restaurant, stand in a queue, and the barista serves them in <b>FIFO</b> order.
          If you handle someone not at the front, it's a <b>queue error</b>.
        </p>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* LEFT: VISUAL AREA */}
          <div className="flex-[1.4] flex flex-col gap-3">
            <div className="relative h-[360px] rounded-2xl bg-gradient-to-t from-[#dfeaff] to-white border border-[#c9d4ff] overflow-hidden p-4">
              {/* Floor */}
              <div className="absolute bottom-[100px] left-0 right-0 h-[5px] bg-gradient-to-r from-[#b9c2e6] to-[#9ca6dd] opacity-80"></div>

              {/* Counter Area */}
              <div className="absolute top-5 left-6 right-6 h-30 flex items-end justify-between">
                <div className="relative w-3/5 h-[70px] bg-gradient-to-b from-white to-[#d3d7ee] rounded-2xl shadow-lg border border-[#b7c3e6] flex items-end px-4 pb-3">
                  <div className="absolute -top-6 left-5 text-[0.65rem] tracking-widest text-[#5c6896]">BARISTA STATION</div>

                  {/* Devices */}
                  <div className="flex gap-3 items-end">
                    {/* Billing Machine */}
                    <div className="w-14 h-10 rounded-lg bg-gradient-to-b from-[#f8f9ff] to-[#c9cde0] border border-[#8e95b6] p-1 shadow-md">
                      <div className="w-full h-3 rounded bg-gradient-to-b from-[#3b7f5a] to-[#24563a] mb-1 flex items-center justify-center text-[0.5rem] text-[#e9ffea]">$12</div>
                      <div className="w-full h-3 rounded bg-[#d2d5e7]"></div>
                    </div>

                    {/* Blender */}
                    <div className="relative w-10 h-12">
                      <div className="w-6 h-7 rounded-t-lg bg-gradient-to-b from-[#eaf5ff] to-[#b8d3ff] border-2 border-[#7b90bf] mx-auto"></div>
                      <div className="w-7 h-3 rounded bg-gradient-to-b from-[#f5f5f7] to-[#b7bccf] border-2 border-[#7b90bf] mx-auto mt-1"></div>
                    </div>

                    {/* Tip Jar */}
                    <div className="w-10 h-8 rounded-lg bg-gradient-to-b from-[#fff8d9] to-[#f2d680] border-2 border-[#c49c3a] flex items-center justify-center text-[0.6rem] font-bold text-[#7f5b10] shadow-md relative">
                      TIP
                      <span className="absolute -top-4 -right-2 text-base">💵</span>
                    </div>
                  </div>

                  {/* Serving Indicator */}
                  {showServingIndicator && (
                    <div className="absolute -top-6 right-3 text-sm text-green-700 animate-pulse">
                      Preparing ☕…
                    </div>
                  )}

                  {/* Coffee Machine */}
                  <div className="w-14 h-11 rounded-lg bg-gradient-to-b from-white to-[#c3c7dd] border border-[#8a92b4] ml-auto shadow-md relative">
                    <div className="absolute top-2 left-2 w-5 h-3 rounded-sm bg-[#4b5676]"></div>
                    <span className="absolute -bottom-5 left-5 text-lg">☕</span>
                  </div>
                </div>

                {/* Barista */}
                <div className="relative w-30 h-[150px]">
                  <BaristaStickman isWalking={baristaState.isWalking} isNodding={baristaState.isNodding} />
                </div>
              </div>

              {/* Entrance Lane */}
              <div className="absolute bottom-28 left-3 right-3 h-24 pointer-events-none">
                {pendingArrivals.length > 0 && isSpawning && (
                  <EntranceWalker
                    name={pendingArrivals[0].name}
                    onArrival={() => {}}
                  />
                )}
              </div>

              {/* Queue Area */}
              <div className="absolute bottom-2 left-5 right-5 flex flex-col">
                <div className="text-sm text-[#4f5f82] mb-1">Queue (front → back):</div>
                <div className="flex gap-3 p-2 rounded-xl bg-[rgba(228,235,255,0.92)] border border-dashed border-[#bec9f2] min-h-[50px] overflow-x-auto">
                  {queue.map((customer, index) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        if (isServing || isSpawning) return;
                        setSelectedIndex(index);
                        if (index === 0) {
                          setMessage({ text: `You selected ${customer.name}. Good – they are at the FRONT.`, type: 'info' });
                        } else {
                          setMessage({
                            text: `You selected ${customer.name}, but ${queue[0].name} is at the front. Serving ${customer.name} breaks FIFO.`,
                            type: 'error',
                          });
                        }
                      }}
                      className={`relative w-16 h-16 rounded-xl bg-white border-2 flex items-center justify-center cursor-pointer transition-all hover:translate-y-[-2px] hover:shadow-lg ${
                        index === 0 ? 'outline outline-2 outline-green-500' : ''
                      } ${selectedIndex === index ? 'border-[#ff9f43] shadow-[0_0_0_2px_rgba(255,159,67,0.5)]' : 'border-[#9ba9de]'} ${
                        shakingIndex === index ? 'animate-[shake_0.35s_ease-in-out]' : ''
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-5 -left-1 text-[0.55rem] bg-green-500 text-white px-1.5 py-0.5 rounded tracking-wider">
                          FRONT
                        </div>
                      )}
                      <SmallStickman name={customer.name} />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[#7581a8] mt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Front
                  </span>
                  <span className="inline-flex items-center gap-1 ml-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff9f43]"></span>Selected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTROLS */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex gap-2 items-center flex-wrap">
              <label className="text-sm min-w-[100px]">New customer:</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomer()}
                placeholder="Optional name (e.g., Alex)"
                className="flex-1 px-3 py-2 rounded-lg border border-[#c5d0f0] text-sm"
                disabled={isServing}
              />
              <button
                onClick={addCustomer}
                disabled={isServing}
                className="px-4 py-2 rounded-lg bg-[#4f7cff] text-white font-semibold text-sm hover:bg-[#385fd6] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Let Stickman Enter ➕
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={serveSelected}
                disabled={isServing || isSpawning}
                className="px-4 py-2 rounded-lg bg-[#4f7cff] text-white font-semibold text-sm hover:bg-[#385fd6] transition-all disabled:opacity-60"
              >
                Serve Selected ☕
              </button>
              <button
                onClick={autoServeFront}
                disabled={isServing || isSpawning}
                className="px-4 py-2 rounded-lg bg-[#eef1ff] text-[#3b4a77] font-semibold text-sm hover:bg-[#dde3ff] transition-all disabled:opacity-60"
              >
                Serve Front (Correct FIFO) ✅
              </button>
              <button
                onClick={resetGame}
                disabled={isServing || isSpawning}
                className="px-4 py-2 rounded-lg bg-[#eef1ff] text-[#3b4a77] font-semibold text-sm hover:bg-[#dde3ff] transition-all disabled:opacity-60"
              >
                Reset 🔄
              </button>
            </div>

            <div className="text-xs text-[#6a769a] bg-[#f4f7ff] rounded-lg p-3 border border-[#dde5ff]">
              1. Click "Let Stickman Enter" → watch them walk in and join the queue.<br />
              2. Click a customer in the queue, then press <b>Serve Selected</b>.<br />
              3. If you select anyone other than the <b>front</b>, you'll get a FIFO error.
            </div>

            <div
              className={`text-sm p-3 rounded-lg ${
                message.type === 'error' ? 'bg-red-50 text-red-700' : message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {message.text}
            </div>

            <div className="text-sm bg-[#f4f7ff] rounded-lg p-3 border border-[#dde5ff] whitespace-pre-line">
              Queue (front → back): {JSON.stringify(queue.map((c) => c.name))}
              {'\n'}Size: {queue.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
