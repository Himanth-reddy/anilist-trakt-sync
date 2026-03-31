import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture Mappings page - empty state
        # Route to mock empty responses
        async def handle_mappings(route):
            await route.fulfill(json={"manual": [], "auto": []})

        await page.route("**/api/mappings", handle_mappings)
        await page.goto("http://localhost:3000/mappings")
        await page.wait_for_selector("text=No mappings found")
        await page.screenshot(path="screenshot_mappings_empty.png")

        # Unroute for next tests
        await page.unroute("**/api/mappings", handle_mappings)

        # Capture Dashboard - empty state and loading
        # Route to mock empty sync progress and delay it to capture loading state
        async def handle_progress(route):
            await asyncio.sleep(2) # add delay to show loading state
            await route.fulfill(json={"count": 0, "items": []})

        await page.route("**/api/progress?limit=12", handle_progress)

        # Navigate and wait for the 'aria-busy' state on the specific table instead of the button which might not be named exactly "Refreshing..." or may be too brief.
        await page.goto("http://localhost:3000")

        # For the home page, the fetching of progress data happens automatically on load,
        # but the loading state `progressLoading` might not be set to true on initial mount
        # because the initial effect just calls fetch. We should click the refresh button to trigger
        # the true loading state.
        await page.wait_for_selector("button:has-text('Update')")

        # Click the update button for Sync Progress specifically.
        # Ensure we don't click until the initial requests are done to avoid state bugs.
        await page.wait_for_selector("text=No progress rows yet")

        await page.click("button[aria-label='Update Sync Progress']")

        # We know the specific table for progress is loading because its aria-busy attr is set
        await page.wait_for_selector("table[aria-busy='true']")
        await page.screenshot(path="screenshot_home_loading.png")

        # Wait for the mocked response to resolve and render the empty state
        await page.wait_for_selector("table:not([aria-busy='true'])")
        await page.wait_for_selector("text=No progress rows yet")
        await page.screenshot(path="screenshot_home_empty.png")

        await browser.close()

asyncio.run(main())
