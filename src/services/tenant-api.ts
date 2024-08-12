import req from "@config/request-handle";

import { TenantResponseData } from "@contracts/tenant-response";

export const tenant = {
  async GET(slug: string): Promise<TenantResponseData> {
    return await req.get(`/tenant/${slug}?populate=categories`);
  },
};
