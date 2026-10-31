import { isRouteErrorResponse, useRouteError } from "react-router";

import notFoundSticker from "../assets/not-found.png";
import { m } from "../paraglide/messages.js";
import { AppErrorPage } from "./app-error-page.tsx";
import { ErrorScreen } from "./error-screen.tsx";

export const NotFoundPage = () => (
  <ErrorScreen
    sticker={notFoundSticker}
    title={m.not_found_title()}
    description={m.not_found_body()}
  />
);

export const RouteError = () => {
  const error = useRouteError();

  return <AppErrorPage notFound={isRouteErrorResponse(error) && error.status === 404} />;
};
