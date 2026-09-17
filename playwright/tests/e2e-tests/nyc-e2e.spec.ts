import { test, expect } from "@playwright/test";
import { PageManager } from "../../pageobjects/page-manager.page";
import {
  clearContext,
  clickCheckbox,
  clickNextButton,
  fillAccountInfo,
  fillAddress,
  fillPersonalInfo,
  getLocaleContent,
} from "../../utils/form-helper";
import {
  createTestAccount,
  EXPECTED_BARCODE_PREFIX,
  IP,
  PAGE_ROUTES,
  PATRON_TYPES,
  SUPPORTED_LANGUAGES,
  TEST_NYC_ADDRESS,
  TEST_PATRON,
} from "../../utils/constants";
import {
  deletePatron,
  getPatronID,
  verifyPatronData,
} from "../../utils/sierra-api-utils";

for (const { lang, name } of SUPPORTED_LANGUAGES) {
  test.describe.serial(
    `E2E: Complete NYC patron application with Sierra API integration in ${name} (${lang})`,
    { tag: ["@release", "@e2e"] },
    () => {
      let pageManager: PageManager;
      let appContent: any;
      let scrapedBarcode: string | null = null;

      test.beforeEach(async ({ page, context }) => {
        await clearContext(page, context);

        await page.setExtraHTTPHeaders({
          "x-client-ip": IP.NYC_IP,
          "x-forwarded-for": IP.NYC_IP,
          "accept-language": `${lang},en-US;q=0.9`,
        });
        appContent = getLocaleContent(lang);
        pageManager = new PageManager(page, appContent);
      });

      test.afterAll("deletes patron", async () => {
        if (scrapedBarcode) {
          try {
            const patronID = await getPatronID(scrapedBarcode);

            if (patronID) {
              await deletePatron(patronID);
            }
          } catch (error) {
            console.error("Error during patron deletion:", error);
          } finally {
            scrapedBarcode = null;
          }
        }
      });

      test("submits NYC patron application", async ({ page }) => {
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
          await fillAddress(pageManager.addressPage, TEST_NYC_ADDRESS);
          await clickNextButton(
            pageManager.addressPage,
            pageManager.addressPage.nextButton,
            pageManager.addressVerificationPage.stepHeading
          );
        });

        await test.step("verifies home address", async () => {
          await expect(
            pageManager.addressVerificationPage.stepHeading
          ).toBeVisible();
          await pageManager.addressVerificationPage
            .getHomeAddressOption(TEST_NYC_ADDRESS.street)
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

        await test.step("displays personal information on review page", async () => {
          await expect(pageManager.reviewPage.stepHeading).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_PATRON.firstName)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_PATRON.lastName)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_PATRON.dateOfBirth)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_PATRON.email)
          ).toBeVisible();
          await expect(pageManager.reviewPage.receiveInfoChoice).toBeVisible();
        });

        await test.step("displays home address on review page", async () => {
          await expect(
            pageManager.reviewPage.getText(TEST_NYC_ADDRESS.street)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_NYC_ADDRESS.city)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_NYC_ADDRESS.state)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.getText(TEST_NYC_ADDRESS.postalCode)
          ).toBeVisible();
        });

        await test.step("displays account information on review page", async () => {
          await expect(
            pageManager.reviewPage.getText(TEST_ACCOUNT.username)
          ).toBeVisible();
          await expect(
            pageManager.reviewPage.showPasswordCheckboxLabel
          ).toBeVisible();
          await clickCheckbox(
            pageManager.reviewPage.showPasswordCheckboxLabel,
            pageManager.reviewPage.showPasswordCheckbox
          );
          await expect(
            pageManager.reviewPage.getText(TEST_ACCOUNT.password)
          ).toBeVisible();
        });

        await test.step("submits application", async () => {
          await expect(pageManager.reviewPage.submitButton).toBeVisible();
          await clickNextButton(
            pageManager.reviewPage,
            pageManager.reviewPage.submitButton,
            pageManager.congratsPage.metroOrNonMetroHeading
          );
        });

        await test.step("displays metro card elements on congrats page", async () => {
          await expect(pageManager.congratsPage.mainHeading).toBeVisible();
          await expect(
            pageManager.congratsPage.metroOrNonMetroHeading
          ).toBeVisible();
          await expect(pageManager.congratsPage.readListenLink).toBeVisible();
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
          await expect(
            pageManager.congratsPage.patronBarcodeNumber
          ).toBeVisible();
          await expect(
            pageManager.congratsPage.patronBarcodeNumber
          ).toContainText(EXPECTED_BARCODE_PREFIX);
        });

        await test.step("verifies patron data in Sierra database", async () => {
          scrapedBarcode =
            await pageManager.congratsPage.patronBarcodeNumber.textContent();
          expect(scrapedBarcode).not.toBeNull();
          await verifyPatronData(
            scrapedBarcode,
            TEST_PATRON,
            TEST_NYC_ADDRESS,
            PATRON_TYPES.DIGITAL_METRO
          );
        });
      });
    }
  );
}
