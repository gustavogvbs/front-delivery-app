import { ReactNode } from "react";

import { Search } from "lucide-react";

interface Props {
  children: ReactNode;
}

export const SearchInput = ({ children }: Props) => {
  return (
    <label
      className="p-1.5 bg-white rounded-md flex gap-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary"
      id="search"
    >
      <div className="size-9 min-w-9 flex justify-center items-center bg-zinc-100 rounded-sm">
        <Search className="size-5 text-primary" />
      </div>
      {children}
    </label>
  );
};
