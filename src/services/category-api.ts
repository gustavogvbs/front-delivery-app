import req from "@config/request-handle";

import { CategoryResponseArr } from "@contracts/category-response";

export const category = {
  async GET_ALL(slug: string): Promise<CategoryResponseArr> {
    return await req.get(`/categories/${slug}?populate=products`);
  },
};
