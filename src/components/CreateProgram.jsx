// src/components/CreateProgram.jsx
import { useState, useEffect } from "react";
import { CalendarDays, Info, X } from "lucide-react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import ConfirmDialog from "patientcare-portal-sharedui/ConfirmDialog";
import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";

const CreateProgram = ({ onClose, onUpdate }) => {
  const shared = useSharedUi();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [payers, setPayers] = useState([]);
  const [totalThreshold, setTotalThreshold] = useState(0);
  const [initialThreshold, setInitialThreshold] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [parentSite, setParentSite] = useState(null);

  // Get today's date for default values
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get date 30 days from now for default end date
  const getFutureDate = (days = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Generate time options from 1AM to 12AM
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 1; hour <= 12; hour++) {
      times.push(`${hour}AM`);
    }
    for (let hour = 1; hour <= 12; hour++) {
      times.push(`${hour}PM`);
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Set default time to 9AM
  const defaultTime = "9AM";

  const [formData, setFormData] = useState({
    programName: "",
    externalDataRequired: false,
    goalId: "",
    goalName: "",
    textTime: defaultTime,
    fromDate: getTodayDate(),
    toDate: getFutureDate(30),
    threshold: "",
    pacEnabled: false,
    selectedCustomer: "",
  });

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString("en-US");
  };

  // Format number WITHOUT commas (just plain number)
  const formatPlainNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return String(num);
  };

  // Parse number from string (remove commas)
  const parseNumber = (str) => {
    if (!str) return 0;
    return parseInt(String(str).replace(/,/g, "")) || 0;
  };

  // Convert time string to 24-hour format for programScheduledTime
  const getTimeIn24Hour = (timeStr) => {
    if (!timeStr) return "9";
    const hour = parseInt(timeStr);
    const ampm = timeStr.slice(-2);
    let hours = hour;
    if (ampm === "PM" && hour !== 12) hours = hour + 12;
    if (ampm === "AM" && hour === 12) hours = 0;
    return String(hours);
  };

  // Fetch parent site
  const fetchParentSite = async () => {
    try {
      const response = await smartReachApi.getParentSite();
      console.log("Parent Site Response:", response);
      setParentSite(response);
      return response;
    } catch (error) {
      console.error("Error fetching parent site:", error);
      return null;
    }
  };

  // Fetch payers for dropdown using getSmartReachPayer API
  const fetchPayers = async () => {
    try {
      const response = await smartReachApi.getSmartReachPayer();
      console.log("Full response:", response);
      
      let payerData = [];
      
      if (response) {
        const dataSource = response.response || response;
        
        if (dataSource.smartReachPayers && Array.isArray(dataSource.smartReachPayers)) {
          payerData = dataSource.smartReachPayers;
        } else if (Array.isArray(dataSource)) {
          payerData = dataSource;
        } else if (Array.isArray(response)) {
          payerData = response;
        } else {
          const possibleArrays = Object.values(dataSource).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            payerData = possibleArrays[0];
          }
        }
      }
      
      console.log("Payers loaded:", payerData);
      console.log("Number of payers:", payerData.length);
      setPayers(payerData);
    } catch (error) {
      console.error("Error fetching payers:", error);
      setPayers([
        { id: 22, name: "Ajayt" },
        { id: 1, name: "Suneel Payer" },
        { id: 2, name: "PyaerGroup43" },
        { id: 3, name: "California" },
        { id: 4, name: "PayerGroup21" },
      ]);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [goalsResult, thresholdResult] = await Promise.all([
          smartReachApi.getGoals(),
          smartReachApi.getProgramThreshold(),
        ]);

        setGoals(Array.isArray(goalsResult) ? goalsResult : []);
        
        // Fetch payers and parent site in parallel
        await Promise.all([
          fetchPayers(),
          fetchParentSite(),
        ]);

        let totalThresholdValue = 0;
        if (thresholdResult !== null && thresholdResult !== undefined) {
          if (typeof thresholdResult === "number") {
            totalThresholdValue = thresholdResult;
          } else if (
            typeof thresholdResult === "object" &&
            thresholdResult.totalThreshold !== undefined
          ) {
            totalThresholdValue = thresholdResult.totalThreshold;
          } else if (
            typeof thresholdResult === "object" &&
            thresholdResult.value !== undefined
          ) {
            totalThresholdValue = thresholdResult.value;
          }
        }
        setTotalThreshold(totalThresholdValue);
      } catch (error) {
        console.error("Error fetching data:", error);
        shared.toast?.error?.(apiErrorText(error, "Failed to load data"));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [shared]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePACChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      pacEnabled: value,
      selectedCustomer: value ? prev.selectedCustomer : "",
    }));
  };

  const handleCustomerChange = (event) => {
    const customerId = event.target.value;
    setFormData((prev) => ({
      ...prev,
      selectedCustomer: customerId,
    }));
  };

  const handleThresholdChange = (value) => {
    const cleanValue = value.replace(/,/g, "");

    if (cleanValue === "" || /^\d*$/.test(cleanValue)) {
      if (cleanValue.length <= 4) {
        const newValue = parseInt(cleanValue) || 0;

        const practiceRole = shared.userDetails?.roles?.practicerole?.[0];
        const totalTextLimit = practiceRole?.practiceTextLimit || 0;

        const remainingWithNewValue =
          totalTextLimit - totalThreshold + initialThreshold - newValue;

        if (remainingWithNewValue >= 0) {
          handleChange("threshold", cleanValue);
        } else {
          shared.toast?.warning?.(
            `Threshold cannot exceed ${formatPlainNumber(totalTextLimit - totalThreshold + initialThreshold)}`
          );
          const maxAllowed = totalTextLimit - totalThreshold + initialThreshold;
          handleChange("threshold", String(maxAllowed));
        }
      } else {
        shared.toast?.warning?.("Threshold cannot exceed 4 digits");
      }
    }
  };

  const userDetails = shared.userDetails;
  const practiceRole = userDetails?.roles?.practicerole?.[0];
  const totalTextLimit = practiceRole?.practiceTextLimit || 0;

  const thresholdValue = parseNumber(formData.threshold);
  const perOccupied =
    totalTextLimit > 0 ? (thresholdValue / totalTextLimit) * 100 : 0;
  const perOccupiedFormatted = perOccupied.toFixed(2);
  const remaining =
    totalTextLimit - totalThreshold + initialThreshold - thresholdValue;

  // Handle close with confirmation
  const handleClose = () => {
    const hasChanges = formData.programName || formData.threshold;
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // Handle confirm dialog close
  const handleConfirmClose = (confirmed) => {
    setShowConfirmDialog(false);
    if (confirmed === true) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!formData.programName.trim()) {
      shared.toast?.error?.("Please enter a program name");
      return;
    }

    if (!formData.threshold || parseNumber(formData.threshold) === 0) {
      shared.toast?.error?.("Please enter a threshold value");
      return;
    }

    if (formData.pacEnabled && !formData.selectedCustomer) {
      shared.toast?.error?.("Please select a Payer Analytics Customer");
      return;
    }

    setLoading(true);
    try {
      // Find selected goal and payer
      const selectedGoal = goals.find(g => String(g.id) === formData.goalId);
      const selectedPayer = payers.find(p => String(p.id) === formData.selectedCustomer);
      
      // Get PMS ID from parent site
      const pmsId = parentSite?.id || parentSite?.pmsId || "4";

      // Build payload matching Angular structure EXACTLY
      const payload = {
        programName: formData.programName.trim(),
        goalId: selectedGoal?.id || Number(formData.goalId) || 2,
        goalName: selectedGoal?.name || formData.goalName || "Visit Follow-up",
        programGoalInformationalStatus: null,
        noThresholdMessages: formData.threshold + "",
        programScheduledTime: getTimeIn24Hour(formData.textTime),
        programOldScheduledTime: "0",
        publishChannel: [1],
        updateFlag: true,
        activeStatus: 1,
        externalData: formData.externalDataRequired ? 1 : 0,
        vptc: formData.pacEnabled ? 1 : 0,
        pmsId: pmsId,
        programStartDate: formData.fromDate,
        programEndDate: formData.toDate,
        payerId: formData.pacEnabled ? Number(formData.selectedCustomer) : null,
        payerName: formData.pacEnabled ? (selectedPayer?.name || "") : "",
      };

      console.log("Creating program with payload:", payload);
      
      // Call the API
      const response = await smartReachApi.createProgram(payload);
      console.log("Create program response:", response);
      
      // Handle response - match Angular logic
      if (response && response.message === "Program created successfully") {
        shared.toast?.success?.(response.message);
        onUpdate();
        onClose();
      } else if (response && response.message) {
        shared.toast?.error?.(response.message);
      } else {
        // If response doesn't have message property but request was successful
        shared.toast?.success?.("Program created successfully");
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Error creating program:", error);
      
      // Handle error response - match Angular logic
      if (error.response?.data?.message) {
        shared.toast?.error?.(error.response.data.message);
      } else if (error.message) {
        shared.toast?.error?.(error.message);
      } else {
        shared.toast?.error?.("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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
          className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Create Program
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
            {loading && !formData.programName ? (
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
                  <span>Loading...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Program Name */}
                <div>
                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(event) =>
                      handleChange("programName", event.target.value)
                    }
                    className="h-[66px] w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-[22px] text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Program Name"
                    disabled={loading}
                  />
                </div>

                {/* External Data Required and PAC in same row */}
                <div className="grid grid-cols-2 gap-6">
                  {/* External Data Required */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#334155",
                        }}
                      >
                        External Data Required
                      </span>
                      <Info size={20} className="fill-blue-600 text-white" />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleChange("externalDataRequired", true)}
                        style={{
                          height: "44px",
                          width: "84px",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                          cursor: loading ? "not-allowed" : "pointer",
                          backgroundColor:
                            formData.externalDataRequired === true
                              ? "#10b981"
                              : "#ffffff",
                          color:
                            formData.externalDataRequired === true
                              ? "#ffffff"
                              : "#475569",
                          border: "none",
                          borderRight: "1px solid #d1d5db",
                        }}
                        onMouseEnter={(e) => {
                          if (!formData.externalDataRequired) {
                            e.target.style.backgroundColor = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!formData.externalDataRequired) {
                            e.target.style.backgroundColor = "#ffffff";
                          }
                        }}
                        disabled={loading}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("externalDataRequired", false)}
                        style={{
                          height: "44px",
                          width: "58px",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                          cursor: loading ? "not-allowed" : "pointer",
                          backgroundColor:
                            formData.externalDataRequired === false
                              ? "#10b981"
                              : "#ffffff",
                          color:
                            formData.externalDataRequired === false
                              ? "#ffffff"
                              : "#475569",
                          border: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (formData.externalDataRequired !== false) {
                            e.target.style.backgroundColor = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.externalDataRequired !== false) {
                            e.target.style.backgroundColor = "#ffffff";
                          }
                        }}
                        disabled={loading}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* PAC Toggle */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#334155",
                        }}
                      >
                        PAC
                      </span>
                      <Info size={20} className="fill-blue-600 text-white" />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handlePACChange(true)}
                        style={{
                          height: "44px",
                          width: "84px",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                          cursor: loading ? "not-allowed" : "pointer",
                          backgroundColor:
                            formData.pacEnabled === true
                              ? "#10b981"
                              : "#ffffff",
                          color:
                            formData.pacEnabled === true
                              ? "#ffffff"
                              : "#475569",
                          border: "none",
                          borderRight: "1px solid #d1d5db",
                        }}
                        onMouseEnter={(e) => {
                          if (!formData.pacEnabled) {
                            e.target.style.backgroundColor = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!formData.pacEnabled) {
                            e.target.style.backgroundColor = "#ffffff";
                          }
                        }}
                        disabled={loading}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePACChange(false)}
                        style={{
                          height: "44px",
                          width: "58px",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                          cursor: loading ? "not-allowed" : "pointer",
                          backgroundColor:
                            formData.pacEnabled === false
                              ? "#10b981"
                              : "#ffffff",
                          color:
                            formData.pacEnabled === false
                              ? "#ffffff"
                              : "#475569",
                          border: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (formData.pacEnabled !== false) {
                            e.target.style.backgroundColor = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.pacEnabled !== false) {
                            e.target.style.backgroundColor = "#ffffff";
                          }
                        }}
                        disabled={loading}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payer Analytics Customer Dropdown - Only show when PAC is Yes */}
                {formData.pacEnabled && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#334155",
                        }}
                      >
                        Payer Analytics Customer
                      </span>
                      <Info size={20} className="fill-blue-600 text-white" />
                    </div>
                    <select
                      value={formData.selectedCustomer}
                      onChange={handleCustomerChange}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={loading}
                      style={{ height: "44px" }}
                    >
                      <option value="">Select a customer...</option>
                      {payers.length > 0 ? (
                        payers.map((payer) => (
                          <option key={payer.id} value={payer.id}>
                            {payer.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="22">Ajayt</option>
                          <option value="1">Suneel Payer</option>
                          <option value="2">PyaerGroup43</option>
                          <option value="3">California</option>
                          <option value="4">PayerGroup21</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* Goal and Text Time */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Goal of Program
                    </label>
                    <select
                      value={formData.goalId}
                      onChange={(event) => {
                        const selectedGoal = goals.find(
                          (g) => String(g.id) === event.target.value
                        );
                        handleChange("goalId", event.target.value);
                        handleChange("goalName", selectedGoal?.name || "");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={loading}
                    >
                      <option value="">Select a goal...</option>
                      {goals.length > 0 ? (
                        goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.name || goal.label || goal.value}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="1">Visit Follow-up</option>
                          <option value="2">Appointment Reminder</option>
                          <option value="3">Patient Follow-up</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Text Time
                    </label>
                    <select
                      value={formData.textTime}
                      onChange={(event) =>
                        handleChange("textTime", event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={loading}
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Dates
                  </label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">
                        From:
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.fromDate}
                          onChange={(event) =>
                            handleChange("fromDate", event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          disabled={loading}
                        />
                        <CalendarDays
                          size={20}
                          className="pointer-events-none absolute right-3 top-3 text-slate-400"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">
                        To:
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.toDate}
                          onChange={(event) =>
                            handleChange("toDate", event.target.value)
                          }
                          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          disabled={loading}
                        />
                        <CalendarDays
                          size={20}
                          className="pointer-events-none absolute right-3 top-3 text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threshold / Allocation */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="pb-2 border-b border-slate-300">
                      <label className="text-sm font-semibold text-slate-700">
                        Threshold :{" "}
                      </label>
                      <input
                        type="text"
                        value={
                          formData.threshold
                            ? formatPlainNumber(formData.threshold)
                            : ""
                        }
                        onChange={(event) =>
                          handleThresholdChange(event.target.value)
                        }
                        className="w-[100px] border-0 bg-transparent px-1 text-sm text-slate-800 outline-none"
                        disabled={loading}
                        placeholder="0"
                        maxLength={4}
                      />
                      <span className="text-sm text-slate-600">
                        {" "}
                        / {formatPlainNumber(totalTextLimit)}
                      </span>
                    </div>
                    <div className="ms-2 pb-2">
                      <span className="text-sm text-slate-600">
                        {perOccupiedFormatted}% Text Allocation
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {remaining === 0 ? (
                      <span className="text-emerald-600 font-medium">
                        0 Remaining
                      </span>
                    ) : (
                      <span>{formatPlainNumber(remaining)} Remaining</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.programName}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Program"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog open={showConfirmDialog} onClose={handleConfirmClose} />
    </>
  );
};

export default CreateProgram;