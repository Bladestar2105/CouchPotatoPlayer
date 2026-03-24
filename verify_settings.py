from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_settings(page: Page):
    page.goto("http://localhost:8081", wait_until="networkidle")

    print("Waiting for page to load...")
    time.sleep(3)

    # Check if we are on the welcome screen
    try:
        # If we see Welcome screen, fill login
        if page.locator("text='M3U Playlist'").is_visible():
            print("Adding test profile...")
            page.get_by_text("M3U Playlist").click()
            page.locator("input[placeholder='Provider Name']").fill("Test Profile")
            page.locator("input[placeholder='M3U Playlist URL']").fill("https://iptv-org.github.io/iptv/index.m3u")

            # Click Login
            page.evaluate("() => { Array.from(document.querySelectorAll('div')).find(el => el.textContent === 'Login').click(); }")
            print("Waiting for app to load after login...")
            time.sleep(10)
    except Exception as e:
        print(f"Login failed or skipped: {e}")

    page.screenshot(path="verification_after_login_new.png", full_page=True)

    # Try to find the Settings button
    try:
        print("Navigating to settings...")
        # Since it's a React Native Web app, roles are usually 'button'
        # Let's try to find the button that has 'settings' or 'Einstellungen' in aria-label
        # Or just the 7th button in the sidebar since we know the order:
        # Toggle, Search, Channels, Movies, Series, Favorites, Recent, Settings
        # Wait, the toggle is the 1st. Settings is the 8th.

        page.evaluate('''() => {
            const buttons = Array.from(document.querySelectorAll('[role="button"]'));
            // Try to find by aria-label
            const settingsBtn = buttons.find(b =>
                b.getAttribute('aria-label') === 'Settings' ||
                b.getAttribute('aria-label') === 'Einstellungen' ||
                b.getAttribute('aria-label') === 'settings'
            );
            if (settingsBtn) {
                settingsBtn.click();
            } else {
                // Fallback: Click the 8th button (index 7) which should be Settings
                buttons[7].click();
            }
        }''')

        time.sleep(3)

        # Take screenshot of settings screen
        print("Taking settings screenshot...")
        page.screenshot(path="verification_settings.png", full_page=True)
    except Exception as e:
        print(f"Failed to navigate to settings: {e}")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        try:
            verify_settings(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
