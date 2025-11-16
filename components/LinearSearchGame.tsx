import React, { useState, useEffect, useRef } from 'react';

const SCORE_VALUES = {
  check: -5,
  correctStep: 2,
  wrongMove: -15,
  found: 50,
  hintCost: -20,
};

const StickmanSVG: React.FC<{ isWalking?: boolean }> = ({ isWalking = false }) => {
  const leftArmRotate = isWalking ? 'rotate(-25 40 55)' : 'rotate(0 40 55)';
  const rightArmRotate = isWalking ? 'rotate(25 40 55)' : 'rotate(0 40 55)';
  const leftLegRotate = isWalking ? 'rotate(-15 40 85)' : 'rotate(0 40 85)';
  const rightLegRotate = isWalking ? 'rotate(15 40 85)' : 'rotate(0 40 85)';

  return (
    <svg viewBox="0 0 80 160" width="80" height="160">
      <circle cx="40" cy="28" r="12" stroke="#023047" strokeWidth="3" fill="#ffd7b3" />
      <line x1="40" y1="42" x2="40" y2="85" stroke="#023047" strokeWidth="4" />
      <line
        x1="40" y1="55" x2="18" y2="70"
        stroke="#023047" strokeWidth="4"
        transform={leftArmRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      <line
        x1="40" y1="55" x2="62" y2="70"
        stroke="#023047" strokeWidth="4"
        transform={rightArmRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      <line
        x1="40" y1="85" x2="20" y2="120"
        stroke="#023047" strokeWidth="4"
        transform={leftLegRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      <line
        x1="40" y1="85" x2="60" y2="120"
        stroke="#023047" strokeWidth="4"
        transform={rightLegRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
    </svg>
  );
};

export const LinearSearchGame: React.FC = () => {
  const [n, setN] = useState(10);
  const [arr, setArr] = useState<number[]>([]);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const [opened, setOpened] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [linearNext, setLinearNext] = useState(0);
  const [message, setMessage] = useState('Linear search moves left → right.');
  const [stickmanPos, setStickmanPos] = useState({ x: 0, y: 0 });
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [isWalking, setIsWalking] = useState(false);

  const doorsRef = useRef<HTMLDivElement>(null);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initGame = () => {
    const newArr: number[] = [];
    for (let i = 0; i < n; i++) {
      newArr.push(Math.floor(Math.random() * 90) + 10);
    }

    const targetIdx = Math.floor(Math.random() * n);
    setArr(newArr);
    setTargetIndex(targetIdx);
    setTargetValue(newArr[targetIdx]);
    setOpened(Array(n).fill(false));
    setScore(0);
    setLinearNext(0);
    setMessage('New linear search game. Check left → right.');
    setGameComplete(false);
    setWrongIndex(null);
    clearAutoMode();

    setTimeout(() => positionStickman(0), 100);
  };

  useEffect(() => {
    initGame();
  }, [n]);

  useEffect(() => {
    return () => clearAutoMode();
  }, []);

  const clearAutoMode = () => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
      setAutoMode(false);
    }
  };

  const positionStickman = (index: number) => {
    if (!doorsRef.current) return;

    const doors = doorsRef.current.children;
    if (!doors[index]) return;

    const door = doors[index] as HTMLElement;
    const doorRect = door.getBoundingClientRect();
    const parentRect = doorsRef.current.getBoundingClientRect();

    const x = doorRect.left - parentRect.left + doorRect.width / 2 - 40;
    const y = -95;

    setIsWalking(true);
    setStickmanPos({ x, y });

    setTimeout(() => {
      setIsWalking(false);
    }, 600);
  };

  const getAllowedIndex = (): number | null => {
    for (let i = 0; i < n; i++) {
      if (!opened[i]) return i;
    }
    return null;
  };

  const handleDoorClick = (index: number) => {
    if (opened[index]) {
      setMessage(`Door ${index} already opened.`);
      return;
    }

    const allowed = getAllowedIndex();
    if (allowed !== index) {
      setWrongIndex(index);
      setScore((s) => s + SCORE_VALUES.wrongMove);
      setMessage(`Wrong move: must open door ${allowed}, not ${index}.`);
      setTimeout(() => setWrongIndex(null), 700);
      return;
    }

    const newOpened = [...opened];
    newOpened[index] = true;
    setOpened(newOpened);
    setScore((s) => s + SCORE_VALUES.check);
    positionStickman(index);

    if (index === targetIndex) {
      setScore((s) => s + SCORE_VALUES.found);
      setMessage(`You found the treasure at door ${index}!`);
      setGameComplete(true);
      clearAutoMode();
      setTimeout(() => {
        const allOpened = Array(n).fill(true);
        setOpened(allOpened);
      }, 500);
      return;
    }

    setScore((s) => s + SCORE_VALUES.correctStep);
    setLinearNext(linearNext + 1);
    setMessage(`Checked door ${index}: ${arr[index]}`);
  };

  const nextStep = () => {
    const allowed = getAllowedIndex();
    if (allowed === null) {
      setMessage('No more steps.');
      clearAutoMode();
      return;
    }
    handleDoorClick(allowed);
  };

  const toggleAutoMode = () => {
    if (autoMode) {
      clearAutoMode();
    } else {
      setAutoMode(true);
      autoIntervalRef.current = setInterval(nextStep, 900);
    }
  };

  const useHint = () => {
    setScore((s) => s + SCORE_VALUES.hintCost);
    const allowed = getAllowedIndex();
    if (allowed === null) {
      setMessage('No hint available.');
      return;
    }
    setMessage(`Hint: You must open door ${allowed}. (-20 pts)`);
  };

  const revealAll = () => {
    setOpened(Array(n).fill(true));
    setGameComplete(true);
    clearAutoMode();
  };

  const allowedIndex = getAllowedIndex();

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-b from-sky-50 to-blue-50 rounded-2xl shadow-2xl p-6">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">🔍 Treasure Hunt — Linear Search (O(n))</h2>

        {/* Top Controls */}
        <div className="flex gap-3 items-center flex-wrap mb-6">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold">Doors:</span>
            <select
              value={n}
              onChange={(e) => setN(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
          </label>

          <button onClick={initGame} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            New Game
          </button>
          <button onClick={nextStep} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition">
            Next Step
          </button>
          <button onClick={toggleAutoMode} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition">
            {autoMode ? 'Stop' : 'Auto Step'}
          </button>
          <button onClick={useHint} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition">
            Use Hint (-20)
          </button>
          <button onClick={revealAll} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition">
            Reveal All
          </button>

          <div className="ml-auto min-w-[160px] text-center bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-600">Score</div>
            <div className="text-2xl font-bold text-blue-900">{score}</div>
          </div>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-2">Linear Search</h3>
            <p className="text-sm text-gray-700 mb-3">
              Linear search checks values in order from LEFT → RIGHT.<br />
              Only the next *unopened* door is allowed. That's why it is O(n).<br />
              <span className="text-blue-700 font-semibold">Watch the stickman walk from door to door!</span>
            </p>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full border border-blue-300">Allowed = blue outline</span>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full border border-red-300">Wrong move = red outline</span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">Treasure = key inside</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Target value (hidden)</div>
            <div className="text-2xl font-bold bg-gray-100 rounded-lg p-3 text-center">
              {gameComplete ? `${targetValue} ✓` : '?'}
            </div>
            <div className="text-xs text-gray-600 mt-3">{message}</div>
            {allowedIndex !== null && !gameComplete && (
              <div className="text-xs text-blue-700 mt-2 font-semibold">
                Next index to check: {allowedIndex}
              </div>
            )}
          </div>
        </div>

        {/* Arena */}
        <div className="bg-gradient-to-b from-white to-blue-50 rounded-xl p-6 border border-gray-200 relative">
          <div
            ref={doorsRef}
            className="flex gap-4 justify-center items-end flex-wrap relative min-h-[180px]"
          >
            {/* Stickman */}
            <div
              className="absolute pointer-events-none"
              style={{
                transform: `translate(${stickmanPos.x}px, ${stickmanPos.y}px)`,
                transition: 'transform 600ms ease-in-out'
              }}
            >
              <StickmanSVG isWalking={isWalking} />
              {isWalking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-blue-700 font-semibold animate-pulse">
                  Walking...
                </div>
              )}
            </div>

            {/* Doors */}
            {arr.map((value, index) => (
              <div
                key={index}
                onClick={() => handleDoorClick(index)}
                className={`w-[72px] h-[140px] rounded-lg cursor-pointer relative flex items-end justify-center transition-all duration-250 select-none shadow-lg ${
                  opened[index]
                    ? 'bg-amber-200 transform translate-y-[-6px]'
                    : 'bg-sky-600'
                } ${
                  allowedIndex === index && !opened[index]
                    ? 'outline outline-[5px] outline-blue-400/30'
                    : ''
                } ${
                  wrongIndex === index
                    ? 'outline outline-[5px] outline-red-500/30'
                    : ''
                } ${
                  index === targetIndex && opened[index]
                    ? 'ring-4 ring-green-500'
                    : ''
                }`}
              >
                {/* Index */}
                <div className="absolute bottom-2 font-bold text-sm text-blue-950">
                  {index}
                </div>

                {/* Value (shown when opened) */}
                {opened[index] && (
                  <div className="absolute top-3 font-bold text-sm text-blue-950">
                    {value}
                  </div>
                )}

                {/* Key (shown when target found) */}
                {index === targetIndex && opened[index] && (
                  <div className="absolute top-12 text-3xl">
                    🔑
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-sm text-gray-700 text-center">
          You must follow linear search rules. Clicking any door other than the next one from the left is a wrong move.
        </div>
      </div>
    </div>
  );
};
