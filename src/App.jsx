import SharedUiProvider from "patientcare-portal-sharedui/SharedUiProvider";
import { sharedUiService } from "patientcare-portal-sharedui/sharedUiService";
import SmartReachPage from "./pages/SmartReachPage.jsx";
import { SMART_REACH_API_BASE_URL } from "./config/smartReachConfig.js";

/**
 * Reads the session written by the shell at login so the shared service
 * and SmartReach provider use the same authentication/user context.
 */
function readSession() {
  let userDetails;

  try {
    const raw = sessionStorage.getItem("userDetails");
    userDetails = raw ? JSON.parse(raw) : undefined;
  } catch {
    userDetails = undefined;
  }

  const baseUrl =
    sharedUiService.getBaseUrl() || SMART_REACH_API_BASE_URL;

  const role =
    userDetails?.roles?.practicerole?.[0]?.role_name ||
    userDetails?.role ||
    "";

  sharedUiService.setBaseUrl(baseUrl);

  if (userDetails) {
    sharedUiService.setUserDetails(userDetails);
    sharedUiService.setAuthentication();

    if (role) {
      sharedUiService.setRole(role);
    }
  }

  return {
    baseUrl,
    role,
    userDetails,
    authenticated: Boolean(userDetails),
  };
}

export default function App() {
  return (
    <SharedUiProvider initialState={readSession()}>
      <SmartReachPage />
    </SharedUiProvider>
  );
}