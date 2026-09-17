import * as utils from "../utils";

describe("getPageTiles", () => {
  test("it returns text saying there are 5 steps", () => {
    expect(utils.getPageTitles()).toEqual({
      personal: "Step 1 of 5: Personal information",
      address: "Step 2 of 5: Address",
      workAddress: "Alternate address",
      verification: "Step 3 of 5: Address verification",
      account: "Step 4 of 5: Customize your account",
      review: "Step 5 of 5: Confirm your information",
    });
  });
});

describe("createQueryParams", () => {
  test("it should return an empty string with an empty object", () => {
    expect(utils.createQueryParams({})).toEqual("");
  });

  test("it should return a url query string", () => {
    const data = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };
    expect(utils.createQueryParams(data)).toEqual(
      "&key1=value1&key2=value2&key3=value3"
    );
  });
});

describe("createNestedQueryParams", () => {
  test("it should return an empty string with an empty string or type argument", () => {
    expect(utils.createNestedQueryParams({}, "key")).toEqual("");
    expect(utils.createNestedQueryParams({ key: "somevalue" }, "")).toEqual("");
  });

  test("it should return a nested url query string", () => {
    const data = {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    };
    expect(utils.createNestedQueryParams(data, "results")).toEqual(
      `&results=${JSON.stringify(data)}`
    );

    expect(utils.createNestedQueryParams(data, "errors")).toEqual(
      `&errors=${JSON.stringify(data)}`
    );
  });
});

describe("isValidPinPattern", () => {
  test("it should return true for a valid password", () => {
    expect(utils.isValidPinPattern("Abcd1234!")).toBe(true);
  });

  test("it should return true for 8 characters password", () => {
    expect(utils.isValidPinPattern("Abc1!xyz")).toBe(true);
  });

  test("it should return true for 32 characters password", () => {
    expect(utils.isValidPinPattern("Abcd1!efghijklmnopqrstuvwxyz1234")).toBe(
      true
    );
  });

  test("it should return true for the following allowed special character", () => {
    const specials = [
      ".",
      "~",
      "!",
      "?",
      "@",
      "#",
      "$",
      "%",
      "^",
      "&",
      "*",
      "(",
      ")",
    ];
    for (const char of specials) {
      expect(utils.isValidPinPattern(`Abcd123${char}`)).toBe(true);
    }
  });

  test("it should return true when two consecutive identical characters are present", () => {
    expect(utils.isValidPinPattern("aabcdefg")).toBe(true);
  });

  test("it should return false for a password shorter than 8 characters", () => {
    expect(utils.isValidPinPattern("Ac1!")).toBe(false);
  });

  test("it should return false for a password longer than 32 characters", () => {
    expect(utils.isValidPinPattern("Abcd1!efghijklmnopqrstuvwxyz123456")).toBe(
      false
    );
  });

  test("it should return true for a password with only lowercase letters", () => {
    expect(utils.isValidPinPattern("abcdefgh")).toBe(true);
  });

  test("it should return true for a password with only uppercase letters", () => {
    expect(utils.isValidPinPattern("ABCDEFGH")).toBe(true);
  });

  test("it should return true for a password with no special character", () => {
    expect(utils.isValidPinPattern("Abcd1234")).toBe(true);
  });

  test("it should return true for a password with no digit", () => {
    expect(utils.isValidPinPattern("Abcdefg!")).toBe(true);
  });

  test("it should return false for an empty string", () => {
    expect(utils.isValidPinPattern("")).toBe(false);
  });

  test("it should return false for an undefined value", () => {
    expect(utils.isValidPinPattern(undefined as any)).toBe(false);
  });

  test("it should return false for a password containing a space", () => {
    expect(utils.isValidPinPattern("Abcd 123!")).toBe(false);
  });

  test("it should return false when a character repeats 3 or more times consecutively", () => {
    expect(utils.isValidPinPattern("Abcaaa1!")).toBe(false);
    expect(utils.isValidPinPattern("Abcaaaa1!")).toBe(false);
    expect(utils.isValidPinPattern("Ab1!cccde")).toBe(false);
  });

  test("it should return false for a 2 character sequence repeated consecutively", () => {
    expect(utils.isValidPinPattern("Ababab1!")).toBe(false);
    expect(utils.isValidPinPattern("x7gp3434")).toBe(false);
  });

  test("it should return false for a 3 character sequence repeated consecutively", () => {
    expect(utils.isValidPinPattern("Aabcabc1!")).toBe(false);
    expect(utils.isValidPinPattern("x7gp3333")).toBe(false);
  });
});
