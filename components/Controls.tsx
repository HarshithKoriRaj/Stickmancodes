import React from 'react';
import { GameState } from '../types';

interface ControlsProps {
  onThrow: () => void;
  onAuto: () => void;
  onReset: () => void;
  status: string;
  isAutoRunning: boolean;
  gameState: GameState;
}

const Button: React.FC<React.PropsWithChildren<{
    onClick: () => void;
    disabled?: boolean;
    primary?: boolean;
}>> = ({ onClick, disabled = false, primary = false, children }) => {
    const baseClasses = "px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100";
    const primaryClasses = "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20 focus:ring-blue-400";
    const secondaryClasses = "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400";
    const disabledClasses = "opacity-60 cursor-not-allowed";

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${primary ? primaryClasses : secondaryClasses} ${disabled ? disabledClasses : ''}`}
        >
            {children}
        </button>
    );
}

export const Controls: React.FC<ControlsProps> = ({ onThrow, onAuto, onReset, status, isAutoRunning, gameState }) => {
    const canThrow = gameState.isRunning && gameState.throwsLeft > 0;

  return (
    <div className="flex gap-3 sm:gap-4 flex-wrap items-center my-3">
      <Button onClick={onThrow} disabled={isAutoRunning || !canThrow} primary>
        Throw (Space)
      </Button>
      <Button onClick={onAuto} disabled={isAutoRunning || !canThrow}>
        {isAutoRunning ? 'Running...' : 'Auto (from code)'}
      </Button>
      <Button onClick={onReset}>
        Reset
      </Button>
      <span className="text-sm text-gray-500">{status}</span>
    </div>
  );
};