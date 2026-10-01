import { cookies } from "next/headers";

import CheckoutLayout from "@/components/pages/checkout";
import { api } from "@/lib/api";

interface Props {
  params: Promise<{ tenant: string }>;
}

async function GetTenantInitial(slug: string) {
  const { tenantApi } = api();

  try {
    return await tenantApi.GET(slug);
  } catch (error) {
    console.log(error);
  }
}

export default async function Page({ params }: Props) {
  const { tenant: slug } = await params;
  const { productApi } = api();

  const tenant = await GetTenantInitial(slug);

  const cartCookie = (await cookies()).get("cart")?.value;
  const cart = await productApi.GET_CART(cartCookie, slug);

  if (!tenant || !tenant?.data) return <div>Error</div>;
  return (
    <>
      <CheckoutLayout data={cart} />
    </>
  );
}
