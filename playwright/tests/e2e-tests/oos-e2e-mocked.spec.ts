import { test, expect } from "@playwright/test";
import {
  clearContext,
  clickNextButton,
  fillAccountInfo,
  fillAddress,
  fillPersonalInfo,
  getLocaleContent,
} from "../../utils/form-helper";
import {
  createTestAccount,
  PAGE_ROUTES,
  PATRON_TYPES,
  SUPPORTED_LANGUAGES,
  TEST_BARCODE_NUMBER,
  TEST_EXPIRATION_DATE,
  TEST_NYC_ADDRESS,
  TEST_OOS_ADDRESS,
  TEST_PATRON,
} from "../../utils/constants";
import { mockCreatePatronApi } from "../../utils/mock-api";
import { PageManager } from "../../pageobjects/page-manager.page";

for (const { lang, name } of SUPPORTED_LANGUAGES) {
  test.describe.serial(
    `E2E: Complete OOS patron application using mocked submit in ${name} (${lang})`,
    { tag: "@e2e" },
    () => {
      let pageManager: PageManager;
      let appContent: any;

      test.beforeEach(async ({ page, context }) => {
        await clearContext(page, context);

        appContent = getLocaleContent(lang);
        pageManager = new PageManager(page, appContent);
      });

      test("submits OOS patron application", async ({ page }) => {
        const TEST_ACCOUNT = createTestAccount();
        const fullName = `${TEST_PATRON.firstName} ${TEST_PATRON.lastName}`;

        await test.step("begins at landing", async () => {
          await page.goto(PAGE_ROUTES.LANDING(lang));
          await expect(pageManager.landingPage.applyHeading).toBeVisible();
          await pageManager.landingPage.getStartedButton.click();
        });

        await test.step("enters personal information", async () => {
          await expect(pageManager.personalPage.stepHeading).toBeVisible();
          await fillPersonalInfo(pageManager.personalPage, TEST_PATRON);
          await clickNextButton(
            pageManager.personalPage,
            pageManager.personalPage.nextButton,
            pageManager.addressPage.stepHeading
          );
        });

        await test.step("enters home address", async () => {
          await expect(pageManager.addressPage.stepHeading).toBeVisible();
          await fillAddress(pageManager.addressPage, TEST_OOS_ADDRESS);
          await clickNextButton(
            pageManager.addressPage,
            pageManager.addressPage.nextButton,
            pageManager.alternateAddressPage.stepHeading
          );
        });

        await test.step("enters alternate address", async () => {
          await expect(
            pageManager.alternateAddressPage.stepHeading
          ).toBeVisible();
          await fillAddress(pageManager.alternateAddressPage, TEST_NYC_ADDRESS);
          await clickNextButton(
            pageManager.alternateAddressPage,
            pageManager.alternateAddressPage.nextButton,
            pageManager.addressVerificationPage.stepHeading
          );
        });

        await test.step("verifies home and alternate addresses", async () => {
          await expect(
            pageManager.addressVerificationPage.stepHeading
          ).toBeVisible();
          await pageManager.addressVerificationPage
            .getHomeAddressOption(TEST_OOS_ADDRESS.street)
            .click();
          await pageManager.addressVerificationPage
            .getAlternateAddressOption(TEST_NYC_ADDRESS.street)
            .click();
          await clickNextButton(
            pageManager.addressVerificationPage,
            pageManager.addressVerificationPage.nextButton,
            pageManager.accountPage.stepHeading
          );
        });

        await test.step("enters account information", async () => {
          await expect(pageManager.accountPage.stepHeading).toBeVisible();
          await fillAccountInfo(pageManager.accountPage, TEST_ACCOUNT);
          await clickNextButton(
            pageManager.accountPage,
            pageManager.accountPage.nextButton,
            pageManager.reviewPage.stepHeading
          );
        });

        await test.step("displays review page", async () => {
          await expect(pageManager.reviewPage.stepHeading).toBeVisible();
        });

        await test.step("submits application", async () => {
          await mockCreatePatronApi(
            page,
            fullName,
            TEST_BARCODE_NUMBER,
            TEST_EXPIRATION_DATE,
            PATRON_TYPES.DIGITAL_TEMPORARY
          );
          await expect(pageManager.reviewPage.submitButton).toBeVisible();
          await clickNextButton(
            pageManager.reviewPage,
            pageManager.reviewPage.submitButton,
            pageManager.congratsPage.temporaryHeading
          );
        });

        await test.step("displays temporary card elements on congrats page", async () => {
          await expect(pageManager.congratsPage.mainHeading).toBeVisible();
          await expect(pageManager.congratsPage.temporaryHeading).toBeVisible();
          await expect(
            pageManager.congratsPage.temporaryCardBanner
          ).toBeVisible();
          await expect(pageManager.congratsPage.learnMoreLink).toBeVisible();
          await expect(pageManager.congratsPage.getHelpEmailLink).toBeVisible();
        });

        await test.step("displays generated library card on congrats page", async () => {
          await expect(
            pageManager.congratsPage.memberNameHeading
          ).toBeVisible();
          await expect(pageManager.congratsPage.memberName).toHaveText(
            fullName
          );
          await expect(
            pageManager.congratsPage.expireDateHeading
          ).toBeVisible();
          await expect(pageManager.congratsPage.expireDate).toBeVisible();
          await expect(pageManager.congratsPage.patronBarcodeNumber).toHaveText(
            TEST_BARCODE_NUMBER
          );
        });
      });
    }
  );
}
