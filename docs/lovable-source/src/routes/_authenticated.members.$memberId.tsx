import { createFileRoute, useParams } from "@tanstack/react-router";
import { PersonProfile } from "@/components/person-profile";

export const Route = createFileRoute("/_authenticated/members/$memberId")({
  head: () => ({ meta: [{ title: "Member — SmartLibrary" }] }),
  component: () => {
    const { memberId } = useParams({ from: "/_authenticated/members/$memberId" });
    return <PersonProfile kind="members" id={memberId} />;
  },
});
