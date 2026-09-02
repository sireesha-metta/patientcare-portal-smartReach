// src/components/ProgramDetailsEdit.jsx
import { useState, useEffect } from "react";
import { X, Edit, FileText, Calendar, Plus, Code } from "lucide-react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";

// Import shared UI components for editing
import DisplayCriteria from "patientcare-portal-sharedui/DisplayCriteria";
import DisplayLocation from "patientcare-portal-sharedui/DisplayLocation";
import MessageText from "patientcare-portal-sharedui/MessageText";
import AgeCriteria from "patientcare-portal-sharedui/AgeCriteria";
import FrequencyCriteria from "patientcare-portal-sharedui/FrequencyCriteria";
import GenderCriteria from "patientcare-portal-sharedui/GenderCriteria";
import LocationCriteria from "patientcare-portal-sharedui/LocationCriteria";
import ProvidersCriteria from "patientcare-portal-sharedui/ProvidersCriteria";
import ActivityTypeCriteria from "patientcare-portal-sharedui/ActivityTypeCriteria";
import InsuranceCriteria from "patientcare-portal-sharedui/InsuranceCriteria";
import ActivitySetTypeCriteria from "patientcare-portal-sharedui/ActivitySetTypeCriteria";
import AppointmentStatus from "patientcare-portal-sharedui/AppointmentStatus";
import ReferringProvider from "patientcare-portal-sharedui/ReferringProvider";
import CptCodeHadCriteria from "patientcare-portal-sharedui/CptCodeHadCriteria";
import { EditIconButton } from "patientcare-portal-sharedui/RowActions";
// Add this import at the top with other imports
import CptCodeHadNotCriteria from "patientcare-portal-sharedui/CptCodeHadNotCriteria";
// Add these imports at the top with other imports
import DiagnosisCodeCriteria from "patientcare-portal-sharedui/DiagnosisCodeCriteria";
import EthnicityTypeCriteria from "patientcare-portal-sharedui/EthnicityTypeCriteria";
// Import constants from config
import {
  CRITERIA_DIALOG_BY_ID,
  CRITERIA_NAMES,
  CRITERIA_VALUE_RULES,
  SR_TEXT,
  REQUEST_FROM,
} from "../config/smartReachConstants.js";

