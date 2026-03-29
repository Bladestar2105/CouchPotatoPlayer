from playwright.sync_api import Page, expect, sync_playwright
import time
import os
import json

def test_settings_screen(page: Page):
    page.goto("http://localhost:8081")

    # Wait for the app to load
    page.wait_for_timeout(2000)

    # Switch to M3U Playlist tab
    page.get_by_text("M3U Playlist").click()
    page.wait_for_timeout(500)

    # Fill inputs
    page.locator("input").nth(0).fill("Test Provider")
    page.locator("input").nth(1).fill("https://iptv-org.github.io/iptv/index.m3u")

    # Click Login
    page.get_by_text("Login").click()

    # Wait for Home screen to load
    page.wait_for_timeout(6000)

    try:
        settings_icon = page.locator("div[role='tab']").nth(6)
        settings_icon.click()
        page.wait_for_timeout(2000)
    except Exception as e:
        print("Could not find Settings via icon...", e)

    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/settings_screen_final2.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_settings_screen(page)
        finally:
            browser.close()
