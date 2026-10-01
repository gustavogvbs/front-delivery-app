import {
  ResponseAttributes,
  ResponseData,
  ResponseDataArray,
  ResponseTimestamps,
} from "./contracts-response";

import { CategoryResponseAttr } from "./category-response";
import { IImageData } from "./image-response";
import { TenantResponseAttr } from "./tenant-response";

export interface IProductRelations {
  tenant?: TenantResponseAttr;
  category?: CategoryResponseAttr;
}

export interface IProductData extends ResponseTimestamps, IProductRelations {
  name: string;
  slug: string;
  image: IImageData | null;
  priceCents: number;
  isAvailable: boolean;
  description: string;
}

export type ProductResponseAttr = ResponseAttributes<IProductData>;
export type ProductResponseArr = ResponseDataArray<IProductData>;
export type ProductResponseData = ResponseData<IProductData>;
