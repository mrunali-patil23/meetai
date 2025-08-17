/**
 * Testing library and framework: Vitest + React Testing Library.
 * Focus: SignUpView behavior (validation, submission success/error, pending state, UI elements).
 *
 * To run these tests, ensure devDependencies include:
 *   - vitest
 *   - @testing-library/react
 *   - @testing-library/user-event
 *   - @testing-library/jest-dom
 *   - jsdom
 * and use the provided vitest.config.ts with JSDOM and "@/"" path alias.
 */
import React from "react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation's useRouter with a shared push spy
vi.mock("next/navigation", () => {
  const push = vi.fn();
  return {
    __esModule: true,
    useRouter: () => ({ push }),
  };
});

// Mock authClient.signUp.email
vi.mock("@/lib/auth-client", () => {
  return {
    __esModule: true,
    authClient: {
      signUp: {
        email: vi.fn(),
      },
    },
  };
});

// Import component under test
import { SignUpView } from "./sign-up-view";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// Helper to access the submit button (labelled "Sign in" in the SignUp view)
const getSubmitButton = () => screen.getByRole("button", { name: /sign in/i });

describe("SignUpView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders headings, form fields, submit button, and sign-in link", () => {
    render(<SignUpView />);

    // Headline/copy
    expect(
      screen.getByRole("heading", { name: /let's get started/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();

    // Form fields by accessible label
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    // Submit button + sign-in link
    expect(getSubmitButton()).toBeInTheDocument();
    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("validation: shows errors for empty required fields on submit", async () => {
    render(<SignUpView />);

    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      // Both password fields are required; at least one required message should appear
      expect(screen.getAllByText(/password is required/i).length).toBeGreaterThanOrEqual(1);
      // Email default zod error
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  test("validation: invalid email and mismatched confirm password", async () => {
    render(<SignUpView />);

    await userEvent.type(screen.getByLabelText(/name/i), "John Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.type(screen.getByLabelText(/^password$/i), "supersecret");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different");

    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
  });

  test("success path: disables while pending, then navigates to '/' on success and re-enables", async () => {
    const pushSpy = (useRouter() as any).push as ReturnType<typeof vi.fn>;
    (authClient.signUp.email as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_payload: any, { onSuccess }: { onSuccess: () => void }) => {
        // simulate async success
        setTimeout(onSuccess, 0);
      }
    );

    render(<SignUpView />);

    await userEvent.type(screen.getByLabelText(/name/i), "John Doe");
    await userEvent.type(screen.getByLabelText(/email/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "supersecret");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "supersecret");

    await userEvent.click(getSubmitButton());

    // Button disabled while pending
    await waitFor(() => expect(getSubmitButton()).toBeDisabled());

    // After success, navigates and button is enabled again
    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith("/");
      expect(getSubmitButton()).not.toBeDisabled();
    });

    // Assert payload and callbacks passed to signUp.email
    expect(authClient.signUp.email).toHaveBeenCalledWith(
      {
        name: "John Doe",
        email: "john@example.com",
        password: "supersecret",
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  test("error path: shows error alert and re-enables button after failure", async () => {
    const apiError = { message: "Email already in use" };
    (authClient.signUp.email as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_payload: any, { onError }: { onError: ({ error }: any) => void }) => {
        setTimeout(() => onError({ error: apiError }), 0);
      }
    );

    render(<SignUpView />);

    await userEvent.type(screen.getByLabelText(/name/i), "Alice");
    await userEvent.type(screen.getByLabelText(/email/i), "alice@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "pw123456");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "pw123456");

    await userEvent.click(getSubmitButton());

    // Button disabled while pending
    await waitFor(() => expect(getSubmitButton()).toBeDisabled());

    // Error alert shown and button re-enabled
    await waitFor(() => {
      expect(screen.getByText(apiError.message)).toBeInTheDocument();
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  test("does not submit when form is invalid (missing confirm password)", async () => {
    (authClient.signUp.email as unknown as ReturnType<typeof vi.fn>).mockReset();

    render(<SignUpView />);

    await userEvent.type(screen.getByLabelText(/name/i), "Bob");
    await userEvent.type(screen.getByLabelText(/email/i), "bob@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "pw123456");

    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    expect(authClient.signUp.email).not.toHaveBeenCalled();
  });

  test("renders social buttons and they are disabled while pending", async () => {
    (authClient.signUp.email as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {});

    render(<SignUpView />);

    const googleBtn = screen.getByRole("button", { name: /google/i });
    const githubBtn = screen.getByRole("button", { name: /github/i });
    expect(googleBtn).toBeInTheDocument();
    expect(githubBtn).toBeInTheDocument();

    // Fill valid form then submit to enter pending state
    await userEvent.type(screen.getByLabelText(/name/i), "Valid User");
    await userEvent.type(screen.getByLabelText(/email/i), "valid@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "password123");
    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(getSubmitButton()).toBeDisabled();
      expect(googleBtn).toBeDisabled();
      expect(githubBtn).toBeDisabled();
    });
  });

  test("clears previous error on resubmit and navigates on subsequent success", async () => {
    const pushSpy = (useRouter() as any).push as ReturnType<typeof vi.fn>;
    const apiError = { message: "Email already in use" };
    const signUpEmailMock = authClient.signUp.email as any;

    // First submit -> error
    signUpEmailMock.mockImplementationOnce(
      (_payload: any, { onError }: { onError: ({ error }: any) => void }) => {
        setTimeout(() => onError({ error: apiError }), 0);
      }
    );
    // Second submit -> success
    signUpEmailMock.mockImplementationOnce(
      (_payload: any, { onSuccess }: { onSuccess: () => void }) => {
        setTimeout(onSuccess, 0);
      }
    );

    render(<SignUpView />);

    // Fill valid form
    await userEvent.type(screen.getByLabelText(/name/i), "Casey");
    await userEvent.type(screen.getByLabelText(/email/i), "casey@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "pw123456");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "pw123456");

    // First submit => error alert appears
    await userEvent.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(apiError.message)).toBeInTheDocument();
      expect(getSubmitButton()).not.toBeDisabled();
    });

    // Second submit => error should clear immediately, then navigate on success
    await userEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.queryByText(apiError.message)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith("/");
      expect(getSubmitButton()).not.toBeDisabled();
    });

    expect(signUpEmailMock).toHaveBeenCalledTimes(2);
  });
});