const ProgramDetailsEdit = ({ program, onClose, onUpdate }) => {
  const shared = useSharedUi();
  console.log("=================================program", program);
  const [loading, setLoading] = useState(true);
  const [programInfo, setProgramInfo] = useState(null);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [selectedActions, setSelectedActions] = useState([]);
  const [selectedScheduledActions, setSelectedScheduledActions] = useState([]);
  const [programTextMsgInfo, setProgramTextMsgInfo] = useState([]);
  const [getAllCriteria, setGetAllCriteria] = useState([]);
  const [programThreshold, setProgramThreshold] = useState(0);
  const [appointmentStatusData, setAppointmentStatusData] = useState(null);

  // CPT Code specific state
  const [cptCodes, setCptCodes] = useState([]);
  const [selectedCptCodes, setSelectedCptCodes] = useState([]);

  // Dialog state
  const [dialog, setDialog] = useState({ type: null, open: false, data: null });
  const [dialogLoading, setDialogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Age and Frequency values (stored in YEARS)
  const [age, setAge] = useState({ min: 0, max: 0 });
  const [frequency, setFrequency] = useState({ min: 0, max: 0 });
  const [selections, setSelections] = useState({});
  const [originalAge, setOriginalAge] = useState({ min: 0, max: 0 });

  // Helper functions
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString("en-US");
  };

  const extractTimeFromSchedule = (scheduleTime) => {
    if (!scheduleTime) return "N/A";
    try {
      const date = new Date(scheduleTime);
      if (isNaN(date.getTime())) return "N/A";
      let hours = date.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}${ampm}`;
    } catch {
      return "N/A";
    }
  };

  const sortAlphabetically = (arr, nameKey = "name") => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => {
      const nameA = (
        a[nameKey] ||
        a.criteriaName ||
        a.actionName ||
        a.label ||
        ""
      ).toLowerCase();
      const nameB = (
        b[nameKey] ||
        b.criteriaName ||
        b.actionName ||
        b.label ||
        ""
      ).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const getDisplayName = (item) => {
    return (
      item.name ||
      item.criteriaName ||
      item.actionName ||
      item.label ||
      item.messageText ||
      item.code ||
      "Unnamed"
    );
  };

  // Dialog functions
  const openDialog = (type, data) => {
    setDialog({
      type,
      open: true,
      data: { ...data, requestAppFrom: REQUEST_FROM },
    });
  };

  const closeDialog = async (result) => {
    const type = dialog.type;

    console.log("🔵 closeDialog:", {
      type,
      result,
    });

    if (result == null) {
      setDialog({
        type: null,
        open: false,
        data: null,
      });
      return;
    }

    // =========================================================
    // CPT CODE -> NEXT
    // =========================================================
    if (type === "cptCodeHadCriteria" && result?.action === "next") {
      try {
        setDialogLoading(true);

        const selectedCodes = Array.isArray(result.values) ? result.values : [];

        // Prepare CPT Code payload
        const cptPayload = {
          programId: Number(program.id),
          criteriaId: Number(dialog.data?.criteriaId),
          name: dialog.data?.criteriaName || "CPT Code",
          programName: programInfo?.programName || program?.name || "",
          codes: selectedCodes.map((code) => ({
            code: code.code || code.id,
            description: code.description || code.name,
            frequency: code.frequency || null,
          })),
          operand: dialog.data?.operand || "OR",
        };

        console.log(
          "📤 CPT CODE CRITERIA POST PAYLOAD:",
          JSON.stringify(cptPayload, null, 2),
        );

        // Call CPT Code API
        await smartReachApi.updateCptCodeHadCriteria(cptPayload);

        console.log("✅ CPT CODE CRITERIA POST SUCCESS");

        // Update local state
        setCptCodes(selectedCodes);
        setSelectedCptCodes(selectedCodes);

        // Update selected criteria
        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: selectedCodes,
              displayText: selectedCodes
                .map((item) => item.code || item.name)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);

        // Close only AFTER API succeeds
        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.("CPT Code criteria updated successfully");
      } catch (error) {
        console.error("❌ CPT CODE CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update CPT Code criteria"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }
    if (type === "cptCodeHadNotCriteria" && result?.action === "next") {
      try {
        setDialogLoading(true);

        const selectedCodes = Array.isArray(result.values) ? result.values : [];

        // Prepare CPT Code Have Not Had payload
        const cptPayload = {
          programId: Number(program.id),
          criteriaId: Number(dialog.data?.criteriaId),
          name: dialog.data?.criteriaName || "CPT Code Have Not Had",
          programName: programInfo?.programName || program?.name || "",
          codes: selectedCodes.map((code) => ({
            code: code.code || code.id,
            description: code.description || code.name,
          })),
          operand: result.operand || dialog.data?.operand || "OR",
          frequency: result.frequency || null,
        };

        console.log(
          "📤 CPT CODE HAVE NOT HAD CRITERIA POST PAYLOAD:",
          JSON.stringify(cptPayload, null, 2),
        );

        // Call CPT Code Have Not Had API
        await smartReachApi.updateCptCodeHadNotCriteria(cptPayload);

        console.log("✅ CPT CODE HAVE NOT HAD CRITERIA POST SUCCESS");

        // Update local state
        setCptCodes(selectedCodes);
        setSelectedCptCodes(selectedCodes);

        // Update selected criteria
        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: selectedCodes,
              operand: result.operand || dialog.data?.operand || "OR",
              frequency: result.frequency || null,
              displayText: selectedCodes
                .map((item) => item.code || item.name)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);

        // Close only AFTER API succeeds
        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.(
          "CPT Code (Have Not Had) criteria updated successfully",
        );
      } catch (error) {
        console.error("❌ CPT CODE HAVE NOT HAD CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(
            error,
            "Failed to update CPT Code (Have Not Had) criteria",
          ),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }
    // =========================================================
    // DIAGNOSIS CODE -> NEXT
    // =========================================================
    if (type === "diagnosisCodeHadCriteria" && result?.action === "next") {
      try {
        setDialogLoading(true);

        const selectedCodes = Array.isArray(result.values) ? result.values : [];

        const diagnosisPayload = {
          programId: Number(program.id),
          criteriaId: Number(dialog.data?.criteriaId),
          name: dialog.data?.criteriaName || "Diagnosis Code",
          programName: programInfo?.programName || program?.name || "",
          codes: selectedCodes.map((code) => ({
            code: code.code || code.id,
            description: code.description || code.name,
          })),
          operand: result.operand || dialog.data?.operand || "OR",
        };

        console.log(
          "📤 DIAGNOSIS CODE CRITERIA POST PAYLOAD:",
          JSON.stringify(diagnosisPayload, null, 2),
        );

        await smartReachApi.updateDiagnosisCodeHadCriteria(diagnosisPayload);

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: selectedCodes,
              operand: result.operand || dialog.data?.operand || "OR",
              displayText: selectedCodes
                .map((item) => item.code || item.name)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);

        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.("Diagnosis Code criteria updated successfully");
      } catch (error) {
        console.error("❌ DIAGNOSIS CODE CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update Diagnosis Code criteria"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }

    // =========================================================
    // ETHNICITY TYPE -> NEXT
    // =========================================================
    if (type === "ethnicityTypeHadCriteria" && result?.action === "next") {
      try {
        setDialogLoading(true);

        const selectedEthnicities = Array.isArray(result.values)
          ? result.values
          : [];

        const ethnicityPayload = {
          programId: Number(program.id),
          criteriaId: Number(dialog.data?.criteriaId),
          name: dialog.data?.criteriaName || "Ethnicity Type",
          programName: programInfo?.programName || program?.name || "",
          values: selectedEthnicities.map((item) => ({
            name: item.name || item,
          })),
          operand: result.operand || dialog.data?.operand || "OR",
        };

        console.log(
          "📤 ETHNICITY TYPE CRITERIA POST PAYLOAD:",
          JSON.stringify(ethnicityPayload, null, 2),
        );

        await smartReachApi.updateEthnicityTypeHadCriteria(ethnicityPayload);

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: selectedEthnicities,
              operand: result.operand || dialog.data?.operand || "OR",
              displayText: selectedEthnicities
                .map((item) => item.name)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);

        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.("Ethnicity Type criteria updated successfully");
      } catch (error) {
        console.error("❌ ETHNICITY TYPE CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update Ethnicity Type criteria"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }

    // =========================================================
    // AGE -> NEXT
    // =========================================================
    if (type === "age" && result.action === "next") {
      try {
        setDialogLoading(true);

        const agePayload = {
          programId: Number(program.id),
          attributeId: Number(dialog.data?.criteriaId),
          name: dialog.data?.criteriaName || "Age",
          programName: programInfo?.programName || program?.name || "",
          min: Number(result.minAge ?? 0),
          max: Number(result.maxAge ?? 0),
        };

        console.log(
          "📤 AGE CRITERIA POST PAYLOAD:",
          JSON.stringify(agePayload, null, 2),
        );

        await smartReachApi.criteriaAge(agePayload);

        console.log("✅ AGE CRITERIA POST SUCCESS");

        setAge({
          min: agePayload.min,
          max: agePayload.max,
        });

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              min: agePayload.min,
              max: agePayload.max,
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setOriginalAge({
          min: agePayload.min,
          max: agePayload.max,
        });
        setHasChanges(true);

        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.("Age criteria updated successfully");
      } catch (error) {
        console.error("❌ AGE CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update Age criteria"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }

    // =========================================================
    // APPOINTMENT STATUS -> NEXT
    // =========================================================
    if (type === "appointmentStatus" && result.action === "next") {
      try {
        setDialogLoading(true);

        const statusPayload = {
          status: (result.values || []).map((item) => item.name || item),
          programId: Number(program.id),
          operand: "OR",
          name: dialog.data?.criteriaName || "Appointment Status",
          programCriteriaId: Number(dialog.data?.criteriaId),
          programName: programInfo?.programName || program?.name || "",
        };

        await smartReachApi.updateAppointmentStatus(statusPayload);

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: result.values,
              displayText: (result.values || [])
                .map((item) => item.name || item)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);

        setDialog({
          type: null,
          open: false,
          data: null,
        });

        shared.toast?.success?.("Appointment Status updated successfully");
      } catch (error) {
        console.error("❌ APPOINTMENT STATUS POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update Appointment Status"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }

    // =========================================================
    // DISPLAY CRITERIA -> NEXT
    // =========================================================
    if (type === "displayCriteria" && result?.action === "next") {
      try {
        setDialogLoading(true);

        const criteriaToSave = Array.isArray(result.values)
          ? result.values
          : [];
        const patientAttributesId = criteriaToSave
          .map((item) => item.id || item.criteriaId)
          .filter(Boolean);

        const programPayload = {
          patientAttributesId,
          programsId: Number(program.id),
          activeStatus: 1,
          programName: programInfo?.programName || program?.name || "",
        };

        console.log(
          "📤 PROGRAM CRITERIA PAYLOAD:",
          JSON.stringify(programPayload, null, 2),
        );

        await smartReachApi.programCriteria(programPayload);

        console.log("✅ PROGRAM CRITERIA POST SUCCESS");

        const updatedCriteria = await smartReachApi.getSelectedCriteria(
          program.id,
        );

        setSelectedCriteria(
          Array.isArray(updatedCriteria)
            ? sortAlphabetically(updatedCriteria)
            : [],
        );
        setHasChanges(true);

        setDialog({
          type: null,
          open: false,
          data: null,
        });
      } catch (error) {
        console.error("❌ PROGRAM CRITERIA POST FAILED:", error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to update program criteria"),
        );
      } finally {
        setDialogLoading(false);
      }
      return;
    }

    if (type === "displayCriteria" && result?.action === "close") {
      setDialog({
        type: null,
        open: false,
        data: null,
      });
      return;
    }

    // =========================================================
    // NORMAL CLOSE / OTHER CRITERIA
    // =========================================================

    setDialog({
      type: null,
      open: false,
      data: null,
    });

    if (type === "displayCriteria") {
      if (result.values) {
        setSelectedCriteria(sortAlphabetically(result.values));
        setHasChanges(true);
      }
    } else if (type === "displayLocation") {
      if (result.values) {
        setSelectedScheduledActions(sortAlphabetically(result.values));
        saveProgramScheduledActions(result.values);
      }
    } else if (type === "messageText") {
      if (result.values) {
        const updatedMessages = [{ messageText: result.values }];
        setProgramTextMsgInfo(updatedMessages);
        saveProgramTextMessages(updatedMessages);
      }
    } else if (type === "age") {
      const updatedMin = Number(result?.minAge ?? 0);
      const updatedMax = Number(result?.maxAge ?? 0);

      setAge({
        min: updatedMin,
        max: updatedMax,
      });

      const updatedCriteria = selectedCriteria.map((criteria) => {
        if (
          Number(criteria.id || criteria.criteriaId) ===
          Number(dialog.data?.criteriaId)
        ) {
          return {
            ...criteria,
            min: updatedMin,
            max: updatedMax,
          };
        }
        return criteria;
      });

      setSelectedCriteria(updatedCriteria);
      setHasChanges(true);
    } else if (type === "frequency") {
      if (
        result.minFrequency !== undefined &&
        result.maxFrequency !== undefined
      ) {
        setFrequency({
          min: result.minFrequency ?? 0,
          max: result.maxFrequency ?? 0,
        });

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (criteria.id === dialog.data?.criteriaId) {
            return {
              ...criteria,
              min: result.minFrequency ?? 0,
              max: result.maxFrequency ?? 0,
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);
      }
    } else if (type === "appointmentStatus") {
      if (result.values) {
        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (
            Number(criteria.id || criteria.criteriaId) ===
            Number(dialog.data?.criteriaId)
          ) {
            return {
              ...criteria,
              values: result.values,
              displayText: result.values
                .map((item) => item.name || item)
                .join(", "),
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);
      }
    } else if (type === "cptCodeHadCriteria") {
      if (result.values) {
        setCptCodes(result.values);
        setSelectedCptCodes(result.values);
        setHasChanges(true);
      }
    } else {
      if (result.values) {
        setSelections((prev) => ({
          ...prev,
          [type]: result.values,
        }));

        const updatedCriteria = selectedCriteria.map((criteria) => {
          if (criteria.id === dialog.data?.criteriaId) {
            return {
              ...criteria,
              values: result.values,
            };
          }
          return criteria;
        });

        setSelectedCriteria(updatedCriteria);
        setHasChanges(true);
      }
    }
  };

  // Save functions for immediate saves
  const saveProgramScheduledActions = async (actions) => {
    setSaving(true);
    try {
      // console.log("Scheduled actions saved:", actions);
    } catch (error) {
      shared.toast?.error?.(
        apiErrorText(error, "Failed to update scheduled actions"),
      );
    } finally {
      setSaving(false);
    }
  };

  const saveProgramTextMessages = async (messages) => {
    setSaving(true);
    try {
      // console.log("Text messages saved:", messages);
    } finally {
      setSaving(false);
    }
  };

  // Open criteria picker
  const openCriteriaPicker = async () => {
    setDialogLoading(true);

    try {
      const allCriteria = await smartReachApi.getCriteria();
      const selected = await smartReachApi.getSelectedCriteria(program.id);

      const availableCriteria = Array.isArray(allCriteria) ? allCriteria : [];
      const criteriaArray = Array.isArray(selected) ? selected : [];

      openDialog("displayCriteria", {
        requestAppFrom: "SR",
        availableData: availableCriteria,
        selectedData: criteriaArray,
      });
    } catch (err) {
      console.error("Error loading criteria:", err);
      shared.toast?.error?.(
        apiErrorText(err, "Failed to load criteria options."),
      );
    } finally {
      setDialogLoading(false);
    }
  };

  // Edit individual criteria
  // Edit individual criteria
  const editCriteria = (criteria) => {
    let type = null;
    const name = criteria.name?.toLowerCase();

    if (name === "age") type = "age";
    else if (name === "frequency") type = "frequency";
    else if (name === "appointment status") type = "appointmentStatus";
    else if (name === "gender") type = "gender";
    else if (name === "insurance plan" || name === "insurance")
      type = "insurance";
    else if (name === "location") type = "location";
    else if (name === "provider") type = "providers";
    else if (name === "activity type" || name === "appointment type")
      type = "activityType";
    else if (name === "activity set type") type = "activitySet";
    else if (name === "referring provider") type = "referring";
    else if (name === "diagnosis code" || name?.includes("diagnosis"))
      type = "diagnosisCodeHadCriteria";
    else if (name === "ethnicity type" || name?.includes("ethnicity"))
      type = "ethnicityTypeHadCriteria";
    else if (
      name === "cpt code have not had" ||
      (name?.includes("cpt") && name?.includes("not"))
    )
      type = "cptCodeHadNotCriteria";
    else if (name?.includes("cpt")) type = "cptCodeHadCriteria";
    else type = CRITERIA_DIALOG_BY_ID[criteria.id];

    console.log("🎯 Determined type:", type);

    if (!type) {
      console.error("No dialog type found for criteria:", criteria);
      shared.toast?.error?.(SR_TEXT.NOT_IMPLEMENTED);
      return;
    }

    if (type === "age") {
      const callAgeInfo = async () => {
        setDialogLoading(true);

        try {
          const payload = {
            programId: Number(program.id),
            attributeId: Number(criteria.id || criteria.criteriaId),
            name: criteria.name || criteria.criteriaName,
          };

          const result = await smartReachApi.programAgeInfo(payload);

          const ageData = result?.data ?? result ?? {};
          const minAgeMonths = Number(ageData.min ?? 0);
          const maxAgeMonths = Number(ageData.max ?? 0);

          const minAgeYears = Math.floor(minAgeMonths / 12);
          const minRemainingMonths = minAgeMonths % 12;
          const maxAgeYears = Math.floor(maxAgeMonths / 12);
          const maxRemainingMonths = maxAgeMonths % 12;

          setAge({
            min: minAgeMonths,
            max: maxAgeMonths,
          });

          setOriginalAge({
            min: minAgeMonths,
            max: maxAgeMonths,
          });

          const ageDialogData = {
            criteriaId: Number(criteria.id || criteria.criteriaId),
            criteriaName: criteria.name || criteria.criteriaName,
            ageMin: minAgeMonths,
            ageMax: maxAgeMonths,
            minAgeYears: minAgeYears,
            minAgeMonths: minRemainingMonths,
            maxAgeYears: maxAgeYears,
            maxAgeMonths: maxRemainingMonths,
            requestAppFrom: REQUEST_FROM,
          };

          setDialog({
            type: "age",
            open: true,
            data: ageDialogData,
          });
        } catch (error) {
          console.error("❌ Error calling programAgeInfo:", error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load age information"),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callAgeInfo();
      return;
    }

    if (type === "appointmentStatus") {
      const callAppointmentStatusInfo = async () => {
        setDialogLoading(true);

        try {
          const response = await smartReachApi.getAppointmentStatus(
            program.id,
            criteria.id,
          );

          const data = Array.isArray(response)
            ? response[0]
            : (response?.response?.[0] ?? response?.response ?? response);

          const availableList = Array.isArray(data?.availableList)
            ? data.availableList
            : [];
          const selectedList = Array.isArray(data?.selectedList)
            ? data.selectedList
            : [];

          const enrichedAvailableList = availableList.map((item) => ({
            ...item,
            programId: program.id,
            programName: program.name,
            attributeId: criteria.id,
            attributeName: criteria.name,
          }));

          const enrichedSelectedList = selectedList.map((item) => ({
            ...item,
            programId: program.id,
            programName: program.name,
            attributeId: criteria.id,
            attributeName: criteria.name,
          }));

          const dialogData = {
            availableData: enrichedAvailableList,
            selectedData: enrichedSelectedList,
            criteriaId: criteria.id,
            criteriaName: criteria.name,
            programId: program.id,
            programName: program.name,
            requestAppFrom: REQUEST_FROM,
          };

          setDialog({
            type: "appointmentStatus",
            open: true,
            data: dialogData,
          });
        } catch (error) {
          console.error("Error calling getAppointmentStatus:", error);
          shared.toast?.error?.(
            apiErrorText(
              error,
              "Failed to load appointment status information",
            ),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callAppointmentStatusInfo();
      return;
    }

    // =====================================================
    // CPT CODE HAD CRITERIA
    // =====================================================
    if (type === "cptCodeHadCriteria") {
      const callCptCodeInfo = async () => {
        setDialogLoading(true);

        try {
          const response = await smartReachApi.getCptCodeHadCriteria(
            program.id,
            criteria.id,
          );

          console.log("📊 CPT Code Had Response:", response);

          const cptData = Array.isArray(response)
            ? response[0] || {}
            : response || {};

          let availableList = Array.isArray(cptData.availableList)
            ? cptData.availableList
            : [];

          const selectedList = Array.isArray(cptData.selectedList)
            ? cptData.selectedList
            : [];

          availableList = availableList
            .map((item) => ({
              ...item,
              code: item?.cpt_code ?? item?.cptCode ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.cpt_code ??
                item?.cptCode ??
                item?.code,
            }))
            .filter((item) => item.code);

          const normalizedSelectedList = selectedList
            .map((item) => ({
              ...item,
              code: item?.cpt_code ?? item?.cptCode ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.cpt_code ??
                item?.cptCode ??
                item?.code,
            }))
            .filter((item) => item.code);

          console.log("📊 ALL CPT CODES:", availableList);
          console.log("📊 SELECTED CPT CODES:", normalizedSelectedList);

          setCptCodes(availableList);
          setSelectedCptCodes(normalizedSelectedList);

          const dialogData = {
            availableData: availableList,
            selectedData: normalizedSelectedList,
            criteriaId: criteria.id,
            criteriaName: criteria.name || "CPT Code Have Had",
            programId: program.id,
            programName: programInfo?.programName || program?.name || "",
            requestAppFrom: REQUEST_FROM,
            operand: criteria.operand || "OR",
          };

          console.log(
            "📊 CPT Dialog Data:",
            JSON.stringify(dialogData, null, 2),
          );

          setDialog({
            type: "cptCodeHadCriteria",
            open: true,
            data: dialogData,
          });
        } catch (error) {
          console.error("❌ Error calling getCptCodeHadCriteria:", error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load CPT Code information"),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callCptCodeInfo();
      return;
    }

    // =====================================================
    // CPT CODE HAVE NOT HAD CRITERIA
    // =====================================================
    if (type === "cptCodeHadNotCriteria") {
      const callCptCodeHadNotInfo = async () => {
        setDialogLoading(true);

        try {
          const response = await smartReachApi.getCptCodeHadNotCriteria(
            program.id,
            criteria.id,
          );

          console.log("📊 CPT Code Had Not Response:", response);

          const cptData = Array.isArray(response)
            ? response[0] || {}
            : response || {};

          let availableList = Array.isArray(cptData.availableList)
            ? cptData.availableList
            : [];

          const selectedList = Array.isArray(cptData.selectedList)
            ? cptData.selectedList
            : [];

          availableList = availableList
            .map((item) => ({
              ...item,
              code: item?.cpt_code ?? item?.cptCode ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.cpt_code ??
                item?.cptCode ??
                item?.code,
            }))
            .filter((item) => item.code);

          const normalizedSelectedList = selectedList
            .map((item) => ({
              ...item,
              code: item?.cpt_code ?? item?.cptCode ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.cpt_code ??
                item?.cptCode ??
                item?.code,
            }))
            .filter((item) => item.code);

          console.log("📊 ALL CPT CODES (Have Not):", availableList);
          console.log(
            "📊 SELECTED CPT CODES (Have Not):",
            normalizedSelectedList,
          );

          const dialogData = {
            availableData: availableList,
            selectedData: normalizedSelectedList,
            criteriaId: criteria.id,
            criteriaName: criteria.name || "CPT Code Have Not Had",
            programId: program.id,
            programName: programInfo?.programName || program?.name || "",
            requestAppFrom: REQUEST_FROM,
            operand: criteria.operand || "OR",
          };

          console.log(
            "📊 CPT Had Not Dialog Data:",
            JSON.stringify(dialogData, null, 2),
          );

          setDialog({
            type: "cptCodeHadNotCriteria",
            open: true,
            data: dialogData,
          });
        } catch (error) {
          console.error("❌ Error calling getCptCodeHadNotCriteria:", error);
          shared.toast?.error?.(
            apiErrorText(
              error,
              "Failed to load CPT Code (Have Not) information",
            ),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callCptCodeHadNotInfo();
      return;
    }

    // =====================================================
    // DIAGNOSIS CODE HAD CRITERIA
    // =====================================================
    if (type === "diagnosisCodeHadCriteria") {
      const callDiagnosisCodeInfo = async () => {
        setDialogLoading(true);

        try {
          const response = await smartReachApi.getCptCodeHadCriteria(
            program.id,
            criteria.id,
          );

          console.log("📊 Diagnosis Code Had Response:", response);

          const diagnosisData = Array.isArray(response)
            ? response[0] || {}
            : response || {};

          let availableList = Array.isArray(diagnosisData.availableList)
            ? diagnosisData.availableList
            : [];

          const selectedList = Array.isArray(diagnosisData.selectedList)
            ? diagnosisData.selectedList
            : [];

          availableList = availableList
            .map((item) => ({
              ...item,
              code: item?.diagnosis_code ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.diagnosis_code ??
                item?.code,
            }))
            .filter((item) => item.code);

          const normalizedSelectedList = selectedList
            .map((item) => ({
              ...item,
              code: item?.diagnosis_code ?? item?.code ?? item?.id,
              name:
                item?.name ??
                item?.description ??
                item?.diagnosis_code ??
                item?.code,
            }))
            .filter((item) => item.code);

          console.log("📊 ALL DIAGNOSIS CODES:", availableList);
          console.log("📊 SELECTED DIAGNOSIS CODES:", normalizedSelectedList);

          const dialogData = {
            availableData: availableList,
            selectedData: normalizedSelectedList,
            criteriaId: criteria.id,
            criteriaName: criteria.name || "Diagnosis Code Have Had",
            programId: program.id,
            programName: programInfo?.programName || program?.name || "",
            requestAppFrom: REQUEST_FROM,
            operand: criteria.operand || "OR",
          };

          console.log(
            "📊 Diagnosis Dialog Data:",
            JSON.stringify(dialogData, null, 2),
          );

          setDialog({
            type: "diagnosisCodeHadCriteria",
            open: true,
            data: dialogData,
          });
        } catch (error) {
          console.error("❌ Error calling getDiagnosisCodeHadCriteria:", error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load Diagnosis Code information"),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callDiagnosisCodeInfo();
      return;
    }

    // =====================================================
    // ETHNICITY TYPE HAD CRITERIA
    // =====================================================
    if (type === "ethnicityTypeHadCriteria") {
      const callEthnicityTypeInfo = async () => {
        setDialogLoading(true);

        try {
          const response = await smartReachApi.getCptCodeHadCriteria(
            program.id,
            criteria.id,
          );

          console.log("📊 Ethnicity Type Had Response:", response);

          const ethnicityData = Array.isArray(response)
            ? response[0] || {}
            : response || {};

          let availableList = Array.isArray(ethnicityData.availableList)
            ? ethnicityData.availableList
            : [];

          const selectedList = Array.isArray(ethnicityData.selectedList)
            ? ethnicityData.selectedList
            : [];

          availableList = availableList
            .map((item) => ({
              ...item,
              name: item?.name ?? item?.ethnicity_name ?? item?.label,
            }))
            .filter((item) => item.name);

          const normalizedSelectedList = selectedList
            .map((item) => ({
              ...item,
              name: item?.name ?? item?.ethnicity_name ?? item?.label,
            }))
            .filter((item) => item.name);

          console.log("📊 ALL ETHNICITY TYPES:", availableList);
          console.log("📊 SELECTED ETHNICITY TYPES:", normalizedSelectedList);

          const dialogData = {
            availableData: availableList,
            selectedData: normalizedSelectedList,
            criteriaId: criteria.id,
            criteriaName: criteria.name || "Ethnicity Type",
            programId: program.id,
            programName: programInfo?.programName || program?.name || "",
            requestAppFrom: REQUEST_FROM,
            operand: criteria.operand || "OR",
          };

          console.log(
            "📊 Ethnicity Dialog Data:",
            JSON.stringify(dialogData, null, 2),
          );

          setDialog({
            type: "ethnicityTypeHadCriteria",
            open: true,
            data: dialogData,
          });
        } catch (error) {
          console.error("❌ Error calling getEthnicityTypeHadCriteria:", error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load Ethnicity Type information"),
          );
        } finally {
          setDialogLoading(false);
        }
      };

      callEthnicityTypeInfo();
      return;
    }

    if (type === "frequency") {
      openDialog("frequency", {
        criteriaId: criteria.id,
        criteriaName: criteria.name,
        minFrequencyYears: Math.floor((frequency.min || 0) / 12),
        minFrequencyMonths: (frequency.min || 0) % 12,
        maxFrequencyYears: Math.floor((frequency.max || 0) / 12),
        maxFrequencyMonths: (frequency.max || 0) % 12,
      });
      return;
    }

    // =====================================================
    // OTHER CRITERIA
    // =====================================================
    openDialog(type, {
      criteriaId: criteria.id,
      criteriaName: criteria.name,
      selectedData: criteria.values || [],
    });
  };

  // Open scheduled action picker
  const openScheduledActionPicker = async () => {
    setDialogLoading(true);
    try {
      const allScheduledActions = await smartReachApi.getScheduledActions();
      openDialog("displayLocation", {
        availableData: Array.isArray(allScheduledActions)
          ? allScheduledActions
          : [],
        selectedData: selectedScheduledActions || [],
      });
    } catch (err) {
      console.error("Error loading scheduled actions:", err);
      shared.toast?.error?.(
        apiErrorText(err, "Failed to load scheduled actions."),
      );
    } finally {
      setDialogLoading(false);
    }
  };

  // Open text message picker
  const openTextMessagePicker = () => {
    setDialogLoading(true);
    try {
      const currentMessage =
        programTextMsgInfo.length > 0 ? programTextMsgInfo[0].messageText : "";
      openDialog("messageText", {
        data: [],
        messageDynamicText: currentMessage,
      });
    } finally {
      setDialogLoading(false);
    }
  };

  // Validate criteria values before update
  const validateCriteriaValues = () => {
    const errors = [];
    for (const criteria of selectedCriteria) {
      const rule = CRITERIA_VALUE_RULES.find(
        (item) => item.name === criteria.name,
      );
      if (!rule) continue;

      if (rule.dialog === "age") {
        if (age.min === 0 && age.max === 0) {
          errors.push(rule.error);
        }
      } else if (rule.dialog === "frequency") {
        if (frequency.min === 0 && frequency.max === 0) {
          errors.push(rule.error);
        }
      } else {
        const selectedValues = selections[rule.dialog] || [];
        const criteriaValues = criteria.values || [];
        if (selectedValues.length === 0 && criteriaValues.length === 0) {
          errors.push(rule.error);
        }
      }
    }
    return errors;
  };

  // Handle Update button click
  const handleUpdate = async () => {
    setSaving(true);

    try {
      const messageText = programTextMsgInfo?.[0]?.messageText ?? "";
      const programStatus = Number(
        programInfo?.programStatus ?? program?.programStatus ?? 2,
      );
      const programName = programInfo?.programName || program?.name || "";

      console.log("📤 Updating program:", {
        programId: Number(program.id),
        messageText,
        programStatus,
        programName,
      });

      await smartReachApi.updateProgramMessageText(
        program.id,
        messageText,
        programStatus,
        programName,
      );

      console.log("✅ Program updated successfully");

      const updatedPrograms = await smartReachApi.getPracticePrograms();

      shared.toast?.success?.("Program updated successfully");
      setHasChanges(false);

      if (onUpdate) {
        onUpdate(updatedPrograms);
      }

      setDialog({
        type: null,
        open: false,
        data: null,
      });

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("❌ Error in Update Program:", error);
      shared.toast?.error?.(apiErrorText(error, "Failed to update program"));
    } finally {
      setSaving(false);
    }
  };

  // Handle close with confirmation
  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm(SR_TEXT.WARNING_MESSAGE)) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Fetch data function
  const fetchData = async () => {
    setLoading(true);

    try {
      const [
        programInfoResult,
        selectedCriteriaResult,
        selectedActionsResult,
        scheduledActionsResult,
        programTextMsgInfoResult,
        allCrieteriaResult,
        programThresholdResult,
        cptCodesResult,
      ] = await Promise.all([
        smartReachApi.getProgramInfo(program.id),
        smartReachApi.getSelectedCriteria(program.id),
        smartReachApi.getSelectedActions(program.id),
        smartReachApi.getScheduledActions(),
        smartReachApi.getProgramTextMsgInfo(program.id),
        smartReachApi.getCriteria(),
        smartReachApi.getProgramThreshold(),
        // smartReachApi.getCptCodes(program.id).catch(() => []), // Fallback if API doesn't exist
      ]);

      let infoData = programInfoResult;
      if (Array.isArray(programInfoResult) && programInfoResult.length > 0) {
        infoData = programInfoResult[0];
      }
      setProgramInfo(infoData);

      const criteriaArray = Array.isArray(selectedCriteriaResult)
        ? selectedCriteriaResult
        : [];

      setSelectedCriteria(sortAlphabetically(criteriaArray));

      const actionsArray = Array.isArray(selectedActionsResult)
        ? selectedActionsResult
        : [];
      const scheduledActionArray = Array.isArray(scheduledActionsResult)
        ? scheduledActionsResult
        : [];
      const textMsgArray = Array.isArray(programTextMsgInfoResult)
        ? programTextMsgInfoResult
        : [];
      const allCrieteriaArray = Array.isArray(allCrieteriaResult)
        ? allCrieteriaResult
        : [];
      const cptCodesArray = Array.isArray(cptCodesResult) ? cptCodesResult : [];

      // Extract age values
      const ageCriteria = criteriaArray.find(
        (c) => c.name === CRITERIA_NAMES.AGE,
      );
      if (ageCriteria) {
        const min = ageCriteria.min || 0;
        const max = ageCriteria.max || 0;
        setAge({ min, max });
        setOriginalAge({ min, max });
      }

      // Extract frequency values
      const frequencyCriteria = criteriaArray.find(
        (c) => c.name === CRITERIA_NAMES.FREQUENCY,
      );
      if (frequencyCriteria) {
        setFrequency({
          min: frequencyCriteria.min || 0,
          max: frequencyCriteria.max || 0,
        });
      }

      // Extract selections for list-based criteria
      const newSelections = {};
      for (const criteria of criteriaArray) {
        const rule = CRITERIA_VALUE_RULES.find(
          (item) => item.name === criteria.name,
        );
        if (rule && rule.dialog !== "age" && rule.dialog !== "frequency") {
          newSelections[rule.dialog] = criteria.values || [];
        }
      }
      setSelections(newSelections);

      // Set CPT codes
      setCptCodes(cptCodesArray);

      // Extract CPT codes from criteria if not in separate API
      const cptCodeHadCriteria = criteriaArray.find(
        (c) =>
          c.name?.toLowerCase() === "cpt code" ||
          c.name?.toLowerCase() === "cpt codes",
      );
      if (cptCodeHadCriteria && cptCodeHadCriteria.values) {
        setSelectedCptCodes(cptCodeHadCriteria.values);
      } else {
        setSelectedCptCodes(cptCodesArray);
      }

      setSelectedActions(sortAlphabetically(actionsArray));
      setSelectedScheduledActions(sortAlphabetically(scheduledActionArray));
      setProgramTextMsgInfo(textMsgArray);
      setGetAllCriteria(sortAlphabetically(allCrieteriaArray));
      setProgramThreshold(programThresholdResult || 0);
      setHasChanges(false);
    } catch (error) {
      console.error("❌ Error fetching program details:", error);
      shared.toast?.error?.(
        apiErrorText(error, "Failed to load program details"),
      );
      setSelectedCriteria([]);
      setSelectedActions([]);
      setSelectedScheduledActions([]);
      setProgramTextMsgInfo([]);
      setCptCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!program) return;
    fetchData();
  }, [program, shared]);

  if (!program) return null;

  const totalPatients = Number(program.total) || 0;
  const thresholdValue = Number(programThreshold) || 0;
  const allocationPercentage =
    totalPatients > 0
      ? ((thresholdValue / totalPatients) * 100).toFixed(2)
      : "0.00";
  const busy = dialogLoading || saving;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
      >
        <div
          className="my-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              {program.name || "Program Details"}
              {loading && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Loading...
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-6 px-6 py-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3 text-slate-500">
                  <svg
                    className="h-6 w-6 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Loading program details...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Criteria Section */}
                <div>
                  <button
                    type="button"
                    onClick={openCriteriaPicker}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    Criteria
                  </button>
                  {selectedCriteria.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {selectedCriteria.map((criteriaItem) => (
                        <div
                          key={criteriaItem.id || criteriaItem.criteriaId}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-slate-800">
                            {getDisplayName(criteriaItem)}
                          </span>
                          <EditIconButton
                            title={`Edit ${getDisplayName(criteriaItem)}`}
                            onClick={() =>
                              editCriteria(
                                criteriaItem,
                                // program?.practiceId || program?.practice_id,
                              )
                            }
                            disabled={busy}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CPT Code Section */}
                {/* CPT Code Section */}
                {selectedCptCodes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Code size={16} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        CPT Codes ({selectedCptCodes.length})
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedCptCodes.map((cpt, index) => (
                        <div
                          key={cpt.id || cpt.code || index}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <span className="text-xs font-medium text-slate-800">
                              {cpt.code || cpt.name}
                            </span>
                            {cpt.description && (
                              <span className="ml-2 text-xs text-slate-500">
                                - {cpt.description}
                              </span>
                            )}
                            {cpt.frequency && (
                              <span className="ml-2 text-xs text-emerald-600">
                                Freq: {cpt.frequency.min}-{cpt.frequency.max}{" "}
                                {cpt.frequency.unit}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                            title="Edit CPT Code"
                            onClick={() => {
                              const cptCriteria = selectedCriteria.find(
                                (c) =>
                                  c.name?.toLowerCase() === "cpt code" ||
                                  c.name?.toLowerCase() === "cpt codes",
                              );
                              if (cptCriteria) {
                                editCriteria(
                                  cptCriteria,
                                  // program?.practiceId || program?.practice_id,
                                );
                              }
                            }}
                            disabled={busy}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduled Action Section */}
                <div>
                  <button
                    type="button"
                    onClick={openScheduledActionPicker}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    <Calendar size={14} />
                    Scheduled Action
                  </button>
                  {selectedScheduledActions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {selectedScheduledActions.map((scheduledItem, index) => (
                        <div
                          key={
                            scheduledItem.id ||
                            scheduledItem.criteriaId ||
                            index
                          }
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-slate-800">
                            {getDisplayName(scheduledItem)}
                          </span>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                            title="Edit scheduled action"
                            onClick={openScheduledActionPicker}
                            disabled={busy}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Text Message Section */}
                <div>
                  <button
                    type="button"
                    onClick={openTextMessagePicker}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    <FileText size={14} />
                    Text Message
                  </button>
                  {programTextMsgInfo.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {programTextMsgInfo.map((msg, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-slate-800 truncate flex-1">
                            {msg.messageText || "No message content"}
                          </span>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition ml-2 flex-shrink-0"
                            title="Edit text message"
                            onClick={openTextMessagePicker}
                            disabled={busy}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Program Goal & Info */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Program Goal
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Program Text Time
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {extractTimeFromSchedule(programInfo?.scheduleTime)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Threshold / Allocation */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Threshold
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {formatNumber(thresholdValue)} /{" "}
                        {formatNumber(totalPatients)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Text Allocation
                      </span>
                      <p className="text-sm font-medium text-emerald-600">
                        {allocationPercentage}%
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Remaining
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {formatNumber(
                          Math.max(totalPatients - thresholdValue, 0),
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional info from API */}
                {programInfo && (
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-slate-600">
                          External Data:
                        </span>
                        <span className="ml-1 text-slate-700">
                          {programInfo.externalData === 1 ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">
                          VPT C:
                        </span>
                        <span className="ml-1 text-slate-700">
                          {programInfo.vptc ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">
                          Informational Only:
                        </span>
                        <span className="ml-1 text-slate-700">
                          {programInfo.informationalOnlyAction ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {saving && (
              <span className="mr-auto flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                Saving...
              </span>
            )}
            <button
              type="button"
              onClick={handleUpdate}
              disabled={busy || loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update Program"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={busy || saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Shared UI Dialogs */}
      <DisplayCriteria
        open={dialog.open && dialog.type === "displayCriteria"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <DisplayLocation
        open={dialog.open && dialog.type === "displayLocation"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <MessageText
        open={dialog.open && dialog.type === "messageText"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <AgeCriteria
        key={dialog.data?.criteriaId || "age-criteria"}
        open={dialog.open && dialog.type === "age"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <FrequencyCriteria
        open={dialog.open && dialog.type === "frequency"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <GenderCriteria
        open={dialog.open && dialog.type === "gender"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <InsuranceCriteria
        open={dialog.open && dialog.type === "insurance"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <LocationCriteria
        open={dialog.open && dialog.type === "location"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <ProvidersCriteria
        open={dialog.open && dialog.type === "providers"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <ActivityTypeCriteria
        open={dialog.open && dialog.type === "activityType"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <ActivitySetTypeCriteria
        open={dialog.open && dialog.type === "activitySet"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <AppointmentStatus
        open={dialog.open && dialog.type === "appointmentStatus"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <ReferringProvider
        open={dialog.open && dialog.type === "referring"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <CptCodeHadCriteria
        open={dialog.open && dialog.type === "cptCodeHadCriteria"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <CptCodeHadNotCriteria
        open={dialog.open && dialog.type === "cptCodeHadNotCriteria"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <DiagnosisCodeCriteria
        open={dialog.open && dialog.type === "diagnosisCodeHadCriteria"}
        data={dialog.data}
        onClose={closeDialog}
      />
      <EthnicityTypeCriteria
        open={dialog.open && dialog.type === "ethnicityTypeHadCriteria"}
        data={dialog.data}
        onClose={closeDialog}
      />
    </>
  );
};

export default ProgramDetailsEdit;
