import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { GroupsPage } from "@/features/dashboard/groups-page";

export const metadata: Metadata = {
  title: "Groups | Bible Challenge",
};

export default function GroupPage() {
  return (
    <AppShell>
      <GroupsPage />
    </AppShell>
  );
}