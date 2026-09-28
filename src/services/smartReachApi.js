
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

function unwrapSafe(res) {
  const data = res?.data?.response ?? res?.data;

  if (data === null || data === undefined) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object") {
    const list = Object.values(data).find(Array.isArray);
    if (list) {
      return list;
    }
    return [data];
  }

  return [];
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

  // Fix the getCptCodeHadCriteria function
  async getCptCodeHadCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/cptCodes", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });

      let data = response?.data?.response ?? response?.data ?? response;

      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (
          firstItem?.availableList !== undefined ||
          firstItem?.selectedList !== undefined
        ) {
          if (firstItem?.cptHadNotFreqData !== undefined) {
            return {
              ...firstItem,
              cptHadNotFreqData: firstItem.cptHadNotFreqData,
            };
          }
          return firstItem;
        }
        if (firstItem?.response) {
          const responseData = firstItem.response;
          if (Array.isArray(responseData) && responseData.length > 0) {
            const responseItem = responseData[0];
            if (responseItem?.availableList !== undefined) {
              return {
                availableList: responseItem.availableList || [],
                selectedList: responseItem.selectedList || [],
                cptHadNotFreqData: responseItem.cptHadNotFreqData || null,
              };
            }
          }
        }
      }

      if (
        data?.availableList !== undefined ||
        data?.selectedList !== undefined
      ) {
        return {
          availableList: data.availableList || [],
          selectedList: data.selectedList || [],
          cptHadNotFreqData: data.cptHadNotFreqData || null,
        };
      }

      if (Array.isArray(data)) {
        return { availableList: data, selectedList: [] };
      }

      return { availableList: [], selectedList: [] };
    } catch (error) {
      console.error("❌ Get CPT Code Had Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      return { availableList: [], selectedList: [] };
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
  async updateProgramActions(payload) {
    try {
      
      const response = await client().post("/programAction", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Program Actions Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },
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
      console.error("❌ Appointments Error:", error);
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
      const requestPayload = {
        min: payload.min || payload.minAge || 0,
        max: payload.max || payload.maxAge || 0,
        programId: payload.programId,
        programName: payload.programName || "Program",
        name: payload.name || "Age",
        attributeId: payload.attributeId,
      };

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

  // ============================================================
  // LOCATION CRITERIA - UNIFIED (GET /locations)
  // ============================================================
  async getLocationCriteria(programId, criteriaId, locationType = "scheduled") {
    try {
      const response = await client().get("/locations", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
          locationType: locationType, // "scheduled" or "billed"
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error(`❌ Get Location ${locationType} Criteria Error:`, error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateLocationCriteria(payload) {
    try {
      const response = await client().post("/locations", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Location Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getEthnicityTypeCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/ethnicities", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Ethnicity Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateEthnicityTypeCriteria(payload) {
    try {
      const response = await client().post("/ethnicities", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Ethnicity Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async programFrequencyInfo(payload) {
    try {
      const response = await client().post("/programfrequencyinfo", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Program Frequency Info Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async criteriaFrequency(payload) {
    try {
      const requestPayload = {
        min: payload.min || payload.minFrequency || 0,
        max: payload.max || payload.maxFrequency || 0,
        programId: payload.programId,
        programName: payload.programName || "Program",
        name: payload.name || "Frequency",
        attributeId: payload.attributeId,
      };

      const response = await client().post(
        "/criteriafrequency",
        requestPayload,
      );
      return response?.data;
    } catch (error) {
      console.error("❌ Criteria Frequency Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getGenderCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/gender", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Gender Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateGenderCriteria(payload) {
    try {
      const response = await client().post("/genders", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Gender Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getInsuranceCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/insurancesdata", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Insurance Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateInsuranceCriteria(payload) {
    try {
      const response = await client().post("/insurances", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Insurance Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getPatientZipCodeCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/patientzipcodes", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });

      const responseData =
        response?.data?.response ?? response?.data ?? response;

      if (
        Array.isArray(responseData) &&
        responseData.length > 0 &&
        responseData[0]?.code !== undefined
      ) {
        const selectedCodes = responseData.map((item) => ({
          ...item,
          name: String(item.code),
          id: item.id || item.code,
          code: item.code,
        }));

        return {
          selectedList: selectedCodes, 
          availableList: [],
        };
      }

      if (responseData?.availableList || responseData?.selectedList) {
        const selectedList = (responseData.selectedList || []).map((item) => ({
          ...item,
          name: String(
            item.code || item.zip || item.zip_code || item.name || item,
          ),
          id: item.id || item.code || item.zip,
          code: item.code || item.zip,
        }));

        const availableList = (responseData.availableList || []).map(
          (item) => ({
            ...item,
            name: String(
              item.code || item.zip || item.zip_code || item.name || item,
            ),
            id: item.id || item.code || item.zip,
            code: item.code || item.zip,
          }),
        );

        return { availableList, selectedList };
      }

      return { availableList: [], selectedList: [] };
    } catch (error) {
      console.error("❌ Get Patient Zip Code Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      return { availableList: [], selectedList: [] };
    }
  },

  async updatePatientZipCodeCriteria(payload) {
    try {
      const response = await client().post("/zipcodes", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Patient Zip Code Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getProvidersCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/providers", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Providers Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateProvidersCriteria(payload) {
    try {
      const response = await client().post("/providers", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Providers Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getRaceTypeCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/races", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Race Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateRaceTypeCriteria(payload) {
    try {
      const response = await client().post("/races", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Race Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getActivityTypeCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/activityType", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Activity Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateActivityTypeCriteria(payload) {
    try {
      const response = await client().post("/activityType", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Activity Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getActivitySetTypeCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/activitySetType", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Activity Set Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateActivitySetTypeCriteria(payload) {
    try {
      const response = await client().post("/activitySetType", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Activity Set Type Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getCptCodeHadNotCriteria(programId, criteriaId) {
    try {
      const response = await client().get("/cpt", {
        headers: {
          reqfrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get CPT Code Had Not Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateCptCodeHadCriteria(payload) {
    try {
      const response = await client().post("/cptcodes", payload);
      return response.data;
    } catch (error) {
      console.error("❌ Update CPT Code Had Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateCptCodeHadNotCriteria(payload) {
    try {
      const response = await client().post("/cptcodes", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update CPT Code Had Not Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getDiagnosisCodes(programId, criteriaId) {
    try {
      const response = await client().get("/diagnosisCode", {
        headers: {
          reqFrom: "ProactiveCoordinator",
          programId: String(programId),
          patientAttributesId: String(criteriaId || ""),
        },
      });


      const responseData = response?.data;

      if (!responseData) {
        return {
          availableList: [],
          selectedList: [],
        };
      }

      const diagnosisData = Array.isArray(responseData?.response)
        ? responseData.response[0]
        : null;

      if (!diagnosisData) {
        return {
          availableList: [],
          selectedList: [],
        };
      }

      const availableList = Array.isArray(diagnosisData.availableList)
        ? diagnosisData.availableList
        : [];

      const selectedList = Array.isArray(diagnosisData.selectedList)
        ? diagnosisData.selectedList
        : [];

      return {
        availableList,
        selectedList,
      };
    } catch (error) {
      console.error("❌ Get Diagnosis Codes Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getActivities(programActionId, programId) {
    try {
      const response = await client().get("/activities", {
        headers: {
          reqfromaction: "action",
          actionid: String(programActionId || ""),
          programid: String(programId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Activities Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateActionActivity(payload) {
    try {
      const response = await client().post("/actionActivity", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Action Activity Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  // ============================================================
  // ACTION LOCATIONS
  // ============================================================
  async getActionLocations(programActionId, programId) {
    try {
      const response = await client().get("/locations", {
        headers: {
          reqfromaction: "action",
          actionid: String(programActionId || ""),
          programid: String(programId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Action Locations Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateActionLocation(payload) {
    try {
      const response = await client().post("/actionLocation", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Action Location Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  // ============================================================
  // ACTION PROVIDERS
  // ============================================================
  async getActionProviders(programActionId, programId) {
    try {
      const response = await client().get("/providers", {
        headers: {
          reqfromaction: "action",
          actionid: String(programActionId || ""),
          programid: String(programId || ""),
        },
      });
      const result = unwrapList(response);
      return result;
    } catch (error) {
      console.error("❌ Get Action Providers Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateActionProvider(payload) {
    try {
      const response = await client().post("/actionProvider", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Action Provider Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },
  async updateDiagnosisCodeHadCriteria(payload) {
    try {
      const response = await client().post("/icdcodes", payload);
      return response.data;
    } catch (error) {
      console.error("❌ Update Diagnosis Codes Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async updateGenericCriteria(payload) {
    try {
      const response = await client().post("/criteria", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Update Generic Criteria Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async deleteProgram(programId) {
    try {
      const payload = {
        programId: Number(programId),
        activeStatus: 0,
      };

      const response = await client().delete(`/programs`, {
        data: payload,
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response?.data;
    } catch (error) {
      console.error("❌ Delete Program Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async createProgram(payload) {
    try {
      const response = await client().post("/programs", payload);
      return response?.data;
    } catch (error) {
      console.error("❌ Create Program Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getParentSite() {
    try {
      const response = await client().get("/parentsite/");
      return response.data;
    } catch (error) {
      console.error("❌ Get Parent Site Error:", error);
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
      return response.data;
    } catch (error) {
      console.error("Error updating program status:", error);
      throw error;
    }
  },

  async getSmartReachPayer() {
    try {
      const response = await client().get("/smartreachpayer");
      return response.data;
    } catch (error) {
      console.error("❌ Get Smart Reach Payer Error:", error);
      if (error.response) {
        console.error("❌ Error Response Data:", error.response.data);
        console.error("❌ Error Status:", error.response.status);
      }
      throw error;
    }
  },

  async getLocationScheduledCriteria(programId, criteriaId) {
    console.warn(
      "⚠️ getLocationScheduledCriteria is deprecated, use getLocationCriteria with locationType='scheduled'",
    );
    return this.getLocationCriteria(programId, criteriaId, "scheduled");
  },

  async getLocationBilledCriteria(programId, criteriaId) {
    console.warn(
      "⚠️ getLocationBilledCriteria is deprecated, use getLocationCriteria with locationType='billed'",
    );
    return this.getLocationCriteria(programId, criteriaId, "billed");
  },

  async updateLocationScheduledCriteria(payload) {
    console.warn(
      "⚠️ updateLocationScheduledCriteria is deprecated, use updateLocationCriteria",
    );
    return this.updateLocationCriteria(payload);
  },

  async updateLocationBilledCriteria(payload) {
    console.warn(
      "⚠️ updateLocationBilledCriteria is deprecated, use updateLocationCriteria",
    );
    return this.updateLocationCriteria(payload);
  },
};

export default smartReachApi;
