import { category } from "@services/category-api";
import { product } from "@services/product-api";
import { tenant } from "@services/tenant-api";

export const api = () => ({
  tenantApi: tenant,
  productApi: product,
  categoryApi: category,
});

// getTenant: (tenantSlug: string): Promise<AxiosResponse> => {
//   return getTenant(tenantSlug);
// },

// getTenantById: (id: string) => {
//   return req.get(`tenants/${id}?populate=categories.products.category`);
// },

// getAllProducts: (tenantSlug: string) => {
//   return getProductsByTenantSlug(tenantSlug);
// },

// getProduct: (id: string): Promise<AxiosResponse> => {
//   return req.get(`products/${id}?populate=category`);
// },

// userRegisterAuth: (data: {
//   email: string;
//   pass: string;
//   user: string;
// }): Promise<UserResponse> => {
//   return req.post('auth/local/register', {
//     username: data.user,
//     email: data.email,
//     password: data.pass
//   });
// },

// userLoginAuth: (email: string, password: string): Promise<UserResponse> => {
//   return req.post('auth/local', {
//     identifier: email,
//     password: password
//   });
// },

// authenticToken: (token: string): Promise<UserType> => {
//   return req.get('users/me?populate=client', {
//     headers: { authorization: `Bearer ${token}` }
//   });
// },

// createClient: (token: string, id: number, userName: string) => {
//   return req.post(
//     'clients?populate=user',
//     {
//       data: {
//         name: userName,
//         user: {
//           connect: [id]
//         }
//       }
//     },
//     {
//       headers: { authorization: `Bearer ${token}` }
//     }
//   );
// },

// putAddress: (token: string, addressId: number, data: AddressType) => {
//   return putAddres(token, addressId, data);
// },

// postNewAddress: (token: string, idUser: number, data: AddressType) => {
//   return postAddress(token, idUser, data);
// },

// getAllAddress: (token: string): Promise<AddressList[] | undefined> => {
//   return getAddress(token);
// },

// deleteAddress: async (token: string, id: number) => {
//   await deleteAddress(token, id);
//   return getAddress(token);
// },

// getAddressById: (
//   token: string,
//   addressId: string
// ): Promise<AxiosResponse> => {
//   return getAddressById(token, addressId);
// },

// getTenantByToken: (token: string): Promise<UserType> => {
//   return req.get('users/me?populate=tenant.categories.products.category', {
//     headers: { authorization: `Bearer ${token}` }
//   });
// },

// handlerStatusTenant: (
//   token: string,
//   id: number,
//   state: boolean
// ): Promise<TenantResponse> => {
//   return req.put(
//     `tenants/${id}`,
//     {
//       data: {
//         isOpen: state
//       }
//     },
//     {
//       headers: { authorization: `Bearer ${token}` }
//     }
//   );
// },

// handleChangeDeliveryTime: (id: number, time: string, token: string) => {
//   return req.put(
//     `tenants/${id}`,
//     {
//       data: {
//         deliveryTime: time
//       }
//     },
//     {
//       headers: { authorization: `Bearer ${token}` }
//     }
//   );
// },

// handleChangePhone: (id: number, phone: string, token: string) => {
//   return req.put(
//     `tenants/${id}`,
//     {
//       data: {
//         phone: phone
//       }
//     },
//     {
//       headers: { authorization: `Bearer ${token}` }
//     }
//   );
// },

// handleDeleteProduct: (id: number, token: string) => {
//   return req.delete(`products/${id}`, {
//     headers: { authorization: `Bearer ${token}` }
//   });
// }
