import { screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { fakeAuthGateway, renderAuthPage } from "../testing/render-auth-page.tsx";
import { ForgotPasswordPage } from "./forgot-password-page.tsx";

describe("ForgotPasswordPage", () => {
  it("answers the same way whether or not the account exists", async () => {
    const gateway = fakeAuthGateway({
      requestPasswordReset: () =>
        Promise.resolve({ ok: false, status: 404, code: "USER_NOT_FOUND", message: "No user" }),
    });

    renderAuthPage(<ForgotPasswordPage />, { path: "/forgot-password", gateway });

    await userEvent.type(screen.getByLabelText("Email"), "nobody@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send the link" }));

    expect(
      await screen.findByText(
        "If an account exists for nobody@example.com, a link to reset the password is on its way.",
      ),
    ).toBeInTheDocument();
  });
});
