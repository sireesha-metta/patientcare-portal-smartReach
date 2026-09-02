// src/services/smartReachApi.js

import axios from "axios";
import { sharedUiService } from "patientcare-portal-sharedui/sharedUiService";
import { SMART_REACH_API_BASE_URL } from "../config/smartReachConfig.js";

function getBaseUrl() {
  return sharedUiService.getBaseUrl() ?? SMART_REACH_API_BASE_URL;
}

function authHeaders() {
  let userDetails = sharedUiService.getUserDetails();

  if (!userDetails) {
    try {
      const raw = sessionStorage.getItem("userDetails");
      userDetails = raw ? JSON.parse(raw) : null;

      if (userDetails) {
        sharedUiService.setUserDetails(userDetails);
      }
    } catch {
      userDetails = null;
    }
  }

  const practiceRole = userDetails?.roles?.practicerole?.[0];

  if (!userDetails || !practiceRole) {
    return {};
  }

  return {
    username: userDetails.username,
    id: String(userDetails.id),
    practice_id: String(practiceRole.practice_id),
    session: userDetails.session,
    practice: practiceRole.practice_name,
  };
}

function client() {
  const instance = axios.create({
    baseURL: getBaseUrl(),
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use((config) => {
    Object.entries(authHeaders()).forEach(([key, value]) => {
      if (value == null) return;

      if (typeof config.headers.set === "function") {
        if (!config.headers.get(key)) {
          config.headers.set(key, value);
        }
      } else if (!config.headers[key]) {
        config.headers[key] = value;
      }
    });

    return config;
  });

  return instance;
}

/**
 * Headers for Selected Actions API.
 *
 * Backend expects:
 * program_id
 */
function selectedActionsHeaders(programId) {
  return {
    headers: {
      program_id: String(programId),
    },
  };
}
function selectedTextActionsHeaders(programId) {
  return {
    headers: {
      programid: String(programId),
    },
  };
}

function unwrapList(res) {
  const payload = res?.data?.response ?? res?.data;

  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload[0]?.programsList) {
      return payload[0].programsList;
    }

    return payload;
  }

  if (payload && typeof payload === "object") {
    if (payload.programsList && Array.isArray(payload.programsList)) {
      return payload.programsList;
    }

    const list = Object.values(payload).find(Array.isArray);

    if (list) {
      return list;
    }

    if (payload.message) {
      throw new Error(payload.message);
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    throw new Error(payload.trim());
  }

  console.error("❌ No list found in response");
  throw new Error("API response did not contain a list");
}

function unwrapData(res) {
  const data = res?.data?.response ?? res?.data;

  if (data && typeof data === "object") {
    if (Array.isArray(data)) {
      return data;
    }

    if (data.message && !data.id && !data.programId) {
      throw new Error(data.message);
    }

    return data;
  }

  if (typeof data === "string" && data.trim()) {
    throw new Error(data.trim());
  }

  return data;
}

/**
 * Safe unwrap that handles both arrays and objects
 */
function unwrapSafe(res) {
  const data = res?.data?.response ?? res?.data;

  if (data === null || data === undefined) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object") {
    // Check if it has a list inside
    const list = Object.values(data).find(Array.isArray);
    if (list) {
      return list;
    }
    // Return the object wrapped in an array if it's a single item
    return [data];
  }

  return [];
}

