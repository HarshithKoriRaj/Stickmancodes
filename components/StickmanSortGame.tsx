import React, { useState, useEffect } from 'react';

interface SortingStep {
  comparing: number[];
  shouldSwap: boolean;
  array: number[];
}

export const StickmanSortGame: React.FC = () => {
  const [stickmen, setStickmen] = useState<number[]>([]);
  const [algorithm, setAlgorithm] = useState<'bubble' | 'selection' | 'insertion'>('bubble');
  const [currentStep, setCurrentStep] = useState(0);
  const [comparing, setComparing] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [difficulty, setDifficulty] = useState(6);
  const [sortingSteps, setSortingSteps] = useState<SortingStep[]>([]);
  const [showExplanation, setShowExplanation] = useState(true);

  const generateStickmen = () => {
    const heights = Array.from({ length: difficulty }, () => Math.floor(Math.random() * 60) + 40);
    setStickmen(heights);
    setCurrentStep(0);
    setComparing([]);
    setScore(0);
    setMistakes(0);
    setGameComplete(false);
    setFeedback('');
    setShowExplanation(true);
    generateSortingSteps(heights);
  };

  useEffect(() => {
    generateStickmen();
  }, [difficulty, algorithm]);

  const isSorted = (arr: number[]): boolean => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  };

  const generateSortingSteps = (arr: number[]) => {
    const steps: SortingStep[] = [];
    const tempArr = [...arr];

    switch (algorithm) {
      case 'bubble':
        for (let i = 0; i < tempArr.length - 1; i++) {
          for (let j = 0; j < tempArr.length - i - 1; j++) {
            steps.push({
              comparing: [j, j + 1],
              shouldSwap: tempArr[j] > tempArr[j + 1],
              array: [...tempArr]
            });
            if (tempArr[j] > tempArr[j + 1]) {
              [tempArr[j], tempArr[j + 1]] = [tempArr[j + 1], tempArr[j]];
            }
          }
        }
        break;

      case 'selection':
        for (let i = 0; i < tempArr.length - 1; i++) {
          let minIdx = i;
          for (let j = i + 1; j < tempArr.length; j++) {
            if (tempArr[j] < tempArr[minIdx]) {
              minIdx = j;
            }
          }
          if (minIdx !== i) {
            steps.push({
              comparing: [i, minIdx],
              shouldSwap: true,
              array: [...tempArr]
            });
            [tempArr[i], tempArr[minIdx]] = [tempArr[minIdx], tempArr[i]];
          }
        }
        break;

      case 'insertion':
        for (let i = 1; i < tempArr.length; i++) {
          let j = i - 1;
          const key = tempArr[i];
          while (j >= 0 && tempArr[j] > key) {
            steps.push({
              comparing: [j, j + 1],
              shouldSwap: true,
              array: [...tempArr]
            });
            tempArr[j + 1] = tempArr[j];
            j--;
          }
          tempArr[j + 1] = key;
        }
        break;
    }

    setSortingSteps(steps);
  };

  const handleDecision = (shouldSwap: boolean) => {
    if (gameComplete || currentStep >= sortingSteps.length) return;

    const step = sortingSteps[currentStep];
    const correct = shouldSwap === step.shouldSwap;

    if (correct) {
      setScore(score + 10);
      setFeedback(shouldSwap ? '✓ Correct! These need to swap!' : '✓ Correct! They\'re in the right order!');

      if (shouldSwap) {
        const newStickmen = [...stickmen];
        const [i, j] = step.comparing;
        [newStickmen[i], newStickmen[j]] = [newStickmen[j], newStickmen[i]];
        setStickmen(newStickmen);

        if (isSorted(newStickmen)) {
          setGameComplete(true);
          setFeedback('🎉 Perfect! You\'ve sorted all the stickmen!');
        }
      }
    } else {
      setMistakes(mistakes + 1);
      setFeedback(step.shouldSwap ? '✗ Wrong! The left one is taller - they should swap!' : '✗ Wrong! They\'re already in order!');
    }

    setTimeout(() => {
      setCurrentStep(currentStep + 1);
      setFeedback('');

      if (currentStep + 1 >= sortingSteps.length && !isSorted(stickmen)) {
        setGameComplete(true);
        setFeedback('Game complete! Check your results.');
      }
    }, 1500);
  };

  useEffect(() => {
    if (sortingSteps.length > 0 && currentStep < sortingSteps.length) {
      setComparing(sortingSteps[currentStep].comparing);
      setShowExplanation(false);
    } else {
      setComparing([]);
    }
  }, [currentStep, sortingSteps]);

  const drawStickman = (height: number, index: number) => {
    const isComparing = comparing.includes(index);
    const isSortedStick = gameComplete && isSorted(stickmen);

    let color = '#64748b';
    if (isSortedStick) color = '#22c55e';
    else if (isComparing) color = '#f59e0b';

    const headRadius = 8;
    const bodyHeight = height * 0.5;
    const legHeight = height * 0.3;
    const armWidth = 12;

    return (
      <svg width="60" height={height + 30} className="mx-auto">
        <circle cx="30" cy={headRadius + 5} r={headRadius} fill={color} stroke="#1e293b" strokeWidth="2" />
        <line x1="30" y1={headRadius * 2 + 5} x2="30" y2={headRadius * 2 + bodyHeight + 5} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1={headRadius * 2 + 10} x2={30 - armWidth} y2={headRadius * 2 + 20} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1={headRadius * 2 + 10} x2={30 + armWidth} y2={headRadius * 2 + 20} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1={headRadius * 2 + bodyHeight + 5} x2={30 - 8} y2={headRadius * 2 + bodyHeight + legHeight + 5} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1={headRadius * 2 + bodyHeight + 5} x2={30 + 8} y2={headRadius * 2 + bodyHeight + legHeight + 5} stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  };

  const algorithmDescriptions = {
    bubble: {
      title: "Bubble Sort",
      description: "Compare pairs of adjacent stickmen. If the left one is taller, swap them. Keep going until all are sorted!",
      emoji: "🫧"
    },
    selection: {
      title: "Selection Sort",
      description: "Find the shortest stickman in the unsorted section and swap them to the front. Repeat!",
      emoji: "👆"
    },
    insertion: {
      title: "Insertion Sort",
      description: "Take each stickman and insert them into the correct position in the already-sorted section.",
      emoji: "📥"
    }
  };

  const getCurrentQuestion = () => {
    if (currentStep >= sortingSteps.length || sortingSteps.length === 0) return null;
    const step = sortingSteps[currentStep];
    const [i, j] = step.comparing;

    let question = '';
    switch (algorithm) {
      case 'bubble':
        question = `Compare positions ${i + 1} and ${j + 1}. Should they swap?`;
        break;
      case 'selection':
        question = `Is position ${j + 1} the smallest? Should we swap it with position ${i + 1}?`;
        break;
      case 'insertion':
        question = `Should position ${j + 1} move to the left?`;
        break;
    }

    return question;
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center">🎮 Sort the Stickmen!</h2>
        <p className="text-blue-200 text-center mb-6">Make smart decisions to sort stickmen from shortest to tallest</p>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-white mb-2 font-semibold">Choose Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'bubble' | 'selection' | 'insertion')}
                disabled={!showExplanation && currentStep > 0}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="bubble">🫧 Bubble Sort</option>
                <option value="selection">👆 Selection Sort</option>
                <option value="insertion">📥 Insertion Sort</option>
              </select>
            </div>

            <div>
              <label className="block text-white mb-2 font-semibold">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                disabled={!showExplanation && currentStep > 0}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="4">Easy (4 stickmen)</option>
                <option value="6">Medium (6 stickmen)</option>
                <option value="8">Hard (8 stickmen)</option>
              </select>
            </div>
          </div>

          {showExplanation ? (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-6 mb-4 border border-blue-400/30">
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">{algorithmDescriptions[algorithm].emoji}</div>
                <h3 className="text-white font-bold text-2xl mb-2">{algorithmDescriptions[algorithm].title}</h3>
                <p className="text-blue-100 text-lg">{algorithmDescriptions[algorithm].description}</p>
              </div>
              <button
                onClick={() => setShowExplanation(false)}
                className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-colors"
              >
                ▶ Start Sorting!
              </button>
            </div>
          ) : (
            <>
              {!gameComplete && currentStep < sortingSteps.length && (
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 mb-4 border border-purple-400/30">
                  <h3 className="text-white font-bold text-xl mb-3 text-center">{getCurrentQuestion()}</h3>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleDecision(true)}
                      className="flex-1 max-w-xs bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors"
                    >
                      ✓ YES, Swap!
                    </button>
                    <button
                      onClick={() => handleDecision(false)}
                      className="flex-1 max-w-xs bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-lg font-bold text-lg transition-colors"
                    >
                      ✗ NO, Keep Order
                    </button>
                  </div>
                </div>
              )}

              {feedback && (
                <div className={`${feedback.includes('✓') ? 'bg-green-500/20 border-green-400/50' : 'bg-red-500/20 border-red-400/50'} border rounded-lg p-4 mb-4 text-center`}>
                  <p className={`${feedback.includes('✓') ? 'text-green-100' : 'text-red-100'} font-bold text-lg`}>{feedback}</p>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <div className="text-blue-300 text-sm">Score</div>
              <div className="text-white text-2xl font-bold">{score}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <div className="text-blue-300 text-sm">Mistakes</div>
              <div className="text-white text-2xl font-bold">{mistakes}</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <div className="text-blue-300 text-sm">Progress</div>
              <div className="text-white text-2xl font-bold">{sortingSteps.length > 0 ? currentStep : 0}/{sortingSteps.length}</div>
            </div>
          </div>

          <button
            onClick={generateStickmen}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            ⟲ New Game
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 sm:p-8">
          <div className="flex items-end justify-center gap-2 sm:gap-4 min-h-[200px] overflow-x-auto pb-4">
            {stickmen.map((height, index) => (
              <div
                key={index}
                className={`flex flex-col items-center transition-all duration-300 ${
                  comparing.includes(index) ? 'scale-110' : ''
                }`}
              >
                <div className={`border-4 rounded-lg p-1 ${
                  comparing.includes(index) ? 'border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/50' : 'border-transparent'
                }`}>
                  {drawStickman(height, index)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-6 mt-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-500 rounded"></div>
              <span className="text-white">Waiting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-white">Comparing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-white">Sorted!</span>
            </div>
          </div>

          {gameComplete && isSorted(stickmen) && (
            <div className="mt-6 bg-green-500/20 border border-green-400/50 rounded-lg p-6 text-center">
              <div className="text-green-300 text-5xl mb-3">🏆</div>
              <p className="text-green-100 font-bold text-2xl mb-2">🎉 Perfect Sort!</p>
              <p className="text-green-200 text-lg">
                Score: {score} points | Mistakes: {mistakes}
              </p>
              <p className="text-green-300 text-sm mt-2">
                You completed {sortingSteps.length} comparisons using {algorithmDescriptions[algorithm].title}!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
