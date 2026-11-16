import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Server-side tests (e.g. the proxy route) run in a Node environment with no DOM: only polyfill when there is one.
const hasDom = typeof window !== "undefined";

afterEach(() => {
  if (hasDom) cleanup();
});

// jsdom lacks matchMedia; Framer Motion's reduced-motion check and our components use it.
if (hasDom && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom lacks ResizeObserver, which Radix primitives (Switch) use for sizing.
if (hasDom && !("ResizeObserver" in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

// jsdom lacks IntersectionObserver, which Framer Motion's whileInView / useInView use.
if (hasDom && !("IntersectionObserver" in globalThis)) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverStub }).IntersectionObserver = IntersectionObserverStub;
}
