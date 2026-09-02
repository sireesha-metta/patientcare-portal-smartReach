// src/components/ProgramInfoEdit.jsx
import { useState, useEffect } from "react";
import { CalendarDays, Info, X } from "lucide-react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import ConfirmDialog from "patientcare-portal-sharedui/ConfirmDialog";
import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";

const ProgramInfoEdit = ({ program, onClose, onUpdate }) => {
  const shared = useSharedUi();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [totalThreshold, setTotalThreshold] = useState(0);
  const [initialThreshold, setInitialThreshold] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    programName: "",
    externalDataRequired: false,
    goalId: "",
    goalName: "",
    textTime: "",
    fromDate: "",
    toDate: "",
    threshold: "",
  });

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString('en-US');
  };

  // Format number WITHOUT commas (just plain number)
  const formatPlainNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return String(num);
  };

  // Parse number from string (remove commas)
  const parseNumber = (str) => {
    if (!str) return 0;
    return parseInt(String(str).replace(/,/g, '')) || 0;
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

  // Extract time from scheduleTime (e.g., "2026-01-08 15:00:00.0" -> "3PM")
  const extractTimeFromSchedule = (scheduleTime) => {
    if (!scheduleTime) return "2PM";
    try {
      const date = new Date(scheduleTime);
      if (isNaN(date.getTime())) return "2PM";
      
      let hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}${ampm}`;
    } catch {
      return "2PM";
    }
  };

  // Convert time string to schedule time format
  const convertTimeToSchedule = (timeStr, dateStr) => {
    if (!timeStr || !dateStr) return null;
    try {
      const hour = parseInt(timeStr);
      const ampm = timeStr.slice(-2);
      let hours = hour;
      if (ampm === 'PM' && hour !== 12) hours = hour + 12;
      if (ampm === 'AM' && hour === 12) hours = 0;
      
      const date = new Date(dateStr);
      date.setHours(hours, 0, 0, 0);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch {
      return null;
    }
  };

  // Fetch all data when modal opens
  useEffect(() => {
    if (!program) return;

    const fetchProgramData = async () => {
      setLoading(true);
      try {
        // Fetch program info, goals, and threshold in parallel
        const [programInfoResult, goalsResult, thresholdResult] = await Promise.all([
          smartReachApi.getProgramInfo(program.id),
          smartReachApi.getGoals(),
          smartReachApi.getProgramThreshold(),
        ]);

        console.log("Program Info Response:", programInfoResult);
        console.log("Threshold Response (totalThreshold):", thresholdResult);

        // Handle program info response - it's an array with one object
        let infoData = programInfoResult;
        if (Array.isArray(programInfoResult) && programInfoResult.length > 0) {
          infoData = programInfoResult[0];
        }
        
        setProgramInfo(infoData);
        setGoals(Array.isArray(goalsResult) ? goalsResult : []);

        // Get total threshold from API response
        let totalThresholdValue = 0;
        if (thresholdResult !== null && thresholdResult !== undefined) {
          if (typeof thresholdResult === 'number') {
            totalThresholdValue = thresholdResult;
          } else if (typeof thresholdResult === 'object' && thresholdResult.totalThreshold !== undefined) {
            totalThresholdValue = thresholdResult.totalThreshold;
          } else if (typeof thresholdResult === 'object' && thresholdResult.value !== undefined) {
            totalThresholdValue = thresholdResult.value;
          }
        }
        console.log("Total Threshold Value:", totalThresholdValue);
        setTotalThreshold(totalThresholdValue);

        // Populate form data from program info response
        if (infoData) {
          // Find matching goal from goals list
          const matchedGoal = Array.isArray(goalsResult) 
            ? goalsResult.find(g => g.id === infoData.goalId)
            : null;

          // Store the initial threshold value for calculations
          const initialThresholdValue = infoData.threshold || 0;
          setInitialThreshold(initialThresholdValue);

          // IMPORTANT: externalData is 0 or 1 from API
          // 0 = No, 1 = Yes
          const externalDataRequired = infoData.externalData === 1;

          setFormData({
            programName: infoData.programName ?? program.name ?? "",
            externalDataRequired: externalDataRequired,
            goalId: infoData.goalId !== undefined && infoData.goalId !== null ? String(infoData.goalId) : "",
            goalName: infoData.goalName ?? matchedGoal?.name ?? "Visit Follow-up",
            textTime: extractTimeFromSchedule(infoData.scheduleTime),
            fromDate: infoData.startDate ?? "",
            toDate: infoData.endDate ?? "",
            threshold: infoData.threshold !== null && infoData.threshold !== undefined 
              ? String(infoData.threshold) 
              : "",
          });
        }
      } catch (error) {
        console.error("Error fetching program data:", error);
        shared.toast?.error?.(apiErrorText(error, "Failed to load program data"));
        
        // Fallback to program data
        setFormData({
          programName: program.name ?? "",
          externalDataRequired: false,
          goalId: "",
          goalName: "Visit Follow-up",
          textTime: "2PM",
          fromDate: "",
          toDate: "2026-01-10",
          threshold: "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProgramData();
  }, [program, shared]);

  if (!program) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleThresholdChange = (value) => {
    // Remove non-numeric characters (commas, spaces, etc.)
    const cleanValue = value.replace(/,/g, '');
    
    // Allow empty or only digits
    if (cleanValue === '' || /^\d*$/.test(cleanValue)) {
      // Max 4 digits restriction
      if (cleanValue.length <= 4) {
        const newValue = parseInt(cleanValue) || 0;
        
        // Get practice text limit
        const practiceRole = shared.userDetails?.roles?.practicerole?.[0];
        const totalTextLimit = practiceRole?.practiceTextLimit || 0;
        
        // Calculate remaining = totalTextLimit - totalThreshold + initialThreshold - newValue
        const remainingWithNewValue = totalTextLimit - totalThreshold + initialThreshold - newValue;
        
        // Don't allow value that makes remaining negative
        if (remainingWithNewValue >= 0) {
          handleChange("threshold", cleanValue);
        } else {
          shared.toast?.warning?.(`Threshold cannot exceed ${formatPlainNumber(totalTextLimit - totalThreshold + initialThreshold)}`);
          // Set to max allowed value
          const maxAllowed = totalTextLimit - totalThreshold + initialThreshold;
          handleChange("threshold", String(maxAllowed));
        }
      } else {
        // Show warning if trying to type more than 4 digits
        shared.toast?.warning?.("Threshold cannot exceed 4 digits");
      }
    }
  };

  // Get practice text limit from user details
  const userDetails = shared.userDetails;
  const practiceRole = userDetails?.roles?.practicerole?.[0];
  const totalTextLimit = practiceRole?.practiceTextLimit || 0;

  // Get threshold value from form
  const thresholdValue = parseNumber(formData.threshold);

  // Calculate perOccupied = (threshold / totalTextLimit) * 100
  const perOccupied = totalTextLimit > 0 
    ? ((thresholdValue / totalTextLimit) * 100) 
    : 0;
  const perOccupiedFormatted = perOccupied.toFixed(2);

  // Calculate remaining = totalTextLimit - totalThreshold + initialThreshold - thresholdValue
  const remaining = totalTextLimit - totalThreshold + initialThreshold - thresholdValue;

  // Handle close with confirmation
  const handleClose = () => {
    // Check if any changes were made
    const hasChanges = formData.threshold !== String(programInfo?.threshold || "");
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // Handle confirm dialog close
  const handleConfirmClose = (confirmed) => {
    setShowConfirmDialog(false);
    // If confirmed (true), close the modal
    // If not confirmed (false or undefined), stay on the modal
    if (confirmed === true) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!formData.threshold || parseNumber(formData.threshold) === 0) {
      shared.toast?.error?.("Please enter a threshold value");
      return;
    }

    setLoading(true);
    try {
      const scheduleTime = convertTimeToSchedule(formData.textTime, formData.fromDate);
      
      const payload = {
        programId: Number(program.id),
        programName: formData.programName,
        externalDataRequired: formData.externalDataRequired ? 1 : 0,
        goalId: Number(formData.goalId) || 2,
        goalName: formData.goalName,
        scheduleTime: scheduleTime || `${formData.fromDate} ${formData.textTime}`,
        startDate: formData.fromDate,
        endDate: formData.toDate,
        threshold: parseNumber(formData.threshold),
      };

      await smartReachApi.updateProgramInfo(payload);
      
      onUpdate({
        ...program,
        ...formData,
        threshold: parseNumber(formData.threshold),
      });
      
      shared.toast?.success?.("Program updated successfully");
    } catch (error) {
      console.error("Error updating program:", error);
      shared.toast?.error?.(apiErrorText(error, "Failed to update program"));
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
              Program Edit
              {loading && <span className="ml-2 text-sm font-normal text-slate-500">Loading...</span>}
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
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Loading program data...</span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(event) => handleChange("programName", event.target.value)}
                    className="h-[66px] w-full rounded-lg border border-slate-300 bg-slate-50 px-4 text-[22px] text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Program Name"
                    disabled={loading}
                  />
                </div>

                <div>
                  <span className="text-base font-semibold text-slate-700">Program ID : </span>
                  <span className="text-base text-slate-700">{program.id}</span>
                </div>

                {/* External Data Required */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>External Data Required</span>
                    <Info size={20} className="fill-blue-600 text-white" />
                  </div>
                  <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                    <button
                      type="button"
                      onClick={() => handleChange("externalDataRequired", true)}
                      style={{
                        height: '44px',
                        width: '84px',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: formData.externalDataRequired === true ? '#10b981' : '#ffffff',
                        color: formData.externalDataRequired === true ? '#ffffff' : '#475569',
                        border: 'none',
                        borderRight: '1px solid #d1d5db',
                      }}
                      onMouseEnter={(e) => {
                        if (!formData.externalDataRequired) {
                          e.target.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!formData.externalDataRequired) {
                          e.target.style.backgroundColor = '#ffffff';
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
                        height: '44px',
                        width: '58px',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        backgroundColor: formData.externalDataRequired === false ? '#10b981' : '#ffffff',
                        color: formData.externalDataRequired === false ? '#ffffff' : '#475569',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (formData.externalDataRequired !== false) {
                          e.target.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.externalDataRequired !== false) {
                          e.target.style.backgroundColor = '#ffffff';
                        }
                      }}
                      disabled={loading}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Goal of Program</label>
                    <select
                      value={formData.goalId}
                      onChange={(event) => {
                        const selectedGoal = goals.find(g => String(g.id) === event.target.value);
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
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Text Time</label>
                    <select
                      value={formData.textTime}
                      onChange={(event) => handleChange("textTime", event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={loading}
                    >
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Dates</label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">From:</span>
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.fromDate}
                          onChange={(event) => handleChange("fromDate", event.target.value)}
                          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder="MM/DD/YYYY"
                          disabled={loading}
                        />
                        <CalendarDays size={20} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">To:</span>
                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.toDate}
                          onChange={(event) => handleChange("toDate", event.target.value)}
                          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          disabled={loading}
                        />
                        <CalendarDays size={20} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threshold / Allocation */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="pb-2 border-b border-slate-300">
                      <label className="text-sm font-semibold text-slate-700">Threshold : </label>
                      <input
                        type="text"
                        value={formData.threshold ? formatPlainNumber(formData.threshold) : ""}
                        onChange={(event) => handleThresholdChange(event.target.value)}
                        className="w-[100px] border-0 bg-transparent px-1 text-sm text-slate-800 outline-none"
                        disabled={loading}
                        placeholder="0"
                        maxLength={4}
                      />
                      <span className="text-sm text-slate-600"> / {formatPlainNumber(totalTextLimit)}</span>
                    </div>
                    <div className="ms-2 pb-2">
                      <span className="text-sm text-slate-600">{perOccupiedFormatted}% Text Allocation</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {remaining === 0 ? (
                      <span className="text-emerald-600 font-medium">0 Remaining</span>
                    ) : (
                      <span>{formatPlainNumber(remaining)} Remaining</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.programName}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Update Program"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        
        onClose={handleConfirmClose}
      />
    </>
  );
};

export default ProgramInfoEdit;