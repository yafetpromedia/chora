/** Remove boot splash so it cannot appear in print / PDF output. */
export function stripPreloaderFromDom() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("#chora-preloader, .chora-preloader").forEach((el) => {
    el.remove();
  });
  document.documentElement.classList.add("sid-print-route");
  document.body.classList.add("sid-print-route");
}

/** Wait until images inside a root are loaded (or errored) before printing. */
export function waitForPrintAssets(root: ParentNode, timeoutMs = 5000): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let settled = false;
    let remaining = images.length;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.requestAnimationFrame(() => resolve());
    };

    const onOne = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };

    const timer = window.setTimeout(finish, timeoutMs);

    for (const img of images) {
      if (img.complete) {
        onOne();
        continue;
      }
      img.addEventListener("load", onOne, { once: true });
      img.addEventListener("error", onOne, { once: true });
    }
  });
}

export function isPreloaderGone(): boolean {
  return !document.getElementById("chora-preloader") && !document.querySelector(".chora-preloader");
}

export function waitForPreloaderGone(timeoutMs = 4000): Promise<void> {
  stripPreloaderFromDom();
  if (isPreloaderGone()) return Promise.resolve();

  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      stripPreloaderFromDom();
      if (isPreloaderGone() || Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

export async function prepareAndPrint(root: ParentNode | null) {
  stripPreloaderFromDom();
  await waitForPreloaderGone();
  if (root) await waitForPrintAssets(root);
  stripPreloaderFromDom();
  await new Promise((r) => window.setTimeout(r, 180));
  window.print();
}
