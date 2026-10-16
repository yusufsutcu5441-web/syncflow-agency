import type { CinemaTargets, DebugSettings } from './core';

/**
 * The messages between the page (lib/cinema/engine.ts) and the cinema worker (lib/cinema/worker.ts). Everything is plain numbers: the
 * engine in the worker never touches the page, the page never touches the canvas once it has been handed over.
 */
export type WorkerInput = {
  state: CinemaTargets;
  pointer: { x: number; y: number };
  scrollY: number;
};

export type ToWorker =
  | { type: 'init'; canvas: OffscreenCanvas; input: WorkerInput; hidden: boolean; width: number; height: number; debug: boolean }
  | ({ type: 'input' } & WorkerInput)
  | { type: 'hidden'; hidden: boolean }
  | { type: 'size'; width: number; height: number }
  | { type: 'glitch'; ms?: number; strength?: number }
  | { type: 'debug'; settings: DebugSettings }
  | { type: 'snap' }
  | { type: 'stop' };

export type WorkerStats = { sceneScale: number; width: number; height: number; frames: number };

export type FromWorker =
  /** The first frame is on the canvas. */
  | { type: 'live' }
  /** The engine could not start (no WebGL2 in a worker, a shader that does not compile): the page tries the main thread. */
  | { type: 'failed' }
  /** The engine switched itself off after it had been live (too slow, a lost context). */
  | { type: 'retire' }
  | { type: 'stats'; stats: WorkerStats };
