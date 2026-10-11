// The category price slider in a real browser: URL → slider → URL, keyboard and drag, the
// result count, right-to-left mirroring, and old ?use= links. Needs Playwright, which is not
// a dependency of this repo: set PLAYWRIGHT_PATH to an installed `playwright` package (with its
// Chromium downloaded), e.g.
//   PLAYWRIGHT_PATH=$(npm root -g)/playwright npm run test:api
// Skipped (with this reason) when it can't be loaded.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { BASE, startServer, stopServer } from './helpers.mjs';
import { filterProducts, parseFilters, priceBounds } from '../../lib/catalogFilters.js';
import { formatNumber } from '../../lib/format.js';

const require = createRequire(import.meta.url);
let chromium = null;
try {
    ({ chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'));
} catch {
    chromium = null;
}
const skip = !chromium && 'Playwright not available (set PLAYWRIGHT_PATH to a playwright package)';

const catalog = require('../../public/assets/data/products.json');
const SLUG = 'antifouling-coatings';
const products = catalog.categories.find(category => category.slug === SLUG).products;
const bounds = priceBounds(products);
const expectedCount = query => filterProducts(products, parseFilters(query, bounds)).length;
const PAGE = `/products/${SLUG}`;

let browser;
before(async () => {
    if (skip) return;
    await startServer();
    browser = await chromium.launch();
});
after(async () => {
    await browser?.close();
    stopServer();
});

async function openPrice(locale = '') {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    return { page, go: async query => {
        await page.goto(`${BASE}${locale}${PAGE}${query}`, { waitUntil: 'networkidle' });
        await page.locator('button[aria-controls^="pop-"]').last().click();
        const sliders = page.locator('[id^="pop-"] input[type=range]');
        await sliders.first().waitFor();
        return { lo: sliders.nth(0), hi: sliders.nth(1) };
    } };
}
const params = page => Object.fromEntries(new URL(page.url()).searchParams);
const waitForParam = (page, key, value) => page.waitForFunction(([k, v]) => new URL(location.href).searchParams.get(k) === v, [key, value]);

test('?min=&max= sets the slider, the chip and the result count', { skip }, async () => {
    const { page, go } = await openPrice();
    const { lo, hi } = await go('?min=100&max=800');
    assert.equal(await lo.inputValue(), '100');
    assert.equal(await hi.inputValue(), '800');
    assert.equal(await lo.getAttribute('aria-valuetext'), '100 DT');
    assert.equal(await page.locator('#results-count').innerText(), `${expectedCount({ min: '100', max: '800' })} products`);
    assert.equal(await page.getByRole('button', { name: 'Remove filter: 100–800 DT' }).count(), 1);
    await page.close();
});

test('keyboard: arrows move a handle, the URL follows after a pause, and the round trip holds', { skip }, async () => {
    const { page, go } = await openPrice();
    const { lo } = await go('?min=100&max=800');
    await lo.focus();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await waitForParam(page, 'min', '103');
    assert.deepEqual(params(page), { min: '103', max: '800' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#results-count', { hasText: `${expectedCount({ min: '103', max: '800' })} products` }).waitFor();
    await page.close();
});

test('drag: releasing the max handle applies it; Full price range resets to a clean URL', { skip }, async () => {
    const { page, go } = await openPrice();
    const { hi } = await go('?min=100&max=800');
    const box = await hi.boundingBox();
    const x = box.x + 22 + (box.width - 44) * ((800 - bounds.min) / (bounds.max - bounds.min));
    await page.mouse.move(x, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x + 30, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    await page.waitForFunction(() => Number(new URL(location.href).searchParams.get('max')) > 800);
    await page.getByRole('button', { name: 'Full price range' }).click();
    await page.waitForFunction(() => !location.search.includes('min') && !location.search.includes('max'));
    await page.locator('#results-count', { hasText: `${products.length} products` }).waitFor();
    await page.close();
});

test('right to left: the handles mirror and ArrowLeft raises the value', { skip }, async () => {
    const { page, go } = await openPrice('/ar');
    const { lo } = await go('?min=1000&max=2000');
    const geometry = await page.evaluate(() => {
        const fill = document.querySelector('[id^="pop-"] [data-range-fill]');
        const track = fill.parentElement.getBoundingClientRect();
        const box = fill.getBoundingClientRect();
        return { fromRight: track.right - box.right, fromLeft: box.left - track.left, width: track.width };
    });
    const at = value => 22 + (geometry.width - 44) * ((value - bounds.min) / (bounds.max - bounds.min));
    assert.ok(Math.abs(geometry.fromRight - at(1000)) < 2, `low handle measured from the right edge (${geometry.fromRight} vs ${at(1000)})`);
    assert.ok(Math.abs(geometry.fromLeft - (geometry.width - at(2000))) < 2, 'high handle towards the left');
    await lo.focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await lo.inputValue(), '1001');
    assert.equal(await lo.getAttribute('aria-valuetext'), `${formatNumber(1001, 'ar', { maximumFractionDigits: 0 })} د.ت`);
    await page.close();
});

test('old ?use= and ?price= links load the whole category with no Use filter', { skip }, async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE}${PAGE}?use=Antifouling&price=50-200`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#results-count').innerText(), `${products.length} products`);
    assert.equal(await page.getByRole('button', { name: /^Use/ }).count(), 0, 'no Use popover');
    assert.equal(await page.locator('nav[aria-label="Use"]').count(), 0, 'no usage pills');
    assert.equal(await page.getByRole('button', { name: /^Remove filter/ }).count(), 0, 'no chips');
    await page.close();
});
