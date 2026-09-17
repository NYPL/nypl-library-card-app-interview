import isEmpty from "lodash/isEmpty";
import { PageTitles } from "../interfaces";
import { NextRouter } from "next/router";
import { isAlphanumeric } from "validator";

const redirectIfUserHasRegistered = async (
  hasRegistered: boolean,
  router: NextRouter
) => {
  if (hasRegistered) {
    await router.push("/congrats?newCard=true");
  }
};

/**
 * homePageRedirect
 * Function that should be used in `getStaticProps` or `getServerSideProps`.
 * This returns a redirect object that those functions understand.
 */
const homePageRedirect = () => ({
  redirect: {
    destination: "/new",
    permanent: false,
  },
});

/**
 * getPageTitles
 * Returns the page titles and updates the titles if the user is not in "nyc".
 */
function getPageTitles(): PageTitles {
  // The "nyc" case is the only case when we don't need the work address from
  // users so we don't show it. The work address is needed for the empty,
  // "nys", and "us" cases. Now an extra page is added to the
  // form submission flow.
  return {
    personal: "Step 1 of 5: Personal information",
    address: "Step 2 of 5: Address",
    workAddress: "Alternate address",
    verification: "Step 3 of 5: Address verification",
    account: "Step 4 of 5: Customize your account",
    review: "Step 5 of 5: Confirm your information",
  };
}

const nyCounties = ["richmond", "queens", "new york", "kings", "bronx"];
const nyCities = [
  "new york",
  "new york city",
  "nyc",
  "bronx",
  "queens",
  "brooklyn",
  "staten island",
];

/**
 * createQueryParams
 * Converts an object into key/value pairs to be use as url query params.
 */
const createQueryParams = (obj = {}) => {
  let query = "";
  for (const [key, value] of Object.entries(obj)) {
    query += `&${key}=${value as string}`;
  }
  return query;
};

/**
 * createNestedQueryParams
 * Stringifies an object to be used as the value for a specified key in a url
 * query param string. This makes it easier to group together errors and
 * results and doesn't override any existing url queries if the same key name
 * appears more than once.
 */
const createNestedQueryParams = (dataAsString = {}, key) => {
  let query = "";
  if (!isEmpty(dataAsString) && key) {
    query = `&${key}=${JSON.stringify(dataAsString)}`;
  }
  return query;
};

/**
 * isValidUsername
 * Validates username based on length and alphanumeric value. Used both
 * to validate the username/show error and to activate the check button.
 */
const isValidUsername = (value = "") =>
  value.length >= 5 && value.length <= 25 && isAlphanumeric(value);

/**
 * Validates a password against the Sierra PIN requirements:
 * - Only allows: letters, digits, and .~!?@#$%^&*()
 * - Password between 8-32 characters long
 * - No repeating a character three or more times
 * - No repeating set of up to four characters two or more times
 *
 * PIN_ALPHA_ONLY & PIN_NUM_ONLY are both set to `false` on our app, hence
 * character-only or number-only passwords are accetpable.
 *
 * https://knowledge.ag-software.clarivate.com/sierra/SierraWebHelp/sgwpac/sgwpac_using_pins.html
 */
const isValidPinPattern = (val: string): boolean => {
  if (!val) return false;
  const validPattern =
    /^(?!.*(.)\1{2})(?!.*(.{2,4})\2)[A-Za-z\d.~!?@#$%^&*()]{8,32}$/;
  return validPattern.test(val);
};

export {
  redirectIfUserHasRegistered,
  homePageRedirect,
  nyCounties,
  nyCities,
  createQueryParams,
  createNestedQueryParams,
  getPageTitles,
  isValidUsername,
  isValidPinPattern,
};
