import { LeaderDetailApp } from "@/components/leaders/LeaderDetailApp";
import { use } from "react";

export default function LeaderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LeaderDetailApp id={id} />;
}


