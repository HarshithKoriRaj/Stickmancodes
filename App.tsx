import React, { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Sidebar } from './components/Sidebar';
import { Controls } from './components/Controls';
import { useGameLogic } from './hooks/useGameLogic';
import { getHint } from './services/geminiService';
import { StickmanArrays } from './components/StickmanArrays';
import { Dashboard } from './components/Dashboard';
import { IfElseGame } from './components/IfElseGame';
import { IfElseIfGame } from './components/IfElseIfGame';
import { StackGame } from './components/StackGame';
import { QueueGame } from './components/QueueGame';
import { TowerOfHanoi } from './components/TowerOfHanoi';
import { StickmanSortGame } from './components/StickmanSortGame';
import { LinkedListGame } from './components/LinkedListGame';
import { LinearSearchGame } from './components/LinearSearchGame';
import { CollaborationRoom } from './components/CollaborationRoom';
import { HeaderTools } from './components/HeaderTools';

const App: React.FC = () => {
  const [level, setLevel] = useState<number>(0); // 0 for dashboard

  // --- State and logic for Level 1: Fire Rescue ---
  const [code, setCode] = useState<string>('');
  const [parsedThrows, setParsedThrows] = useState<number>(20);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  const [codeStatus, setCodeStatus] = useState<string>('Waiting for your loop…');

  const {
    gameState,
    gameStatus,
    canvasRef,
    mousePosRef,
    throwWater,
    runFromCode,
    resetGame,
    isAutoRunning,
  } = useGameLogic(parsedThrows);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (level === 1 && e.code === 'Space' && !isAutoRunning) {
        e.preventDefault();
        throwWater();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [throwWater, isAutoRunning, level]);

  const parseThrowCountFromCode = (text: string): number => {
    if (!text) return 20;
    const match = text.match(/\d+/);
    if (match) {
        const num = parseInt(match[0], 10);
        if (num >= 1 && num <= 200) {
            return num;
        }
    }
    return 20;
  };

  const handleSubmitCode = useCallback(() => {
    const n = parseThrowCountFromCode(code);
    setParsedThrows(n);
    setCodeStatus(`Parsed throw count: ${n}`);
  }, [code]);

  const handleGetHint = useCallback(async () => {
    setIsHintLoading(true);
    try {
      const hint = await getHint();
      const codeSnippet = hint.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/)?.[1]?.trim() || hint;
      setCode(codeSnippet);
    } catch (error) {
      console.error('Failed to get hint from AI:', error);
      setCodeStatus('Error fetching hint.');
    } finally {
      setIsHintLoading(false);
    }
  }, []);
  
  const MemoizedGameCanvas = React.memo(GameCanvas);

  if (level === 0) {
    return (
      <>
        <Dashboard onSelectLevel={setLevel} />
        <HeaderTools onOpenWhiteboard={() => setLevel(11)} />
      </>
    );
  }

  const getLevelTitle = () => {
    if (level === 1) return "Level 1: 2D Fire-Rescue";
    if (level === 2) return "Level 2: Stickman Arrays";
    if (level === 3) return "Level 3: IF-ELSE Runner";
    if (level === 4) return "Level 4: IF / ELSE IF Runner";
    if (level === 5) return "Level 5: Stickman Stack Tower";
    if (level === 6) return "Level 6: Stickman Barista Queue";
    if (level === 7) return "Level 7: Tower of Hanoi - Recursion";
    if (level === 8) return "Level 8: Stickman Sorting Algorithms";
    if (level === 9) return "Level 9: Beach Bridge - Linked List";
    if (level === 10) return "Level 10: Treasure Hunt - Linear Search";
    if (level === 11) return "Level 11: Collaboration Room";
    return "STICKMAN CODES";
  }

  const renderLevel = () => {
    switch (level) {
      case 1:
        return (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
              <div className="w-full">
                <MemoizedGameCanvas
                    ref={canvasRef}
                    width={960}
                    height={540}
                    gameState={gameState}
                    mousePosRef={mousePosRef}
                />
                <p className="text-sm text-gray-500 mt-3">
                  <b>Concepts:</b> initialization, loops, state, randomness, collision, game loop.
                </p>
              </div>

              <Sidebar
                code={code}
                setCode={setCode}
                onSubmitCode={handleSubmitCode}
                onGetHint={handleGetHint}
                codeStatus={codeStatus}
                isHintLoading={isHintLoading}
              />
            </div>
        );
      case 2:
        return <StickmanArrays />;
      case 3:
        return <IfElseGame />;
      case 4:
        return <IfElseIfGame />;
      case 5:
        return <StackGame />;
      case 6:
        return <QueueGame />;
      case 7:
        return <TowerOfHanoi />;
      case 8:
        return <StickmanSortGame />;
      case 9:
        return <LinkedListGame />;
      case 10:
        return <LinearSearchGame />;
      case 11:
        return <CollaborationRoom />;
      default:
        return null;
    }
  }
  
  const backButtonClasses = "px-4 py-2 rounded-lg font-semibold transition bg-gray-200 text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400";
  const titleClasses = "text-xl sm:text-2xl font-bold text-gray-900";


  return (
    <div className={`bg-gray-100 text-gray-800 min-h-screen font-sans p-3 sm:p-4 md:p-6 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        <header className="mb-4">
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => setLevel(0)}
                    className={backButtonClasses}
                >
                    &larr; Back to Dashboard
                </button>
                 <h1 className={titleClasses}>{getLevelTitle()}</h1>
            </div>

          {level === 1 && (
            <Controls
                onThrow={throwWater}
                onAuto={runFromCode}
                onReset={resetGame}
                status={gameStatus}
                isAutoRunning={isAutoRunning}
                gameState={gameState}
              />
          )}
        </header>

        <main>
          {renderLevel()}
        </main>
      </div>
      <HeaderTools onOpenWhiteboard={() => setLevel(11)} />
    </div>
  );
};

export default App;