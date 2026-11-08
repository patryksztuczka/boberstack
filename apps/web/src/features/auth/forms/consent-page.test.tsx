import {
  McpClientDirectoryUnavailableError,
  McpClientNotFoundError,
  McpClientProfile,
} from "@boberstack/client-runtime/identity";
import type { McpClientDirectoryApi } from "@boberstack/client-runtime/identity";
import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Effect, Option } from "effect";
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

const claude: McpClientDirectoryApi["profileOf"] = (clientId) =>
  Effect.succeed(new McpClientProfile({ clientId, name: Option.some("Claude") }));

const renderConsent = (gateway: AuthGateway = fakeAuthGateway()) =>
  renderAuthPage(<ConsentPage />, { path: CONSENT_PATH, gateway, mcpClients: claude });

describe("ConsentPage", () => {
  it("names the MCP client and lists what it asks for in plain words", async () => {
    renderConsent();

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

    renderConsent(fakeAuthGateway({ answerConsent, followRedirect }));

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

    renderConsent(fakeAuthGateway({ answerConsent, followRedirect }));

    await userEvent.click(await screen.findByRole("button", { name: "Deny" }));

    expect(answerConsent).toHaveBeenCalledWith(false);
    expect(followRedirect).toHaveBeenCalledWith(denied);
  });

  it("explains an expired request instead of leaving the User stuck", async () => {
    const followRedirect = vi.fn<AuthGateway["followRedirect"]>();

    renderConsent(
      fakeAuthGateway({
        answerConsent: () =>
          Promise.resolve({
            ok: false,
            status: 400,
            code: "invalid_signature",
            message: "Bad Request",
          }),
        followRedirect,
      }),
    );

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(
      await screen.findByRole("heading", { name: "This request is no longer valid." }),
    ).toBeInTheDocument();
    expect(followRedirect).not.toHaveBeenCalled();
  });

  it("shows why Consent could not be saved and lets the User try again", async () => {
    renderConsent(
      fakeAuthGateway({
        answerConsent: () =>
          Promise.resolve({
            ok: false,
            status: 500,
            code: undefined,
            message: "Internal Server Error",
          }),
      }),
    );

    await userEvent.click(await screen.findByRole("button", { name: "Allow" }));

    expect(await screen.findByText("That did not work: Internal Server Error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Allow" })).toBeEnabled();
  });

  it("refuses a page opened without a signed request from an MCP client", () => {
    const profileOf = vi.fn<McpClientDirectoryApi["profileOf"]>(claude);

    renderAuthPage(<ConsentPage />, {
      path: "/oauth/consent?client_id=client-123",
      mcpClients: profileOf,
    });

    expect(
      screen.getByRole("heading", { name: "This request is no longer valid." }),
    ).toBeInTheDocument();
    expect(profileOf).not.toHaveBeenCalled();
  });

  it("refuses a request from an MCP client that is not registered", async () => {
    renderAuthPage(<ConsentPage />, {
      path: CONSENT_PATH,
      mcpClients: (clientId) => Effect.fail(new McpClientNotFoundError({ clientId })),
    });

    expect(
      await screen.findByRole("heading", { name: "This request is no longer valid." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Allow" })).not.toBeInTheDocument();
  });

  it("says why the MCP client could not be loaded and loads it again on retry", async () => {
    const profileOf = vi
      .fn<McpClientDirectoryApi["profileOf"]>(claude)
      .mockReturnValueOnce(
        Effect.fail(new McpClientDirectoryUnavailableError({ reason: "Network down" })),
      );

    renderAuthPage(<ConsentPage />, { path: CONSENT_PATH, mcpClients: profileOf });

    expect(await screen.findByText("That did not work: Network down")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Connect Claude." })).toBeInTheDocument();
  });
});
