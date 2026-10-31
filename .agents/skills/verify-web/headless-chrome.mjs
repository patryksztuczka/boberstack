import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const findChrome = () => {
  const path = CHROME_PATHS.find((candidate) => candidate !== undefined && existsSync(candidate));

  if (path === undefined) throw new Error("no Chrome found; set CHROME_PATH");

  return path;
};

export async function openBrowser(evidenceDir, port = 9333) {
  mkdirSync(evidenceDir, { recursive: true });

  const profile = mkdtempSync(join(tmpdir(), "verify-web-"));
  const chrome = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${String(port)}`,
      `--user-data-dir=${profile}`,
      "--window-size=1100,900",
      "--no-first-run",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let version;

  for (let attempt = 0; attempt < 50 && version === undefined; attempt += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${String(port)}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }

  if (version === undefined) throw new Error(`Chrome did not open port ${String(port)}`);

  const socket = new WebSocket(version.webSocketDebuggerUrl);

  await new Promise((resolve) => socket.addEventListener("open", resolve));

  let nextId = 0;
  const pending = new Map();
  const console = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    } else if (message.method === "Runtime.exceptionThrown") {
      console.push(`exception: ${message.params.exceptionDetails.text}`);
    } else if (message.method === "Runtime.consoleAPICalled") {
      const text = message.params.args.map((arg) => arg.value ?? arg.description).join(" ");

      if (message.params.type === "error" || message.params.type === "warning") {
        console.push(`${message.params.type}: ${text}`);
      }
    }
  });

  const send = (method, params, sessionId) =>
    new Promise((resolve, reject) => {
      nextId += 1;
      pending.set(nextId, (message) =>
        message.error === undefined
          ? resolve(message.result)
          : reject(new Error(`${method}: ${message.error.message}`)),
      );
      socket.send(JSON.stringify({ id: nextId, method, params: params ?? {}, sessionId }));
    });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );

    if (exceptionDetails !== undefined) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }

    return result.value;
  };

  const waitFor = async (expression, label, timeout = 15_000) => {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (await evaluate(expression).catch(() => false)) return;

      await sleep(150);
    }

    throw new Error(`timed out waiting for ${label}`);
  };

  const goto = async (url) => {
    await send("Page.navigate", { url }, sessionId);
    await waitFor("document.readyState === 'complete'", `load of ${url}`);
  };

  const present = (selector) =>
    waitFor(`document.querySelector(${JSON.stringify(selector)}) !== null`, selector);

  const type = async (selector, text) => {
    await present(selector);
    await evaluate(
      `(() => { const element = document.querySelector(${JSON.stringify(selector)}); element.focus(); element.select?.(); return true; })()`,
    );
    await send("Input.insertText", { text }, sessionId);
  };

  const click = async (selector) => {
    await present(selector);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };

  const screenshot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" }, sessionId);
    const path = join(evidenceDir, `${name}.png`);

    writeFileSync(path, Buffer.from(data, "base64"));

    return path;
  };

  const close = () => {
    socket.close();
    chrome.kill();
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };

  return { goto, waitFor, evaluate, type, click, screenshot, console, close };
}
