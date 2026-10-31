import { useEffect, useRef, useState } from "react";

import { m } from "../../../paraglide/messages.js";
import { BeaverArt } from "./beaver-art.tsx";

import "./beaver.css";

const EYE_CENTER_X = 463 / 983;

const EYE_CENTER_Y = 330 / 1024;

const LOOK_REACH = 9;

const IDLE_GLANCE_MS = 3500;

const POP_MS = 950;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lookAt = (svg: SVGSVGElement, x: number, y: number) => {
  const box = svg.getBoundingClientRect();
  const dx = x - (box.left + box.width * EYE_CENTER_X);
  const dy = y - (box.top + box.height * EYE_CENTER_Y);
  const distance = Math.hypot(dx, dy) || 1;
  const reach = (LOOK_REACH * distance) / (distance + 120);

  svg.style.setProperty("--beaver-look-x", `${String((dx / distance) * reach)}px`);
  svg.style.setProperty("--beaver-look-y", `${String((dy / distance) * reach)}px`);
};

export const Beaver = () => {
  const art = useRef<SVGSVGElement>(null);
  const [presses, setPresses] = useState(0);

  const press = () => {
    setPresses((count) => count + 1);
  };

  useEffect(() => {
    const svg = art.current;

    if (svg === null || prefersReducedMotion()) return undefined;

    let lastMove = 0;

    const follow = (event: PointerEvent) => {
      lastMove = performance.now();
      lookAt(svg, event.clientX, event.clientY);
    };

    const glance = window.setInterval(() => {
      if (performance.now() - lastMove < IDLE_GLANCE_MS) return;

      const box = svg.getBoundingClientRect();

      lookAt(
        svg,
        box.left + box.width * (Math.random() * 2 - 0.5),
        box.top + box.height * Math.random(),
      );
    }, 2200);

    window.addEventListener("pointermove", follow);

    return () => {
      window.removeEventListener("pointermove", follow);
      window.clearInterval(glance);
    };
  }, []);

  useEffect(() => {
    const svg = art.current;

    if (svg === null || prefersReducedMotion()) return undefined;

    let timer = 0;

    const blink = () => {
      svg.classList.add("is-blinking");
      window.setTimeout(() => svg.classList.remove("is-blinking"), 130);
    };

    const schedule = () => {
      timer = window.setTimeout(
        () => {
          blink();

          if (Math.random() < 0.25) window.setTimeout(blink, 260);

          schedule();
        },
        2400 + Math.random() * 3600,
      );
    };

    schedule();

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const svg = art.current;

    if (svg === null || presses === 0 || prefersReducedMotion()) return undefined;

    svg.classList.remove("is-popping");

    const frame = window.requestAnimationFrame(() => svg.classList.add("is-popping"));
    const timer = window.setTimeout(() => svg.classList.remove("is-popping"), POP_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [presses]);

  return (
    <button
      type="button"
      onClick={press}
      aria-label={m.welcome_beaver_label()}
      className="w-[220px] cursor-pointer rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-[252px]"
    >
      <BeaverArt ref={art} />
    </button>
  );
};
