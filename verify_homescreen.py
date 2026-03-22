from playwright.sync_api import sync_playwright
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to simulate a TV screen
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        page.goto("http://localhost:8081", wait_until='networkidle')

        # Insert a mock profile into localStorage with real credentials
        mock_profiles = '[{"id": "test_profile_123", "name": "Real Test", "type": "xtream", "url": "https://stream.team-ei.de", "username": "yoshisan", "password": "Ss21051988", "icon": "tv"}]'

        page.evaluate(f"window.localStorage.setItem('IPTV_PROFILES', '{mock_profiles}')")
        page.evaluate(f"window.localStorage.setItem('IPTV_CURRENT_PROFILE', 'test_profile_123')")

        # Reload so context picks up the mock profile
        page.reload(wait_until='networkidle')

        print("Waiting for data to load...")
        # Give the app time to fetch xtream API and EPG data
        page.wait_for_timeout(10000)

        # Take a screenshot
        page.screenshot(path="homescreen_verification.png", full_page=True)
        print("Screenshot saved to homescreen_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()