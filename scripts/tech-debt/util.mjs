import { readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

export function walk(root, filter = /\.(ts|tsx|mjs|js|jsx)$/) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === "node_modules" || name.startsWith(".") || name === "dist" || name === ".output")
        continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) stack.push(full);
      else if (filter.test(name)) out.push(full);
    }
  }
  return out;
}

export function rel(root, abs) {
  return relative(root, abs).split(sep).join("/");
}

export function read(abs) {
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return "";
  }
}

export function stableId(detector, ...parts) {
  const h = createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 8);
  return `td-${detector}-${h}`;
}

/** Zieht Line-Nr aus String-Offset. */
export function lineOf(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}
