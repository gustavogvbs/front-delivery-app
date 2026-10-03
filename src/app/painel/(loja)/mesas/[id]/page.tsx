import { TabDetail } from "@/components/panel/tab-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PanelTabPage({ params }: Props) {
  const { id } = await params;
  return <TabDetail id={id} />;
}
