/**
 * Tests for SignInView
 *
 * Framework: Jest + React Testing Library (RTL) with jsdom
 * If your project uses Vitest, these tests should still largely work,
 * but you may need to change jest-specific imports (e.g., vi instead of jest)
 * and ensure a jsdom environment.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation useRouter
jest.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }),
  };
});

// Mock authClient with signIn.email
jest.mock("@/lib/auth-client", () => {
  return {
    authClient: {
      signIn: {
        email: jest.fn(),
      },
    },
  };
});

// Mock UI components that are not essential to logic
jest.mock("@/components/ui/input", () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
jest.mock("@/components/ui/alert", () => ({
  Alert: ({ children, ...props }: any) => <div role="alert" {...props}>{children}</div>,
  AlertTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
jest.mock("@/components/ui/form", () => {
  // Provide minimal mock of shadcn form components delegating to children
  const Form = ({ children }: any) => <>{children}</>;
  const FormControl = ({ children }: any) => <>{children}</>;
  const FormField = ({ render }: any) => render({ field: { name: "mock", value: "", onChange: jest.fn(), onBlur: jest.fn(), ref: jest.fn() } });
  const FormItem = ({ children }: any) => <div>{children}</div>;
  const FormLabel = ({ children }: any) => <label>{children}</label>;
  const FormMessage = ({ children }: any) => <div>{children}</div>;
  return { Form, FormControl, FormField, FormItem, FormLabel, FormMessage };
});

// Mock lucide-react icon to avoid SVG/render complexity
jest.mock("lucide-react", () => ({
  OctagonAlertIcon: (props: any) => <svg data-testid="octagon-alert-icon" {...props} />,
}));

// Mock next/link to render simple anchor
jest.mock("next/link", () => {
  return ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>;
});

// Import after mocks so the component uses mocked modules
import { SignInView } from "./sign-in-view";

// Utilities to access mocks
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

describe("SignInView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const typeInto = async (labelText: string, value: string) => {
    const input = screen.getByLabelText(labelText);
    fireEvent.change(input, { target: { value } });
    return input;
  };

  it("renders the form with initial state and controls", () => {
    render(<SignInView />);

    // Headings and text
    expect(screen.getByRole("heading", { level: 1, name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByText(/login to your account/i)).toBeInTheDocument();

    // Inputs by label
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Submit button
    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    expect(submitBtn).toBeEnabled();

    // Social buttons
    expect(screen.getByRole("button", { name: /google/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /github/i })).toBeEnabled();

    // Sign-up link
    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  it("validates email format and password required before submitting", async () => {
    render(<SignInView />);

    // Try submitting empty form
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Expect validation errors via zod/react-hook-form.
    // Since FormMessage UI is mocked, errors may not render unless FormMessage children appear.
    // We can still ensure no auth call is made when invalid.
    expect((authClient.signIn.email as jest.Mock)).not.toHaveBeenCalled();

    // Enter invalid email
    await typeInto(/email/i, "not-an-email");
    await typeInto(/password/i, "secret");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect((authClient.signIn.email as jest.Mock)).not.toHaveBeenCalled();

    // Enter valid email and empty password
    await typeInto(/email/i, "m@example.com");
    await typeInto(/password/i, ""); // ensure it's empty
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect((authClient.signIn.email as jest.Mock)).not.toHaveBeenCalled();
  });

  it("submits with valid credentials and routes to home on success", async () => {
    render(<SignInView />);

    // Prepare signIn.email mock to capture callbacks
    const emailMock = authClient.signIn.email as jest.Mock;
    emailMock.mockImplementation((_creds, { onSuccess }) => {
      // simulate async success
      setTimeout(() => onSuccess(), 0);
    });

    // Fill valid inputs and submit
    await typeInto(/email/i, "m@example.com");
    await typeInto(/password/i, "correcthorsebatterystaple");
    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Button should be disabled while pending
    expect(submitBtn).toBeDisabled();

    // Ensure call payload shape
    await waitFor(() => {
      expect(emailMock).toHaveBeenCalledTimes(1);
      const [creds] = emailMock.mock.calls[0];
      expect(creds).toEqual({
        email: "m@example.com",
        password: "correcthorsebatterystaple",
      });
    });

    // Router push called on success and pending cleared
    const router = useRouter() as unknown as { push: jest.Mock };
    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/");
      expect(submitBtn).toBeEnabled();
    });
  });

  it("shows error alert and re-enables submit on sign-in error", async () => {
    render(<SignInView />);

    const errorMessage = "Invalid credentials";

    // Mock error path
    const emailMock = authClient.signIn.email as jest.Mock;
    emailMock.mockImplementation((_creds, { onError }) => {
      setTimeout(() => onError({ error: { message: errorMessage } }), 0);
    });

    await typeInto(/email/i, "m@example.com");
    await typeInto(/password/i, "wrong-password");

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Button disabled during pending
    expect(submitBtn).toBeDisabled();

    // Error alert shows and button enabled afterwards
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(errorMessage);
    expect(screen.getByTestId("octagon-alert-icon")).toBeInTheDocument();
    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });
  });

  it("disables social buttons when pending to prevent multiple submissions", async () => {
    render(<SignInView />);

    const emailMock = authClient.signIn.email as jest.Mock;
    emailMock.mockImplementation((_creds, { onSuccess }) => {
      // Keep pending for a moment before success
      setTimeout(() => onSuccess(), 10);
    });

    await typeInto(/email/i, "m@example.com");
    await typeInto(/password/i, "pw");
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    const googleBtn = screen.getByRole("button", { name: /google/i });
    const githubBtn = screen.getByRole("button", { name: /github/i });

    expect(googleBtn).toBeEnabled();
    expect(githubBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    expect(googleBtn).toBeDisabled();
    expect(githubBtn).toBeDisabled();

    await waitFor(() => expect(submitBtn).toBeEnabled(), { timeout: 1000 });
  });

  it("clears previous error when resubmitting", async () => {
    render(<SignInView />);

    const emailMock = authClient.signIn.email as jest.Mock;

    // First attempt: error
    emailMock.mockImplementationOnce((_creds, { onError }) => {
      setTimeout(() => onError({ error: { message: "First failure" } }), 0);
    });

    await typeInto(/email/i, "m@example.com");
    await typeInto(/password/i, "pw");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("First failure");

    // Second attempt: success; error should be cleared before callbacks
    emailMock.mockImplementationOnce((_creds, { onSuccess }) => {
      setTimeout(() => onSuccess(), 0);
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Immediately after clicking, alert should no longer be visible due to setError(null)
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("renders legal text and important links", () => {
    render(<SignInView />);
    expect(
      screen.getByText(/By clicking continue, you agree to our/i)
    ).toBeInTheDocument();
    const terms = screen.getAllByRole("link", { name: /terms of service/i })[0] || screen.getByText(/Terms of Service/i).closest("a");
    const privacy = screen.getAllByRole("link", { name: /privacy policy/i })[0] || screen.getByText(/Privacy Policy/i).closest("a");
    expect(terms).toHaveAttribute("href");
    expect(privacy).toHaveAttribute("href");
  });
});