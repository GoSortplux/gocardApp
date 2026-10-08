from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate directly to the dashboard
    page.goto("http://localhost:5173/dashboard")

    # Wait for the charts to be visible
    expect(page.locator("text=Attendance Comparison")).to_be_visible()
    expect(page.locator("text=Message Status")).to_be_visible()

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/dashboard.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
