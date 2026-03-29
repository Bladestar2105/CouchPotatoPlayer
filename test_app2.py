from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8081")
    page.wait_for_timeout(2000)
    page.get_by_text("M3U Playlist").click()
    page.wait_for_timeout(500)
    page.locator("input").nth(0).fill("Test Provider")
    page.locator("input").nth(1).fill("https://iptv-org.github.io/iptv/index.m3u")
    page.get_by_text("Login").click()
    page.wait_for_timeout(5000)
    page.screenshot(path="verify_app2.png")
    browser.close()
