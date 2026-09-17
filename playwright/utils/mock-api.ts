import { Page } from "@playwright/test";
import { PATRON_TYPES } from "./constants";
import { AddressData } from "./types";

export const usernameResponse = {
  available: {
    status: 200,
    message: "This username is available.",
  },
  unavailable: {
    status: 409,
    message: "This username is unavailable. Please try another.",
  },
};

export async function mockUsernameApi(
  page: Page,
  availability: "available" | "unavailable"
) {
  await page.route("**/library-card/api/username", async (route) => {
    const { status, message } = usernameResponse[availability];
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ message }),
    });
  });
}

export const createPatronErrorResponse = {
  status: 502,
  message:
    "Our systems are currently unavailable. Please try submitting your application again in a few minutes.",
};

type MockCreatePatronApiExtras = {
  error?: { status: number; message: string };
  offline?: boolean;
};

export async function mockCreatePatronApi(
  page: Page,
  name: string,
  barcode: string,
  expirationDate: string,
  ptype: number = PATRON_TYPES.DIGITAL_TEMPORARY,
  extras?: MockCreatePatronApiExtras
) {
  await page.route("**/library-card/api/create-patron", async (route) => {
    if (extras?.offline) {
      await route.abort("internetdisconnected");
      return;
    }

    if (extras?.error) {
      await route.fulfill({
        status: extras.error.status,
        contentType: "application/json",
        body: JSON.stringify({ message: extras.error.message }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name, barcode, ptype, expirationDate }),
    });
  });
}

export async function mockCreatePatronApiServerError(page: Page) {
  return mockCreatePatronApi(page, "", "", "", PATRON_TYPES.DIGITAL_TEMPORARY, {
    error: createPatronErrorResponse,
  });
}

export async function mockCreatePatronApiOffline(page: Page) {
  return mockCreatePatronApi(page, "", "", "", PATRON_TYPES.DIGITAL_TEMPORARY, {
    offline: true,
  });
}

export async function mockCreateAddress(page: Page, address: AddressData) {
  await page.route("**/library-card/api/address", async (route) => {
    const addressData = {
      line1: address.street,
      city: address.city,
      state: address.state,
      zip: address.postalCode,
      hasBeenValidated: true,
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        address: addressData,
        addresses: [],
        success: true,
      }),
    });
  });
}
