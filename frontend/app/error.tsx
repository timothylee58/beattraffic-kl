"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="container py-16 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted-foreground">The page hit an unexpected error.</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