export const smartReachApi = {
  /**
   * Get SmartReach practice programs.
   *
   * GET: /proactivecare/practiceprograms
   */
  async getPracticePrograms() {
    try {
      const response = await client().get("/practiceprograms");
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ API Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  /**
   * Get program information by ID.
   *
   * GET: /proactivecare/programInfo/{programId}
   */
  async getProgramInfo(programId) {
    try {
      const response = await client().get(`/programInfo/${programId}`);
      const result = unwrapData(response);
      return result;
    } catch (error) {
      console.error("❌ Get Program Info Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async getProgramTextMsgInfo(programId) {
    try {
      const response = await client().get(
        "/programInfo",
        selectedTextActionsHeaders(programId),
      );
      const result = unwrapData(response);
      return result;
    } catch (error) {
      console.error("❌ Get Program Text Msg Info Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  /**
   * Get available goals for programs.
   *
   * GET: /proactivecare/goals
   */
  async getGoals() {
    try {
      const response = await client().get("/goals");
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Goals Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  /**
   * Get program threshold information.
   *
   * GET: /proactivecare/programThreshold
   */
  async getProgramThreshold() {
    try {
      const response = await client().get("/programThreshold");
      const result = unwrapData(response);
      return result;
    } catch (error) {
      console.error("❌ Get Program Threshold Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async getScheduledActions() {
    try {
      const response = await client().get("/actions");
      const result = unwrapData(response);
      return result;
    } catch (error) {
      console.error("❌ Get Scheduled Action Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  /**
   * Get program criteria.
   *
   * GET: /proactivecare/criteria
   */
  async getCriteria() {
    try {
      const response = await client().get("/criteria");
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Criteria Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  // In your service/API file
  // In smartReachApi.js

  // Update the appointmentStatus method to accept criteriaId
  async getAppointmentStatus(programId, criteriaId) {
    try {
      const response = await client().get("/appointmentStatus", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });

      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Appointment Status Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  /**
   * Get selected criteria for a program.
   *
   * GET: /proactivecare/selectedCriteria
   * Header: program_id: <programId>
   */

  async getCptCodeHadCriteria(programId,criteriaId) {
    try {
    const response = await client().get("/cptCodes", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });

      const result = unwrapSafe(response);
      return result;
    } catch (error) {
      console.error("❌ Get Selected Criteria Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      return [];
    }
  },
  async getSelectedCriteria(programId) {
    try {
      const response = await client().get(
        "/selectedCriteria",
        selectedActionsHeaders(programId),
      );

      const result = unwrapSafe(response);
      return result;
    } catch (error) {
      console.error("❌ Get Selected Criteria Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      return [];
    }
  },

  /**
   * Get selected actions for a program.
   *
   * GET: /proactivecare/selectedActions
   *
   * Header:
   * program_id: <programId>
   */
  async getSelectedActions(programId) {
    try {
      const response = await client().get(
        "/selectedActions",
        selectedActionsHeaders(programId),
      );

      const result = unwrapSafe(response);
      return result;
    } catch (error) {
      console.error("❌ Get Selected Actions Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      return [];
    }
  },

  /**
   * Update SmartReach program status.
   *
   * PUT: /proactivecare/program
   */
  async updateProgramMessageText(
    programId,
    messageText,
    programStatus,
    programName,
  ) {
    try {
      const payload = {
        programId: Number(programId),
        messageText: messageText ?? "",
        programStatus: Number(programStatus),
        programName: programName ?? "",
      };

      const response = await client().put("/programs", payload);

      // console.log(
      //   "✅ UPDATE PROGRAM RESPONSE:",
      //   JSON.stringify(response?.data, null, 2)
      // );

      return response?.data;
    } catch (error) {
      console.error("❌ Update Program Message Text Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  /**
   * Update program information.
   *
   * PUT: /proactivecare/programInfo
   */
  async updateProgramInfo(payload) {
    try {
      const response = await client().put("/programInfo", payload);

      return response?.data;
    } catch (error) {
      console.error("❌ Update Program Info Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async programCriteria(payload) {
    try {
      const response = await client().post("/programCriteria", payload);

      return response?.data;
    } catch (error) {
      console.error("❌ Program Criteria Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async updateAppointmentStatus(payload) {
    try {
      const response = await client().post("/appointments", payload);

      return response?.data;
    } catch (error) {
      console.error("❌ appointments  Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async programAgeInfo(payload) {
    try {
      const response = await client().post("/programageinfo", payload);

      return response?.data;
    } catch (error) {
      console.error("❌ Program Age Info Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },

  async criteriaAge(payload) {
    try {
      // The backend expects 'min' and 'max' not 'minAge' and 'maxAge'
      const requestPayload = {
        min: payload.min || payload.minAge || 0,
        max: payload.max || payload.maxAge || 0,
        programId: payload.programId,
        programName: payload.programName || "Program",
        name: payload.name || "Age",
        attributeId: payload.attributeId,
      };

      // console.log("📤 Criteria Age Request Payload:", requestPayload);

      const response = await client().post("/criteriaage", requestPayload);

      return response?.data;
    } catch (error) {
      console.error("❌ Criteria Age Error:", error);

      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);

        console.error("❌ Error Status:", error.response.status);
      }

      throw error;
    }
  },
};

export default smartReachApi;
