import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { GroupDashboard } from "@/features/dashboard/group-dashboard";

export const metadata: Metadata = {
  title: "Group | Bible Challenge",
};

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return (
    <AppShell>
      <GroupDashboard groupId={groupId} />
    </AppShell>
  );
}