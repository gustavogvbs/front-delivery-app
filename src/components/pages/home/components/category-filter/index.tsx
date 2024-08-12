"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { CategoryResponseAttr } from "@/contracts/category-response";

import { CategoryScrollItem } from "./scroll-item";

interface Props {
  data: CategoryResponseAttr[];
}

export default function CategoryFilter({ data }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get("category");

  const createQueryString = useCallback(
    (filter: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", filter);

      return params.toString();
    },
    [searchParams],
  );

  const handleFilter = (filter: string) => {
    return pathname + "?" + createQueryString(filter);
  };

  return (
    <div className="w-full flex gap-2 overflow-scroll py-4 px-6 scrollbar-hide">
      <CategoryScrollItem
        href={pathname}
        data-status={typeof filter !== "string" || filter === ""}
      >
        Tudo
      </CategoryScrollItem>
      {data.map((item) => {
        return (
          <CategoryScrollItem
            href={handleFilter(item.attributes.slug)}
            key={item.id}
            data-status={filter === item.attributes.slug}
          >
            {item.attributes.name}
          </CategoryScrollItem>
        );
      })}
    </div>
  );
}
