import { SHARED_SERVICES_CONSTANTS } from "patientcare-portal-sharedui/constants";

/** Prefers the backend message, then the axios message, then a shared fallback. */
export function apiErrorText(err, fallbackText) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    SHARED_SERVICES_CONSTANTS?.APIERRORSOMETHINGWENTWRONG ||
    fallbackText
  );
}

export default apiErrorText;
