import React from 'react';

interface DashboardProps {
  onSelectLevel: (level: number) => void;
}

const LevelCard: React.FC<{
  level: number;
  title: string;
  description: string;
  icon: string;
  onClick: (level: number) => void;
}> = ({ level, title, description, icon, onClick }) => (
  <button
    onClick={() => onClick(level)}
    className="group bg-white border border-gray-200 rounded-2xl p-6 text-left w-full hover:bg-gray-50 hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100 shadow-sm"
  >
    <div className="flex items-start gap-4">
      <div className="text-4xl bg-gray-100 group-hover:bg-blue-100 p-3 rounded-xl transition-colors">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-gray-500">{description}</p>
      </div>
    </div>
  </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ onSelectLevel }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">STICKMAN CODES</h1>
            <p className="text-gray-600 text-lg">Choose a level to start learning and playing.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
            <LevelCard
                level={1}
                title="Level 1: Fire Rescue"
                description="Learn about loops and game state by writing code to extinguish a fire in this interactive canvas game."
                icon="🔥"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={2}
                title="Level 2: Stickman Arrays"
                description="Grasp the concept of arrays as collections of similar items by helping a stickman pack his bag for school."
                icon="🎒"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={3}
                title="Level 3: IF-ELSE Runner"
                description="Master conditional logic by writing IF-ELSE statements to help a stickman avoid obstacles."
                icon="🏃"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={4}
                title="Level 4: IF / ELSE IF Runner"
                description="Handle multiple conditions with 'else if' to help a stickman jump over stalagmites and duck under stalactites."
                icon="⛰️"
                onClick={onSelectLevel}
            />
             <LevelCard
                level={5}
                title="Level 5: Stickman Stack Tower"
                description="Learn the Stack (LIFO) data structure by helping a stickman build a Jenga-like tower with PUSH and POP."
                icon="🧱"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={6}
                title="Level 6: Stickman Barista Queue"
                description="Understand the Queue (FIFO) data structure by serving stickman customers in the correct order at a coffee shop."
                icon="☕"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={7}
                title="Level 7: Tower of Hanoi"
                description="Master recursion by solving the classic Tower of Hanoi puzzle. Watch the recursion stack and tree visualize in real-time."
                icon="🗼"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={8}
                title="Level 8: Sorting Algorithms"
                description="Learn Bubble, Selection, and Insertion Sort by making decisions to sort stickmen from shortest to tallest."
                icon="📊"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={9}
                title="Level 9: Beach Bridge"
                description="Master singly linked lists by building a bright wooden bridge! Watch the stickman walk ON TOP as you learn insertions, deletions, and traversal."
                icon="🌉"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={10}
                title="Level 10: Treasure Hunt"
                description="Learn linear search (O(n)) by finding treasure behind doors. Must check left to right - wrong moves cost points!"
                icon="🔍"
                onClick={onSelectLevel}
            />
            <LevelCard
                level={11}
                title="Level 11: Collaboration Room"
                description="Connect with a friend via webcam! Draw annotations together in real-time and talk using WebRTC peer-to-peer technology."
                icon="👥"
                onClick={onSelectLevel}
            />
        </div>
    </div>
  );
};