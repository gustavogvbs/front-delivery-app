import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  icon: ReactNode;
}

export const WrapperInput = ({ children, icon }: Props) => {
  return (
    <label
      className="p-1.5 h-11 bg-zinc-100 rounded-md flex gap-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary"
      id="search"
    >
      <div className="size-8 h-full min-w-9 flex justify-end items-center rounded-sm font-bold text-xl text-zinc-600">
        {icon}
      </div>
      {children}
    </label>
  );
};
