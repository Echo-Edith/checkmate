// Copies the Stockfish WASM engine from node_modules into /public/stockfish so the
// browser can load it as a Web Worker. Runs automatically after `npm install`
// (including on Vercel). The engine is NOT stored in the repository or in MongoDB.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const pkgDir = path.join(root, "node_modules", "stockfish");
const destDir = path.join(root, "public", "stockfish");

function listFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).map((name) => path.join(dir, name)) : [];
}

if (!existsSync(pkgDir)) {
  console.warn("[stockfish] node_modules/stockfish not found; skipping engine copy.");
  process.exit(0);
}

const candidates = [...listFiles(path.join(pkgDir, "src")), ...listFiles(path.join(pkgDir, "bin")), ...listFiles(pkgDir)];

// A usable engine is a .js loader with a .wasm file of the same name next to it.
const engines = candidates
  .filter((file) => file.endsWith(".js") && existsSync(file.replace(/\.js$/, ".wasm")))
  .map((file) => path.basename(file))
  .filter((name) => name.startsWith("stockfish"));

// Prefer a single-threaded build (no special COOP/COEP headers needed), lightest first.
function score(name) {
  let s = 0;
  if (name.includes("single")) s += 4;
  if (name.includes("lite")) s += 2;
  if (name.includes("nnue") || /\d/.test(name)) s += 1;
  return s;
}
engines.sort((a, b) => score(b) - score(a));

const chosen = engines[0];
if (!chosen) {
  console.warn("[stockfish] No .js/.wasm engine pair found in the stockfish package. Engine features will not work.");
  process.exit(0);
}

const chosenDir = candidates.find((file) => path.basename(file) === chosen);
if (!chosenDir) process.exit(0);
const dir = path.dirname(chosenDir);
const stem = chosen.replace(/\.js$/, "");

mkdirSync(destDir, { recursive: true });
// Renamed as a pair so the loader still finds its .wasm next to itself.
copyFileSync(path.join(dir, `${stem}.js`), path.join(destDir, "stockfish.js"));
copyFileSync(path.join(dir, `${stem}.wasm`), path.join(destDir, "stockfish.wasm"));

for (const license of ["Copying.txt", "COPYING.txt", "LICENSE", "LICENSE.txt"]) {
  const file = path.join(pkgDir, license);
  if (existsSync(file)) {
    copyFileSync(file, path.join(destDir, "COPYING.txt"));
    break;
  }
}

console.log(`[stockfish] Installed engine "${stem}" to public/stockfish/`);
