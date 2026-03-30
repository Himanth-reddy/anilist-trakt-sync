import asyncio
from playwright.async_api import async_playwright
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto("http://localhost:3000")
        await page.wait_for_selector("nav")
        await page.screenshot(path="screenshot_home.png")

        await page.goto("http://localhost:3000/sync")
        await page.wait_for_selector("h3")
        await page.screenshot(path="screenshot_sync.png")

        await browser.close()

asyncio.run(main())
