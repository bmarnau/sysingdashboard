import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import process from "node:process";
import { normalizeGeneratedText } from "./normalize-generated-text.mjs";

const root = process.cwd();
const pairs = [
  [
    "supabase/schema/public-schema.sql",
    "supabase/schema/public-schema.generated.sql",
    "DATABASE_SCHEMA_DRIFT",
  ],
  [
    "src/integrations/supabase/types.ts",
    "src/integrations/supabase/types.generated.ts",
    "DATABASE_TYPES_DRIFT",
  ],
];

async function readNormalized(pathname) {
  const fullPath = resolve(root, pathname);
  try {
    return normalizeGeneratedText(await readFile(fullPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.error(`${pathname}: MISSING`);
      process.exitCode = 1;
      return null;
    }
    throw error;
  }
}

let drift = false;
for (const [canonicalPath, generatedPath, marker] of pairs) {
  const canonical = await readNormalized(canonicalPath);
  const generated = await readNormalized(generatedPath);
  if (canonical === null || generated === null) {
    drift = true;
    continue;
  }

  if (canonical !== generated) {
    console.error(`${marker}: DETECTED`);
    console.error(`canonical=${relative(root, resolve(root, canonicalPath))}`);
    console.error(`generated=${relative(root, resolve(root, generatedPath))}`);
    drift = true;
  }
}

if (drift || process.exitCode) {
  process.exitCode = 1;
} else {
  console.log("DATABASE_SCHEMA_DRIFT: NONE");
  console.log("DATABASE_TYPES_DRIFT: NONE");
}
