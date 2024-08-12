import { createContext, useReducer } from "react";

import { reducer } from "./reducer";
import { ContextType, DateType, Providertype } from "./types";

export { useCartContext } from "./hooks";

const initialState: DateType = {
  cart: [],
  length: 0,
};

export const CartContext = createContext<ContextType>({
  state: initialState,
  dispatch: () => {},
});

export const Provider = ({ children }: Providertype) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};
