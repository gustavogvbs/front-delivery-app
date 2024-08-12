import { Formatter } from "@/lib/formatter";
import { Minus, Plus } from "lucide-react";

interface Props {
  handlePlus: () => void;
  handleMinus: () => void;
  value: number;
}

export const Counter = ({ handleMinus, handlePlus, value }: Props) => {
  const formatter = Formatter();

  return (
    <div className="inline-flex rounded-sm overflow-hidden">
      <button
        disabled={value <= 1}
        onClick={handleMinus}
        className="bg-zinc-200 w-8 h-8 flex justify-center items-center"
      >
        <Minus className="size-4 text-zinc-500" />
      </button>
      <div className="w-8 h-8 flex justify-center items-center border ">
        <p className="text-sm">{formatter.formatCounter(value)}</p>
      </div>
      <button
        disabled={value >= 10}
        onClick={handlePlus}
        className="bg-primary w-8 h-8 flex justify-center items-center"
      >
        <Plus className="size-4 text-zinc-50" />
      </button>
    </div>
  );
};
