import Link from "next/link";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  href: string;
}

export const CategoryScrollItem = ({ children, href, ...props }: Props) => {
  return (
    <Link
      href={href}
      className="flex px-4 h-8 cursor-pointer transition-all rounded-full shadow-md shadow-zinc-200 justify-center items-center  ring-1 ring-zinc-50 data-[status=true]:bg-primary  data-[status=true]:ring-1 data-[status=true]:ring-primary"
      {...props}
    >
      <p
        {...props}
        className="transition-all font-medium text-base text-zinc-600 data-[status=true]:text-white"
      >
        {children}
      </p>
    </Link>
  );
};
