import {
  ResponseAttributes,
  ResponseData,
  ResponseDataArray,
  ResponseTimestamps
} from './contracts-response';

import { CategoryResponseAttr } from './category-response';

export interface ITenantRelations {
  categories: CategoryResponseAttr[];
}

export interface ITenantResponse extends ResponseTimestamps, ITenantRelations {
  name: string;
  city: string;
  approved: boolean;
  phone: string;
  primaryColor: string;
  slug: string;
}

export type TenantResponseAttr = ResponseAttributes<ITenantResponse>;
export type TenantResponseArr = ResponseDataArray<ITenantResponse>;
export type TenantResponseData = ResponseData<ITenantResponse>;
