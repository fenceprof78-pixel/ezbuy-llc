import { Suspense } from "react";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-slate-400">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          Loading reports…
        </div>
      }
    >
      <ReportsClient />
    </Suspense>
  );
}
