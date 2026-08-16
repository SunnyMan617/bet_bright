import crypto from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { SlipProvider } from "./betway.js";
import { AppError, isAppError } from "./errors.js";
import type { OperationKind, OperationStore } from "./store.js";

const codeSchema = z.object({
  code: z.string().trim().min(5).max(20).regex(/^[a-z0-9]+$/i),
});

const selectionSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  marketId: z.string().trim().min(1).max(200),
  outcomeId: z.string().trim().min(1).max(200),
});

const encodeSchema = z.object({
  selections: z.array(selectionSchema).min(1).max(50),
});

type Dependencies = {
  provider: SlipProvider;
  store: OperationStore;
  serveWeb?: boolean;
};

function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Check the submitted fields.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export function createApp({ provider, store, serveWeb = false }: Dependencies) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: process.env.NODE_ENV === "test" ? 10_000 : 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") || crypto.randomUUID();
    response.setHeader("x-request-id", requestId);
    response.locals.requestId = requestId;
    next();
  });

  app.get("/healthz", (_request, response) => {
    response.json({ ok: true, service: "betbridge", time: new Date().toISOString() });
  });

  app.get("/api/v1/operations", (_request, response) => {
    response.json({ operations: store.recent(10) });
  });

  const operation =
    (
      kind: OperationKind,
      handler: (request: Request) => Promise<unknown>,
    ) =>
    async (request: Request, response: Response, next: NextFunction) => {
      const started = performance.now();
      try {
        const result = await handler(request);
        const record = result as Record<string, unknown>;
        const slip = (record.slip || result) as Record<string, unknown>;
        const selections = Array.isArray(slip.selections) ? slip.selections : [];
        store.record({
          kind,
          inputCode: typeof request.body?.code === "string" ? request.body.code : undefined,
          outputCode: typeof record.code === "string" ? record.code : undefined,
          status: "success",
          durationMs: Math.round(performance.now() - started),
          selectionCount: selections.length,
        });
        response.json(result);
      } catch (error) {
        store.record({
          kind,
          inputCode: typeof request.body?.code === "string" ? request.body.code : undefined,
          status: "error",
          durationMs: Math.round(performance.now() - started),
          selectionCount: 0,
        });
        next(error);
      }
    };

  app.post(
    "/api/v1/slips/decode",
    operation("decode", async (request) => {
      const { code } = validate(codeSchema, request.body);
      return provider.decode(code);
    }),
  );

  app.post(
    "/api/v1/slips/encode",
    operation("encode", async (request) => {
      const { selections } = validate(encodeSchema, request.body);
      return provider.encode(selections);
    }),
  );

  app.post(
    "/api/v1/slips/convert",
    operation("convert", async (request) => {
      const { code } = validate(codeSchema, request.body);
      return provider.convert(code);
    }),
  );

  if (serveWeb) {
    const dist = resolve("dist");
    if (existsSync(dist)) {
      app.use(express.static(dist, { maxAge: "1h", index: false }));
      app.get("/{*path}", (_request, response) => {
        response.sendFile(resolve(dist, "index.html"));
      });
    }
  }

  app.use((_request, _response, next) => {
    next(new AppError(404, "NOT_FOUND", "The requested route does not exist."));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const appError = isAppError(error)
      ? error
      : new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
    if (!isAppError(error)) console.error(error);
    response.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
        requestId: response.locals.requestId,
      },
    });
  });

  return app;
}
