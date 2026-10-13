import type { AllocationMode, PassivePlan } from "./passive-plan";

export type PlannerCheckpoint = {
  classIndex: number;
  ascendancy: string;
  mode: AllocationMode;
  selected?: string;
  plan: PassivePlan;
};

export function rememberPlannerChange(history: PlannerCheckpoint[], checkpoint: PlannerCheckpoint) {
  return [...history, structuredClone(checkpoint)].slice(-50);
}

export function undoPlannerChange(history: PlannerCheckpoint[]) {
  return {
    checkpoint: history.length ? structuredClone(history[history.length - 1]) : undefined,
    history: history.slice(0, -1),
  };
}
