import { createFileRoute } from "@tanstack/react-router";
import { PermissionGate } from "@/components/PermissionGate";
import { PersonResponsibilityView } from "@/components/avkk/person/PersonResponsibilityView";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";

export const Route = createFileRoute("/_authenticated/verantwortungen")({
  head: () => ({ meta: [{ title: "Verantwortungen - Engineer Console" }] }),
  component: ResponsibilitiesPage,
});

function ResponsibilitiesPage() {
  return (
    <PermissionGate
      permission="avkk.management.view"
      fallback={<p role="alert">Keine Berechtigung für die Verantwortungsansicht.</p>}
    >
      <CustomerPageShell sectionTitle="Verantwortungen">
        <div className="mx-auto w-full max-w-7xl">
          <PersonResponsibilityView />
        </div>
      </CustomerPageShell>
    </PermissionGate>
  );
}
