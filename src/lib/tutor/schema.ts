import { z } from "zod";

export const PERSONAS = ["teacher", "coach", "analyst"] as const;
export type Persona = (typeof PERSONAS)[number];

export const CLASSIFICATIONS = ["best", "good", "inaccuracy", "mistake", "blunder"] as const;
export type MoveClassification = (typeof CLASSIFICATIONS)[number];

const persona = z.enum(PERSONAS);
const san = z.string().max(16);
const fen = z.string().max(100);
const color = z.enum(["w", "b"]);

/** Facts produced by Stockfish in the browser. Gemini may only rely on these for evaluations. */
export const engineFactsSchema = z
  .object({
    evalText: z.string().max(40),
    bestMoveSan: san.optional(),
    line: z.array(san).max(8).optional(),
    depth: z.number().int().min(1).max(80).optional(),
  })
  .strict();

const moveFactsSchema = z
  .object({
    san,
    color,
    moveNumber: z.number().int().min(1).max(500),
    classification: z.enum(CLASSIFICATIONS),
    bestSan: san.optional(),
    evalBefore: z.string().max(40).optional(),
    evalAfter: z.string().max(40).optional(),
  })
  .strict();

const summaryFactsSchema = z
  .object({
    result: z.string().max(60),
    whiteAccuracy: z.number().min(0).max(100),
    blackAccuracy: z.number().min(0).max(100),
    counts: z.record(z.string().max(30), z.number().int().min(0).max(1000)),
    keyMoments: z
      .array(
        z
          .object({
            moveNumber: z.number().int().min(1).max(500),
            color,
            san,
            classification: z.enum(CLASSIFICATIONS),
            bestSan: san.optional(),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();

export const tutorRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("question"),
      persona,
      message: z.string().trim().min(1).max(500),
      fen: fen.optional(),
      engine: engineFactsSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("explain_position"),
      persona,
      fen,
      engine: engineFactsSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("puzzle_hint"),
      puzzleId: z.string().max(60),
      hintLevel: z.union([z.literal(1), z.literal(2)]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("explain_move"),
      persona,
      fen,
      move: moveFactsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("game_summary"),
      persona,
      summary: summaryFactsSchema,
    })
    .strict(),
]);

export type TutorRequest = z.infer<typeof tutorRequestSchema>;
export type EngineFactsPayload = z.infer<typeof engineFactsSchema>;
export type MoveFactsPayload = z.infer<typeof moveFactsSchema>;
export type SummaryFactsPayload = z.infer<typeof summaryFactsSchema>;
