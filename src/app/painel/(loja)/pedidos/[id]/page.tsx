import { OrderDetail } from "@/components/panel/order-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PanelOrderPage({ params }: Props) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
