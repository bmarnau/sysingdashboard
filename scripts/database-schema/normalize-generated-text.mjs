export function normalizeGeneratedText(input) {
  const normalized = input
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");

  return `${normalized}\n`;
}
