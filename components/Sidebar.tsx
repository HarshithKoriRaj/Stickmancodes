import React from 'react';

interface SidebarProps {
  code: string;
  setCode: (code: string) => void;
  onSubmitCode: () => void;
  onGetHint: () => void;
  codeStatus: string;
  isHintLoading: boolean;
}

const HintDetails: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
    <details className="bg-gray-50 border border-gray-200 rounded-xl p-3 my-2 open:bg-gray-100 transition-colors">
        <summary className="cursor-pointer font-semibold text-gray-700 select-none">
            {title}
        </summary>
        <div className="text-xs text-gray-500 mt-2">
            {children}
        </div>
    </details>
);

export const Sidebar: React.FC<SidebarProps> = ({ code, setCode, onSubmitCode, onGetHint, codeStatus, isHintLoading }) => {
  return (
    <aside className="bg-white border border-gray-200 rounded-2xl p-4 shadow-md h-full">
      <h2 className="text-lg font-bold text-gray-800 mb-2">Your Code (For-Loop)</h2>
      <div className="flex flex-col gap-2 mb-3">
        <label htmlFor="codeBox" className="text-sm text-gray-500">
          Type a for-loop. We'll extract the loop count from the first number we find.
        </label>
        <textarea
          id="codeBox"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`// Example:\n// for (let i = 0; i < 20; i++) {\n//   throwWater();\n// }`}
          className="w-full min-h-[140px] bg-gray-50 text-gray-800 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center mb-4">
        <button onClick={onSubmitCode} className="w-full sm:w-auto flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50">
          Submit Code
        </button>
        <button onClick={onGetHint} disabled={isHintLoading} className="w-full sm:w-auto bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50">
          {isHintLoading ? 'Getting Hint...' : 'Get AI Hint'}
        </button>
      </div>
       <span className="text-sm text-gray-500 h-4 block">{codeStatus}</span>

      <div className="mt-4">
        <HintDetails title="Hint 1">
            Use any classic for-loop pattern. If you include a number (like 10 or 20), we’ll use it as your throw count.
        </HintDetails>
        <HintDetails title="Hint 2">
            <p>Examples:</p>
            <pre className="bg-gray-100 border border-gray-200 p-2 rounded-md mt-1 text-xs text-gray-700">
{`for (let i=1; i<=15; i++) {
  throwWater();
}

// OR

for (let i=0; i<20; i++) {
  throwWater();
}`}
            </pre>
            <p className="mt-2">You can also type plain text like “loop 12 times” — we’ll parse 12.</p>
        </HintDetails>
      </div>
    </aside>
  );
};