import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { renderAuthPage } from "../testing/render-auth-page.tsx";
import { SignUpPage } from "./sign-up-form.tsx";

describe("SignUpPage", () => {
  it("explains every invalid field before calling the API", async () => {
    renderAuthPage(<SignUpPage />, { path: "/sign-up" });

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
  });

  it("sends a new account to check its inbox", async () => {
    const router = renderAuthPage(<SignUpPage />, { path: "/sign-up" });

    await userEvent.type(screen.getByLabelText("Name"), "Ana");
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("elsewhere")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/check-email");
    expect(router.state.location.search).toBe("?email=ana%40example.com");
  });
});
