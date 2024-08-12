"use server";

import { cookies } from "next/headers";

import CheckoutLayout from "@/components/pages/checkout";
import { TenantLayout } from "@/components/pages/home";
import { CartPopup } from "@/components/pages/home/components/cart";
import { api } from "@/lib/api";

import { getCookie } from "cookies-next";

interface Props {
  params: {
    tenant: string;
  };
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
  const { productApi } = api();

  const tenant = await GetTenantInitial(params.tenant);

  const cartCookie = getCookie("cart", { cookies });
  const cart = await productApi.GET_CART(cartCookie, params.tenant);

  if (!tenant || !tenant?.data) return <div>Error</div>;
  return (
    <>
      <CheckoutLayout data={cart} />
    </>
  );
}
