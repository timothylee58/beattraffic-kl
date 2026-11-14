import { Train } from "lucide-react";
import { Replanner } from "@/components/replanner";

export default function Page() {
  return (
    <>
      <header className="border-b">
        <div className="container flex h-14 items-center gap-2">
          <Train className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="text-lg font-semibold">Disruption re-planner</h1>
        </div>
      </header>
      <Replanner />
    </>
  );
}
