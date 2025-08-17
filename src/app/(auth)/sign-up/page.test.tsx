// Tests for src/app/(auth)/sign-up/page.tsx
// Note: Framework: Jest + React Testing Library (expected). If repository uses Vitest, adapt import from 'vitest' and setup accordingly.

import React from "react";
import { render, screen } from "@testing-library/react";

// We import the default export Page from the page file if it exists,
// but since this file path is named *.test.tsx, we instead dynamically import Page from sibling "page" module.
let Page: React.ComponentType;

beforeAll(async () => {
  // Dynamically import the actual page module to avoid ESM/CJS issues in test environments.
  // Adjust the path if the repository uses a different extension or directory layout.
  const mod = await import("./page");
  Page = (mod as any).default ?? (mod as any).Page ?? mod;
});

// Mock the SignUpView to keep the test focused and stable.
jest.mock("@/modules/auth/ui/views/sign-up-view", () => {
  const React = require("react");
  const Mock = () => React.createElement("div", { "data-testid": "sign-up-view-mock" }, "SignUpViewMock");
  return { SignUpView: Mock, __esModule: true };
});

describe("SignUp Page", () => {
  test("renders without crashing and includes the SignUpView", async () => {
    render(<Page />);
    const el = await screen.findByTestId("sign-up-view-mock");
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("SignUpViewMock");
  });

  test("does not render unexpected content besides SignUpView container", async () => {
    render(<Page />);
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("sign-up-view-mock")).toBeVisible();
  });

  test("gracefully handles SignUpView throwing during render (boundary assumptions)", async () => {
    // Re-mock SignUpView to throw to simulate failure conditions.
    jest.isolateModules(() => {
      jest.doMock("@/modules/auth/ui/views/sign-up-view", () => {
        const React = require("react");
        const Boom = () => {
          throw new Error("render boom");
        };
        return { SignUpView: Boom, __esModule: true };
      });
    });

    const modPromise = import("./page");
    const mod = await modPromise;
    const FaultyPage = (mod as any).default ?? (mod as any).Page ?? mod;

    // Rendering a server component that throws typically bubbles up; we
    // assert that it throws. If the project has an error boundary/wrapper,
    // adapt this expectation accordingly.
    expect(() => render(<FaultyPage />)).toThrow();
  });
});

// --- Appended Tests ---
// Framework: Jest + React Testing Library (expected; adapt to Vitest if repo uses it)


// Mock the SignUpView dependency to focus on page composition contract.
jest.mock("@/modules/auth/ui/views/sign-up-view", () => {
  const React = require("react");
  const Mock = () => React.createElement("div", { "data-testid": "sign-up-view-mock" }, "SignUpViewMock");
  return { SignUpView: Mock, __esModule: true };
});

describe("SignUp Page (composition)", () => {
  let Page: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("./page");
    Page = (mod as any).default ?? (mod as any).Page ?? mod;
  });

  test("renders SignUpView", async () => {
    render(<Page />);
    expect(await screen.findByTestId("sign-up-view-mock")).toBeInTheDocument();
  });

  test("renders only expected mocked content by default", async () => {
    render(<Page />);
    const el = await screen.findByTestId("sign-up-view-mock");
    expect(el).toHaveTextContent("SignUpViewMock");
    expect(screen.queryByText(/unexpected/i)).not.toBeInTheDocument();
  });

  test("throws if SignUpView fails during render", async () => {
    jest.isolateModules(() => {
      jest.doMock("@/modules/auth/ui/views/sign-up-view", () => {
        const React = require("react");
        const Boom = () => {
          throw new Error("render failure");
        };
        return { SignUpView: Boom, __esModule: true };
      });
    });
    const mod = await import("./page");
    const FaultyPage = (mod as any).default ?? (mod as any).Page ?? mod;
    expect(() => render(<FaultyPage />)).toThrow();
  });
});