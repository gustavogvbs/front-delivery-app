import { Suspense } from "react";

import { NewOrderView } from "@/components/panel/new-order-view";

export default function Page() {
  return (
    <Suspense>
      <NewOrderView />
    </Suspense>
  );
}
