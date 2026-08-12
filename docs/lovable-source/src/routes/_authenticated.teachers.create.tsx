import { createFileRoute } from "@tanstack/react-router";
import { PersonCreateForm } from "@/components/person-form";

export const Route = createFileRoute("/_authenticated/teachers/create")({
  head: () => ({ meta: [{ title: "Add teacher — SmartLibrary" }] }),
  component: () => <PersonCreateForm kind="teachers" />,
});
