import { createFileRoute } from "@tanstack/react-router";
import { PersonCreateForm } from "@/components/person-form";

export const Route = createFileRoute("/_authenticated/students/create")({
  head: () => ({ meta: [{ title: "Add student — SmartLibrary" }] }),
  component: () => <PersonCreateForm kind="students" />,
});
