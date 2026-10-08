/** Sense desbordament horitzontal accidental a les mides previstes (desktop i tauleta). */
import { expect, test } from "@playwright/test";
import { loginAs } from "./fixtures";

const PAGES = ["/club", "/club/oportunitats", "/club/oportunitats/o_vn_central", "/club/cercar", "/club/jugadors/p_biel?offer=o_vn_central", "/club/pipeline", "/club/avaluacions", "/club/configuracio", "/club/comparar?ids=p_biel,p_arnau&offer=o_vn_central"];

for (const width of [1440, 1280, 1024, 768]) {
  test(`sense scroll horitzontal a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await loginAs(page, "director");
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} desborda ${overflow}px a ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}
