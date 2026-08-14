import { describe, it, expect } from "vitest";
import {
  resolveDisplayName,
  greetingNameOf,
  looksLikeEmail,
  NEUTRAL_DISPLAY_NAME,
} from "@/lib/user-display-name";

describe("resolveDisplayName", () => {
  it("bevorzugt den fachlichen Anzeigenamen aus dem Profil", () => {
    expect(
      resolveDisplayName({
        displayName: "Demo Sam Infrastruktur",
        firstName: "Sam",
        lastName: "Infrastruktur",
        metadata: { full_name: "Ignoriert" },
      }),
    ).toBe("Demo Sam Infrastruktur");
  });

  it("verwendet niemals eine E-Mail-Adresse als Anzeigenamen", () => {
    expect(resolveDisplayName({ displayName: "sam@example.org" })).toBe(NEUTRAL_DISPLAY_NAME);
  });

  it("fällt auf Vor- und Nachname zurück", () => {
    expect(
      resolveDisplayName({ displayName: "", firstName: "Jörg", lastName: "Müller-Groß" }),
    ).toBe("Jörg Müller-Groß");
  });

  it("nutzt Auth-Metadaten, wenn das Profil leer ist", () => {
    expect(resolveDisplayName({ metadata: { full_name: "Petra Projektleitung" } })).toBe(
      "Petra Projektleitung",
    );
    expect(resolveDisplayName({ metadata: { name: "Georg Geschäftsführung" } })).toBe(
      "Georg Geschäftsführung",
    );
    expect(
      resolveDisplayName({ metadata: { given_name: "Alex", family_name: "Systemtechnik" } }),
    ).toBe("Alex Systemtechnik");
  });

  it("ignoriert E-Mail-artige Metadaten", () => {
    expect(resolveDisplayName({ metadata: { full_name: "user@example.org" } })).toBe(
      NEUTRAL_DISPLAY_NAME,
    );
  });

  it("liefert einen neutralen Fallback ohne jede Quelle", () => {
    expect(resolveDisplayName({})).toBe(NEUTRAL_DISPLAY_NAME);
    expect(resolveDisplayName({ displayName: "   ", firstName: " ", lastName: null })).toBe(
      NEUTRAL_DISPLAY_NAME,
    );
  });

  it("normalisiert überflüssige Leerzeichen und erhält lange Namen", () => {
    expect(resolveDisplayName({ displayName: "  Dr.   Änne   von Überlingen-Schmidt " })).toBe(
      "Dr. Änne von Überlingen-Schmidt",
    );
  });

  it("greetingNameOf nutzt den vollständigen Namen", () => {
    expect(greetingNameOf({ displayName: "Demo Sam Infrastruktur" })).toBe(
      "Demo Sam Infrastruktur",
    );
  });

  it("looksLikeEmail erkennt Adressen", () => {
    expect(looksLikeEmail("a@b.de")).toBe(true);
    expect(looksLikeEmail("Sam Infrastruktur")).toBe(false);
  });
});
