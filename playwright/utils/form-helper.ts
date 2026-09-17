import fs from "fs";
import path from "path";
import { BrowserContext, Locator, Page, expect } from "@playwright/test";
import { PersonalPage } from "../pageobjects/personal.page";
import { AddressPage } from "../pageobjects/address.page";
import { AlternateAddressPage } from "../pageobjects/alternate-address.page";
import { AddressVerificationPage } from "../pageobjects/address-verification.page";
import { AccountPage } from "../pageobjects/account.page";
import { ReviewPage } from "../pageobjects/review.page";
import { AddressFormPage, AddressData, AccountData, PatronData } from "./types";
import { SPINNER_TIMEOUT } from "./constants";

export async function fillPersonalInfo(
  page: PersonalPage | ReviewPage,
  patronData: PatronData
) {
  await fillAndVerify(page.firstNameInput, patronData.firstName);
  await fillAndVerify(page.lastNameInput, patronData.lastName);
  await fillAndVerify(page.dateOfBirthInput, patronData.dateOfBirth);
  await fillAndVerify(page.emailInput, patronData.email);
  if (!patronData.ecommunicationsPref) {
    await clickCheckbox(
      page.receiveInfoCheckboxLabel,
      page.receiveInfoCheckbox
    );
    await expect(page.receiveInfoCheckbox).toHaveJSProperty("checked", false);
  }
}

async function fillAndVerify(locator: Locator, value: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    await locator.fill(value);
    if ((await locator.inputValue()) === value) return;
  }
  throw new Error(
    `Failed to fill field with "${value}" after ${retries} attempts`
  );
}

export async function fillAddress(
  page: AddressFormPage,
  addressData: AddressData
) {
  await fillAndVerify(page.streetAddressInput, addressData.street);
  await fillAndVerify(page.apartmentSuiteInput, addressData.apartmentSuite);
  await fillAndVerify(page.cityInput, addressData.city);
  await page.stateInput.selectOption(addressData.state);
  await fillAndVerify(page.postalCodeInput, addressData.postalCode);
}

export async function fillAccountInfo(
  page: AccountPage | ReviewPage,
  accountData: AccountData
) {
  await fillAndVerify(page.usernameInput, accountData.username);
  await fillAndVerify(page.passwordInput, accountData.password);
  await fillAndVerify(page.verifyPasswordInput, accountData.password);
  await page.selectHomeLibrary.selectOption(accountData.homeLibraryCode);
  if (!(await page.acceptTermsCheckbox.isChecked())) {
    await clickCheckbox(
      page.acceptTermsCheckboxLabel,
      page.acceptTermsCheckbox
    );
    await expect(page.acceptTermsCheckbox).toHaveJSProperty("checked", true);
  }
}

export async function clickNextButton(
  currentPage:
    | PersonalPage
    | AddressPage
    | AlternateAddressPage
    | AddressVerificationPage
    | AccountPage
    | ReviewPage,
  nextButton: Locator,
  nextPageHeading: Locator
): Promise<void> {
  await nextButton.click();

  const errorMessages = getErrorMessages(currentPage);
  const nextPageLoaded = await waitForErrorOrHeading(
    errorMessages,
    nextPageHeading
  );

  if (!nextPageLoaded) {
    const visibleErrors: string[] = [];

    for (const errorMessage of errorMessages) {
      if (await errorMessage.isVisible()) {
        const text = (await errorMessage.textContent())?.trim();
        if (text) {
          visibleErrors.push(text);
        }
      }
    }

    if (visibleErrors.length > 0) {
      throw new Error(
        `nextPageLoaded blocked by form validation errors: ${visibleErrors.join("; ")}`
      );
    }

    throw new Error(
      "Next page heading did not appear and no visible validation error was found."
    );
  }
}

/*
 ** waits for either error messages or next page's heading to display
 ** returns true if the next page heading displays or false if error messages display
 */
export async function waitForErrorOrHeading(
  errorMessages: Locator[],
  nextPageHeading: Locator
): Promise<boolean> {
  return Promise.race([
    ...errorMessages.map((locator) =>
      locator
        .waitFor({ state: "visible", timeout: 1500 })
        .then(() => false)
        .catch(() => new Promise<never>(() => {}))
    ),
    nextPageHeading
      .waitFor({ state: "visible", timeout: SPINNER_TIMEOUT })
      .then(() => true),
  ]);
}

export function getErrorMessages(
  page:
    | PersonalPage
    | AddressPage
    | AlternateAddressPage
    | AddressVerificationPage
    | AccountPage
    | ReviewPage
): Locator[] {
  if (page instanceof PersonalPage) {
    return [
      page.firstNameError,
      page.lastNameError,
      page.dateOfBirthInvalid,
      page.dateOfBirthError,
      page.emailError,
    ];
  } else if (page instanceof AddressPage) {
    return [
      page.streetAddressError,
      page.cityError,
      page.stateError,
      page.postalCodeError,
    ];
  } else if (page instanceof AlternateAddressPage) {
    return [
      page.streetAddressError,
      page.cityError,
      page.stateError,
      page.postalCodeError,
    ];
  } else if (page instanceof AddressVerificationPage) {
    return [page.homeAddressError, page.alternateAddressError];
  } else if (page instanceof AccountPage) {
    return [
      page.usernameError,
      page.passwordError,
      page.verifyPasswordError,
      page.homeLibraryError,
      page.acceptTermsError,
    ];
  } else if (page instanceof ReviewPage) {
    return [
      page.firstNameError,
      page.lastNameError,
      page.dateOfBirthInvalid,
      page.dateOfBirthError,
      page.emailError,
      page.streetAddressError,
      page.cityError,
      page.stateError,
      page.postalCodeError,
      page.usernameError,
      page.unavailableUsernameMessage,
      page.passwordError,
      page.verifyPasswordError,
      page.homeLibraryError,
      page.acceptTermsError,
    ];
  }
  return [];
}

export function getLocaleContent(lang: string) {
  const localePath = path.resolve(
    __dirname,
    `../../public/locales/${lang}/common.json`
  );
  return JSON.parse(fs.readFileSync(localePath, "utf-8"));
}

export const clearContext = async (page: Page, context: BrowserContext) => {
  await context.clearCookies();
  await page.goto("about:blank");
};

// Webkit sometimes doesn't trigger a checkbox state change in the DOM
export async function clickCheckbox(
  checkboxLabel: Locator,
  checkbox: Locator
): Promise<void> {
  await checkboxLabel.click();
  await checkbox.blur();
}
