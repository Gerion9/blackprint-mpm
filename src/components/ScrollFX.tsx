"use client";

import { useEffect } from "react";

/**
 * Efectos globales del reporte (cliente): reveal-on-scroll, count-up de KPIs,
 * crecimiento de barras, barra de progreso, scroll-spy del TOC y botón "arriba".
 * Renderiza la barra de progreso y el botón; el resto opera sobre el DOM ya
 * pintado por los Server Components. Respeta prefers-reduced-motion.
 */
export default function ScrollFX() {
  useEffect(() => {
    const RM = window.matchMedia?.("(prefers-reduced-motion:reduce)").matches;
    const $$ = (s: string) => Array.from(document.querySelectorAll(s));

    function countUp(el: Element) {
      const raw = el.getAttribute("data-cv") || el.textContent || "";
      const m = raw.match(/-?\d[\d,]*\.?\d*/);
      if (!m || RM) {
        el.textContent = raw;
        return;
      }
      const numStr = m[0];
      const target = parseFloat(numStr.replace(/,/g, ""));
      const dec = (numStr.split(".")[1] || "").length;
      const hasComma = numStr.includes(",");
      const idx = m.index ?? 0;
      const pre = raw.slice(0, idx);
      const post = raw.slice(idx + numStr.length);
      const fmt = (v: number) => {
        let s = dec ? v.toFixed(dec) : Math.round(v).toString();
        if (hasComma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return s;
      };
      const dur = 1100;
      let t0: number | null = null;
      const step = (ts: number) => {
        if (t0 === null) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = pre + fmt(target * e) + post;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target;
          if (el.classList.contains("reveal")) el.classList.add("in");
          if (el.hasAttribute("data-cv")) countUp(el);
          if (el.classList.contains("bars-host"))
            el.querySelectorAll(".fill").forEach((f) => {
              (f as HTMLElement).style.width = (f.getAttribute("data-w") || "0") + "%";
            });
          io.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    $$(".reveal,[data-cv],.bars-host").forEach((el) => io.observe(el));

    const prog = document.getElementById("progress");
    const totop = document.getElementById("totop");
    const links = $$("#topnav a") as HTMLAnchorElement[];
    const secs = $$("[data-sec]");
    const onScroll = () => {
      const h = document.documentElement;
      const st = h.scrollTop || document.body.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? st / max : 0})`;
      const show = st > 520;
      document.getElementById("topnav")?.classList.toggle("show", show);
      totop?.classList.toggle("show", show);
      let cur: string | null = null;
      secs.forEach((s) => {
        if (s.getBoundingClientRect().top < 160) cur = s.id;
      });
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${cur}`));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const toTop = () => window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
    totop?.addEventListener("click", toTop);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      totop?.removeEventListener("click", toTop);
    };
  }, []);

  return (
    <>
      <div className="progress" id="progress" />
      <button className="totop" id="totop" aria-label="Volver arriba" type="button">
        ↑
      </button>
    </>
  );
}
