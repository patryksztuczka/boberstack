import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import type { AuthGateway } from "../api/auth-client.ts";
import { fakeAuthGateway, renderAuthPage } from "../testing/render-auth-page.tsx";
import { ConsentPage } from "./consent-page.tsx";

const MCP_CLIENT_REQUEST = new URLSearchParams({
  client_id: "client-123",
  redirect_uri: "http://localhost:33418/callback",
  response_type: "code",
  scope: "openid profile email offline_access todos:read",
  state: "state-1",
  exp: "1893456000",
  sig: "signature",
}).toString();

const CONSENT_PATH = `/oauth/consent?${MCP_CLIENT_REQUEST}`;

const CLIENT_CALLBACK = "http://localhost:33418/callback?code=abc&state=state-1";

const namedClient = (overrides: Partial<AuthGateway> = {}) =>
  fakeAuthGateway({ mcpClientName: () => Promise.resolve("Claude"), ...overrides });

describe("ConsentPage", () => {
  it("names the MCP client and lists what it asks for in plain words", async () => {
    renderAuthPage(<ConsentPage />, { path: CONSENT_PATH, gateway: namedClient() });

    expect(await screen.findByRole("heading", { name: "Connect Claude." })).toBeInTheDocument();
    expect(
      screen.getByText("Claude is asking to act for you. If you allow it, it can:"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Confirm who you are",
      "See your name and profile picture",
      "See your email address",
      "Keep access when you are not using it",
      "Use the “todos:read” permission",
    ]);
    expect(screen.getByText("Either way, you go back to localhost:33418.")).toBeInTheDocument();
  });

  it("falls back to the client id when the MCP client has no public name", async () => {
    renderAuthPage(<ConsentPage />, { path: CONSENT_PATH });

    expect(await screen.findByRole("heading", { name: "Connect client-123." })).toBeInTheDocument();
  });

  it("gives Consent and follows the URL back to the MCP client", async () => {
    const answerConsent = vi.fn<AuthGateway["answerConsent"]>(() =>
      Promise.resolve({ ok: true, url: CLIENT_CALLBACK }),
    );

    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    renderAuthPage(<ConsentPage />, {
      path: CONSENT_PATH,
      gateway: namedClient({ answerConsent, followRedirect }),
    });

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(answerConsent).toHaveBeenCalledWith(true);
    expect(followRedirect).toHaveBeenCalledWith(CLIENT_CALLBACK);
  });

  it("refuses Consent and follows the URL back to the MCP client", async () => {
    const denied = "http://localhost:33418/callback?error=access_denied&state=state-1";

    const answerConsent = vi.fn<AuthGateway["answerConsent"]>(() =>
      Promise.resolve({ ok: true, url: denied }),
    );

    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    renderAuthPage(<ConsentPage />, {
      path: CONSENT_PATH,
      gateway: namedClient({ answerConsent, followRedirect }),
    });

    await userEvent.click(await screen.findByRole("button", { name: "Deny" }));

    expect(answerConsent).toHaveBeenCalledWith(false);
    expect(followRedirect).toHaveBeenCalledWith(denied);
  });

  it("explains an expired request instead of leaving the User stuck", async () => {
    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    renderAuthPage(<ConsentPage />, {
      path: CONSENT_PATH,
      gateway: namedClient({
        answerConsent: () =>
          Promise.resolve({
            ok: false,
            status: 400,
            code: "invalid_signature",
            message: "Bad Request",
          }),
        followRedirect,
      }),
    });

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(
      await screen.findByRole("heading", { name: "This request is no longer valid." }),
    ).toBeInTheDocument();
    expect(followRedirect).not.toHaveBeenCalled();
  });

  it("shows why Consent could not be saved and lets the User try again", async () => {
    renderAuthPage(<ConsentPage />, {
      path: CONSENT_PATH,
      gateway: namedClient({
        answerConsent: () =>
          Promise.resolve({
            ok: false,
            status: 500,
            code: undefined,
            message: "Internal Server Error",
          }),
      }),
    });

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(await screen.findByText("That did not work: Internal Server Error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allow" })).toBeEnabled();
  });

  it("refuses a page opened without a signed request from an MCP client", () => {
    const mcpClientName = vi.fn<AuthGateway["mcpClientName"]>(() => Promise.resolve("Claude"));

    renderAuthPage(<ConsentPage />, {
      path: "/oauth/consent?client_id=client-123",
      gateway: fakeAuthGateway({ mcpClientName }),
    });

    expect(
      screen.getByRole("heading", { name: "This request is no longer valid." }),
    ).toBeInTheDocument();
    expect(mcpClientName).not.toHaveBeenCalled();
  });
});
