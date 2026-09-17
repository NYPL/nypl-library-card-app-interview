import { test, expect } from "@playwright/test";
import { PageManager } from "../../../pageobjects/page-manager.page";
import {
  clearContext,
  clickCheckbox,
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
  SUPPORTED_LANGUAGES,
  TEST_EDITED_PATRON,
  TEST_OOS_ADDRESS,
  TEST_PATRON,
} from "../../../utils/constants";
import { deletePatron, getPatronID } from "../../../utils/sierra-api-utils";

for (const { lang, name } of SUPPORTED_LANGUAGES) {
  test.describe.serial(
    `E2E: Retains patron name in ${name} (${lang})`,
    { tag: "@e2e" },
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
          }
        }
      });

      test("retains edited name", async ({ page }) => {
        const TEST_ACCOUNT = createTestAccount();
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
          await pageManager.addressVerificationPage
            .getHomeAddressOption(TEST_OOS_ADDRESS.street)
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

        await test.step("edits personal info on review page", async () => {
          await expect(pageManager.reviewPage.stepHeading).toBeVisible();
          await pageManager.reviewPage.editPersonalInfoButton.click();
          await fillPersonalInfo(pageManager.reviewPage, TEST_EDITED_PATRON);
          await clickCheckbox(
            pageManager.reviewPage.receiveInfoCheckboxLabel,
            pageManager.reviewPage.receiveInfoCheckbox
          );
        });

        await test.step("displays updated personal info on review page", async () => {
          await expect(pageManager.reviewPage.firstNameInput).toHaveValue(
            TEST_EDITED_PATRON.firstName
          );
          await expect(pageManager.reviewPage.lastNameInput).toHaveValue(
            TEST_EDITED_PATRON.lastName
          );
          await expect(pageManager.reviewPage.dateOfBirthInput).toHaveValue(
            TEST_EDITED_PATRON.dateOfBirth
          );
          await expect(pageManager.reviewPage.emailInput).toHaveValue(
            TEST_EDITED_PATRON.email
          );
        });

        await test.step("submits application", async () => {
          await expect(pageManager.reviewPage.submitButton).toBeVisible();
          await clickNextButton(
            pageManager.reviewPage,
            pageManager.reviewPage.submitButton,
            pageManager.congratsPage.temporaryHeading
          );
        });

        await test.step("displays edited name on congrats page", async () => {
          const editedFullName = `${TEST_EDITED_PATRON.firstName} ${TEST_EDITED_PATRON.lastName}`;
          await expect(pageManager.congratsPage.temporaryHeading).toBeVisible();
          await expect(
            pageManager.congratsPage.memberNameHeading
          ).toBeVisible();
          await expect(pageManager.congratsPage.memberName).toHaveText(
            editedFullName
          );
        });

        await test.step("retrieves barcode from congrats page", async () => {
          scrapedBarcode =
            await pageManager.congratsPage.patronBarcodeNumber.textContent();
          expect(scrapedBarcode).not.toBeNull();
        });
      });
    }
  );
}
