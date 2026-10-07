/**
 * @file src/types/index.ts
 * @description Defines TypeScript interfaces and types for the Simple Counter Application.
 */

/**
 * Represents the state of the counter, which is a simple number.
 */
export type CounterState = number;

/**
 * Defines the possible actions that can be dispatched to modify the counter state.
 * (Not explicitly used as a reducer, but good for conceptual clarity).
 */
export type CounterAction = 'INCREMENT' | 'DECREMENT' | 'RESET';
