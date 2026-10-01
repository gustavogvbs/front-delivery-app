export const Formatter = () => ({
  // valores chegam em centavos (inteiro)
  formatPrice: (cents: number) => {
    return (cents / 100).toLocaleString("pt-br", {
      minimumFractionDigits: 2,
      style: "currency",
      currency: "BRL",
    });
  },

  formatCounter: (count: number) => {
    const num = count.toString();
    let res = null;
    num.length == 1 ? (res = `0${num}`) : (res = num);

    return res;
  },
});
