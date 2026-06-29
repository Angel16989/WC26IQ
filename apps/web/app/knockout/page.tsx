import { Suspense } from "react";
import { KnockoutContent } from "./knockout-content";

export default function KnockoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center space-y-3">
            <div
              className="mx-auto h-12 w-12 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--secondary)", borderTopColor: "transparent" }}
            />
            <p className="wc-data-label text-xs">Computing tournament scenarios…</p>
          </div>
        </div>
      }
    >
      <KnockoutContent />
    </Suspense>
  );
}
