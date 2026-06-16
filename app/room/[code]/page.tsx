import type { Metadata } from "next";
import { RoomClient } from "@/components/room/RoomClient";

export const metadata: Metadata = {
  title: "대국방",
  robots: { index: false, follow: false },
};

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
