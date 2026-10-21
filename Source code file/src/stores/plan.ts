import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type PlanTier = "basic" | "premium";

export type PlanState = {
  plan: PlanTier;
  /** How many of the Basic plan's free questions have been asked. */
  basicQuestionsUsed: number;
  /** How many free questions the Basic plan allows before Vera is blocked. */
  basicQuestionsLimit: number;
  /** Shared across the app — the sidebar's "Upgrade" button and Vera's
   * paywall both open the same dialog instance. */
  upgradeDialogOpen: boolean;
};

export type PlanActions = {
  /** Records one used question against the Basic plan's limit. No-op on Premium. */
  consumeBasicQuestion: () => void;
  /** Instantly flips the account to Premium (the demo's mock "checkout"). */
  upgradeToPremium: () => void;
  /** Demo-only: step back down to Basic to re-demo the paywall. */
  downgradeToBasic: () => void;
  setPlan: (plan: PlanTier) => void;
  setBasicQuestionsLimit: (limit: number) => void;
  setBasicQuestionsUsed: (used: number) => void;
  openUpgradeDialog: () => void;
  closeUpgradeDialog: () => void;
  reset: () => void;
};

const initState: PlanState = {
  plan: "basic",
  basicQuestionsUsed: 0,
  basicQuestionsLimit: 1,
  upgradeDialogOpen: false,
};

export const usePlanStore = create<PlanState & PlanActions>()(
  persist(
    immer((set) => ({
      ...initState,
      consumeBasicQuestion: () =>
        set((state) => {
          if (state.plan === "basic") {
            state.basicQuestionsUsed += 1;
          }
        }),
      upgradeToPremium: () =>
        set((state) => {
          state.plan = "premium";
          state.upgradeDialogOpen = false;
        }),
      downgradeToBasic: () =>
        set((state) => {
          state.plan = "basic";
          state.basicQuestionsUsed = 0;
        }),
      setPlan: (plan) =>
        set((state) => {
          state.plan = plan;
        }),
      setBasicQuestionsLimit: (limit) =>
        set((state) => {
          state.basicQuestionsLimit = limit;
        }),
      setBasicQuestionsUsed: (used) =>
        set((state) => {
          state.basicQuestionsUsed = used;
        }),
      openUpgradeDialog: () =>
        set((state) => {
          state.upgradeDialogOpen = true;
        }),
      closeUpgradeDialog: () =>
        set((state) => {
          state.upgradeDialogOpen = false;
        }),
      reset: () =>
        set((state) => {
          state.plan = initState.plan;
          state.basicQuestionsUsed = initState.basicQuestionsUsed;
          state.basicQuestionsLimit = initState.basicQuestionsLimit;
          state.upgradeDialogOpen = false;
        }),
    })),
    { name: "gt-plan" },
  ),
);

/** True once a Basic-plan account has used up its free questions. Always false on Premium. */
export function isBasicLimitReached(state: PlanState): boolean {
  return state.plan === "basic" && state.basicQuestionsUsed >= state.basicQuestionsLimit;
}
