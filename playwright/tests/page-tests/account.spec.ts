import { test, expect } from "@playwright/test";
import { AccountPage } from "../../pageobjects/account.page";
import { fillAccountInfo } from "../../utils/form-helper";
import {
  PAGE_ROUTES,
  SUPPORTED_LANGUAGES,
  TEST_ACCOUNT,
} from "../../utils/constants";
import { mockUsernameApi } from "../../utils/mock-api";

const VALID_USERNAME = "ValidUser1";
const VALID_HOME_LIBRARY = "vr";

for (const { lang, name } of SUPPORTED_LANGUAGES) {
  test.describe(
    `account page tests in ${name} (${lang})`,
    { tag: ["@regression", "@api"] },
    () => {
      let accountPage: AccountPage;
      let appContent: any;

      test.beforeEach(async ({ page }) => {
        appContent = require(`../../../public/locales/${lang}/common.json`);
        accountPage = new AccountPage(page, appContent, lang);
        await page.goto(PAGE_ROUTES.ACCOUNT(lang));
      });

      const fillNonPasswordFields = async () => {
        await accountPage.usernameInput.fill(VALID_USERNAME);
        await accountPage.selectHomeLibrary.selectOption(VALID_HOME_LIBRARY);
        await accountPage.acceptTermsCheckboxLabel.click();
      };

      test.describe("displays elements", () => {
        test("displays headings and buttons", async () => {
          await expect(accountPage.mainHeading).toBeVisible();
          await expect(accountPage.stepHeading).toBeVisible();
          await expect(accountPage.homeLibraryHeading).toBeVisible();
          await expect(accountPage.nextButton).toBeVisible();
          await expect(accountPage.previousButton).toBeVisible();
        });

        test("displays username and password form", async () => {
          await expect(accountPage.usernameInput).toBeVisible();
          await expect(accountPage.availableUsernameButton).toBeVisible();
          await expect(accountPage.passwordInput).toBeVisible();
          await expect(accountPage.verifyPasswordInput).toBeVisible();
          await expect(accountPage.showPasswordCheckboxLabel).toBeVisible();
        });

        test("displays home library form", async () => {
          await expect(accountPage.nyplLocationLink).toBeVisible();
          await expect(accountPage.selectHomeLibrary).toBeVisible();
          await expect(accountPage.cardholderTerms).toBeVisible();
          await expect(accountPage.rulesRegulations).toBeVisible();
          await expect(accountPage.privacyPolicy).toBeVisible();
          await expect(accountPage.acceptTermsCheckboxLabel).toBeVisible();
        });

        test("confirms links open in new tab", async () => {
          const links = [
            accountPage.nyplLocationLink,
            accountPage.cardholderTerms,
            accountPage.rulesRegulations,
            accountPage.privacyPolicy,
          ];
          for (const link of links) {
            await expect(link).toHaveAttribute("target", "_blank");
            await expect(link).toHaveAttribute(
              "rel",
              "nofollow noopener noreferrer"
            );
          }
        });
      });

      test.describe("enters account information", () => {
        test("displays entered values in form fields", async () => {
          await fillAccountInfo(accountPage, TEST_ACCOUNT);
          await expect(accountPage.usernameInput).toHaveValue(
            TEST_ACCOUNT.username
          );
          await accountPage.showPasswordCheckboxLabel.click();
          await expect(accountPage.passwordInput).toHaveValue(
            TEST_ACCOUNT.password
          );
          await expect(accountPage.verifyPasswordInput).toHaveValue(
            TEST_ACCOUNT.password
          );
          await expect(accountPage.selectHomeLibrary).toHaveValue(
            TEST_ACCOUNT.homeLibraryCode
          );
          await expect(accountPage.acceptTermsCheckbox).toBeChecked();
        });
      });

      test.describe("mocks API responses on account page", () => {
        test("displays username available message", async ({ page }) => {
          await mockUsernameApi(page, "available");
          await accountPage.usernameInput.fill("AvailableUsername");
          await accountPage.availableUsernameButton.click();
          await expect(accountPage.availableUsernameMessage).toBeVisible();
        });

        test("displays username unavailable error message", async ({
          page,
        }) => {
          await mockUsernameApi(page, "unavailable");
          await accountPage.usernameInput.fill("UnavailableUsername");
          await accountPage.availableUsernameButton.click();
          await expect(accountPage.unavailableUsernameMessage).toBeVisible();
        });
      });

      test.describe("displays error messages", () => {
        test("displays errors for required fields", async () => {
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).toBeVisible();
          await expect(accountPage.passwordError).toBeVisible();
          await expect(accountPage.homeLibraryError).toBeVisible();
          await expect(accountPage.acceptTermsError).toBeVisible();
        });

        test("displays error when special characters in username", async () => {
          await accountPage.usernameInput.fill("User!@#");
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).toBeVisible();
        });

        test("displays error when non-Latin characters in username", async () => {
          await accountPage.usernameInput.fill("用戶名用戶名");
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).toBeVisible();
        });

        test("displays error when passwords do not match", async () => {
          await accountPage.usernameInput.fill(VALID_USERNAME);
          await accountPage.passwordInput.fill("ValidPass1!");
          await accountPage.verifyPasswordInput.fill("DifferentPass1!");
          await accountPage.nextButton.click();
          await expect(accountPage.verifyPasswordError).toBeVisible();
        });

        test("displays error when terms are not accepted", async () => {
          await accountPage.usernameInput.fill(VALID_USERNAME);
          await accountPage.passwordInput.fill("ValidPass1!");
          await accountPage.verifyPasswordInput.fill("ValidPass1!");
          await accountPage.selectHomeLibrary.selectOption(VALID_HOME_LIBRARY);
          await accountPage.nextButton.click();
          await expect(accountPage.acceptTermsError).toBeVisible();
        });

        test("displays error with too many characters", async () => {
          await accountPage.usernameInput.fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
          await accountPage.passwordInput.fill(
            "123456789012345678901234567890123"
          );
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).toBeVisible();
          await expect(accountPage.passwordError).toBeVisible();
        });

        test("displays error with too few characters", async () => {
          await accountPage.usernameInput.fill("A");
          await accountPage.passwordInput.fill("1!");
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).toBeVisible();
          await expect(accountPage.passwordError).toBeVisible();
        });
      });

      test.describe("password complexity validation", () => {
        test.describe("repeating character (3+ consecutive) fails", () => {
          const cases = [
            { label: "repeat at start", password: "aaaaTest1" },
            { label: "repeat in middle/end", password: "Testaaaa1" },
          ];

          for (const { label, password } of cases) {
            test(`displays error when password has a repeated character - ${label}`, async () => {
              await fillNonPasswordFields();
              await accountPage.passwordInput.fill(password);
              await accountPage.verifyPasswordInput.fill(password);
              await accountPage.nextButton.click();
              await expect(accountPage.passwordError).toBeVisible();
            });
          }
        });

        test.describe("repeating pattern (up to 4-char sequence repeated) fails", () => {
          const cases = [
            { label: "2-character pattern", password: "abab1234" },
            { label: "3-character pattern", password: "abcabc12" },
            { label: "4-character pattern", password: "abcdabcd" },
            {
              label: "pattern embedded in longer password",
              password: "x7gp3434",
            },
          ];

          for (const { label, password } of cases) {
            test(`displays error when password has a repeating pattern - ${label}`, async () => {
              await fillNonPasswordFields();
              await accountPage.passwordInput.fill(password);
              await accountPage.verifyPasswordInput.fill(password);
              await accountPage.nextButton.click();
              await expect(accountPage.passwordError).toBeVisible();
            });
          }
        });

        test.describe("length validation", () => {
          test("displays error when password is below 8 characters", async () => {
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill("Ab1!xy");
            await accountPage.verifyPasswordInput.fill("Ab1!xy");
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).toBeVisible();
          });

          test("allows password exactly 8 characters", async () => {
            const password = "Vk9!mQ2#";
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill(password);
            await accountPage.verifyPasswordInput.fill(password);
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).not.toBeVisible();
          });

          test("allows password exactly 32 characters", async () => {
            const password = "Vk9!mQ2#Xr5$Lt8^Bn3&Pj6*Wc4~Yz1?";
            expect(password.length).toBe(32);
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill(password);
            await accountPage.verifyPasswordInput.fill(password);
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).not.toBeVisible();
          });

          test("displays error when password is above 32 characters", async () => {
            const password = "Vk9!mQ2#Xr5$Lt8^Bn3&Pj6*Wc4~Yz1?A";
            expect(password.length).toBe(33);
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill(password);
            await accountPage.verifyPasswordInput.fill(password);
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).toBeVisible();
          });
        });

        test.describe("special character validation", () => {
          test("allows password using only allowed special characters", async () => {
            const password = "Val1d.Pass~!?@#";
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill(password);
            await accountPage.verifyPasswordInput.fill(password);
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).not.toBeVisible();
          });

          const disallowedCases = [
            { label: "plus sign", password: "ValidPass1+" },
            { label: "equals sign", password: "ValidPass1=" },
            { label: "curly braces", password: "ValidPass{1}" },
            { label: "square brackets", password: "ValidPass[1]" },
          ];

          for (const { label, password } of disallowedCases) {
            test(`displays error when password contains a disallowed special character - ${label}`, async () => {
              await fillNonPasswordFields();
              await accountPage.passwordInput.fill(password);
              await accountPage.verifyPasswordInput.fill(password);
              await accountPage.nextButton.click();
              await expect(accountPage.passwordError).toBeVisible();
            });
          }
        });

        test("allows a fully valid password and submits successfully", async () => {
          const password = "Sunshine7!";
          await fillNonPasswordFields();
          await accountPage.passwordInput.fill(password);
          await accountPage.verifyPasswordInput.fill(password);
          await accountPage.nextButton.click();
          await expect(accountPage.usernameError).not.toBeVisible();
          await expect(accountPage.passwordError).not.toBeVisible();
          await expect(accountPage.verifyPasswordError).not.toBeVisible();
          await expect(accountPage.homeLibraryError).not.toBeVisible();
          await expect(accountPage.acceptTermsError).not.toBeVisible();
        });

        test("verify password field triggers the same validation rules as password field", async () => {
          await fillNonPasswordFields();
          await accountPage.passwordInput.fill("Vk9!mQ2#");
          await accountPage.verifyPasswordInput.fill("abcabc12");
          await accountPage.nextButton.click();
          await expect(accountPage.verifyPasswordError).toBeVisible();
        });
      });

      test.describe("regression - previously valid passwords", () => {
        const previouslyValidPasswords = [TEST_ACCOUNT.password, "ValidPass1!"];

        for (const password of previouslyValidPasswords) {
          test(`still allows previously valid password: ${password}`, async () => {
            await fillNonPasswordFields();
            await accountPage.passwordInput.fill(password);
            await accountPage.verifyPasswordInput.fill(password);
            await accountPage.nextButton.click();
            await expect(accountPage.passwordError).not.toBeVisible();
          });
        }
      });
    }
  );
}
