/**
 * Test framework: Jest + React Testing Library
 *
 * If your project uses Vitest, replace:
 *   - jest.spyOn with vi.spyOn
 *   - jest.fn with vi.fn
 *   - describe/it from 'vitest'
 * and ensure appropriate setupFiles are configured.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";

// We will mock the auth client module used by the component
// The module path is "@/lib/auth-client" as per the component's imports.
const mockUseSession = jest.fn();
const mockSignOut = jest.fn();
const mockSignUpEmail = jest.fn();
const mockSignInEmail = jest.fn();

jest.mock("@/lib/auth-client", () => {
  return {
    __esModule: true,
    authClient: {
      useSession: () => mockUseSession(),
      signOut: mockSignOut,
      signUp: {
        email: mockSignUpEmail,
      },
      signIn: {
        email: mockSignInEmail,
      },
    },
  };
});

// Mock the UI components minimally to avoid external behavior affecting tests.
// If your project prefers using real components, remove these mocks.
jest.mock("@/components/ui/input", () => {
  return {
    __esModule: true,
    Input: ({ placeholder, type = "text", value, onChange }: any) => {
      return (
        <input
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={onChange}
          aria-label={placeholder}
        />
      );
    },
  };
});

jest.mock("@/components/ui/button", () => {
  return {
    __esModule: true,
    Button: ({ children, onClick }: any) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

// Import the component under test after mocks
// Adjust the import path if your tsconfig baseUrl or module resolution differs.
import Home from "./page";

describe("Home page (auth flows)", () => {
  const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    alertSpy.mockRestore();
  });

  it("renders login state when a session exists and allows sign out", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Jane Doe", email: "jane@example.com" } },
    });

    render(<Home />);

    expect(
      screen.getByText(/Logged in as Jane Doe/i)
    ).toBeInTheDocument();

    // Only one Sign Out button should be visible in session state
    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Ensure auth forms are not present when session is present
    expect(screen.queryByRole("button", { name: /create user/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /login/i })).not.toBeInTheDocument();
  });

  it("renders unauthenticated view when no session exists", () => {
    mockUseSession.mockReturnValue({ data: null });

    render(<Home />);

    // Both flows are visible
    expect(screen.getByRole("button", { name: /create user/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();

    // Inputs for both flows should be present (two emails, two passwords, one name)
    const nameInput = screen.getByPlaceholderText(/name/i);
    expect(nameInput).toBeInTheDocument();

    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    expect(emailInputs).toHaveLength(2);
    expect(passwordInputs).toHaveLength(2);
  });

  it("signs up a user successfully and alerts Success", () => {
    mockUseSession.mockReturnValue({ data: null });

    // Mock signUp.email to invoke onSuccess callback
    mockSignUpEmail.mockImplementation((payload, opts) => {
      // Simulate async-like success scenario by directly calling onSuccess
      if (opts?.onSuccess) opts.onSuccess();
    });

    render(<Home />);

    const nameInput = screen.getByPlaceholderText(/name/i);
    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    const createBtn = screen.getByRole("button", { name: /create user/i });

    // Fill the "create user" group (first email/password)
    fireEvent.change(nameInput, { target: { value: "Alice" } });
    fireEvent.change(emailInputs[0], { target: { value: "alice@example.com" } });
    fireEvent.change(passwordInputs[0], { target: { value: "secret" } });

    fireEvent.click(createBtn);

    expect(mockSignUpEmail).toHaveBeenCalledTimes(1);
    expect(mockSignUpEmail).toHaveBeenCalledWith(
      {
        email: "alice@example.com",
        name: "Alice",
        password: "secret",
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      })
    );

    expect(window.alert).toHaveBeenCalledWith("Success");
  });

  it("sign-up handles error and alerts Something went wrong", () => {
    mockUseSession.mockReturnValue({ data: null });

    mockSignUpEmail.mockImplementation((payload, opts) => {
      if (opts?.onError) opts.onError(new Error("network"));
    });

    render(<Home />);

    const nameInput = screen.getByPlaceholderText(/name/i);
    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    const createBtn = screen.getByRole("button", { name: /create user/i });

    fireEvent.change(nameInput, { target: { value: "Bob" } });
    fireEvent.change(emailInputs[0], { target: { value: "bob@example.com" } });
    fireEvent.change(passwordInputs[0], { target: { value: "hunter2" } });

    fireEvent.click(createBtn);

    expect(mockSignUpEmail).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith("Something went wrong");
  });

  it("logs in successfully and alerts Success", () => {
    mockUseSession.mockReturnValue({ data: null });

    mockSignInEmail.mockImplementation((payload, opts) => {
      if (opts?.onSuccess) opts.onSuccess();
    });

    render(<Home />);

    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole("button", { name: /login/i });

    // Fill the "login" group (second email/password)
    fireEvent.change(emailInputs[1], { target: { value: "login@example.com" } });
    fireEvent.change(passwordInputs[1], { target: { value: "p@ssw0rd" } });

    fireEvent.click(loginBtn);

    expect(mockSignInEmail).toHaveBeenCalledTimes(1);
    expect(mockSignInEmail).toHaveBeenCalledWith(
      {
        email: "login@example.com",
        password: "p@ssw0rd",
      },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      })
    );

    expect(window.alert).toHaveBeenCalledWith("Success");
  });

  it("login handles error and alerts Something went wrong", () => {
    mockUseSession.mockReturnValue({ data: null });

    mockSignInEmail.mockImplementation((payload, opts) => {
      if (opts?.onError) opts.onError(new Error("bad creds"));
    });

    render(<Home />);

    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole("button", { name: /login/i });

    fireEvent.change(emailInputs[1], { target: { value: "fail@example.com" } });
    fireEvent.change(passwordInputs[1], { target: { value: "wrong" } });

    fireEvent.click(loginBtn);

    expect(mockSignInEmail).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith("Something went wrong");
  });

  it("updates controlled inputs correctly for both sections", () => {
    mockUseSession.mockReturnValue({ data: null });

    render(<Home />);

    const nameInput = screen.getByPlaceholderText(/name/i);
    const emailInputs = screen.getAllByPlaceholderText(/email/i);
    const passwordInputs = screen.getAllByPlaceholderText(/password/i);

    // Create user section (index 0 for email/password)
    fireEvent.change(nameInput, { target: { value: "Charlie" } });
    fireEvent.change(emailInputs[0], { target: { value: "charlie@example.com" } });
    fireEvent.change(passwordInputs[0], { target: { value: "abc123" } });

    expect((nameInput as HTMLInputElement).value).toBe("Charlie");
    expect((emailInputs[0] as HTMLInputElement).value).toBe("charlie@example.com");
    expect((passwordInputs[0] as HTMLInputElement).value).toBe("abc123");

    // Login section (index 1 for email/password)
    fireEvent.change(emailInputs[1], { target: { value: "dana@example.com" } });
    fireEvent.change(passwordInputs[1], { target: { value: "passpass" } });
    expect((emailInputs[1] as HTMLInputElement).value).toBe("dana@example.com");
    expect((passwordInputs[1] as HTMLInputElement).value).toBe("passpass");
  });

  it("invokes auth methods even with empty inputs (current behavior)", () => {
    // This test documents current behavior: there is no input validation
    mockUseSession.mockReturnValue({ data: null });

    mockSignUpEmail.mockImplementation(() => {});
    mockSignInEmail.mockImplementation(() => {});

    render(<Home />);

    const createBtn = screen.getByRole("button", { name: /create user/i });
    const loginBtn = screen.getByRole("button", { name: /login/i });

    fireEvent.click(createBtn);
    expect(mockSignUpEmail).toHaveBeenCalledWith(
      { email: "", name: "", password: "" },
      expect.any(Object)
    );

    fireEvent.click(loginBtn);
    expect(mockSignInEmail).toHaveBeenCalledWith(
      { email: "", password: "" },
      expect.any(Object)
    );
  });
});