import asyncio
from playwright.async_api import async_playwright
import time

async def verify():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})

        # Navigate to the local server
        print("Navigating to http://localhost:8081...")
        await page.goto('http://localhost:8081', wait_until='networkidle')
        await asyncio.sleep(3) # Let UI initialize

        print("Taking initial screenshot...")
        await page.screenshot(path="sidebar_initial.png")

        print("Pressing Tab to start navigating...")
        # Press Tab repeatedly to try to get focus onto the sidebar items
        # On React Native Web, focus management can be tricky, but we'll try tab navigation
        for i in range(5):
            await page.keyboard.press('Tab')
            await asyncio.sleep(0.5)
            await page.screenshot(path=f"sidebar_tab_{i}.png")
            print(f"Captured tab state {i}")

        print("Verification complete.")
        await browser.close()

asyncio.run(verify())
