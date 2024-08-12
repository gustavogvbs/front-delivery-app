import { Skeleton } from "@/components/ui/skeleton";

export const Loading = () => {
  return (
    <div className="w-full flex flex-col gap-2 container-sm py-4">
      <div className="py-4">
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
        <Skeleton className="h-[116px] w-full" />
      </div>
    </div>
  );
};
