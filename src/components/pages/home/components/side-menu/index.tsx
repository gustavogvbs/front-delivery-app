import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

interface Props {
  close: () => void;
}

export function SideMenu({ close, ...props }: Props) {
  return (
    <aside
      className="fixed top-0 transition-transform duration-300 left-[100%] w-full h-full bg-zinc-50 z-50 data-[status=true]:translate-x-[-100%]"
      {...props}
    >
      <div className="container-sm py-6">
        <button onClick={close} className="absolute right-6 top-14">
          <X className="size-8 text-primary" />
        </button>
        <div className="py-8 px-6">
          <h2 className="text-2xl">Gustavo Vilas Boas Silva</h2>
          <p className="text-zinc-400 text-base">Ultimo pedido há 2 semanas</p>
        </div>
        <Separator>
          <Separator className="bg-primary w-[70%]" />
        </Separator>
      </div>
    </aside>
  );
}
