import {
  ResponseAttributes,
  ResponseData,
  ResponseDataArray,
  ResponseTimestamps,
} from "./contracts-response";

import { ProductResponseAttr } from "./product-response";
import { TenantResponseAttr } from "./tenant-response";

export interface ICategoryRelations {
  tenant?: TenantResponseAttr;
  products?: ProductResponseAttr[];
}

export interface ICategoryData extends ResponseTimestamps, ICategoryRelations {
  name: string;
  slug: string;
}

export type CategoryResponseAttr = ResponseAttributes<ICategoryData>;
export type CategoryResponseArr = ResponseDataArray<ICategoryData>;
export type CategoryResponseData = ResponseData<ICategoryData>;
