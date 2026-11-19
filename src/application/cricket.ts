// Play stops as soon as the target is reached. A third ball after 44 is illegal.
export const chasePattern = '44|[01]44|4[01]4';
export const shots = [0, 1, 4] as const;
export type Shot = typeof shots[number];

export function innings(balls: readonly Shot[]) {
  const runs = balls.reduce<number>((total, shot) => total + shot, 0);
  return { runs, won: runs >= 8, finished: runs >= 8 || balls.length >= 3 };
}
