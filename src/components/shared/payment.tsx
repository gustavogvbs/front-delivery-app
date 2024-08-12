import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export const Payment = () => {
  return (
    <div className="rounded-md bg-zinc-100 py-8 px-6">
      <div className="pb-6">
        <div className="flex flex-col gap-2 pb-4">
          <div className="flex justify-between">
            <p className="text-base font-semibold">Subtotal</p>
            <p className="text-base font-bold">R$102,00</p>
          </div>
          <div className="flex justify-between">
            <p className="text-base font-semibold">Frete</p>
            <p className="text-base font-bold">--</p>
          </div>
        </div>
        <Separator />
        <div className="pt-4">
          <div className="flex justify-between">
            <p className="text-base font-semibold">Total</p>
            <p className="text-xl text-primary font-bold">R$102,00</p>
          </div>
        </div>
      </div>
      <div>
        <Button type="button" className="w-full py-6 text-base">
          Continuar
        </Button>
      </div>
    </div>
  );
};
