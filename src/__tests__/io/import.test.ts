// Re-Export der bestehenden Integrations-Suite unter neuem Modus `io`.
// Der Original-Test bleibt vorerst unter integration/ liegen, damit
// existierende CI-Runs nicht brechen.
import "../env/test-instance";
export * from "../integration/import.test";
