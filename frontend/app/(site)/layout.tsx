import type { ReactNode } from "react";
import { SiteProviders } from "@/components/providers";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteProviders>{children}</SiteProviders>;
}
