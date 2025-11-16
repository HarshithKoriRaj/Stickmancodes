import React, { useState, useEffect, useRef } from 'react';

interface CallStackItem {
  n: number;
  from: number;
  to: number;
  aux: number;
}

export const TowerOfHanoi: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numDisks, setNumDisks] = useState(3);
  const [speed, setSpeed] = useState(500);
  const [towers, setTowers] = useState<number[][]>([[], [], []]);
  const [animating, setAnimating] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [callStack, setCallStack] = useState<CallStackItem[]>([]);
  const [currentMoveText, setCurrentMoveText] = useState('Ready to start!');
  const animatingRef = useRef(false);

  const towerPositions = [200, 400, 600];
  const baseY = 250;
  const diskHeight = 20;
  const maxDiskWidth = 140;
  const minDiskWidth = 40;
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

  const adjustBrightness = (color: string, amount: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  };

  const draw = (towersState: number[][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bases
    ctx.fillStyle = '#34495e';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(towerPositions[i] - 80, baseY, 160, 10);
      ctx.fillRect(towerPositions[i] - 5, baseY - 150, 10, 150);
    }

    // Draw tower labels
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Source', towerPositions[0], baseY + 35);
    ctx.fillText('Auxiliary', towerPositions[1], baseY + 35);
    ctx.fillText('Destination', towerPositions[2], baseY + 35);

    // Draw disks
    for (let i = 0; i < 3; i++) {
      const tower = towersState[i];
      for (let j = 0; j < tower.length; j++) {
        const diskSize = tower[j];
        const diskWidth = minDiskWidth + (maxDiskWidth - minDiskWidth) * (diskSize / numDisks);
        const x = towerPositions[i] - diskWidth / 2;
        const y = baseY - diskHeight - (j * diskHeight);

        // Draw disk with gradient
        const gradient = ctx.createLinearGradient(x, y, x + diskWidth, y);
        gradient.addColorStop(0, colors[diskSize - 1]);
        gradient.addColorStop(1, adjustBrightness(colors[diskSize - 1], -30));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, diskWidth, diskHeight - 2);

        // Draw disk border
        ctx.strokeStyle = adjustBrightness(colors[diskSize - 1], -50);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, diskWidth, diskHeight - 2);

        // Draw disk number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(diskSize.toString(), towerPositions[i], y + diskHeight / 2 + 4);
      }
    }
  };

  const initializeTowers = () => {
    const newTowers: number[][] = [[], [], []];
    const moves = Math.pow(2, numDisks) - 1;

    for (let i = numDisks; i >= 1; i--) {
      newTowers[0].push(i);
    }

    setTowers(newTowers);
    setMoveCount(0);
    setTotalMoves(moves);
    setCallStack([]);
    setCurrentMoveText('Ready to start!');
    draw(newTowers);
  };

  useEffect(() => {
    initializeTowers();
  }, [numDisks]);

  useEffect(() => {
    draw(towers);
  }, [towers]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const moveDisk = async (from: number, to: number, towersState: number[][]) => {
    if (!animatingRef.current) return towersState;

    const newTowers = towersState.map(t => [...t]);
    const disk = newTowers[from].pop();
    if (disk !== undefined) {
      newTowers[to].push(disk);
    }

    setTowers(newTowers);
    setMoveCount(prev => prev + 1);

    const fromName = ['Source', 'Auxiliary', 'Destination'][from];
    const toName = ['Source', 'Auxiliary', 'Destination'][to];
    setCurrentMoveText(`Moving disk ${disk} from ${fromName} to ${toName}`);

    await sleep(speed);
    return newTowers;
  };

  const hanoi = async (
    n: number,
    from: number,
    to: number,
    aux: number,
    towersState: number[][]
  ): Promise<number[][]> => {
    if (!animatingRef.current) return towersState;

    const newCall: CallStackItem = { n, from, to, aux };
    setCallStack(prev => [...prev, newCall]);
    await sleep(speed / 2);

    let currentTowers = towersState;

    if (n === 1) {
      currentTowers = await moveDisk(from, to, currentTowers);
    } else {
      currentTowers = await hanoi(n - 1, from, aux, to, currentTowers);
      currentTowers = await moveDisk(from, to, currentTowers);
      currentTowers = await hanoi(n - 1, aux, to, from, currentTowers);
    }

    setCallStack(prev => prev.slice(0, -1));
    return currentTowers;
  };

  const startAnimation = async () => {
    if (animating) return;

    initializeTowers();
    setAnimating(true);
    animatingRef.current = true;

    const initialTowers: number[][] = [[], [], []];
    for (let i = numDisks; i >= 1; i--) {
      initialTowers[0].push(i);
    }

    await hanoi(numDisks, 0, 2, 1, initialTowers);

    setAnimating(false);
    animatingRef.current = false;
    setCurrentMoveText('🎉 Completed! All disks moved successfully!');
  };

  const reset = () => {
    animatingRef.current = false;
    setAnimating(false);
    initializeTowers();
  };

  const towerLabels = ['Source', 'Auxiliary', 'Destination'];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h2 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          🗼 Tower of Hanoi
        </h2>
        <p className="text-center text-gray-600 text-lg mb-8">Visualizing Recursive Algorithm</p>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-center items-center mb-8">
          <div className="flex items-center gap-3">
            <label htmlFor="disks" className="font-bold text-gray-700">Number of Disks:</label>
            <input
              type="number"
              id="disks"
              min="1"
              max="7"
              value={numDisks}
              onChange={(e) => setNumDisks(Math.min(7, Math.max(1, parseInt(e.target.value) || 3)))}
              disabled={animating}
              className="w-16 px-3 py-2 border-2 border-purple-500 rounded-lg text-center font-semibold disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="speed" className="font-bold text-gray-700">Speed (ms):</label>
            <input
              type="number"
              id="speed"
              min="100"
              max="2000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value) || 500)}
              className="w-20 px-3 py-2 border-2 border-purple-500 rounded-lg text-center font-semibold"
            />
          </div>
          <button
            onClick={startAnimation}
            disabled={animating}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
          >
            Start Animation
          </button>
          <button
            onClick={reset}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-bold hover:from-pink-600 hover:to-rose-600 transition-all hover:shadow-lg"
          >
            Reset
          </button>
        </div>

        {/* Info Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-xl text-center">
            <div className="text-sm opacity-90 mb-1">Total Moves</div>
            <div className="text-3xl font-bold">{totalMoves}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-xl text-center">
            <div className="text-sm opacity-90 mb-1">Current Move</div>
            <div className="text-3xl font-bold">{moveCount}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-4 rounded-xl text-center">
            <div className="text-sm opacity-90 mb-1">Recursion Depth</div>
            <div className="text-3xl font-bold">{callStack.length}</div>
          </div>
        </div>

        {/* Current Move Text */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-xl text-center text-xl font-bold mb-6">
          {currentMoveText}
        </div>

        {/* Canvas */}
        <div className="bg-gray-100 rounded-xl p-5 mb-6">
          <canvas ref={canvasRef} width={800} height={300} className="mx-auto bg-white rounded-lg" />
        </div>

        {/* Recursion Stack */}
        <div className="bg-gray-100 rounded-xl p-5 mb-6">
          <h3 className="text-xl font-bold text-purple-600 mb-4">📚 Recursion Call Stack (Live)</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {callStack.length === 0 ? (
              <div className="bg-white p-3 rounded-lg border-l-4 border-purple-500 font-mono">
                Stack is empty
              </div>
            ) : (
              [...callStack].reverse().map((call, index) => (
                <div
                  key={index}
                  className="bg-white p-3 rounded-lg border-l-4 border-purple-500 font-mono animate-slideIn"
                >
                  hanoi({call.n}, {towerLabels[call.from]}, {towerLabels[call.to]}, {towerLabels[call.aux]})
                </div>
              ))
            )}
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
          <h4 className="text-lg font-bold text-blue-700 mb-3">How It Works:</h4>
          <p className="text-gray-700 leading-relaxed">
            The Tower of Hanoi is solved recursively with three steps:
            <br />1. Move n-1 disks from source to auxiliary (using destination as temporary)
            <br />2. Move the largest disk from source to destination
            <br />3. Move n-1 disks from auxiliary to destination (using source as temporary)
            <br /><br />
            The minimum number of moves required is 2<sup>n</sup> - 1, where n is the number of disks.
          </p>
        </div>
      </div>
    </div>
  );
};
