import time
from playwright.sync_api import sync_playwright

def verify_a11y():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:8080")
            page.wait_for_selector("text=CouchPotatoPlayer", timeout=5000)

            # Click M3U Playlist button
            page.locator("text=M3U Playlist").click()

            # Fill URL
            page.locator('input[placeholder="M3U Playlist URL"]').fill("http://example.com/playlist.m3u")

            # Click Login
            page.locator("text=Login").click()

            # Wait for Recently Watched text (indicates we're on Home screen)
            page.wait_for_selector("text=Recently Watched", timeout=5000)

            # Wait a moment for rendering
            time.sleep(1)

            html = page.content()

            found_all = True
            labels = ["Live TV", "Movies", "Series", "Search", "Settings"]
            for label in labels:
                if f'aria-label="{label}"' in html:
                    print(f"✅ Found aria-label='{label}'")
                else:
                    print(f"❌ Could not find aria-label='{label}'")
                    found_all = False

            if found_all:
                print("All accessibility labels successfully applied!")

            page.screenshot(path="verification/home_screen.png")
            print("Screenshot saved to verification/home_screen.png")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_a11y()
