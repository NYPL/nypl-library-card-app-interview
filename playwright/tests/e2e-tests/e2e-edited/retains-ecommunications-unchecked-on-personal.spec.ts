import { test, expect } from "@playwright/test";
import { PageManager } from "../../../pageobjects/page-manager.page";
import {
  clearContext,
  clickNextButton,
  fillAccountInfo,
  fillAddress,
  fillPersonalInfo,
  getLocaleContent,
} from "../../../utils/form-helper";
import {
  createTestAccount,
  IP,
  PAGE_ROUTES,
  PATRON_TYPES,
  SUPPORTED_LANGUAGES,
  TEST_EDITED_PATRON,
  TEST_OOS_ADDRESS,
} from "../../../utils/constants";
import {
  deletePatron,
  getPatronID,
  verifyPatronData,
} from "../../../utils/sierra-api-utils";

for (const { lang, name } of SUPPORTED_LANGUAGES) {
  test.describe.serial(
    `E2E: Unchecks ecommunications preference on personal page in ${name} (${lang})`,
    { tag: "@e2e" },
    () => {
      let pageManager: PageManager;
      let appContent: any;
      let scrapedBarcode: string | null = null;

      test.beforeEach(async ({ page, context }) => {
        await clearContext(page, context);

        await page.setExtraHTTPHeaders({
          "x-client-ip": IP.NYS_IP,
          "x-forwarded-for": IP.NYS_IP,
          "accept-language": `${lang},en-US;q=0.9`,
        });

        appContent = getLocaleContent(lang);
        pageManager = new PageManager(page, appContent);
      });

      test.afterEach("deletes patron", async () => {
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

      test("unchecks ecommunications preference on personal page", async ({
        page,
      }) => {
        const TEST_ACCOUNT = createTestAccount();
        await test.step("enters personal information with ecomms unchecked", async () => {
          await page.goto(PAGE_ROUTES.PERSONAL(lang));
          await expect(pageManager.personalPage.stepHeading).toBeVisible();
          await fillPersonalInfo(pageManager.personalPage, TEST_EDITED_PATRON);
          await expect(
            pageManager.personalPage.receiveInfoCheckbox
          ).not.toBeChecked();
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

        await test.step("skips alternate address", async () => {
          await expect(
            pageManager.alternateAddressPage.stepHeading
          ).toBeVisible();
          await clickNextButton(
            pageManager.alternateAddressPage,
            pageManager.alternateAddressPage.nextButton,
            pageManager.addressVerificationPage.stepHeading
          );
        });

        await test.step("verifies home address", async () => {
          await expect(
            pageManager.addressVerificationPage.stepHeading
          ).toBeVisible();
          const addressOption =
            pageManager.addressVerificationPage.getHomeAddressOption(
              TEST_OOS_ADDRESS.street
            );
          await addressOption.click();
          await expect(addressOption).toBeChecked();
          await clickNextButton(
            pageManager.addressVerificationPage,
            pageManager.addressVerificationPage.nextButton,
            pageManager.accountPage.stepHeading
          );
        });

        await test.step("enters account information", async () => {
          await page.waitForURL("**/library-card/account**");
          await expect(pageManager.accountPage.stepHeading).toBeVisible();
          await fillAccountInfo(pageManager.accountPage, TEST_ACCOUNT);
          await clickNextButton(
            pageManager.accountPage,
            pageManager.accountPage.nextButton,
            pageManager.reviewPage.stepHeading
          );
        });

        await test.step("confirms ecommunications preference is retained on review page", async () => {
          await page.waitForURL("**/library-card/review**");
          await expect(pageManager.reviewPage.stepHeading).toBeVisible();
          await expect(pageManager.reviewPage.receiveInfoChoice).toBeVisible();
          await pageManager.reviewPage.editPersonalInfoButton.click();
          await expect(
            pageManager.personalPage.receiveInfoCheckbox
          ).not.toBeChecked();
        });

        await test.step("submits application and verifies Sierra data", async () => {
          await expect(pageManager.reviewPage.stepHeading).toBeVisible();
          await clickNextButton(
            pageManager.reviewPage,
            pageManager.reviewPage.submitButton,
            pageManager.congratsPage.temporaryHeading
          );
          scrapedBarcode =
            await pageManager.congratsPage.patronBarcodeNumber.textContent();
          expect(scrapedBarcode).not.toBeNull();
          await verifyPatronData(
            scrapedBarcode,
            TEST_EDITED_PATRON,
            TEST_OOS_ADDRESS,
            PATRON_TYPES.DIGITAL_TEMPORARY
          );
        });
      });
    }
  );
}
