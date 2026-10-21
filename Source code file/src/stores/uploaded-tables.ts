import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type UploadedTable = {
  tableName: string;
  worksheetGuid: string | null;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columns: string[];
};

export type UploadedTablesState = {
  tables: UploadedTable[];
};

export type UploadedTablesActions = {
  addTable: (table: UploadedTable) => void;
  removeTable: (tableName: string) => void;
  reset: () => void;
};

/**
 * Session-only by default (no persist middleware) — uploaded Snowflake
 * tables themselves are durable, but which ones show up in "Explore
 * Uploads" resets on refresh, matching a one-off/ad-hoc upload mental
 * model rather than a permanent library.
 */
export const useUploadedTablesStore = create<
  UploadedTablesState & UploadedTablesActions
>()(
  immer((set) => ({
    tables: [],
    addTable: (table) =>
      set((state) => {
        state.tables.unshift(table);
      }),
    removeTable: (tableName) =>
      set((state) => {
        state.tables = state.tables.filter((t) => t.tableName !== tableName);
      }),
    reset: () =>
      set((state) => {
        state.tables = [];
      }),
  })),
);
