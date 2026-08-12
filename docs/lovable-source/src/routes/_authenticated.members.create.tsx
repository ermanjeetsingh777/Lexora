import { createFileRoute } from "@tanstack/react-router";
import { PersonCreateForm } from "@/components/person-form";

export const Route = createFileRoute("/_authenticated/members/create")({
  head: () => ({ meta: [{ title: "Add member — SmartLibrary" }] }),
  component: () => <PersonCreateForm kind="members" />,
});
