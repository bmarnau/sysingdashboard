import { describe, expect, it } from "vitest";
import "../env/test-instance";
import { azureService } from "@/lib/azure/azure-service";
import { assertAzureMock } from "../env/test-instance";

describe("azureService (Mock-Modus)", () => {
  it("should_returnNotImplementedStub_when_testConnectionCalled", async () => {
    assertAzureMock();
    const res = await azureService.testConnection("actor:test");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/nicht angebunden|not-implemented|Backend/i);
  });

  it("should_returnPreviewShape_when_fetchImportPreviewCalled", async () => {
    const preview = await azureService.fetchImportPreview();
    expect(preview.counts).toEqual(
      expect.objectContaining({ toCreate: expect.any(Number), toUpdate: expect.any(Number) }),
    );
  });
});
