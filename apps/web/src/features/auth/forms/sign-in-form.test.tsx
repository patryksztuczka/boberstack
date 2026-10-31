import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import type { AuthGateway } from "../api/auth-client.ts";
import { fakeAuthGateway, renderAuthPage } from "../testing/render-auth-page.tsx";
import { SignInPage } from "./sign-in-form.tsx";

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("SignInPage", () => {
  it("returns to the page the user wanted after signing in", async () => {
    const router = renderAuthPage(<SignInPage />, { path: "/sign-in?redirectTo=%2Ftodos%3Fx%3D1" });

    await fillAndSubmit();

    expect(await screen.findByText("elsewhere")).toBeInTheDocument();
    expect(`${router.state.location.pathname}${router.state.location.search}`).toBe("/todos?x=1");
  });

  it("asks to confirm the email when the account is not verified yet", async () => {
    const signInEmail = vi.fn<AuthGateway["signInEmail"]>(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        code: "EMAIL_NOT_VERIFIED",
        message: "Email not verified",
      }),
    );

    const gateway = fakeAuthGateway({ signInEmail });

    renderAuthPage(<SignInPage />, { path: "/sign-in?redirectTo=%2Ftodos%3Fx%3D1", gateway });

    await fillAndSubmit();

    expect(
      await screen.findByText(
        "Confirm your email first. We just sent a new link to ana@example.com.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send the link again" })).toBeInTheDocument();
    expect(signInEmail).toHaveBeenCalledWith(
      "ana@example.com",
      "correct-horse",
      `${globalThis.location.origin}/todos?x=1`,
    );
  });

  it("hides social sign-in when the server enables no provider", () => {
    renderAuthPage(<SignInPage />, { path: "/sign-in", providers: [] });

    expect(screen.queryByRole("button", { name: /Continue with/ })).not.toBeInTheDocument();
  });

  it("offers each provider the server enables", () => {
    renderAuthPage(<SignInPage />, { path: "/sign-in", providers: ["github"] });

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });
});
