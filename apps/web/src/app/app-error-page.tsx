import errorSticker from "../assets/app-error.png";
import notFoundSticker from "../assets/not-found.png";
import { m } from "../paraglide/messages.js";
import { Wordmark } from "../shared/brand/wordmark.tsx";
import { ErrorScreen } from "./error-screen.tsx";

export const AppErrorPage = ({ notFound = false }: { readonly notFound?: boolean }) => (
  <div className="mx-auto flex min-h-svh max-w-[768px] flex-col gap-10 px-6 py-9">
    <header>
      <h1>
        <a href="/" className="text-[30px]">
          <Wordmark />
        </a>
      </h1>
    </header>
    <main className="flex-1">
      <ErrorScreen
        sticker={notFound ? notFoundSticker : errorSticker}
        title={notFound ? m.not_found_title() : m.error_title()}
        description={notFound ? m.not_found_body() : m.error_body()}
        reload={!notFound}
      />
    </main>
  </div>
);
