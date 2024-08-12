import { Actions, ActionType, DateType } from "./types";

export const reducer = (state: DateType, action: ActionType) => {
  switch (action.type) {
    case Actions.SET_PRODUCT:
      if (action.payload.cart) {
        const hasProduct = state.cart.filter((item) => {
          return item.product.id === action.payload.cart.product.id;
        });

        if (hasProduct.length > 0) {
          state.cart.forEach((item, index) => {
            if (item.product.id === action.payload.cart.product.id) {
              state.cart[index].qtd += action.payload.cart.qtd;
              state.length = state.cart.length;
            }
          });
        } else {
          state.cart.push(action.payload.cart);
          state.length = state.cart.length;
        }
      }
      return state;

    case Actions.SET_CART:
      if (action.payload.cart.length > 0) {
        state.cart = action.payload.cart;
        state.length = state.cart.length;
      }
      return state;
    default:
      return state;
  }
};
