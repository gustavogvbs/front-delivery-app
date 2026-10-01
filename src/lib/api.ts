import { category } from "@services/category-api";
import { product } from "@services/product-api";
import { tenant } from "@services/tenant-api";

export const api = () => ({
  tenantApi: tenant,
  productApi: product,
  categoryApi: category,
});
