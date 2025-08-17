/**
 * Tests for src/app/(auth)/sign-in/page.tsx
 *
 * Framework note:
 * - This test suite is designed for Jest or Vitest with React Testing Library (RTL).
 * - It uses @testing-library/react for rendering and @testing-library/jest-dom for assertions where available.
 * - If Vitest is used, ensure setup includes jsdom and @testing-library/jest-dom in the global setup.
 *
 * Coverage goals:
 * - Validate that the page's default export renders the SignInView.
 * - Ensure SignInView is invoked exactly once and receives expected props (currently none).
 * - Handle edge cases by mocking SignInView to throw and verifying failure handling.
 * - Provide a snapshot of minimal render to detect regressions.
 */

import React from "react";

// In Next.js app router, the page component should be default export from ./page
// We import as PageComponent to avoid name conflicts with global Page types
import PageComponent from "./page";

// We will mock the SignInView module to control its output and interactions
// The source page imports: import { SignInView } from "@/modules/auth/ui/views/sign-in-view";
// We mock using the same module specifier path to intercept usage.
const mockRenderId = "sign-in-view-mock";
vi.mock("@/modules/auth/ui/views/sign-in-view", () => {
  const React = require("react");
  return {
    __esModule: true,
    // Provide a functional mock component that renders a sentinel element
    SignInView: ({ children, ...restProps }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Expose props as data attributes for potential assertions
      return React.createElement(
        "div",
        {
          "data-testid": mockRenderId,
          // leak prop names (if any appear later) for future-proofing
          "data-props": JSON.stringify(Object.keys(restProps || {})),
        },
        children
      );
    },
  };
});

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("Sign-In Page (src/app/(auth)/sign-in/page.tsx)", () => {
  it("renders without crashing and includes the SignInView", () => {
    render(React.createElement(PageComponent));
    const el = screen.getByTestId(mockRenderId);
    expect(el).toBeInTheDocument();
  });

  it("renders the SignInView exactly once", () => {
    const { container } = render(React.createElement(PageComponent));
    const instances = container.querySelectorAll(`[data-testid="${mockRenderId}"]`);
    expect(instances.length).toBe(1);
  });

  it("does not pass unexpected props to SignInView (forward-compat check)", () => {
    render(React.createElement(PageComponent));
    const el = screen.getByTestId(mockRenderId);
    // Currently, page.tsx renders <SignInView /> with no props.
    // The mock exposes prop keys via data-props attribute.
    const propKeys = el.getAttribute("data-props");
    expect(propKeys).toBe("[]");
  });

  it("produces a stable minimal snapshot", () => {
    const { asFragment } = render(React.createElement(PageComponent));
    expect(asFragment()).toMatchSnapshot();
  });

  it("propagates errors thrown by SignInView to the test environment (edge case)", async () => {
    // Remock SignInView to throw during render to validate behavior.
    // Note: dynamic re-mock works in Vitest/Jest as long as we re-import the page afterwards or
    // use jest.isolateModules/vi.isolateModules; we will isolate to ensure the page rebinds the import.
    vi.doMock("@/modules/auth/ui/views/sign-in-view", () => {
      return {
        __esModule: true,
        SignInView: () => {
          throw new Error("Boom");
        },
      };
    });

    // Isolate the module import to pick up the new mock definition
    const { default: IsolatedPage } = await vi.importActual<typeof import("./page")>("./page");

    // Render and assert that an error is thrown. In a real app, boundary may catch this, but the bare component will throw.
    expect(() => render(React.createElement(IsolatedPage))).toThrowError(/Boom/);

    // Restore original mock for subsequent tests
    vi.doUnmock("@/modules/auth/ui/views/sign-in-view");
  });
});