/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dispatch, ReactNode } from "react";

import { ICartItem } from "@/schemas/cart-cookies";

export type DateType = {
  cart: ICartItem[];
  length: number;
};

export type ActionType = {
  type: Actions;
  payload?: any;
};

export type ContextType = {
  state: DateType;
  dispatch: Dispatch<ActionType>;
};

export type Providertype = {
  children: ReactNode;
};

export enum Actions {
  SET_PRODUCT,
  SET_CART,
}
