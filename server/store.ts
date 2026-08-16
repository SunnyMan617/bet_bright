import Database from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

export type OperationKind = "decode" | "encode" | "convert";

export type OperationRecord = {
  kind: OperationKind;
  inputCode?: string;
  outputCode?: string;
  status: "success" | "error";
  durationMs: number;
  selectionCount: number;
};

export interface OperationStore {
  record(operation: OperationRecord): void;
  recent(limit: number): unknown[];
  close?(): void;
}

export class SqliteOperationStore implements OperationStore {
  private readonly database: Database.Database;

  constructor(databasePath = process.env.DATABASE_PATH || "./data/betbridge.db") {
    const absolutePath = resolve(databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new Database(absolutePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        input_code TEXT,
        output_code TEXT,
        status TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        selection_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS operations_created_at_idx
        ON operations(created_at DESC);
    `);
  }

  record(operation: OperationRecord): void {
    this.database
      .prepare(`
        INSERT INTO operations
          (kind, input_code, output_code, status, duration_ms, selection_count)
        VALUES
          (@kind, @inputCode, @outputCode, @status, @durationMs, @selectionCount)
      `)
      .run({
        inputCode: null,
        outputCode: null,
        ...operation,
      });
  }

  recent(limit: number): unknown[] {
    return this.database
      .prepare(`
        SELECT
          kind,
          status,
          duration_ms AS durationMs,
          selection_count AS selectionCount,
          created_at AS createdAt
        FROM operations
        ORDER BY id DESC
        LIMIT ?
      `)
      .all(limit);
  }

  close(): void {
    this.database.close();
  }
}
