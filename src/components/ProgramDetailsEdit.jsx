// src/components/ProgramDetailsEdit.jsx
import { useState, useEffect } from "react";
import {
  X,
  Edit,
  FileText,
  Calendar,
  Plus,
  Code,
  MapPin,
  Users,
} from "lucide-react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";
import ConfirmDialog from "patientcare-portal-sharedui/ConfirmDialog";

// Import shared UI components
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
import CptCodeHadNotCriteria from "patientcare-portal-sharedui/CptCodeHadNotCriteria";
import DiagnosisCodeCriteria from "patientcare-portal-sharedui/DiagnosisCodeCriteria";
import EthnicityTypeCriteria from "patientcare-portal-sharedui/EthnicityTypeCriteria";
import RaceTypeCriteria from "patientcare-portal-sharedui/RaceTypeCriteria";
import PatientZipCodeCriteria from "patientcare-portal-sharedui/PatientZipCodeCriteria";
import { EditIconButton } from "patientcare-portal-sharedui/RowActions";
import ActionScheduledActivityCriteria from "patientcare-portal-sharedui/ActionScheduledActivityCriteria";
import ActionLocationCriteria from "patientcare-portal-sharedui/ActionLocationCriteria";
import ActionProviderCriteria from "patientcare-portal-sharedui/ActionProviderCriteria";
import {
  CRITERIA_NAMES,
  SR_TEXT,
  REQUEST_FROM,
} from "../config/smartReachConstants.js";

// CONSTANTS & HELPERS

const formatNumber = (num) => {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString("en-US");
};

