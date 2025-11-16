export interface Point {
  x: number;
  y: number;
}

export interface Projectile extends Point {
  vx: number;
  vy: number;
  r: number;
  life: number;
}

export interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
}

export type Flame = Particle;
export type Steam = Particle;

export interface GameState {
  fire: number;
  throwsLeft: number;
  projectiles: Projectile[];
  flames: Flame[];
  steam: Steam[];
  armAnim: number;
  isRunning: boolean;
}

// --- Types for Stickman Arrays Game (Level 2) ---

export interface Stickman {
    x: number;
    y: number;
    destX: number;
    speed: number;
    phase: number;
    busy: boolean;
    carrying: boolean;
}

// --- Types for IF-ELSE Runner Game (Level 3) ---

export interface StickmanRunner {
  x: number;
  headY: number;
  vy: number;
  gravity: number;
  jumpPower: number;
  onGround: boolean;
  runPhase: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

// --- Types for IF-ELSE-IF Runner Game (Level 4) ---

export interface StickmanIfElseIf extends StickmanRunner {
  isDucking: boolean;
  duckingCooldown: number;
  jumpCooldown: number;
}

export interface ObstacleV2 extends Obstacle {
  type: 'low' | 'high';
}

// --- Types for Stickman Stack Tower Game (Level 5) ---

export interface StickmanStackState {
    position: 'source' | 'tower';
    isWalking: boolean;
    isPeeking: boolean;
    carryingValue: string | null;
}

// --- Types for Stickman Barista Queue Game (Level 6) ---

export interface Customer {
  id: number;
  name: string;
}

export interface BaristaState {
  isWalking: boolean;
  isNodding: boolean;
  isServing: boolean;
  position: 'idle' | 'serving';
}

// --- Types for Voice Assistant ---

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
}

// --- Types for Tower of Hanoi Game (Level 7) ---

export interface HanoiCallStackItem {
  n: number;
  from: number;
  to: number;
  aux: number;
}