from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to local app...")
            page.goto("http://localhost:8081")

            print("Waiting for Welcome page...")
            page.wait_for_selector("text=Welcome", timeout=10000)

            print("Taking screenshot...")
            page.screenshot(path="verification_welcome.png")
            print("Screenshot saved to verification_welcome.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
