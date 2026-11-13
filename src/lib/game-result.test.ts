import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import { decideResult, positionStatus } from "./game-result";

const m = (pgn: string) => pgn.split(/\s+/).filter(Boolean);

const FOOLS_MATE = m("f3 e5 g4 Qh4#"); // Black mates White
const SCHOLARS_MATE = m("e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#"); // White mates Black
const LOYD_STALEMATE = m(
  "e3 a5 Qh5 Ra6 Qxa5 h5 h4 Rah6 Qxc7 f6 Qxd7+ Kf7 Qxb7 Qd3 Qxb8 Qh7 Qxc8 Kg6 Qe6",
);
const KNIGHT_SHUFFLE = m("Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8");
// A normal game that simply ends on a Black move (...g4). White still has legal moves.
const ENDS_ON_BLACK_G4 = m("d4 d5 h3 g5 e4 g4");

test("a position after a Black move with legal moves left is not over", () => {
  const game = new Chess();
  ENDS_ON_BLACK_G4.forEach((san) => game.move(san));
  assert.equal(game.turn(), "w");
  assert.ok(game.moves().length > 0);
  const status = positionStatus(game);
  assert.equal(status.over, false);
  assert.equal(status.result, null);
});

test("end of the move list is never a loss", () => {
  for (const color of ["w", "b"] as const) {
    const out = decideResult(ENDS_ON_BLACK_G4, color, "computer", false);
    assert.deepEqual(out, { ok: false, error: "unfinished" });
  }
});

test("checkmate gives the right winner", () => {
  const fools = decideResult(FOOLS_MATE, "w", "computer", false);
  assert.ok(fools.ok && fools.result === "0-1" && fools.reason === "board");
  const scholars = decideResult(SCHOLARS_MATE, "w", "computer", false);
  assert.ok(scholars.ok && scholars.result === "1-0");
});

test("stalemate is a draw", () => {
  const out = decideResult(LOYD_STALEMATE, "b", "computer", false);
  assert.ok(out.ok && out.result === "1/2-1/2");
});

test("threefold repetition is a draw", () => {
  const out = decideResult(KNIGHT_SHUFFLE, "w", "computer", false);
  assert.ok(out.ok && out.result === "1/2-1/2");
});

test("resigning against the computer is a loss for the player", () => {
  const asWhite = decideResult(ENDS_ON_BLACK_G4, "w", "computer", true);
  assert.ok(asWhite.ok && asWhite.result === "0-1" && asWhite.reason === "resignation" && asWhite.resigned);
  const asBlack = decideResult(ENDS_ON_BLACK_G4, "b", "computer", true);
  assert.ok(asBlack.ok && asBlack.result === "1-0");
});

test("resign flag is ignored in two-player games", () => {
  const out = decideResult(ENDS_ON_BLACK_G4, "w", "pvp", true);
  assert.deepEqual(out, { ok: false, error: "unfinished" });
});

test("a finished board result beats a resign flag", () => {
  // Player (White) was checkmated, then a stray resign flag arrives: still a checkmate loss, not marked resigned.
  const lost = decideResult(FOOLS_MATE, "w", "computer", true);
  assert.ok(lost.ok && lost.result === "0-1" && lost.reason === "board" && lost.resigned === false);
  // Player won by checkmate: a stray resign flag must not turn the win into a loss.
  const won = decideResult(SCHOLARS_MATE, "w", "computer", true);
  assert.ok(won.ok && won.result === "1-0" && won.resigned === false);
});

test("illegal and empty games are rejected", () => {
  assert.deepEqual(decideResult(m("e4 e4"), "w", "computer", false), { ok: false, error: "illegal" });
  assert.deepEqual(decideResult([], "w", "computer", true), { ok: false, error: "empty" });
});
