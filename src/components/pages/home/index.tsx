"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { SearchInput } from "@/components/shared/buttons/search-input";
import { Accordion } from "@/components/ui/accordion";
import { TenantResponseData } from "@/contracts/tenant-response";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { MenuIcon } from "lucide-react";

import { Input } from "@components/ui/input";

import CategoryFilter from "./components/category-filter";
import MenuProducts from "./components/menu-products";
import { Loading } from "./components/menu-products/loading";
import { SideMenu } from "./components/side-menu";

interface Props {
  initialData: TenantResponseData;
  slug: string;
}

export const TenantLayout = ({ initialData, slug }: Props) => {
  const [sideBar, setSideBar] = useState(false);

  const { tenantApi, categoryApi } = api();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const { data: tenant } = useQuery({
    queryKey: ["tenant", slug],
    queryFn: () => tenantApi.GET(slug),
    initialData,
  });

  const { data: menu, isLoading } = useQuery({
    queryKey: ["categories", slug],
    queryFn: () => categoryApi.GET_ALL(slug),
  });

  const { categories } = tenant.data.attributes;
  console.log(menu, "products");

  return (
    <>
      <div className="relative z-10">
        <header className="bg-zinc-100 container-sm py-8 shadow-md shadow-stone-200 relative">
          <button
            onClick={() => setSideBar(!sideBar)}
            className="absolute right-6 top-14"
          >
            <MenuIcon className="size-8 text-primary" />
          </button>
          <div className="py-6">
            <h1 className="text-2xl font-semibold">Seja Bem-Vindo 👋</h1>
            <p className="text-base text-zinc-400">O que deseja pra hoje?</p>
          </div>
          <div className="pt-4">
            <SearchInput>
              <Input
                name="search"
                placeholder="Digite o nome do Burger"
                className="input-search"
              />
            </SearchInput>
          </div>
        </header>
        <SideMenu data-status={sideBar} close={() => setSideBar(!sideBar)} />
        <main className="pb-8">
          <section id="category-scroll">
            <CategoryFilter data={categories} />
          </section>
          <section>
            <Accordion type="single" collapsible className="w-full">
              {isLoading && <Loading />}

              {menu &&
                menu.data.map((category) => {
                  const { products, slug } = category.attributes;

                  return products &&
                    products.length > 0 &&
                    (categoryFilter === slug ||
                      typeof categoryFilter !== "string") ? (
                    <MenuProducts
                      key={`category-wrapper-${slug}`}
                      title={category.attributes.name}
                      data={category.attributes.products}
                    />
                  ) : null;
                })}
            </Accordion>
          </section>
        </main>
      </div>
    </>
  );
};
