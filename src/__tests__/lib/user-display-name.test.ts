import { describe, it, expect } from "vitest";
import {
  resolveDisplayName,
  resolveProfileDisplayName,
  greetingNameOf,
  greetingFirstNameOf,
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

describe("resolveProfileDisplayName", () => {
  it("normalisiert den gepflegten Vornamen für die Profilanzeige", () => {
    expect(
      resolveProfileDisplayName({
        displayName: "petra Marnau",
        firstName: "petra",
        lastName: "Marnau",
      }),
    ).toBe("Petra Marnau");
  });

  it("erhält die gespeicherte Eigenschreibweise des Nachnamens", () => {
    expect(
      resolveProfileDisplayName({
        displayName: "petra von Überlingen-Schmidt",
        firstName: "petra",
        lastName: "von Überlingen-Schmidt",
      }),
    ).toBe("Petra von Überlingen-Schmidt");
    expect(
      resolveProfileDisplayName({
        displayName: "alex McDonald",
        firstName: "alex",
        lastName: "McDonald",
      }),
    ).toBe("Alex McDonald");
  });

  it("nutzt bei unvollständigen Profilnamen den bestehenden sicheren Fallback", () => {
    expect(resolveProfileDisplayName({ displayName: "Demo Sam Infrastruktur" })).toBe(
      "Demo Sam Infrastruktur",
    );
    expect(resolveProfileDisplayName({ displayName: "sam@example.org" })).toBe(
      NEUTRAL_DISPLAY_NAME,
    );
  });
});

describe("greetingFirstNameOf", () => {
  it("bevorzugt firstName unverändert und normalisiert Schreibweise", () => {
    expect(greetingFirstNameOf({ firstName: "alex" })).toBe("Alex");
    expect(greetingFirstNameOf({ firstName: "ALEX" })).toBe("Alex");
    expect(greetingFirstNameOf({ firstName: "Alex" })).toBe("Alex");
    expect(greetingFirstNameOf({ firstName: "aLeX" })).toBe("Alex");
  });

  it("trimmt firstName und normalisiert Mehrfachleerzeichen", () => {
    expect(greetingFirstNameOf({ firstName: "  alex  " })).toBe("Alex");
  });

  it("nutzt erstes Wort des Display Name, wenn firstName fehlt", () => {
    expect(greetingFirstNameOf({ displayName: "alex marnau" })).toBe("Alex");
    expect(greetingFirstNameOf({ displayName: "ALEX MARNAU" })).toBe("Alex");
    expect(greetingFirstNameOf({ displayName: "Alex Marnau" })).toBe("Alex");
    expect(greetingFirstNameOf({ displayName: "aLeX mArNaU" })).toBe("Alex");
  });

  it("ignoriert E-Mail-artige Display Names", () => {
    expect(greetingFirstNameOf({ displayName: "alex@example.org" })).toBe(NEUTRAL_DISPLAY_NAME);
  });

  it("fällt auf Auth-Metadaten zurück", () => {
    expect(greetingFirstNameOf({ metadata: { given_name: "alex" } })).toBe("Alex");
    expect(greetingFirstNameOf({ metadata: { first_name: "ALEX" } })).toBe("Alex");
    expect(greetingFirstNameOf({ metadata: { full_name: "alex marnau" } })).toBe("Alex");
    expect(greetingFirstNameOf({ metadata: { name: "aLeX mArNaU" } })).toBe("Alex");
  });

  it("fällt auf E-Mail-Local-Part zurück, wenn nichts anderes vorhanden ist", () => {
    expect(greetingFirstNameOf({ email: "alex@example.org" })).toBe("Alex");
    expect(greetingFirstNameOf({ email: "ALEX@EXAMPLE.ORG" })).toBe("Alex");
    expect(greetingFirstNameOf({ email: "alex.marnau@example.org" })).toBe("Alex.marnau");
  });

  it("zeigt niemals die vollständige E-Mail-Adresse", () => {
    expect(greetingFirstNameOf({ email: "alex@example.org" })).not.toContain("@example.org");
    expect(greetingFirstNameOf({ email: "alex@example.org" })).toBe("Alex");
  });

  it("liefert neutralen Fallback, wenn keine Quelle vorhanden ist", () => {
    expect(greetingFirstNameOf({})).toBe(NEUTRAL_DISPLAY_NAME);
    expect(greetingFirstNameOf({ displayName: "", firstName: "", lastName: "" })).toBe(
      NEUTRAL_DISPLAY_NAME,
    );
  });

  it("erhält korrekte Eigenschreibweisen zusammengesetzter Namen", () => {
    // Bereits korrekt geschriebene Namen werden nicht zerstört.
    expect(greetingFirstNameOf({ firstName: "Jörg-Michael" })).toBe("Jörg-Michael");
    expect(greetingFirstNameOf({ firstName: "Dr. Änne" })).toBe("Dr. Änne");
    // Einheitlich falsche Schreibweise wird korrigiert, aber Bindestriche bleiben erhalten.
    expect(greetingFirstNameOf({ firstName: "JÖRG-MICHAEL" })).toBe("Jörg-Michael");
  });

  it("gibt firstName Vorrang vor Display Name und E-Mail", () => {
    expect(
      greetingFirstNameOf({
        firstName: "alex",
        displayName: "Sam Infrastruktur",
        email: "sam@example.org",
      }),
    ).toBe("Alex");
  });
});
