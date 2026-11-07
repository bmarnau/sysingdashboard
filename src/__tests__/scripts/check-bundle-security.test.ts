/**
 * Tests der Bundle-Sicherheitsprüfung (A33, `scripts/check-bundle-security.mjs`).
 *
 * Kleine Fixtures werden je Test in einem temporären Verzeichnis angelegt:
 * sauberes Bundle, Bundle mit Broker-Kennung, Lockfile mit zu alter Version
 * (bun.lock und package-lock.json). Zusätzlich prüft ein Regressionstest das
 * echte `bun.lock` des Repositorys. Kein Netzwerkzugriff.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  checkLockfile,
  compareVersions,
  formatTable,
  readLockfileVersions,
  runCheck,
  scanContent,
  // @ts-expect-error — reines ESM-Skript ohne Typdeklaration
} from "../../../scripts/check-bundle-security.mjs";

const REPO_ROOT = resolve(__dirname, "../../..");

const CLEAN_JS = 'console.log("hallo");const k="sb-auth-token";export{k};\n';
// Kennung zusammengesetzt, damit dieser Testquelltext selbst keine wörtliche Kennung enthält.
const PREFIX = ["lovable", "preview", "auth"].join("-");
const BROKER_JS = `window.postMessage({type:"${PREFIX}:get"});addEventListener("message",e=>e.data.type==="${PREFIX}:result");\n`;

const bunLock = (version: string) =>
  `{\n  "lockfileVersion": 1,\n  "packages": {\n    "@tanstack/react-start": ["@tanstack/react-start@${version}", "", {}, "sha512-x"],\n    "@tanstack/react-start-client": ["@tanstack/react-start-client@1.0.0", "", {}, "sha512-y"],\n  }\n}\n`;

const npmLock = (version: string) =>
  JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": { name: "fixture" },
      "node_modules/@tanstack/react-start": { version },
      "node_modules/@tanstack/react-start-client": { version: "1.0.0" },
    },
  });

let root: string;

function fixture(files: Record<string, string>) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(resolve(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-bundle-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("check-bundle-security", () => {
  it("meldet ein sauberes Bundle mit aktuellem Lockfile als ok", () => {
    fixture({
      "dist/assets/index-abc.js": CLEAN_JS,
      "dist/index.html": "<script src=assets/index-abc.js></script>",
      "bun.lock": bunLock("1.168.60"),
    });
    const r = runCheck({ root });
    expect(r.ok).toBe(true);
    expect(r.scannedFiles).toBe(2);
    expect(r.broker.hits).toEqual([]);
    expect(r.lockfile.versions).toEqual(["1.168.60"]);
    expect(formatTable(r, root)).toMatch(/Broker-Kennungen\s+\| ok/);
  });

  it("findet Broker-Kennungen im Bundle (Exit-Fall)", () => {
    fixture({
      "dist/assets/index-B1N4K92k.js": BROKER_JS,
      "dist/assets/other.js": CLEAN_JS,
      "bun.lock": bunLock("1.168.60"),
    });
    const r = runCheck({ root });
    expect(r.ok).toBe(false);
    expect(r.broker.ok).toBe(false);
    expect(r.broker.hits).toHaveLength(1);
    expect(r.broker.hits[0].file).toMatch(/index-B1N4K92k\.js$/);
    expect(r.broker.hits[0].markers).toEqual([`${PREFIX}:get`, `${PREFIX}:result`]);
    expect(r.lockfile.ok).toBe(true);
    expect(formatTable(r, root)).toContain("FUND");
  });

  it("prüft auch eine Liste lokal gespeicherter Skriptdateien", () => {
    fixture({ "saved/a.js": CLEAN_JS, "saved/b.js": BROKER_JS, "bun.lock": bunLock("1.169.0") });
    const r = runCheck({ root, files: [join(root, "saved/a.js"), join(root, "saved/b.js")] });
    expect(r.source).toBe("dateien");
    expect(r.broker.hits.map((h: { file: string }) => h.file)).toEqual([join(root, "saved/b.js")]);
  });

  it("meldet ein zu altes @tanstack/react-start in bun.lock", () => {
    fixture({ "dist/a.js": CLEAN_JS, "bun.lock": bunLock("1.168.59") });
    const r = runCheck({ root });
    expect(r.ok).toBe(false);
    expect(r.broker.ok).toBe(true);
    expect(r.lockfile.ok).toBe(false);
    expect(r.lockfile.reason).toContain("1.168.59");
  });

  it("liest package-lock.json, wenn kein bun.lock vorhanden ist", () => {
    fixture({ "dist/a.js": CLEAN_JS, "package-lock.json": npmLock("1.150.0") });
    const r = runCheck({ root });
    expect(r.lockfile.lockfile).toMatch(/package-lock\.json$/);
    expect(r.lockfile.versions).toEqual(["1.150.0"]);
    expect(r.lockfile.ok).toBe(false);
  });

  it("schlägt fehl, wenn das Paket im Lockfile fehlt oder kein Lockfile existiert", () => {
    expect(checkLockfile(join(root, "bun.lock")).reason).toBe("Lockfile fehlt");
    fixture({ "bun.lock": '{ "packages": {} }' });
    expect(checkLockfile(join(root, "bun.lock")).reason).toBe("Paket nicht im Lockfile");
  });

  it("meldet fehlendes dist als Eingabefehler", () => {
    expect(runCheck({ root }).error).toMatch(/existiert nicht/);
  });

  it("nutzt .output, wenn dist fehlt (Nitro-Build)", () => {
    fixture({ ".output/public/assets/x.js": BROKER_JS, "bun.lock": bunLock("1.168.60") });
    const r = runCheck({ root });
    expect(r.source).toBe(join(root, ".output"));
    expect(r.broker.ok).toBe(false);
  });

  it("vergleicht Versionen numerisch und behandelt Vorabversionen als kleiner", () => {
    expect(compareVersions("1.168.60", "1.168.60")).toBe(0);
    expect(compareVersions("1.168.100", "1.168.60")).toBe(1);
    expect(compareVersions("1.168.9", "1.168.60")).toBe(-1);
    expect(compareVersions("1.168.60-beta.1", "1.168.60")).toBe(-1);
    expect(compareVersions("2.0.0", "1.999.999")).toBe(1);
  });

  it("erkennt keine Kennung in unverdächtigem Text", () => {
    expect(scanContent(CLEAN_JS)).toEqual([]);
    expect(scanContent(BROKER_JS)).toHaveLength(2);
  });

  it("Regression: das echte bun.lock erfüllt die Mindestversion", () => {
    const r = checkLockfile(join(REPO_ROOT, "bun.lock"));
    expect(r.versions.length).toBeGreaterThan(0);
    expect(r.ok).toBe(true);
    expect(readLockfileVersions('["@tanstack/react-start@1.2.3"', "bun")).toEqual(["1.2.3"]);
  });
});
