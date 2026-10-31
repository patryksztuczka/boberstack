import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { fakeAuthGateway, renderAuthPage } from "../testing/render-auth-page.tsx";
import { ResetPasswordPage } from "./reset-password-page.tsx";

describe("ResetPasswordPage", () => {
  it("refuses two different passwords before calling the API", async () => {
    const tokens: Array<string> = [];

    const gateway = fakeAuthGateway({
      resetPassword: (_password, token) => {
        tokens.push(token);

        return Promise.resolve({ ok: true });
      },
    });

    renderAuthPage(<ResetPasswordPage />, { path: "/reset-password?token=abc", gateway });

    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.type(screen.getByLabelText("Repeat the password"), "correct-horsf");
    await userEvent.click(screen.getByRole("button", { name: "Save the new password" }));

    expect(await screen.findByText("The passwords do not match.")).toBeInTheDocument();
    expect(tokens).toEqual([]);
  });

  it("saves a matching password with the token from the link", async () => {
    const tokens: Array<string> = [];

    const gateway = fakeAuthGateway({
      resetPassword: (_password, token) => {
        tokens.push(token);

        return Promise.resolve({ ok: true });
      },
    });

    renderAuthPage(<ResetPasswordPage />, { path: "/reset-password?token=abc", gateway });

    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.type(screen.getByLabelText("Repeat the password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Save the new password" }));

    expect(await screen.findByRole("heading", { name: "Password changed." })).toBeInTheDocument();
    expect(tokens).toEqual(["abc"]);
  });

  it("explains an expired link instead of showing the form", () => {
    renderAuthPage(<ResetPasswordPage />, { path: "/reset-password?error=INVALID_TOKEN" });

    expect(screen.getByRole("link", { name: "Ask for a new link" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
