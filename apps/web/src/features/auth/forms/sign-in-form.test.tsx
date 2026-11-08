import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import type { AuthGateway } from "../api/auth-client.ts";
import { fakeAuthGateway, renderAuthPage } from "../testing/render-auth-page.tsx";
import { SignInPage } from "./sign-in-form.tsx";

const MCP_CLIENT_REQUEST = new URLSearchParams({
  client_id: "client-123",
  redirect_uri: "http://localhost:33418/callback",
  response_type: "code",
  scope: "openid profile",
  prompt: "login",
  exp: "1893456000",
  sig: "signature",
}).toString();

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

  it("stays in the app after a normal Sign-in even when the server names a URL", async () => {
    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    const gateway = fakeAuthGateway({
      signInEmail: () => Promise.resolve({ ok: true, url: "http://localhost/todos" }),
      followRedirect,
    });

    const router = renderAuthPage(<SignInPage />, { path: "/sign-in", gateway });

    await fillAndSubmit();

    expect(await screen.findByText("elsewhere")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/todos");
    expect(followRedirect).not.toHaveBeenCalled();
  });

  it("continues the MCP client's authorization after Sign-in", async () => {
    const consent = `/oauth/consent?${MCP_CLIENT_REQUEST}`;
    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    const gateway = fakeAuthGateway({
      signInEmail: () => Promise.resolve({ ok: true, url: consent }),
      followRedirect,
    });

    const router = renderAuthPage(<SignInPage />, {
      path: `/sign-in?${MCP_CLIENT_REQUEST}`,
      gateway,
    });

    await fillAndSubmit();

    expect(followRedirect).toHaveBeenCalledWith(consent);
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("explains an expired request from an MCP client", async () => {
    const gateway = fakeAuthGateway({
      signInEmail: () =>
        Promise.resolve({
          ok: false,
          status: 400,
          code: "invalid_signature",
          message: "Bad Request",
        }),
    });

    renderAuthPage(<SignInPage />, { path: `/sign-in?${MCP_CLIENT_REQUEST}`, gateway });

    await fillAndSubmit();

    expect(
      await screen.findByText(
        "This connection request expired. Start it again from the app that sent you here.",
      ),
    ).toBeInTheDocument();
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

  it("follows the provider's page for Social sign-in", async () => {
    const providerPage = "https://github.com/login/oauth/authorize?client_id=x";

    const signInSocial = vi.fn<AuthGateway["signInSocial"]>(() =>
      Promise.resolve({ ok: true, url: providerPage }),
    );

    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    renderAuthPage(<SignInPage />, {
      path: "/sign-in?redirectTo=%2Ftodos",
      providers: ["github"],
      gateway: fakeAuthGateway({ signInSocial, followRedirect }),
    });

    await userEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));

    expect(signInSocial).toHaveBeenCalledWith("github", `${globalThis.location.origin}/todos`);
    expect(followRedirect).toHaveBeenCalledWith(providerPage);
  });

  it("offers each provider the server enables", () => {
    renderAuthPage(<SignInPage />, { path: "/sign-in", providers: ["github"] });

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });
});
