// src/services/smartReachApi.js

import axios from "axios";
import { sharedUiService } from "patientcare-portal-sharedui/sharedUiService";
import { SMART_REACH_API_BASE_URL } from "../config/smartReachConfig.js";

/**
 * SmartReach API
 *
 * GET:
 * /proactivecare/practiceprograms
 * /proactivecare/programInfo/{programId}
 * /proactivecare/goals
 * /proactivecare/programThreshold
 *
 * PUT:
 * /proactivecare/program
 */

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

function unwrapList(res) {
  // Try to get the payload
  let payload = res?.data?.response ?? res?.data;

  // If payload is an array, return it directly
  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload[0]?.programsList) {
      return payload[0].programsList;
    }
    return payload;
  }

  // If payload is an object, look for programsList or any array
  if (payload && typeof payload === "object") {
    // Check if payload has programsList property
    if (payload.programsList && Array.isArray(payload.programsList)) {
      return payload.programsList;
    }

    // Find any array in the object
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
  // Try to get the data
  let data = res?.data?.response ?? res?.data;

  if (data && typeof data === "object") {
    // If it's an array, return it directly
    if (Array.isArray(data)) {
      return data;
    }
    
    // If it has a message property, it might be an error
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

export const smartReachApi = {

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

  
  async updateProgramStatus(programId, programStatus) {
    try {
      const payload = {
        programId: Number(programId),
        programStatus: String(programStatus),
      };

      const response = await client().put("/program", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Program Status Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  
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
};

export default smartReachApi;