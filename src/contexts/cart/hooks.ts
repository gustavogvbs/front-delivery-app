import { useContext } from "react";

import { ICartItem } from "@/schemas/cart-cookies";

import { CartContext } from ".";
import { Actions } from "./types";

export const useCartContext = () => {
  const { state, dispatch } = useContext(CartContext);

  return {
    ...state,
    setProduct: (cart: ICartItem) => {
      dispatch({
        type: Actions.SET_PRODUCT,
        payload: { cart },
      });
    },
    setCart: (cart: ICartItem[]) => {
      dispatch({
        type: Actions.SET_CART,
        payload: { cart },
      });
    },
  };
};
