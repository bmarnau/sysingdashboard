import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PermissionGate } from "@/components/PermissionGate";
import { PersonResponsibilityView } from "@/components/avkk/person/PersonResponsibilityView";
import { CustomerPageShell } from "@/components/customers/CustomerPageShell";
import { WorkPackageWorkView } from "@/components/avkk/work/WorkPackageWorkView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/verantwortungen")({
  validateSearch: z.object({ tab: z.literal("workpackages").optional().catch(undefined) }),
  head: () => ({ meta: [{ title: "Verantwortungen - SysIng Dashboard" }] }),
  component: ResponsibilitiesPage,
});

function ResponsibilitiesPage() {
  const { tab } = Route.useSearch();
  return (
    <PermissionGate
      permission="avkk.management.view"
      fallback={<p role="alert">Keine Berechtigung für die Verantwortungsansicht.</p>}
    >
      <CustomerPageShell sectionTitle="Verantwortungen">
        <div className="mx-auto w-full max-w-7xl">
          <Tabs key={tab ?? "person"} defaultValue={tab ?? "person"} className="min-w-0 space-y-4">
            <TabsList aria-label="Verantwortungssichten">
              <TabsTrigger value="person">Personen</TabsTrigger>
              <TabsTrigger value="workpackages">Arbeitspakete</TabsTrigger>
            </TabsList>
            <TabsContent value="person">
              <PersonResponsibilityView />
            </TabsContent>
            <TabsContent value="workpackages">
              <WorkPackageWorkView />
            </TabsContent>
          </Tabs>
        </div>
      </CustomerPageShell>
    </PermissionGate>
  );
}
