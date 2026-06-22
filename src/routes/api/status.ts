import { createFileRoute } from "@tanstack/react-router";
import { getStatus } from "../../../backend/services/statusService.mjs";

export const Route = createFileRoute("/api/status")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(getStatus());
      },
    },
  },
});