const sortAlphabetically = (arr, key = "name") => {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const nameA = (
      a[key] ||
      a.criteriaName ||
      a.actionName ||
      a.label ||
      ""
    ).toLowerCase();
    const nameB = (
      b[key] ||
      b.criteriaName ||
      b.actionName ||
      b.label ||
      ""
    ).toLowerCase();
    return nameA.localeCompare(nameB);
  });
};
const sortByName = (items) => {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const nameA = (a?.name || a?.display_name || a?.label || "").toLowerCase();
    const nameB = (b?.name || b?.display_name || b?.label || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

const getDisplayName = (item) => {
  if (!item) return "Unnamed";

  // If it's a string, return it
  if (typeof item === "string") return item;

  // If it's a number, convert to string
  if (typeof item === "number") return String(item);

  // If it's an object
  if (typeof item === "object") {
    // Check for name in various formats
    if (item.name) return item.name;
    if (item.actionName) return item.actionName;
    if (item.label) return item.label;
    if (item.description) return item.description;
    if (item.criteriaName) return item.criteriaName;
    if (item.messageText) return item.messageText;
    if (item.code) return item.code;

    // For selected actions that might have different structure
    if (item.action_name) return item.action_name;
    if (item.display_name) return item.display_name;

    // If no name found, try to stringify
    try {
      return JSON.stringify(item);
    } catch {
      return "Unnamed";
    }
  }

  return String(item);
};

const extractTime = (scheduleTime) => {
  if (!scheduleTime) return "N/A";
  try {
    const date = new Date(scheduleTime);
    if (isNaN(date.getTime())) return "N/A";
    let hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}${ampm}`;
  } catch {
    return "N/A";
  }
};

const normalizeCptCode = (item) => ({
  ...item,
  id: item?.id ?? item?.cpt_code ?? item?.cptCode ?? item?.code,
  code: item?.cpt_code ?? item?.cptCode ?? item?.code ?? item?.id,
  name:
    item?.name ??
    item?.description ??
    item?.cpt_code ??
    item?.cptCode ??
    item?.code,
  description: item?.description ?? item?.name ?? item?.cpt_code ?? item?.code,
});

const normalizeDiagnosisCode = (item) => ({
  ...item,
  id: item?.id ?? item?.diagnosis_code ?? item?.code,
  code: item?.diagnosis_code ?? item?.code ?? item?.id,
  name: item?.diagnosis_code ?? item?.code ?? item?.id,
});

const normalizeListItem = (item) => ({
  ...item,
  name:
    item?.name ??
    item?.label ??
    item?.ethnicity ?? // ← For ethnicity data
    item?.ethnicity_name ??
    item?.race_name ??
    item?.zip_code ??
    item?.code ??
    item?.id ??
    String(item),
  // Preserve the original fields for ethnicity
  ethnicity: item?.ethnicity || item?.ethnicity_name,
  ethnicity_id: item?.ethnicity_id || item?.id,
});

// MAIN COMPONENT
const ProgramDetailsEdit = ({ program, onClose, onUpdate, onCancel }) => {
  const shared = useSharedUi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // State
  const [programInfo, setProgramInfo] = useState(null);
  const [selectedCriteria, setSelectedCriteria] = useState([]);
  const [selectedActions, setSelectedActions] = useState([]);
  const [selectedScheduledActions, setSelectedScheduledActions] = useState([]);
  const [programTextMsgInfo, setProgramTextMsgInfo] = useState([]);
  const [programThreshold, setProgramThreshold] = useState(0);
  const [totalTextLimit, setTotalTextLimit] = useState(0);
  const [remainingTextLimit, setRemainingTextLimit] = useState(0);
  const [remainingTotalTextLimit, setRemainingTotalTextLimit] = useState(0);
  const [actionDetailDialog, setActionDetailDialog] = useState({
    open: false,
    type: null, // 'activity', 'location', 'provider'
    data: null,
    action: null,
  });
  // Criteria-specific states
  const [age, setAge] = useState({ min: 0, max: 0 });
  const [frequency, setFrequency] = useState({ min: 0, max: 0 });
  const [selectedCptCodes, setSelectedCptCodes] = useState([]);
  const [selectedZipCodes, setSelectedZipCodes] = useState([]);
  const [selectedRaceTypes, setSelectedRaceTypes] = useState([]);
  const [selectedScheduledLocations, setSelectedScheduledLocations] = useState(
    [],
  );
  const [selectedBilledLocations, setSelectedBilledLocations] = useState([]);
  const [diagnosisCodes, setDiagnosisCodes] = useState([]);
  const [selectedDiagnosisCodes, setSelectedDiagnosisCodes] = useState([]);

  // Dialog state
  const [dialog, setDialog] = useState({ type: null, open: false, data: null });
  // In ProgramDetailsEdit.jsx, add this helper function:

  // SELECTION RULES FOR ACTION DETAILS - AUTO REPLACE
  const getPracticeSumOfProgramThreshold = async (
    currentProgramThreshold = 0,
  ) => {
    try {
      const userDetails = shared.userDetails;
      const practiceRole = userDetails?.roles?.practicerole?.[0];

      const practiceTextLimit = Number(practiceRole?.practiceTextLimit || 0);

      setTotalTextLimit(practiceTextLimit);

      const response = await smartReachApi.getProgramThreshold();

      // API returns the sum of thresholds of programs
      const usedThreshold = Number(response || 0);

      // Same as Angular:
      // remainTextLimit = totalTextLimit - resp
      const remaining = Math.max(practiceTextLimit - usedThreshold, 0);

      // When editing the current program, add its existing
      // threshold back because it is already included in the API sum.
      const remainingForCurrentProgram = Math.max(
        practiceTextLimit +
          Number(currentProgramThreshold || 0) -
          usedThreshold,
        0,
      );

      setRemainingTextLimit(remaining);
      setRemainingTotalTextLimit(remainingForCurrentProgram);

      return {
        practiceTextLimit,
        usedThreshold,
        remaining,
        remainingForCurrentProgram,
      };
    } catch (error) {
      console.error("❌ Failed to get practice program threshold:", error);

      shared.toast?.error?.(
        apiErrorText(error, "Failed to load remaining text limit"),
      );

      return null;
    }
  };
  const getSingleSelectRules = () => ({
    // Always allow selection
    validateSelect: () => null,
    // Auto-replace: remove current selection and add new one
    onSelect: (item, selected, setSelected, setAvailable) => {
      // If there's already a selected item, move it back to available
      if (selected.length > 0) {
        const currentSelected = selected[0];
        setAvailable((prev) => {
          // Check if item already exists in available to avoid duplicates
          if (!prev.some((a) => a.id === currentSelected.id)) {
            return sortByName([...prev, currentSelected]);
          }
          return prev;
        });
        setSelected((prev) => prev.filter((s) => s.id !== currentSelected.id));
      }

      // Add the new item to selected
      setSelected((prev) => {
        // Avoid duplicates
        if (prev.some((s) => s.id === item.id)) {
          return prev;
        }
        return sortByName([...prev, item]);
      });
      setAvailable((prev) => prev.filter((a) => a.id !== item.id));
    },
  });
  const openActionDetailPicker = async (action, type) => {
    setDialogLoading(true);
    try {
      const programActionId = action.id || action.actionId || action.action_id;
      const programId = program.id;

      if (!programActionId) {
        shared.toast?.error?.("Invalid action ID");
        setDialogLoading(false);
        return;
      }

      let availableData = [];
      let selectedData = [];
      let title = "";
      let configureLabel = "";
      const singleSelectRules = getSingleSelectRules();

      switch (type) {
        case "activity": {
          const response = await smartReachApi.getActivities(
            programActionId,
            programId,
          );

          // Handle different response structures
          let availableList = [];
          let selectedList = [];

          if (Array.isArray(response)) {
            if (response.length > 0 && response[0]?.availableList) {
              // Format: [{ availableList: [...], selectedList: [...] }]
              availableList = response[0].availableList || [];
              selectedList = response[0].selectedList || [];
            } else {
              // Format: plain array of items
              // All items are available if no selected list is provided
              availableList = response;
              selectedList = [];
            }
          } else if (response?.availableList) {
            availableList = response.availableList || [];
            selectedList = response.selectedList || [];
          }

          // Normalize available data
          availableData = (availableList || []).map((item) => ({
            ...item,
            id: item.id || item.activity_id || item.activityId,
            name:
              item.display_name || item.name || item.activity_name || "Unnamed",
            display_name: item.display_name || item.name || item.activity_name,
          }));

          // Normalize selected data
          selectedData = (selectedList || []).map((item) => ({
            ...item,
            id: item.id || item.activity_id || item.activityId,
            name:
              item.display_name || item.name || item.activity_name || "Unnamed",
            display_name: item.display_name || item.name || item.activity_name,
          }));

          // If selectedData is empty but action.value has IDs, try to match them
          if (
            selectedData.length === 0 &&
            action.value &&
            Array.isArray(action.value)
          ) {
            selectedData = availableData.filter((item) =>
              action.value.includes(String(item.id)),
            );
          }

          title = "Configure Appointment Type";
          configureLabel = "Appointment Type";
          break;
        }

        case "location": {
          const response = await smartReachApi.getActionLocations(
            programActionId,
            programId,
          );

          let availableList = [];
          let selectedList = [];

          if (Array.isArray(response)) {
            if (response.length > 0 && response[0]?.availableList) {
              availableList = response[0].availableList || [];
              selectedList = response[0].selectedList || [];
            } else {
              availableList = response;
              selectedList = [];
            }
          } else if (response?.availableList) {
            availableList = response.availableList || [];
            selectedList = response.selectedList || [];
          }

          availableData = (availableList || []).map((item) => ({
            ...item,
            id: item.id || item.location_id || item.locationId,
            name:
              item.display_name || item.name || item.location_name || "Unnamed",
            display_name: item.display_name || item.name || item.location_name,
          }));

          selectedData = (selectedList || []).map((item) => ({
            ...item,
            id: item.id || item.location_id || item.locationId,
            name:
              item.display_name || item.name || item.location_name || "Unnamed",
            display_name: item.display_name || item.name || item.location_name,
          }));

          if (
            selectedData.length === 0 &&
            action.value &&
            Array.isArray(action.value)
          ) {
            selectedData = availableData.filter((item) =>
              action.value.includes(String(item.id)),
            );
          }

          title = "Configure Location";
          configureLabel = "Location";
          break;
        }

        case "provider": {
          const response = await smartReachApi.getActionProviders(
            programActionId,
            programId,
          );

          let availableList = [];
          let selectedList = [];

          if (Array.isArray(response)) {
            if (response.length > 0 && response[0]?.availableList) {
              availableList = response[0].availableList || [];
              selectedList = response[0].selectedList || [];
            } else {
              availableList = response;
              selectedList = [];
            }
          } else if (response?.availableList) {
            availableList = response.availableList || [];
            selectedList = response.selectedList || [];
          }

          availableData = (availableList || []).map((item) => ({
            ...item,
            id: item.id || item.provider_id || item.providerId,
            name:
              item.display_name || item.name || item.provider_name || "Unnamed",
            display_name: item.display_name || item.name || item.provider_name,
          }));

          selectedData = (selectedList || []).map((item) => ({
            ...item,
            id: item.id || item.provider_id || item.providerId,
            name:
              item.display_name || item.name || item.provider_name || "Unnamed",
            display_name: item.display_name || item.name || item.provider_name,
          }));

          if (
            selectedData.length === 0 &&
            action.value &&
            Array.isArray(action.value)
          ) {
            selectedData = availableData.filter((item) =>
              action.value.includes(String(item.id)),
            );
          }

          title = "Configure Provider";
          configureLabel = "Provider";
          break;
        }

        default:
          shared.toast?.error?.(`Unknown action type: ${type}`);
          setDialogLoading(false);
          return;
      }

      // Remove selected items from available list to avoid duplicates
      const selectedIds = new Set(selectedData.map((item) => String(item.id)));
      const filteredAvailable = availableData.filter(
        (item) => !selectedIds.has(String(item.id)),
      );

      setActionDetailDialog({
        open: true,
        type: type,
        action: action,
        data: {
          availableData: filteredAvailable,
          selectedData: selectedData,
          title: title,
          configureLabel: configureLabel,
          actionId: programActionId,
          programId: programId,
          programName: programInfo?.programName || program?.name || "",
          requestAppFrom: REQUEST_FROM,
          selectionRules: singleSelectRules,
        },
      });
    } catch (error) {
      console.error(`❌ Error loading ${type} details:`, error);
      shared.toast?.error?.(
        apiErrorText(error, `Failed to load ${type} details`),
      );
    } finally {
      setDialogLoading(false);
    }
  };

  const handleActionDetailClose = async (result) => {
    if (!result) {
      setActionDetailDialog({
        open: false,
        type: null,
        data: null,
        action: null,
      });
      return;
    }

    if (result.action === "close") {
      setActionDetailDialog({
        open: false,
        type: null,
        data: null,
        action: null,
      });
      return;
    }

    // Get selected values returned by the dialog
    let values = result.values || result.selected || [];

    // If dialog returned nothing, use the data that was originally selected
    if (values.length === 0 && actionDetailDialog.data?.selectedData) {
      values = actionDetailDialog.data.selectedData;
    }

    const { type, action } = actionDetailDialog;

    const programId = Number(program.id);
    const programName = programInfo?.programName || program?.name || "";

    setDialogLoading(true);

    try {
      let payload = {};
      let apiCall;

      switch (type) {
        // ACTIVITY
        case "activity": {
          const selectedActivity = values?.[0];

          payload = {
            value: [selectedActivity?.id],
            programId: programId,
            programActionId: action.id,
            activeStatus: 1,
            activityName: selectedActivity?.name,
            programName: programName,
          };

          apiCall = smartReachApi.updateActionActivity(payload);

          break;
        }

        // LOCATION
        case "location": {
          const selectedLocation = values?.[0];

          payload = {
            value: [selectedLocation?.id],
            programId: programId,
            programActionId: action.id,
            activeStatus: 1,
            locationName: selectedLocation?.name,
            programName: programName,
          };

          apiCall = smartReachApi.updateActionLocation(payload);

          break;
        }

        // PROVIDER
        case "provider": {
          const selectedProvider = values?.[0];

          payload = {
            value: [selectedProvider?.id],
            programId: programId,
            programActionId: action.id,
            activeStatus: 1,
            providerName: selectedProvider?.name,
            programName: programName,
          };

          apiCall = smartReachApi.updateActionProvider(payload);

          break;
        }

        default:
          return;
      }

      if (apiCall) {
        await apiCall;

        // Refresh scheduled actions
        const refreshedActions = await smartReachApi.getSelectedActions(
          program.id,
        );

        const normalized = (refreshedActions || []).map((action) => ({
          id: action.id || action.actionId || action.action_id,

          name:
            action.name ||
            action.actionName ||
            action.label ||
            "Unnamed Action",

          ...action,
        }));

        setSelectedScheduledActions(sortAlphabetically(normalized));

        shared.toast?.success?.(`${type} updated successfully`);
      }
    } catch (error) {
      console.error(`❌ ${type} update failed:`, error);

      shared.toast?.error?.(apiErrorText(error, `Failed to update ${type}`));
    } finally {
      setDialogLoading(false);

      setActionDetailDialog({
        open: false,
        type: null,
        data: null,
        action: null,
      });
    }
  };
  // HELPER FUNCTIONS
  const getItemDisplayValue = (item) => {
    if (!item) return "";
    if (typeof item === "string") {
      // If it's in "id_name" format, extract just the name
      if (item.includes("_")) {
        const parts = item.split("_");
        return parts.slice(1).join("_");
      }
      return item;
    }
    if (typeof item === "number") return String(item);
    if (typeof item === "object") {
      // For patient zip
      if (item.code) return String(item.code);
      if (item.zip) return String(item.zip);
      if (item.zip_code) return String(item.zip_code);
      // For insurance
      if (item.display_name) return String(item.display_name);
      if (item.plan_name) return String(item.plan_name);
      // For ethnicity
      if (item.ethnicity) return String(item.ethnicity);
      if (item.ethnicity_name) return String(item.ethnicity_name);
      if (item.race_name) return String(item.race_name);
      if (item.name) return String(item.name);
      if (item.label) return String(item.label);
      if (item.cpt_code) return String(item.cpt_code);
      if (item.cptCode) return String(item.cptCode);
      if (item.id) return String(item.id);
      if (item.value) return String(item.value);
      if (item.toString && item.toString() !== "[object Object]") {
        return item.toString();
      }
      return String(item);
    }
    return String(item);
  };

  const extractStrings = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(getItemDisplayValue).filter(Boolean);
  };

  const openDialog = (type, data) => {
    setDialog({
      type,
      open: true,
      data: { ...data, requestAppFrom: REQUEST_FROM },
    });
  };

  const closeDialog = () => {
    setDialog({ type: null, open: false, data: null });
  };

  const updateCriteria = (criteriaId, updates) => {
    setSelectedCriteria((prev) =>
      prev.map((c) => {
        if (Number(c.id || c.criteriaId) === Number(criteriaId)) {
          return { ...c, ...updates };
        }
        return c;
      }),
    );
    setHasChanges(true);
  };

  // REFRESH CPT DATA
  const refreshCptData = async (criteriaId) => {
    try {
      const result = await smartReachApi.getCptCodeHadCriteria(
        program.id,
        criteriaId,
      );

      const criteriaToUpdate = selectedCriteria.find(
        (c) => Number(c.id || c.criteriaId) === Number(criteriaId),
      );

      if (criteriaToUpdate) {
        const selectedList = result.selectedList || [];
        const displayText = selectedList
          .map((item) => item.code || item.cpt_code || item.name)
          .join(", ");

        updateCriteria(criteriaId, {
          values: selectedList,
          displayText: displayText,
        });

        setSelectedCptCodes(selectedList);
      }
    } catch (error) {
      console.error("❌ Failed to refresh CPT data:", error);
    }
  };

  // HANDLE DIALOG CLOSE
  const handleDialogClose = async (result) => {
    if (!result) return closeDialog();

    const { type, data } = dialog;
    const values = result.values || [];

    if (result.action === "close") {
      closeDialog();
      return;
    }

    const selectedIds = values
      .map((item) => getItemDisplayValue(item))
      .filter(Boolean);

    if (
      !selectedIds.length &&
      !result.minAge &&
      !result.maxAge &&
      !result.minFrequency &&
      !result.maxFrequency &&
      !result.values // ✅ Also check for message text
    ) {
      return closeDialog();
    }

    setDialogLoading(true);

    try {
      const criteriaId = Number(data?.criteriaId);
      const criteriaName = data?.criteriaName || type;
      const programId = Number(program.id);
      const programName = programInfo?.programName || program?.name || "";

      let apiCall;
      let payload = {};

      switch (type) {
        case "age": {
          const minAge = Number(result.minAge ?? 0);
          const maxAge = Number(result.maxAge ?? 0);
          payload = {
            programId: programId,
            attributeId: criteriaId,
            name: criteriaName,
            programName: programName,
            min: minAge,
            max: maxAge,
          };
          apiCall = smartReachApi.criteriaAge(payload);
          setAge({ min: minAge, max: maxAge });
          break;
        }

        case "frequency": {
          const minFreq = Number(result.minFrequency ?? 0);
          const maxFreq = Number(result.maxFrequency ?? 0);
          payload = {
            programId: programId,
            attributeId: criteriaId,
            name: criteriaName,
            programName: programName,
            min: minFreq,
            max: maxFreq,
          };
          apiCall = smartReachApi.criteriaFrequency(payload);
          setFrequency({ min: minFreq, max: maxFreq });
          break;
        }

        case "cptCodeHadCriteria": {
          const codes = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) return item;
                return item;
              }
              if (typeof item === "number") return String(item);
              if (item && typeof item === "object") {
                const id = item.id || item.practice_id;
                const code =
                  item.cpt_code ||
                  item.code ||
                  item.cptCode ||
                  item.name ||
                  item.label;
                if (id && code) {
                  return `${id}_${code}`;
                }
                return code || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: codes,
            operand: result.operand || data?.operand || "OR",
          };

          apiCall = smartReachApi.updateCptCodeHadCriteria(payload);

          const normalizedValues = values.map(normalizeCptCode);
          setSelectedCptCodes(normalizedValues);

          updateCriteria(criteriaId, {
            values: normalizedValues.map((item) => item.code || item.id),
            displayText: normalizedValues
              .map((item) => item.code || item.name)
              .join(", "),
          });

          break;
        }

        case "cptCodeHadNotCriteria": {
          const codes = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) return item;
                return item;
              }
              if (typeof item === "number") return String(item);
              if (item && typeof item === "object") {
                const id = item.id || item.practice_id;
                const code =
                  item.cpt_code ||
                  item.code ||
                  item.cptCode ||
                  item.name ||
                  item.label;
                if (id && code) {
                  return `${id}_${code}`;
                }
                return code || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          const minFreq =
            result.minFrequency ?? data?.cptHadNotFreqData?.min ?? 0;
          const maxFreq =
            result.maxFrequency ?? data?.cptHadNotFreqData?.max ?? 0;

          const frequencyInfo = {
            attributeId: criteriaId,
            min: Number(minFreq),
            max: Number(maxFreq),
            name: `${criteriaName} Frequency`,
            programId: programId,
            programName: programName,
          };

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: codes,
            operand: result.operand || data?.operand || "OR",
            frequencyInfo: frequencyInfo,
          };

          apiCall = smartReachApi.updateCptCodeHadNotCriteria(payload);
          break;
        }

        case "diagnosisCodeHadCriteria": {
          const codes = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) return item;
                return item;
              }
              if (typeof item === "number") return String(item);
              if (item && typeof item === "object") {
                const code =
                  item.diagnosis_code ||
                  item.code ||
                  item.name ||
                  item.id ||
                  "";
                const description =
                  item.description || item.diagnosis_name || item.name || "";
                if (code && description) {
                  return `${code}_${description}`;
                }
                if (code) {
                  return code;
                }
                return String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: codes,
            operand: result.operand || data?.operand || "OR",
          };

          apiCall = smartReachApi.updateDiagnosisCodeHadCriteria(payload);

          setDiagnosisCodes(codes);
          setSelectedDiagnosisCodes(codes);

          await apiCall;

          shared.toast?.success?.(`${criteriaName} updated successfully`);

          const displayText = codes.join(", ");
          updateCriteria(criteriaId, { values: codes, displayText });

          const updated = await smartReachApi.getSelectedCriteria(program.id);
          setSelectedCriteria(sortAlphabetically(updated));

          break;
        }

        case "appointmentStatus": {
          const statuses = values
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                return item.name || item.status || item.label || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            status: statuses,
            programId: programId,
            operand: result.operand || "OR",
            name: criteriaName,
            programCriteriaId: criteriaId,
            programName: programName,
          };
          apiCall = smartReachApi.updateAppointmentStatus(payload);
          break;
        }

        case "gender": {
          const genderValues = values
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                return item.name || item.label || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            genders: genderValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateGenderCriteria(payload);
          break;
        }

        case "insurance": {
          const insuranceValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.plan_id;
                const name =
                  item.display_name ||
                  item.plan_name ||
                  item.name ||
                  String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            ids: insuranceValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateInsuranceCriteria(payload);
          break;
        }

        case "locationScheduled": {
          const locationValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.location_id || item.ID;
                const name =
                  item.name || item.label || item.location_name || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                if (id) {
                  return String(id);
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            attributeId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: locationValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateLocationCriteria(payload);
          break;
        }

        case "locationBilled": {
          const locationValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.location_id || item.ID;
                const name =
                  item.name || item.label || item.location_name || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                if (id) {
                  return String(id);
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);
          payload = {
            programId: programId,
            attributeId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: locationValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateLocationCriteria(payload);
          break;
        }

        case "providers": {
          const providerValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.provider_id;
                const name = item.name || item.label || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            criteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            values: providerValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateProvidersCriteria(payload);
          break;
        }

        case "activityType": {
          const activityValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.activity_id;
                const name = item.name || item.label || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            criteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            values: activityValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateActivityTypeCriteria(payload);
          break;
        }

        case "activitySet": {
          const activitySetValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.activity_set_id;
                const name = item.name || item.label || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            criteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            values: activitySetValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateActivitySetTypeCriteria(payload);
          break;
        }

        case "patientZipCodeHadCriteria": {
          const zipValues = values
            .map((item) => {
              if (typeof item === "number") return item;
              if (typeof item === "string") {
                const num = Number(item.trim());
                return isNaN(num) ? null : num;
              }
              if (item && typeof item === "object") {
                const code =
                  item.code ||
                  item.zip ||
                  item.zip_code ||
                  item.name ||
                  String(item);
                const num = Number(code);
                return isNaN(num) ? null : num;
              }
              return null;
            })
            .filter(
              (item) => item !== null && item !== undefined && item !== "",
            );

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            codes: zipValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updatePatientZipCodeCriteria(payload);
          break;
        }

        case "raceTypeHadCriteria": {
          const raceValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.race_id;
                const name =
                  item.name || item.label || item.race_name || String(item);
                if (id && name) {
                  return `${id}_${name}`;
                }
                return name || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            programCriteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            races: raceValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall = smartReachApi.updateRaceTypeCriteria(payload);
          break;
        }

        case "ethnicityTypeHadCriteria": {
          const ethnicityValues = values
            .map((item) => {
              if (typeof item === "string") {
                if (item.includes("_")) {
                  return item;
                }
                return item;
              }
              if (item && typeof item === "object") {
                const id = item.id || item.ethnicity_id;
                const ethnicity =
                  item.ethnicity ||
                  item.ethnicity_name ||
                  item.name ||
                  String(item);
                if (id && ethnicity) {
                  return `${id}_${ethnicity}`;
                }
                return ethnicity || String(item);
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            attributeId: criteriaId,
            name: criteriaName,
            programName: programName,
            ethnicities: ethnicityValues,
            operand: result.operand || data?.operand || "OR",
          };

          apiCall = smartReachApi.updateEthnicityTypeCriteria(payload);
          break;
        }

        // SCHEDULED ACTIONS
        case "displayLocation": {
          // Get the action IDs from selected values
          const actionIds = values
            .map((item) => {
              if (typeof item === "number") return item;
              if (typeof item === "string") {
                const num = Number(item);
                return isNaN(num) ? null : num;
              }
              if (item && typeof item === "object") {
                return item.id || item.actionId || item.action_id || item.value;
              }
              return null;
            })
            .filter((id) => id !== null && id !== undefined);
          payload = {
            actionId: actionIds,
            programsId: programId,
            activeStatus: 1,
            programName: programName,
          };

          apiCall = smartReachApi.updateProgramActions(payload);
          break;
        }

        case "messageText": {
          const messageText = Array.isArray(result.values)
            ? result.values[0] || ""
            : result.values || "";

          if (programTextMsgInfo.length > 0) {
            const updatedMessages = programTextMsgInfo.map((msg, idx) => {
              if (idx === 0) {
                return { ...msg, messageText: messageText };
              }
              return msg;
            });
            setProgramTextMsgInfo(updatedMessages);
          } else {
            // If no messages exist, create one
            setProgramTextMsgInfo([
              {
                messageText: messageText,
                programId: program.id,
              },
            ]);
          }

          setHasChanges(true);
          shared.toast?.success?.("Message text updated");
          break;
        }
        // In handleDialogClose function - replace the displayCriteria case
        case "displayCriteria": {
          // Handle both "next" and "submit" actions, or when action is not "close"
          const isSaveAction = result?.action !== "close";

          if (isSaveAction && values) {
            try {
              setDialogLoading(true);

              // Get the criteria IDs from the selected values
              const criteriaToSave = Array.isArray(values) ? values : [];
              const patientAttributesId = criteriaToSave
                .map((item) => item.id || item.criteriaId)
                .filter(Boolean);

              // Build payload for programCriteria API
              const payload = {
                patientAttributesId: patientAttributesId,
                programsId: programId,
                activeStatus: 1,
                programName: programName,
              };

              await smartReachApi.programCriteria(payload);
              const updated = await smartReachApi.getSelectedCriteria(
                program.id,
              );
              setSelectedCriteria(sortAlphabetically(updated));
              setHasChanges(true);

              shared.toast?.success?.("Program criteria updated successfully");

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
          } else {
            // Close without saving
            setDialog({
              type: null,
              open: false,
              data: null,
            });
            return;
          }
        }
        default: {
          const stringValues = values
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                return (
                  item.name ||
                  item.code ||
                  item.label ||
                  item.id ||
                  String(item)
                );
              }
              return String(item);
            })
            .filter(Boolean);

          payload = {
            programId: programId,
            criteriaId: criteriaId,
            name: criteriaName,
            programName: programName,
            values: stringValues,
            operand: result.operand || data?.operand || "OR",
          };
          apiCall =
            smartReachApi.updateGenericCriteria?.(payload) || Promise.resolve();
        }
      }

      if (apiCall) await apiCall;

      if (type === "cptCodeHadCriteria" || type === "cptCodeHadNotCriteria") {
        await refreshCptData(criteriaId);
      }

      // For displayLocation, refresh the selected actions after update
      if (type === "displayLocation") {
        const refreshedActions = await smartReachApi.getSelectedActions(
          program.id,
        );
        const normalized = (refreshedActions || []).map((action) => ({
          id: action.id || action.actionId || action.action_id,
          name:
            action.name ||
            action.actionName ||
            action.label ||
            "Unnamed Action",
          ...action,
        }));
        setSelectedScheduledActions(sortAlphabetically(normalized));

        // Also update the dialog data to reflect the new selection
        if (dialog.open) {
          setDialog((prev) => ({
            ...prev,
            data: {
              ...prev.data,
              selectedData: normalized,
            },
          }));
        }
      }

      const displayText = values
        .map((item) => getItemDisplayValue(item))
        .join(", ");
      updateCriteria(criteriaId, { values, displayText });

      if (type === "displayCriteria") {
        const updated = await smartReachApi.getSelectedCriteria(program.id);
        setSelectedCriteria(sortAlphabetically(updated));
      }

      shared.toast?.success?.(`${criteriaName} updated successfully`);
    } catch (error) {
      console.error(`❌ ${type} update failed:`, error);
      shared.toast?.error?.(apiErrorText(error, "Failed to update criteria"));
    } finally {
      setDialogLoading(false);
      closeDialog();
    }
  };

  // CRITERIA EDIT HANDLER
  const editCriteria = async (criteria) => {
    const name = criteria.name?.toLowerCase() || "";
    const criteriaId = Number(criteria.id || criteria.criteriaId);

    let type;
    if (name === "age") type = "age";
    else if (name === "frequency") type = "frequency";
    else if (name === "appointment status") type = "appointmentStatus";
    else if (name === "gender") type = "gender";
    else if (name.includes("insurance")) type = "insurance";
    else if (name === "location - scheduled") type = "locationScheduled";
    else if (name === "location - billed") type = "locationBilled";
    else if (name === "providers") type = "providers";
    else if (name.includes("activity type")) type = "activityType";
    else if (name.includes("activity set")) type = "activitySet";
    else if (name.includes("patient zip")) type = "patientZipCodeHadCriteria";
    else if (name === "race") type = "raceTypeHadCriteria";
    else if (name.includes("diagnosis")) type = "diagnosisCodeHadCriteria";
    else if (name.includes("ethnicity")) type = "ethnicityTypeHadCriteria";
    else if (name.includes("cpt") && name.includes("not"))
      type = "cptCodeHadNotCriteria";
    else if (name.includes("cpt")) type = "cptCodeHadCriteria";
    else type = "displayCriteria";

    const dialogData = {
      criteriaId,
      criteriaName: criteria.name,
      programId: program.id,
      programName: programInfo?.programName || program?.name || "",
      requestAppFrom: REQUEST_FROM,
      operand: criteria.operand || "OR",
    };

    const fetchListData = async (apiMethod) => {
      setDialogLoading(true);
      try {
        const response = await apiMethod(program.id, criteriaId);

        // Handle different response structures
        let data = response;

        // If response is an array with nested data
        if (Array.isArray(response)) {
          if (response.length > 0 && response[0]?.availableList) {
            data = response[0];
          } else if (response.length > 0 && response[0]?.code !== undefined) {
            // This is the patient zip code format: [{"code":12}, {"code":123}]
            // Treat all as available list
            data = {
              availableList: response.map((item) => ({
                ...item,
                name: String(item.code || item.zip || item.zip_code || item),
                id: item.id || item.code || item.zip,
              })),
              selectedList: [],
            };
          }
        }

        // Special handling for different data types
        let availableList = (data.availableList || []).map((item) => ({
          ...item,
          name:
            item.display_name ||
            item.plan_name ||
            item.name ||
            item.label ||
            item.location_name ||
            String(item.code || item.zip || item.zip_code || item),
          display_name: item.display_name || item.plan_name,
          plan_name: item.plan_name || item.display_name,
          id:
            item.id || item.plan_id || item.location_id || item.ID || item.code,
          plan_id: item.plan_id || item.id,
        }));

        let selectedList = (data.selectedList || []).map((item) => ({
          ...item,
          name:
            item.display_name ||
            item.plan_name ||
            item.name ||
            item.label ||
            item.location_name ||
            String(item.code || item.zip || item.zip_code || item),
          display_name: item.display_name || item.plan_name,
          plan_name: item.plan_name || item.display_name,
          id:
            item.id || item.plan_id || item.location_id || item.ID || item.code,
          plan_id: item.plan_id || item.id,
        }));
        // In fetchListData function - update the patient zip handling

        // If it's patient zip criteria, handle the data properly
        if (type === "patientZipCodeHadCriteria") {
          // The API returns the already selected codes
          const responseData =
            response?.data?.response ?? response?.data ?? response;
          let codes = [];

          if (
            Array.isArray(responseData) &&
            responseData.length > 0 &&
            responseData[0]?.code !== undefined
          ) {
            codes = responseData.map((item) => ({
              ...item,
              name: String(item.code),
              id: item.id || item.code,
              code: item.code,
            }));
          } else if (data.selectedList && data.selectedList.length > 0) {
            codes = data.selectedList.map((item) => ({
              ...item,
              name: String(
                item.code || item.zip || item.zip_code || item.name || item,
              ),
              id: item.id || item.code || item.zip,
              code: item.code || item.zip,
            }));
          }

          // Put all codes in selectedList
          selectedList = codes;
          availableList = [];
        }
        // In the fetchListData function, update the race handling
        if (type === "raceTypeHadCriteria") {
          availableList = (data.availableList || []).map((item) => ({
            ...item,
            name: item.race_name || item.race || item.name || String(item),
            id: item.id || item.race_id,
            race_id: item.race_id || item.id,
            race_name: item.race_name || item.race || item.name,
          }));
          selectedList = (data.selectedList || []).map((item) => ({
            ...item,
            name: item.race_name || item.race || item.name || String(item),
            id: item.id || item.race_id,
            race_id: item.race_id || item.id,
            race_name: item.race_name || item.race || item.name,
          }));
        }
        // If it's insurance criteria, ensure we use display_name and id
        if (type === "insurance") {
          availableList = (data.availableList || []).map((item) => ({
            ...item,
            name: item.display_name || item.plan_name || String(item),
            display_name: item.display_name || item.plan_name,
            id: item.id || item.plan_id,
            plan_id: item.plan_id || item.id,
          }));
          selectedList = (data.selectedList || []).map((item) => ({
            ...item,
            name: item.display_name || item.plan_name || String(item),
            display_name: item.display_name || item.plan_name,
            id: item.id || item.plan_id,
            plan_id: item.plan_id || item.id,
          }));
        }

        // If it's location criteria, ensure we use name and id
        if (type === "locationScheduled" || type === "locationBilled") {
          availableList = (data.availableList || []).map((item) => ({
            ...item,
            name: item.name || item.label || item.location_name || String(item),
            id: item.id || item.location_id || item.ID,
            location_id: item.location_id || item.id || item.ID,
          }));
          selectedList = (data.selectedList || []).map((item) => ({
            ...item,
            name: item.name || item.label || item.location_name || String(item),
            id: item.id || item.location_id || item.ID,
            location_id: item.location_id || item.id || item.ID,
          }));
        }

        // If it's ethnicity criteria, ensure we use the correct field
        if (type === "ethnicityTypeHadCriteria") {
          availableList = (data.availableList || []).map((item) => ({
            ...item,
            name:
              item.ethnicity ||
              item.ethnicity_name ||
              item.name ||
              String(item),
          }));
          selectedList = (data.selectedList || []).map((item) => ({
            ...item,
            name:
              item.ethnicity ||
              item.ethnicity_name ||
              item.name ||
              String(item),
          }));
        }

        openDialog(type, {
          ...dialogData,
          availableData: availableList,
          selectedData: selectedList,
        });
      } catch (error) {
        console.error(`❌ Error loading ${type} info:`, error);
        shared.toast?.error?.(
          apiErrorText(error, "Failed to load information"),
        );
      } finally {
        setDialogLoading(false);
      }
    };

    switch (type) {
      case "age": {
        const loadAge = async () => {
          setDialogLoading(true);
          try {
            const result = await smartReachApi.programAgeInfo({
              programId: program.id,
              attributeId: criteriaId,
            });
            const data = result?.data ?? result ?? {};
            const minMonths = Number(data.min ?? 0);
            const maxMonths = Number(data.max ?? 0);
            setAge({ min: minMonths, max: maxMonths });
            openDialog("age", {
              ...dialogData,
              ageMin: minMonths,
              ageMax: maxMonths,
              minAgeYears: Math.floor(minMonths / 12),
              minAgeMonths: minMonths % 12,
              maxAgeYears: Math.floor(maxMonths / 12),
              maxAgeMonths: maxMonths % 12,
            });
          } catch (error) {
            shared.toast?.error?.(apiErrorText(error, "Failed to load age"));
          } finally {
            setDialogLoading(false);
          }
        };
        loadAge();
        return;
      }

      case "frequency": {
        const loadFrequency = async () => {
          setDialogLoading(true);
          try {
            const result = await smartReachApi.programFrequencyInfo({
              programId: program.id,
              attributeId: criteriaId,
              name: criteria.name,
            });
            const data = result?.data ?? result ?? {};
            const minMonths = Number(data.min ?? 0);
            const maxMonths = Number(data.max ?? 0);
            setFrequency({ min: minMonths, max: maxMonths });
            openDialog("frequency", {
              ...dialogData,
              minFrequencyYears: Math.floor(minMonths / 12),
              minFrequencyMonths: minMonths % 12,
              maxFrequencyYears: Math.floor(maxMonths / 12),
              maxFrequencyMonths: maxMonths % 12,
              minFrequencyDays: minMonths,
              maxFrequencyDays: maxMonths,
            });
          } catch (error) {
            shared.toast?.error?.(
              apiErrorText(error, "Failed to load frequency"),
            );
          } finally {
            setDialogLoading(false);
          }
        };
        loadFrequency();
        return;
      }

      case "cptCodeHadCriteria":
      case "cptCodeHadNotCriteria": {
        setDialogLoading(true);
        try {
          const response = await smartReachApi.getCptCodeHadCriteria(
            program.id,
            criteriaId,
          );

          const availableList = (response?.availableList || []).map(
            normalizeCptCode,
          );
          const selectedList = (response?.selectedList || []).map(
            normalizeCptCode,
          );

          let extraData = {};
          if (type === "cptCodeHadNotCriteria" && response?.cptHadNotFreqData) {
            const freqData = response.cptHadNotFreqData;
            const minYears = Math.floor((freqData.min || 0) / 12);
            const minMonths = (freqData.min || 0) % 12;
            const maxYears = Math.floor((freqData.max || 0) / 12);
            const maxMonths = (freqData.max || 0) % 12;

            extraData = {
              cptHadNotFreqData: freqData,
              minFrequency: freqData.min || 0,
              maxFrequency: freqData.max || 0,
              minFrequencyYears: minYears,
              minFrequencyMonths: minMonths,
              maxFrequencyYears: maxYears,
              maxFrequencyMonths: maxMonths,
              frequencyDisplay: `${minYears}y ${minMonths}m - ${maxYears}y ${maxMonths}m`,
            };
          }

          openDialog(type, {
            ...dialogData,
            availableData: availableList,
            selectedData: selectedList,
            ...extraData,
          });
        } catch (error) {
          console.error(`❌ Error loading ${type} info:`, error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load CPT codes"),
          );
        } finally {
          setDialogLoading(false);
        }
        return;
      }

      case "diagnosisCodeHadCriteria": {
        setDialogLoading(true);
        try {
          const response = await smartReachApi.getDiagnosisCodes(
            program.id,
            criteriaId,
          );

          const availableList = Array.isArray(response?.availableList)
            ? response.availableList.map((item) => ({
                ...item,
                code: item.code || item.diagnosis_code,
                description:
                  item.description || item.diagnosis_name || item.name,
                displayName: item.code || item.diagnosis_code,
              }))
            : [];

          const selectedList = Array.isArray(response?.selectedList)
            ? response.selectedList.map((item) => ({
                ...item,
                code: item.code || item.diagnosis_code,
                description:
                  item.description || item.diagnosis_name || item.name,
                displayName: item.code || item.diagnosis_code,
              }))
            : [];

          openDialog(type, {
            ...dialogData,
            availableData: availableList,
            selectedData: selectedList,
            isLoading: false,
          });
        } catch (error) {
          console.error(`❌ Error loading diagnosis info:`, error);
          shared.toast?.error?.(
            apiErrorText(error, "Failed to load diagnosis codes"),
          );
          closeDialog();
        } finally {
          setDialogLoading(false);
        }
        return;
      }

      case "gender":
      case "insurance":
      case "locationScheduled":
      case "locationBilled":
      case "providers":
      case "activityType":
      case "activitySet":
      case "appointmentStatus":
      case "patientZipCodeHadCriteria":
      case "raceTypeHadCriteria":
      case "ethnicityTypeHadCriteria": {
        const apiMap = {
          gender: smartReachApi.getGenderCriteria,
          insurance: smartReachApi.getInsuranceCriteria,
          locationScheduled: (pid, cid) =>
            smartReachApi.getLocationCriteria(pid, cid, "scheduled"),
          locationBilled: (pid, cid) =>
            smartReachApi.getLocationCriteria(pid, cid, "billed"),
          providers: smartReachApi.getProvidersCriteria,
          activityType: smartReachApi.getActivityTypeCriteria,
          activitySet: smartReachApi.getActivitySetTypeCriteria,
          appointmentStatus: smartReachApi.getAppointmentStatus,
          patientZipCodeHadCriteria: smartReachApi.getPatientZipCodeCriteria,
          raceTypeHadCriteria: smartReachApi.getRaceTypeCriteria,
          ethnicityTypeHadCriteria: smartReachApi.getEthnicityTypeCriteria,
        };
        fetchListData(apiMap[type]);
        return;
      }

      default:
        openDialog(type, dialogData);
    }
  };

  // PICKERS
  const openCriteriaPicker = async () => {
    setDialogLoading(true);
    try {
      const [allCriteria, selected] = await Promise.all([
        smartReachApi.getCriteria(),
        smartReachApi.getSelectedCriteria(program.id),
      ]);

      // Open the DisplayCriteria dialog
      openDialog("displayCriteria", {
        availableData: allCriteria || [],
        selectedData: selected || [],
        // Pass additional context
        programId: program.id,
        programName: programInfo?.programName || program?.name || "",
        requestAppFrom: REQUEST_FROM,
      });
    } catch (error) {
      shared.toast?.error?.(apiErrorText(error, "Failed to load criteria"));
    } finally {
      setDialogLoading(false);
    }
  };

  const openScheduledActionPicker = async () => {
    setDialogLoading(true);
    try {
      // Get both available actions and selected actions
      const [allActions, selectedActions] = await Promise.all([
        smartReachApi.getScheduledActions(),
        smartReachApi.getSelectedActions(program.id),
      ]);

      // Map the actions to ensure they have the correct structure
      const availableActions = (allActions || []).map((action) => ({
        id: action.id || action.actionId || action.action_id,
        name:
          action.name ||
          action.actionName ||
          action.label ||
          action.description ||
          "Unnamed Action",
        description: action.description || action.name || "",
        ...action,
      }));

      // Normalize selected actions
      const selectedActionList = (selectedActions || []).map((action) => ({
        id: action.id || action.actionId || action.action_id,
        name:
          action.name || action.actionName || action.label || "Unnamed Action",
        description: action.description || action.name || "",
        ...action,
      }));

      openDialog("displayLocation", {
        availableData: availableActions,
        selectedData: selectedActionList,
        criteriaId: "scheduledActions",
        criteriaName: "Scheduled Actions",
        // ✅ FIX: Set the title explicitly for the dialog
        title: "Configure Scheduled Actions",
        configureLabel: "Scheduled Action",
        actionLabel: "Configure",
        requestAppFrom: REQUEST_FROM,
      });
    } catch (error) {
      console.error("❌ Error loading scheduled actions:", error);
      shared.toast?.error?.(
        apiErrorText(error, "Failed to load scheduled actions"),
      );
    } finally {
      setDialogLoading(false);
    }
  };
  const openTextMessagePicker = () => {
    // Get the current message from the first item in programTextMsgInfo
    const firstMsg = programTextMsgInfo[0] || {};

    // Try different possible field names for the message text
    const currentMessage =
      firstMsg.messageText ||
      firstMsg.message_text ||
      firstMsg.text ||
      firstMsg.msg ||
      firstMsg.MessageText ||
      firstMsg.Message ||
      firstMsg.value ||
      "";

    // ✅ Directly set dialog state to ensure messageDynamicText is at top level
    setDialog({
      type: "messageText",
      open: true,
      data: {
        data: [],
        messageDynamicText: currentMessage,
        requestAppFrom: REQUEST_FROM,
      },
    });
  };

  // UPDATE & CLOSE
  const handleUpdate = async () => {
    setSaving(true);
    try {
      // ✅ Get the latest message from programTextMsgInfo
      const firstMsg = programTextMsgInfo[0] || {};
      const messageText =
        firstMsg.messageText || firstMsg.message_text || firstMsg.text || "";

      await smartReachApi.updateProgramMessageText(
        program.id,
        messageText,
        Number(programInfo?.programStatus ?? 2),
        programInfo?.programName || program?.name || "",
      );
      shared.toast?.success?.("Program updated successfully");
      setHasChanges(false);
      const updated = await smartReachApi.getPracticePrograms();
      onUpdate?.(updated);
      onClose?.();
    } catch (error) {
      shared.toast?.error?.(apiErrorText(error, "Failed to update program"));
    } finally {
      setSaving(false);
    }
  };
  // Update the handleClose and handleDiscardConfirm functions

  const handleDiscardConfirm = (confirmed) => {
    setConfirmDiscard(false);

    if (!confirmed) {
      return;
    }

    setIsClosing(true);

    setTimeout(() => {
      setIsClosing(false);
      // ✅ Use onCancel if provided, otherwise use onClose
      if (onCancel) {
        onCancel();
      } else {
        onClose?.();
      }
    }, 300);
  };

  const handleClose = () => {
    // If there are unsaved changes, show ConfirmDialog
    if (hasChanges) {
      setConfirmDiscard(true);
      return;
    }

    // No changes, close directly
    setIsClosing(true);

    setTimeout(() => {
      setIsClosing(false);
      // ✅ Use onCancel if provided, otherwise use onClose
      if (onCancel) {
        onCancel();
      } else {
        onClose?.();
      }
    }, 300);
  };

  // ============================================================
  // FETCH DATA
  // ============================================================

  const fetchData = async () => {
    setLoading(true);
    try {
      const [info, criteria, actions, scheduled, messages, threshold] =
        await Promise.all([
          smartReachApi.getProgramInfo(program.id),
          smartReachApi.getSelectedCriteria(program.id),
          smartReachApi.getSelectedActions(program.id),
          smartReachApi.getScheduledActions(),
          smartReachApi.getProgramTextMsgInfo(program.id),
          smartReachApi.getProgramThreshold(),
        ]);

      const infoData = Array.isArray(info) ? info[0] || {} : info || {};
      setProgramInfo(infoData);

      const criteriaArray = Array.isArray(criteria) ? criteria : [];
      setSelectedCriteria(sortAlphabetically(criteriaArray));
      const currentProgramThreshold = Number(infoData?.threshold || 0);

      setProgramThreshold(currentProgramThreshold);

      await getPracticeSumOfProgramThreshold(currentProgramThreshold);
      const selectedActionsList = Array.isArray(actions) ? actions : [];
      const normalizedSelectedActions = selectedActionsList.map((action) => ({
        id: action.id || action.actionId || action.action_id,
        name:
          action.name || action.actionName || action.label || "Unnamed Action",
        ...action,
      }));
      setSelectedScheduledActions(
        sortAlphabetically(normalizedSelectedActions),
      );

      // Keep all available actions for reference
      setSelectedActions(sortAlphabetically(scheduled || []));
      setProgramTextMsgInfo(Array.isArray(messages) ? messages : []);
      // setProgramThreshold(threshold || 0);

      const ageCriteria = criteriaArray.find(
        (c) => c.name === CRITERIA_NAMES.AGE,
      );
      if (ageCriteria) {
        setAge({ min: ageCriteria.min || 0, max: ageCriteria.max || 0 });
      }

      const freqCriteria = criteriaArray.find(
        (c) => c.name === CRITERIA_NAMES.FREQUENCY,
      );
      if (freqCriteria) {
        setFrequency({
          min: freqCriteria.min || 0,
          max: freqCriteria.max || 0,
        });
      }

      const cptHadCriteria = criteriaArray.find((c) => {
        const name = c.name?.toLowerCase() || "";
        return (
          (name.includes("cpt") &&
            name.includes("had") &&
            !name.includes("not")) ||
          (name.includes("cpt codes have had") && c.values?.length > 0)
        );
      });
      if (cptHadCriteria?.values?.length) {
        setSelectedCptCodes(cptHadCriteria.values.map(normalizeCptCode));
      }

      const diagnosisCriteria = criteriaArray.find((c) => {
        const name = c.name?.toLowerCase() || "";
        return name.includes("diagnosis") && c.values?.length > 0;
      });
      if (diagnosisCriteria?.values?.length) {
        const codes = diagnosisCriteria.values.map((v) =>
          typeof v === "string" ? v : v?.code || v?.diagnosis_code || String(v),
        );
        setDiagnosisCodes(codes);
        setSelectedDiagnosisCodes(codes);
      }

      const scheduledLocCriteria = criteriaArray.find(
        (c) => c.name === "Location - Scheduled",
      );
      if (scheduledLocCriteria?.values?.length) {
        setSelectedScheduledLocations(scheduledLocCriteria.values);
      }

      const billedLocCriteria = criteriaArray.find(
        (c) => c.name === "Location - Billed",
      );
      if (billedLocCriteria?.values?.length) {
        setSelectedBilledLocations(billedLocCriteria.values);
      }

      const zipCriteria = criteriaArray.find(
        (c) => c.name?.toLowerCase() === "patient zip",
      );
      if (zipCriteria?.values?.length) {
        setSelectedZipCodes(zipCriteria.values);
      }

      const raceCriteria = criteriaArray.find(
        (c) => c.name?.toLowerCase() === "race",
      );
      if (raceCriteria?.values?.length) {
        setSelectedRaceTypes(raceCriteria.values);
      }

      setHasChanges(false);
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      shared.toast?.error?.(
        apiErrorText(error, "Failed to load program details"),
      );
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  if (!program) return;

  const loadProgramData = async () => {
    await fetchData();
  };

  loadProgramData();
}, [program]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!program) return null;

  // ✅ Use programInfo.threshold instead of programThreshold
  const thresholdValue = Number(programInfo?.threshold) || 0;
  // ✅ Divide by 40000 (or totalPatients if needed)
  const baseValue = 40000; // Hardcoded as per requirement
  const allocationPercent =
    baseValue > 0 ? ((thresholdValue / baseValue) * 100).toFixed(2) : "0.00";
  const busy = dialogLoading || saving || isClosing;
  const renderCriteriaItem = (criteria, label) => {
    const name = criteria.name?.toLowerCase() || "";

    // Helper to get display value from criteria values
    // Update the getDisplayValue function to handle race data properly
    const getDisplayValue = (item) => {
      if (!item) return "";
      if (typeof item === "string") {
        // If it's in "id_name" format, extract just the name
        if (item.includes("_")) {
          const parts = item.split("_");
          return parts.slice(1).join("_");
        }
        return item;
      }
      if (typeof item === "number") return String(item);
      if (typeof item === "object") {
        // For race data - check for race_name first
        if (item.race_name) return String(item.race_name);
        if (item.race) return String(item.race);
        // For patient zip
        if (item.code) return String(item.code);
        if (item.zip) return String(item.zip);
        if (item.zip_code) return String(item.zip_code);
        // For insurance
        if (item.display_name) return String(item.display_name);
        if (item.plan_name) return String(item.plan_name);
        // For ethnicity
        if (item.ethnicity) return String(item.ethnicity);
        if (item.ethnicity_name) return String(item.ethnicity_name);
        if (item.name) return String(item.name);
        if (item.label) return String(item.label);
        if (item.cpt_code) return String(item.cpt_code);
        if (item.cptCode) return String(item.cptCode);
        if (item.id) return String(item.id);
        if (item.value) return String(item.value);
        // If it has toString that's not [object Object], use it
        if (item.toString && item.toString() !== "[object Object]") {
          return item.toString();
        }
        // Last resort - try to get any meaningful property
        const firstValue = Object.values(item).find(
          (v) => typeof v === "string" || typeof v === "number",
        );
        if (firstValue !== undefined) return String(firstValue);
        return String(item);
      }
      return String(item);
    };

    const displayValue =
      criteria.values?.length > 0
        ? criteria.values.map((v) => getDisplayValue(v)).join(", ")
        : criteria.displayText || "";

    // Diagnosis codes
    if (name.includes("diagnosis")) {
      const codeList = criteria.values
        ?.slice(0, 3)
        .map((v) => (typeof v === "string" ? v : getDisplayValue(v)))
        .join(", ");
      const extra =
        criteria.values?.length > 3
          ? ` +${criteria.values.length - 3} more`
          : "";

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* {criteria.values?.length > 0 && (
            <span className="ml-2 text-xs text-slate-500">
              ({criteria.values.length} codes: {codeList}{extra})
            </span>
          )} */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // Age
    if (criteria.name === "Age" || criteria.name === CRITERIA_NAMES.AGE) {
      const minYears = Math.floor((criteria.min || 0) / 12);
      const minMonths = (criteria.min || 0) % 12;
      const maxYears = Math.floor((criteria.max || 0) / 12);
      const maxMonths = (criteria.max || 0) % 12;
      const displayRange = `${minYears}y ${minMonths}m - ${maxYears}y ${maxMonths}m`;

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* <span className="ml-2 text-xs text-slate-500">
            ({displayRange})
          </span> */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // Frequency
    if (
      criteria.name === "Frequency" ||
      criteria.name === CRITERIA_NAMES.FREQUENCY
    ) {
      const displayRange = `${criteria.min || 0} - ${criteria.max || 0} months`;

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* <span className="ml-2 text-xs text-slate-500">
            ({displayRange})
          </span> */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // CPT codes
    if (criteria.name?.toLowerCase().includes("cpt")) {
      const codeList = criteria.values
        ?.slice(0, 3)
        .map((v) => getDisplayValue(v))
        .join(", ");
      const extra =
        criteria.values?.length > 3
          ? ` +${criteria.values.length - 3} more`
          : "";

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* {criteria.values?.length > 0 && (
            <span className="ml-2 text-xs text-slate-500">
              ({criteria.values.length} codes: {codeList}{extra})
            </span>
          )} */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // Ethnicity
    if (name.includes("ethnicity")) {
      const valueList = criteria.values
        ?.slice(0, 3)
        .map((v) => getDisplayValue(v))
        .join(", ");
      const extra =
        criteria.values?.length > 3
          ? ` +${criteria.values.length - 3} more`
          : "";

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* {criteria.values?.length > 0 && (
            <span className="ml-2 text-xs text-slate-500">
              ({criteria.values.length} items: {valueList}{extra})
            </span>
          )} */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // Race
    if (name.includes("race")) {
      const valueList = criteria.values
        ?.slice(0, 3)
        .map((v) => getDisplayValue(v))
        .join(", ");
      const extra =
        criteria.values?.length > 3
          ? ` +${criteria.values.length - 3} more`
          : "";

      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-800">
            {label || criteria.name}
            {/* {criteria.values?.length > 0 && (
            <span className="ml-2 text-xs text-slate-500">
              ({criteria.values.length} items: {valueList}{extra})
            </span>
          )} */}
          </span>
          <EditIconButton
            title={`Edit ${criteria.name}`}
            onClick={() => editCriteria(criteria)}
            disabled={busy}
          />
        </div>
      );
    }

    // Default rendering for other criteria
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs font-medium text-slate-800">
          {label || criteria.name}
          {/* {displayValue && (
          <span className="ml-2 text-xs text-slate-500">
            ({displayValue})
          </span>
        )} */}
        </span>
        <EditIconButton
          title={`Edit ${criteria.name}`}
          onClick={() => editCriteria(criteria)}
          disabled={busy}
        />
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
        onMouseDown={(e) =>
          e.target === e.currentTarget && !busy && handleClose()
        }
      >
        <div
          className="my-8 w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={(e) => e.stopPropagation()}
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
              onClick={handleClose}
              disabled={busy}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
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
                {/* All Criteria Section */}
                <div>
                  <button
                    onClick={openCriteriaPicker}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    Criteria
                  </button>

                  {selectedCriteria.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {selectedCriteria.map((c) => {
                        const name = c.name?.toLowerCase() || "";

                        if (
                          name === "age" ||
                          name === CRITERIA_NAMES.AGE?.toLowerCase()
                        ) {
                          return renderCriteriaItem(c, "Age");
                        }
                        if (
                          name === "frequency" ||
                          name === CRITERIA_NAMES.FREQUENCY?.toLowerCase()
                        ) {
                          return renderCriteriaItem(c, "Frequency");
                        }
                        if (
                          name.includes("cpt") &&
                          name.includes("had") &&
                          !name.includes("not")
                        ) {
                          return renderCriteriaItem(c, "CPT Codes Have Had");
                        }
                        if (
                          name.includes("cpt") &&
                          name.includes("not") &&
                          name.includes("had")
                        ) {
                          return renderCriteriaItem(
                            c,
                            "CPT Codes Have Not Had",
                          );
                        }
                        if (name === "appointment status") {
                          return renderCriteriaItem(c, "Appointment Status");
                        }
                        if (name === "gender") {
                          return renderCriteriaItem(c, "Gender");
                        }
                        if (name.includes("insurance")) {
                          return renderCriteriaItem(c, "Insurance Plan");
                        }
                        if (name === "location - scheduled") {
                          return renderCriteriaItem(c, "Location - Scheduled");
                        }
                        if (name === "location - billed") {
                          return renderCriteriaItem(c, "Location - Billed");
                        }
                        if (name === "providers") {
                          return renderCriteriaItem(c, "Providers");
                        }
                        if (name.includes("activity type")) {
                          return renderCriteriaItem(c, "Activity Type");
                        }
                        if (name.includes("activity set")) {
                          return renderCriteriaItem(c, "Activity Set Type");
                        }
                        if (name.includes("patient zip")) {
                          return renderCriteriaItem(c, "Patient Zip");
                        }
                        if (name === "race") {
                          return renderCriteriaItem(c, "Race");
                        }
                        if (name.includes("diagnosis")) {
                          return renderCriteriaItem(c, "Diagnosis Codes");
                        }
                        if (name.includes("ethnicity")) {
                          return renderCriteriaItem(c, "Ethnicity");
                        }
                        return renderCriteriaItem(c);
                      })}
                    </div>
                  )}
                </div>

                {/* Scheduled Action */}
                <div>
                  <button
                    onClick={openScheduledActionPicker}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    <Calendar size={14} /> Scheduled Action
                  </button>
                  {selectedScheduledActions.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {selectedScheduledActions.map((item, idx) => {
                        // Determine the type based on the action name
                        let actionType = "";
                        const name = item.name?.toLowerCase() || "";
                        if (
                          name.includes("appointment") ||
                          name.includes("activity")
                        ) {
                          actionType = "activity";
                        } else if (name.includes("location")) {
                          actionType = "location";
                        } else if (name.includes("provider")) {
                          actionType = "provider";
                        }

                        return (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="text-sm font-medium text-slate-800">
                              {getDisplayName(item)}
                            </span>
                            {["activity", "location", "provider"].includes(
                              actionType,
                            ) && (
                              <EditIconButton
                                title={`Edit ${getDisplayName(item)}`}
                                onClick={() =>
                                  openActionDetailPicker(item, actionType)
                                }
                                disabled={busy}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Action Detail Dialogs */}
                {actionDetailDialog.open &&
                  actionDetailDialog.type === "activity" && (
                    <ActionScheduledActivityCriteria
                      open={actionDetailDialog.open}
                      data={{
                        ...actionDetailDialog.data,
                        selectionRules: actionDetailDialog.data?.selectionRules,
                      }}
                      onClose={handleActionDetailClose}
                    />
                  )}

                {actionDetailDialog.open &&
                  actionDetailDialog.type === "location" && (
                    <ActionLocationCriteria
                      open={actionDetailDialog.open}
                      data={{
                        ...actionDetailDialog.data,
                        selectionRules: actionDetailDialog.data?.selectionRules,
                      }}
                      onClose={handleActionDetailClose}
                    />
                  )}

                {actionDetailDialog.open &&
                  actionDetailDialog.type === "provider" && (
                    <ActionProviderCriteria
                      open={actionDetailDialog.open}
                      data={{
                        ...actionDetailDialog.data,
                        selectionRules: actionDetailDialog.data?.selectionRules,
                      }}
                      onClose={handleActionDetailClose}
                    />
                  )}
                {/* Text Message */}
                {/* Text Message */}
                <div>
                  <button
                    onClick={openTextMessagePicker}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    <FileText size={14} /> Text Message
                  </button>
                  {programTextMsgInfo && programTextMsgInfo.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {programTextMsgInfo.map((msg, idx) => {
                        // Try different possible field names for the message text
                        const messageText =
                          msg?.messageText ||
                          msg?.message_text ||
                          msg?.text ||
                          msg?.msg ||
                          msg?.MessageText ||
                          msg?.Message ||
                          msg?.value ||
                          "";

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <span className="text-sm font-medium text-slate-800 truncate flex-1">
                              {messageText || "No message"}
                            </span>
                            <button
                              onClick={openTextMessagePicker}
                              className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                              title="Edit message"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Program Info */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Program Goal
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {programInfo?.goalName}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Program Text Time
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {extractTime(programInfo?.scheduleTime)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Threshold */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Threshold
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {/* {formatNumber(thresholdValue)} /{" "}
                        {formatNumber(totalPatients)} */}
                        {programInfo?.threshold} / 40000
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Text Allocation
                      </span>
                      <p className="text-sm font-medium text-emerald-600">
                        {allocationPercent}%
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-600">
                        Remaining
                      </span>
                      <p className="text-sm font-medium text-slate-800">
                        {remainingTextLimit}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            {(saving || isClosing) && (
              <span className="mr-auto flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                {saving ? "Saving..." : "Closing..."}
              </span>
            )}
            <button
              onClick={handleUpdate}
              disabled={busy || loading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {saving ? "Saving..." : "Update Program"}
            </button>
            <button
              onClick={handleClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              {isClosing ? "Closing..." : "Close"}
            </button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <DisplayCriteria
        open={dialog.open && dialog.type === "displayCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <DisplayLocation
        open={dialog.open && dialog.type === "displayLocation"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <MessageText
        open={dialog.open && dialog.type === "messageText"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <AgeCriteria
        key={dialog.data?.criteriaId || "age"}
        open={dialog.open && dialog.type === "age"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <FrequencyCriteria
        open={dialog.open && dialog.type === "frequency"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <GenderCriteria
        open={dialog.open && dialog.type === "gender"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <InsuranceCriteria
        open={dialog.open && dialog.type === "insurance"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <LocationCriteria
        open={
          dialog.open &&
          ["location", "locationScheduled", "locationBilled"].includes(
            dialog.type,
          )
        }
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <ProvidersCriteria
        open={dialog.open && dialog.type === "providers"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <ActivityTypeCriteria
        open={dialog.open && dialog.type === "activityType"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <ActivitySetTypeCriteria
        open={dialog.open && dialog.type === "activitySet"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <AppointmentStatus
        open={dialog.open && dialog.type === "appointmentStatus"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <ReferringProvider
        open={dialog.open && dialog.type === "referring"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <CptCodeHadCriteria
        open={dialog.open && dialog.type === "cptCodeHadCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <CptCodeHadNotCriteria
        open={dialog.open && dialog.type === "cptCodeHadNotCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <DiagnosisCodeCriteria
        open={dialog.open && dialog.type === "diagnosisCodeHadCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <EthnicityTypeCriteria
        open={dialog.open && dialog.type === "ethnicityTypeHadCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <RaceTypeCriteria
        open={dialog.open && dialog.type === "raceTypeHadCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <PatientZipCodeCriteria
        open={dialog.open && dialog.type === "patientZipCodeHadCriteria"}
        data={dialog.data}
        onClose={handleDialogClose}
      />
      <ConfirmDialog
        open={confirmDiscard}
        data={{
          title: SR_TEXT.WARNING_TITLE,
          message: SR_TEXT.WARNING_MESSAGE,
        }}
        onClose={(confirmed) => {
          setConfirmDiscard(false);
          if (confirmed) {
            // ✅ Use onCancel if provided, otherwise use onClose
            if (onCancel) {
              onCancel();
            } else {
              onClose?.();
            }
          }
        }}
      />
    </>
  );
};

export default ProgramDetailsEdit;
