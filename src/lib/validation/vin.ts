// VIN Validation
// Source: https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/Check_digit
// + NHTSA 49 CFR Part 565

const VIN_TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

const VIN_VALID_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidationResult {
  valid: boolean;
  formatValid: boolean;
  checkDigitValid: boolean;
  expectedCheckDigit?: string;
  actualCheckDigit?: string;
  error?: string;
}

export function validateVin(vin: string | null): VinValidationResult {
  if (!vin) {
    return {
      valid: false,
      formatValid: false,
      checkDigitValid: false,
      error: "VIN is empty",
    };
  }

  const upperVin = vin.toUpperCase().trim();

  // VIN-01: Format validation (17 alphanumeric, no I/O/Q)
  if (!VIN_VALID_CHARS.test(upperVin)) {
    return {
      valid: false,
      formatValid: false,
      checkDigitValid: false,
      error:
        upperVin.length !== 17
          ? `VIN must be 17 characters (got ${upperVin.length})`
          : "VIN contains invalid characters (I, O, Q not allowed)",
    };
  }

  // VIN-02: Check digit validation (position 9, 0-indexed position 8)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = upperVin[i];
    const value = VIN_TRANSLITERATION[char] ?? parseInt(char, 10);
    sum += value * VIN_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? "X" : String(remainder);
  const actual = upperVin[8];

  if (expected !== actual) {
    return {
      valid: false,
      formatValid: true,
      checkDigitValid: false,
      expectedCheckDigit: expected,
      actualCheckDigit: actual,
      error: `VIN check digit invalid -- expected ${expected}, got ${actual}`,
    };
  }

  return { valid: true, formatValid: true, checkDigitValid: true };
}
