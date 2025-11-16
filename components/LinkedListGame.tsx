import React, { useState, useRef, useEffect } from 'react';

interface ListNode {
  id: number;
  value: string;
  next: ListNode | null;
}

const StickmanSVG: React.FC<{ isWalking?: boolean; isFalling?: boolean }> = ({ isWalking = false, isFalling = false }) => {
  const leftArmRotate = isFalling ? 'rotate(-45 40 55)' : isWalking ? 'rotate(-20 40 55)' : 'rotate(0 40 55)';
  const rightArmRotate = isFalling ? 'rotate(45 40 55)' : isWalking ? 'rotate(20 40 55)' : 'rotate(0 40 55)';
  const leftLegRotate = isFalling ? 'rotate(-30 40 85)' : isWalking ? 'rotate(-12 40 85)' : 'rotate(0 40 85)';
  const rightLegRotate = isFalling ? 'rotate(30 40 85)' : isWalking ? 'rotate(12 40 85)' : 'rotate(0 40 85)';

  return (
    <svg viewBox="0 0 80 160" width="70" height="140">
      {/* Head */}
      <circle cx="40" cy="28" r="14" stroke="#1a1a1a" strokeWidth="3" fill="#ffd7b3" />
      {/* Smile or Frown */}
      {isFalling ? (
        <path d="M 32 32 Q 40 26 48 32" stroke="#1a1a1a" strokeWidth="2" fill="none" />
      ) : (
        <path d="M 32 28 Q 40 34 48 28" stroke="#1a1a1a" strokeWidth="2" fill="none" />
      )}
      {/* Eyes */}
      <circle cx="35" cy="24" r="2" fill="#1a1a1a" />
      <circle cx="45" cy="24" r="2" fill="#1a1a1a" />
      {/* Body */}
      <line x1="40" y1="44" x2="40" y2="90" stroke="#1a1a1a" strokeWidth="5" />
      {/* Arms */}
      <line
        x1="40" y1="58" x2="18" y2="73"
        stroke="#1a1a1a" strokeWidth="5"
        transform={leftArmRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      <line
        x1="40" y1="58" x2="62" y2="73"
        stroke="#1a1a1a" strokeWidth="5"
        transform={rightArmRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      {/* Legs */}
      <line
        x1="40" y1="90" x2="20" y2="125"
        stroke="#1a1a1a" strokeWidth="5"
        transform={leftLegRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
      <line
        x1="40" y1="90" x2="60" y2="125"
        stroke="#1a1a1a" strokeWidth="5"
        transform={rightLegRotate}
        style={{ transition: 'transform 0.3s ease-in-out' }}
      />
    </svg>
  );
};

class SinglyLinkedList {
  head: ListNode | null = null;
  tail: ListNode | null = null;
  length: number = 0;
  private nodeIdCounter = 1;

  createNode(value: string): ListNode {
    return { id: this.nodeIdCounter++, value, next: null };
  }

  addHead(value: string): ListNode {
    const node = this.createNode(value);
    if (this.length === 0) {
      this.head = this.tail = node;
    } else {
      node.next = this.head;
      this.head = node;
    }
    this.length++;
    return node;
  }

  addTail(value: string): ListNode {
    const node = this.createNode(value);
    if (this.length === 0) {
      this.head = this.tail = node;
    } else {
      if (this.tail) this.tail.next = node;
      this.tail = node;
    }
    this.length++;
    return node;
  }

  insertAt(value: string, index: number): ListNode {
    if (index < 0 || index > this.length) throw new Error('Index out of bounds');
    if (index === 0) return this.addHead(value);
    if (index === this.length) return this.addTail(value);

    const node = this.createNode(value);
    let curr = this.head;
    for (let i = 0; i < index - 1; i++) {
      if (curr) curr = curr.next;
    }
    if (curr) {
      node.next = curr.next;
      curr.next = node;
    }
    this.length++;
    return node;
  }

  deleteAt(index: number): void {
    if (index < 0 || index >= this.length) throw new Error('Index out of bounds');
    if (index === 0) {
      this.head = this.head?.next || null;
      if (this.length === 1) this.tail = null;
      this.length--;
      return;
    }

    let curr = this.head;
    for (let i = 0; i < index - 1; i++) {
      if (curr) curr = curr.next;
    }
    if (curr && curr.next) {
      curr.next = curr.next.next;
      if (index === this.length - 1) this.tail = curr;
    }
    this.length--;
  }

  search(value: string): number {
    let curr = this.head;
    let index = 0;
    while (curr) {
      if (curr.value === value) return index;
      curr = curr.next;
      index++;
    }
    return -1;
  }

  toArray(): string[] {
    const arr: string[] = [];
    let curr = this.head;
    while (curr) {
      arr.push(curr.value);
      curr = curr.next;
    }
    return arr;
  }
}

export const LinkedListGame: React.FC = () => {
  const list = useRef(new SinglyLinkedList()).current;
  const [, setRefresh] = useState(0);
  const [valueInput, setValueInput] = useState('');
  const [positionInput, setPositionInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [foundId, setFoundId] = useState<number | null>(null);
  const [message, setMessage] = useState({ text: 'Build your linked list bridge to cross the river!', type: 'info' as 'info' | 'error' | 'success' });
  const [logs, setLogs] = useState<Array<{ time: string; kind: string; text: string }>>([]);
  const [stickmanPos, setStickmanPos] = useState({ x: -120, y: -180 });
  const [isTraversing, setIsTraversing] = useState(false);
  const [currentTraverseId, setCurrentTraverseId] = useState<number | null>(null);
  const [isWalking, setIsWalking] = useState(false);
  const [isFalling, setIsFalling] = useState(false);
  const [requiredBridgeLength] = useState(5); // Minimum bridge length to reach far shore

  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const traverseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = () => setRefresh(r => r + 1);

  const log = (text: string, kind: 'info' | 'error' | 'action' | 'traverse' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, kind, text }]);
  };

  useEffect(() => {
    // Position stickman at starting shore
    setTimeout(() => {
      setStickmanPos({ x: -120, y: -180 });
    }, 100);

    return () => {
      if (traverseIntervalRef.current) {
        clearInterval(traverseIntervalRef.current);
      }
    };
  }, []);

  const positionStickmanAtNode = (nodeId: number) => {
    if (!nodesContainerRef.current) return;

    const nodeElements = nodesContainerRef.current.querySelectorAll('[data-node-id]');
    let targetElement: Element | null = null;

    nodeElements.forEach((el) => {
      if (el.getAttribute('data-node-id') === nodeId.toString()) {
        targetElement = el;
      }
    });

    if (!targetElement) return;

    const containerRect = nodesContainerRef.current.getBoundingClientRect();
    const nodeRect = targetElement.getBoundingClientRect();

    const x = nodeRect.left - containerRect.left + nodeRect.width / 2 - 35;
    const y = -180;

    setIsWalking(true);
    setStickmanPos({ x, y });

    setTimeout(() => {
      setIsWalking(false);
    }, 800);
  };

  const positionStickmanAtStart = () => {
    setIsWalking(true);
    setStickmanPos({ x: -120, y: -180 });
    setTimeout(() => {
      setIsWalking(false);
    }, 800);
  };

  const makeStickmanFall = () => {
    setIsFalling(true);
    setIsWalking(false);
    // Animate falling into water
    setStickmanPos(prev => ({ ...prev, y: 200 }));

    setTimeout(() => {
      setIsFalling(false);
      positionStickmanAtStart();
    }, 1500);
  };

  const stopTraversal = () => {
    if (traverseIntervalRef.current) {
      clearInterval(traverseIntervalRef.current);
      traverseIntervalRef.current = null;
    }
    setIsTraversing(false);
    setCurrentTraverseId(null);
  };

  const handleTraverse = () => {
    if (list.length === 0) {
      setMessage({ text: 'Cannot traverse! Build a bridge first!', type: 'error' });
      log('Traversal failed: No bridge exists', 'error');
      return;
    }

    if (isTraversing) {
      stopTraversal();
      setMessage({ text: 'Traversal stopped', type: 'info' });
      return;
    }

    // Check if bridge reaches the far shore
    if (list.length < requiredBridgeLength) {
      setMessage({ text: `Bridge too short! Need ${requiredBridgeLength} planks to reach far shore. Stickman will fall!`, type: 'error' });
      log(`Bridge incomplete: ${list.length}/${requiredBridgeLength} planks. Stickman falling!`, 'error');

      setIsTraversing(true);

      // Walk to the end of incomplete bridge and fall
      const nodeIds: number[] = [];
      let curr = list.head;
      while (curr) {
        nodeIds.push(curr.id);
        curr = curr.next;
      }

      let index = 0;
      const walkAndFall = () => {
        if (index >= nodeIds.length) {
          // Reached end of incomplete bridge - FALL!
          stopTraversal();
          setTimeout(() => {
            makeStickmanFall();
            setMessage({ text: '💧 SPLASH! Bridge incomplete - stickman fell into the water!', type: 'error' });
            log('Stickman fell into the water!', 'error');
          }, 500);
          return;
        }

        const nodeId = nodeIds[index];
        setCurrentTraverseId(nodeId);
        positionStickmanAtNode(nodeId);

        index++;
      };

      walkAndFall();
      traverseIntervalRef.current = setInterval(walkAndFall, 1000);
      return;
    }

    // Bridge is complete - successful traversal
    setIsTraversing(true);
    log('Starting safe traversal from left shore → far shore', 'traverse');
    setMessage({ text: 'Bridge complete! Traversing safely...', type: 'success' });

    const nodeIds: number[] = [];
    let curr = list.head;
    while (curr) {
      nodeIds.push(curr.id);
      curr = curr.next;
    }

    let index = 0;

    const traverse = () => {
      if (index >= nodeIds.length) {
        // Successfully reached far shore!
        stopTraversal();
        setMessage({ text: '🎉 Success! Stickman crossed the river safely!', type: 'success' });
        log(`Traversal complete! Crossed ${nodeIds.length} planks safely.`, 'traverse');
        setTimeout(() => {
          positionStickmanAtStart();
        }, 1500);
        return;
      }

      const nodeId = nodeIds[index];
      setCurrentTraverseId(nodeId);
      positionStickmanAtNode(nodeId);

      let curr = list.head;
      let nodeIndex = 0;
      while (curr && curr.id !== nodeId) {
        curr = curr.next;
        nodeIndex++;
      }

      if (curr) {
        log(`Walking on plank ${nodeIndex}: "${curr.value}"`, 'traverse');
        setMessage({ text: `On plank ${nodeIndex + 1}/${requiredBridgeLength}: "${curr.value}"`, type: 'info' });
      }

      index++;
    };

    traverse();
    traverseIntervalRef.current = setInterval(traverse, 1000);
  };

  const handleAddHead = () => {
    try {
      if (!valueInput.trim()) throw new Error('Enter a value');
      const node = list.addHead(valueInput.trim());
      log(`addHead("${valueInput}")`, 'action');
      setMessage({ text: `Added "${valueInput}" at head`, type: 'success' });
      setValueInput('');
      refresh();
      setTimeout(() => {
        if (list.head) positionStickmanAtNode(list.head.id);
      }, 100);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      log(err.message, 'error');
    }
  };

  const handleAddTail = () => {
    try {
      if (!valueInput.trim()) throw new Error('Enter a value');
      const node = list.addTail(valueInput.trim());
      log(`addTail("${valueInput}")`, 'action');
      setMessage({ text: `Added "${valueInput}" at tail`, type: 'success' });
      setValueInput('');
      refresh();
      setTimeout(() => {
        positionStickmanAtNode(node.id);
      }, 100);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      log(err.message, 'error');
    }
  };

  const handleInsertAt = () => {
    try {
      if (!valueInput.trim()) throw new Error('Enter a value');
      const pos = parseInt(positionInput);
      if (isNaN(pos)) throw new Error('Enter a valid position');
      const node = list.insertAt(valueInput.trim(), pos);
      log(`insertAt("${valueInput}", ${pos})`, 'action');
      setMessage({ text: `Inserted "${valueInput}" at position ${pos}`, type: 'success' });
      setValueInput('');
      setPositionInput('');
      refresh();
      setTimeout(() => {
        positionStickmanAtNode(node.id);
      }, 100);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      log(err.message, 'error');
    }
  };

  const handleDeleteAt = () => {
    try {
      const pos = parseInt(positionInput);
      if (isNaN(pos)) throw new Error('Enter a valid position');
      list.deleteAt(pos);
      log(`deleteAt(${pos})`, 'action');
      setMessage({ text: `Deleted node at position ${pos}`, type: 'success' });
      setPositionInput('');
      refresh();
      positionStickmanAtStart();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      log(err.message, 'error');
    }
  };

  const handleSearch = () => {
    try {
      if (!searchInput.trim()) throw new Error('Enter a value to search');
      const idx = list.search(searchInput.trim());
      if (idx === -1) {
        setMessage({ text: `"${searchInput}" not found`, type: 'error' });
        log(`search("${searchInput}") → not found`, 'info');
        setFoundId(null);
        return;
      }

      let curr = list.head;
      for (let i = 0; i < idx; i++) {
        if (curr) curr = curr.next;
      }
      if (curr) {
        setFoundId(curr.id);
        setMessage({ text: `Found "${searchInput}" at index ${idx}`, type: 'success' });
        log(`search("${searchInput}") → index ${idx}`, 'action');
        setTimeout(() => {
          positionStickmanAtNode(curr!.id);
        }, 100);
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
      log(err.message, 'error');
    }
  };

  const handleBuildSample = () => {
    list.head = list.tail = null;
    list.length = 0;
    ['A', 'B', 'C', 'D', 'E'].forEach(v => list.addTail(v));
    log('Built complete sample bridge: A → B → C → D → E', 'action');
    setMessage({ text: `Complete bridge built! (${requiredBridgeLength}/${requiredBridgeLength} planks)`, type: 'success' });
    refresh();

    setTimeout(() => {
      if (list.head) {
        positionStickmanAtNode(list.head.id);
      }
    }, 100);
  };

  const handleReset = () => {
    stopTraversal();
    list.head = list.tail = null;
    list.length = 0;
    setLogs([]);
    setMessage({ text: 'Bridge demolished. Ready to build!', type: 'info' });
    setFoundId(null);
    setHighlightId(null);
    refresh();
    positionStickmanAtStart();
  };

  const renderNodes = () => {
    const nodes: JSX.Element[] = [];
    let curr = list.head;
    let index = 0;

    while (curr) {
      const node = curr;
      const isHead = node === list.head;
      const isTail = node === list.tail;
      const isFound = node.id === foundId;
      const isHighlight = node.id === highlightId;
      const isCurrentTraverse = node.id === currentTraverseId;

      nodes.push(
        <div
          key={node.id}
          data-node-id={node.id}
          onClick={() => setPositionInput(index.toString())}
          className={`relative min-w-[100px] max-w-[140px] p-4 rounded-xl cursor-pointer transition-all shadow-2xl ${
            isHead ? 'border-4 border-green-500 shadow-green-400/50' : isTail ? 'border-4 border-orange-500 shadow-orange-400/50' : 'border-2 border-yellow-700'
          } ${isFound ? 'ring-4 ring-green-400 scale-105' : ''} ${isHighlight ? 'ring-4 ring-blue-400' : ''} ${
            isCurrentTraverse ? 'ring-4 ring-purple-500 scale-110 shadow-purple-500/50' : ''
          }
          bg-gradient-to-br from-yellow-600 via-yellow-700 to-amber-800 text-yellow-50 hover:scale-105 hover:shadow-3xl hover:brightness-110`}
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(202,138,4,0.15) 2px, transparent 2px), linear-gradient(rgba(202,138,4,0.15) 2px, transparent 2px)',
            backgroundSize: '12px 12px'
          }}
        >
          <div className="flex justify-between items-center text-[10px] mb-2">
            <span className="px-2 py-1 rounded-full bg-yellow-300/40 border border-yellow-200 font-bold">{isHead ? 'HEAD' : 'PLANK'}</span>
            <span className="opacity-90 font-semibold">#{index}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl font-bold text-white drop-shadow-lg">{node.value}</span>
            <span className="text-[12px] opacity-90 font-semibold">→ {node.next ? 'next' : 'null'}</span>
          </div>
          <div className="text-[10px] opacity-80 flex justify-between font-semibold">
            <span>id:{node.id}</span>
            {isTail && <span className="text-orange-300 font-bold">TAIL</span>}
          </div>
        </div>
      );

      curr = curr.next;
      index++;
    }

    return nodes;
  };

  const bridgeStatus = list.length >= requiredBridgeLength ? 'complete' : 'incomplete';

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🌉 Beach Bridge: Singly Linked List Challenge
            </h2>
            <p className="text-gray-700 text-sm mt-1 font-semibold">Build a {requiredBridgeLength}-plank bridge for the stickman to cross safely! 🚶‍♂️</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
            bridgeStatus === 'complete'
              ? 'bg-green-100 text-green-800 border-green-400'
              : 'bg-orange-100 text-orange-800 border-orange-400 animate-pulse'
          }`}>
            Bridge: {list.length}/{requiredBridgeLength} planks {bridgeStatus === 'complete' ? '✓' : '⚠️'}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Add Operations */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
            <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-lg">➕</span> Build Bridge
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTail()}
                placeholder="Plank value..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleAddHead} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition shadow-lg">
                ← Add at Head
              </button>
              <button onClick={handleAddTail} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition shadow-lg">
                Add at Tail →
              </button>
            </div>
          </div>

          {/* Insert/Delete Operations */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🔧</span> Modify Bridge
            </h3>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={positionInput}
                onChange={(e) => setPositionInput(e.target.value)}
                placeholder="Position..."
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button onClick={handleInsertAt} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                Insert Here
              </button>
            </div>
            <button onClick={handleDeleteAt} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition">
              Delete at Position
            </button>
          </div>
        </div>

        {/* Search & Traverse */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
            <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🔍</span> Search & Navigate
            </h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search value..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button onClick={handleSearch} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition">
                Search
              </button>
            </div>
            <button
              onClick={handleTraverse}
              className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg ${
                isTraversing
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isTraversing ? '⏸️ Stop Crossing' : '🚶 Cross Bridge!'}
            </button>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200">
            <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
              <span className="text-lg">⚙️</span> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleBuildSample} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition shadow-lg">
                🏗️ Build Sample
              </button>
              <button onClick={handleReset} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition shadow-lg">
                🔄 Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className={`mb-6 p-4 rounded-xl text-sm font-semibold transition-all ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border-2 border-red-300' :
          message.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-300' :
          'bg-blue-50 text-blue-700 border-2 border-blue-300'
        }`}>
          {message.text}
        </div>

        {/* Bridge Visualization */}
        <div className="bg-gradient-to-b from-sky-200 via-blue-100 to-amber-100 rounded-2xl p-6 border-4 border-blue-400 mb-6 shadow-2xl">
          <div className="flex justify-between text-xs text-gray-800 mb-3 font-bold">
            <span>🏖️ Left Shore (Start) →</span>
            <span>→ Far Shore (Goal) 🏖️</span>
          </div>

          <div className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-xl p-8 overflow-x-auto shadow-2xl border-4 border-blue-700" style={{ minHeight: '250px' }}>
            <div className="flex items-center gap-3 relative">
              {/* Left Shore (Fixed) */}
              <div className="flex-shrink-0 w-24 h-32 rounded-xl bg-gradient-to-b from-yellow-300 to-yellow-500 border-4 border-yellow-800 flex items-center justify-center text-yellow-900 text-xs font-bold text-center shadow-2xl">
                🏖️<br/>START<br/>SHORE
              </div>

              {/* Nodes Container */}
              <div ref={nodesContainerRef} className="flex items-center gap-3 relative min-w-0">
                {/* Stickman */}
                <div
                  className="absolute pointer-events-none z-30"
                  style={{
                    transform: `translate(${stickmanPos.x}px, ${stickmanPos.y}px)`,
                    transition: isFalling ? 'transform 1.2s cubic-bezier(0.5, 0, 1, 1)' : 'transform 800ms ease-in-out',
                    filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.4))'
                  }}
                >
                  <StickmanSVG isWalking={isWalking} isFalling={isFalling} />
                  {isWalking && !isFalling && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-white font-bold bg-purple-600 px-3 py-1 rounded-full animate-pulse shadow-lg">
                      🚶 Walking
                    </div>
                  )}
                  {isFalling && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-white font-bold bg-red-600 px-3 py-1 rounded-full animate-bounce shadow-lg">
                      💧 FALLING!
                    </div>
                  )}
                </div>

                {/* Bridge Planks */}
                {renderNodes()}

                {/* Gap indicator if bridge incomplete */}
                {list.length > 0 && list.length < requiredBridgeLength && (
                  <div className="flex-shrink-0 min-w-[80px] h-24 border-4 border-dashed border-red-500 rounded-xl bg-red-100/30 flex items-center justify-center text-red-700 text-xs font-bold text-center">
                    ⚠️<br/>GAP!<br/>Add {requiredBridgeLength - list.length}<br/>more
                  </div>
                )}
              </div>

              {/* Null Indicator */}
              {list.length > 0 && (
                <div className="flex-shrink-0 px-4 py-2 rounded-full bg-gray-800 text-yellow-200 text-xs font-bold border-3 border-yellow-500 shadow-2xl">
                  → null
                </div>
              )}

              {/* Far Shore (Fixed) */}
              <div className={`flex-shrink-0 w-24 h-32 rounded-xl border-4 flex items-center justify-center text-xs font-bold text-center shadow-2xl ${
                bridgeStatus === 'complete'
                  ? 'bg-gradient-to-b from-green-300 to-green-500 border-green-800 text-green-900'
                  : 'bg-gradient-to-b from-gray-400 to-gray-600 border-gray-800 text-gray-200'
              }`}>
                🏖️<br/>{bridgeStatus === 'complete' ? 'FAR' : 'TOO'}<br/>{bridgeStatus === 'complete' ? 'SHORE' : 'FAR!'}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-800 bg-white/70 rounded-lg p-3 border-2 border-blue-300 font-semibold">
            <strong>🔗 Bridge Status:</strong> {list.length} planks | <strong>📋 Planks:</strong> [{list.toArray().join(' → ') || 'Empty'}] | <strong>🎯 Goal:</strong> {requiredBridgeLength} planks
          </div>
        </div>

        {/* Info & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-300">
            <h3 className="text-sm font-bold text-gray-800 mb-2">📚 Linked List Operations</h3>
            <div className="text-xs text-gray-700 space-y-2 max-h-48 overflow-y-auto">
              <p><strong>Add at Head:</strong> O(1) - New plank becomes head</p>
              <p><strong>Add at Tail:</strong> O(1) - New plank becomes tail (with tail pointer)</p>
              <p><strong>Insert at Position:</strong> O(n) - Must traverse to position</p>
              <p><strong>Delete at Position:</strong> O(n) - Must traverse to position</p>
              <p><strong>Search:</strong> O(n) - Linear search through planks</p>
              <p><strong>Traverse:</strong> O(n) - Visit each plank from head to tail</p>
              <p className="pt-2 border-t text-purple-700 font-bold">
                🎯 Build exactly {requiredBridgeLength} planks to complete the bridge!
              </p>
              <p className="text-red-700 font-bold">
                ⚠️ If bridge is incomplete, stickman will FALL into water!
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-300">
            <h3 className="text-sm font-bold text-gray-800 mb-2">📋 Operation Log</h3>
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No operations yet - start building!</p>
              ) : (
                logs.slice(-20).reverse().map((log, i) => (
                  <div key={i} className={`p-2 rounded ${
                    log.kind === 'error' ? 'bg-red-100 text-red-800' :
                    log.kind === 'action' ? 'bg-blue-100 text-blue-800' :
                    log.kind === 'traverse' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <span className="text-[10px] opacity-75">{log.time}</span> - {log.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
