import { createFileRoute, useParams } from "@tanstack/react-router";
import { PersonProfile } from "@/components/person-profile";

export const Route = createFileRoute("/_authenticated/teachers/$teacherId")({
  head: () => ({ meta: [{ title: "Teacher — SmartLibrary" }] }),
  component: () => {
    const { teacherId } = useParams({ from: "/_authenticated/teachers/$teacherId" });
    return <PersonProfile kind="teachers" id={teacherId} />;
  },
});
