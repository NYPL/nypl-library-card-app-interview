import { Page, Locator } from "@playwright/test";

export class PageNotFoundPage {
  readonly page: Page;
  readonly homeBreadcrumb: Locator;
  readonly getALibraryCardBreadcrumb: Locator;
  readonly errorIcon: Locator;
  readonly errorTitle: Locator;
  readonly errorMessage: Locator;
  readonly homeLink: Locator;
  readonly getALibraryCardLink: Locator;
  readonly newApplicationLink: Locator;
  readonly contactUsLink: Locator;

  constructor(page: Page) {
    this.homeBreadcrumb = page.getByRole("link", { name: "Home" });

    this.getALibraryCardBreadcrumb = page
      .locator("#mainHeader")
      .getByRole("link", { name: "Get A Library Card" });

    this.errorIcon = page.locator("#mainContent").locator("svg");

    this.errorTitle = page.getByRole("heading", {
      name: "We couldn't find that page",
      level: 2,
    });

    this.errorMessage = page.getByText(
      "The page you were looking for doesn't exist or may have moved elsewhere."
    );

    this.newApplicationLink = page.getByRole("link", {
      name: "new application",
    });

    this.contactUsLink = page.getByRole("link", { name: "contact us" });
  }
}
