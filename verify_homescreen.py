from playwright.sync_api import sync_playwright

def verify_homescreen():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local Expo web server
        page.goto("http://localhost:8081", wait_until="networkidle")

        # Wait a bit for React to render and the context to settle
        page.wait_for_timeout(3000)

        # Take a screenshot
        page.screenshot(path="homescreen_verification.png", full_page=True)

        print("Screenshot saved to homescreen_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_homescreen()
