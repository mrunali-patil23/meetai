/**
 * Tests for src/app/(auth)/layout.tsx
 *
 * Detected/Assumed testing library and framework:
 * - Jest with @testing-library/react and @testing-library/jest-dom (typical for Next.js projects).
 * If this repository uses Vitest, these tests should still work with minor config adjustments.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Import the layout component under test.
// If this repo's component resides at src/app/(auth)/layout.tsx, this resolves to "./layout".
import Layout from "./layout";

describe("Auth Layout", () => {
  it("renders without crashing and mounts required structure", () => {
    render(
      <Layout>
        <div data-testid="child">Hello</div>
      </Layout>
    );

    // Verify children render
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();

    // Structural checks: two nested divs, outer with utility classes, inner as container
    const outer = screen.getByTestId("auth-layout-outer");
    const inner = screen.getByTestId("auth-layout-inner");

    expect(outer).toBeInTheDocument();
    expect(inner).toBeInTheDocument();

    // Class validation: ensure essential utility classes exist (not exhaustive to allow refactors)
    expect(outer).toHaveClass("bg-muted");
    expect(outer.className).toMatch(/\bmin-h-svh\b/);
    expect(outer.className).toMatch(/\bflex-col\b/);
    expect(outer.className).toMatch(/\bitems-center\b/);
    expect(outer.className).toMatch(/\bjustify-center\b/);

    // Inner width constraints
    expect(inner.className).toMatch(/\bmax-w-sm\b/);
    expect(inner.className).toMatch(/\bmd:max-w-3xl\b/);
  });

  it("supports different children types such as string, React elements, and fragments", () => {
    const { rerender } = render(<Layout>{"Plain string child"}</Layout>);
    expect(screen.getByText("Plain string child")).toBeInTheDocument();

    rerender(
      <Layout>
        <>
          <span data-testid="frag-1">A</span>
          <span data-testid="frag-2">B</span>
        </>
      </Layout>
    );
    expect(screen.getByTestId("frag-1")).toHaveTextContent("A");
    expect(screen.getByTestId("frag-2")).toHaveTextContent("B");
  });

  it("renders empty inner container gracefully when children is null", () => {
    // @ts-expect-error Testing runtime behavior with null children.
    const { container } = render(<Layout>{null}</Layout>);
    const inner = screen.getByTestId("auth-layout-inner");
    expect(inner).toBeInTheDocument();
    // no content inside
    expect(inner.textContent).toBe("");
    // Still has the expected classes on outer container
    const outer = screen.getByTestId("auth-layout-outer");
    expect(outer).toHaveClass("bg-muted");
  });
});