from playwright.sync_api import sync_playwright

def test_login_and_navigate_to_categories():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to simulate a TV screen
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8081", wait_until='networkidle')

        print("Filling in Xtream credentials...")
        page.get_by_placeholder("Provider Name").fill("Real Test")
        page.get_by_placeholder("Server URL (http://...)").fill("https://stream.team-ei.de")
        page.get_by_placeholder("Username").fill("yoshisan")
        page.get_by_placeholder("Password").fill("Ss21051988")

        print("Clicking Login...")
        page.get_by_text("Login").click()

        print("Waiting for playlist prompt to appear...")
        # Handle native browser prompts
        page.on("dialog", lambda dialog: dialog.accept())

        # Wait for the MainLayout to render, or error text
        try:
            page.wait_for_selector('text="MENU"', timeout=15000)
            print("Sidebar rendered successfully.")
        except Exception as e:
            print("Timeout waiting for sidebar. Checking for errors.")
            page.screenshot(path="error_state.png", full_page=True)

            # Use javascript evaluation to see if there is an error
            # Since React Native web might obfuscate classes
            error = page.evaluate('''(function() {
                var el = document.querySelector('[style*="color: rgb(255, 69, 58)"]');
                return el ? el.innerText : null;
            })()''')
            if error:
                 print(f"Detected error on screen: {error}")

            browser.close()
            return

        print("Waiting for Categories to load...")
        page.wait_for_timeout(10000)

        # Take a screenshot to verify UI
        page.screenshot(path="homescreen_real_data.png", full_page=True)
        print("Screenshot saved to homescreen_real_data.png")

        # Let's interact with the menu
        print("Focusing on Movies tab...")
        page.get_by_label("movies").click()
        page.wait_for_timeout(4000)

        page.screenshot(path="movies_tab_real_data.png", full_page=True)
        print("Screenshot saved to movies_tab_real_data.png")

        browser.close()

if __name__ == "__main__":
    test_login_and_navigate_to_categories()