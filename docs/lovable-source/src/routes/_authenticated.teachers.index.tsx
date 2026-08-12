import { createFileRoute } from "@tanstack/react-router";
import { PeopleList } from "@/components/people-list";

export const Route = createFileRoute("/_authenticated/teachers/")({
  head: () => ({ meta: [{ title: "Teachers — SmartLibrary" }] }),
  component: () => <PeopleList kind="teachers" />,
});
