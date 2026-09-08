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

  const [vptc, setVptc] = useState(false);
  const [payerTeamCustomer, setPayerTeamCustomer] = useState(null);
  const [payerTeamCustomerName, setPayerTeamCustomerName] = useState("");

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

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString("en-US");
  };

  const formatPlainNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return String(num);
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    return parseInt(String(str).replace(/,/g, "")) || 0;
  };

  // ---------------------------------------------------------
  // Time options
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // Extract time from scheduleTime
  // ---------------------------------------------------------

  const extractTimeFromSchedule = (scheduleTime) => {
    if (!scheduleTime) return "2PM";

    try {
      const date = new Date(scheduleTime);

      if (isNaN(date.getTime())) return "2PM";

      let hours = date.getHours();

      const ampm = hours >= 12 ? "PM" : "AM";

      hours = hours % 12;
      hours = hours ? hours : 12;

      return `${hours}${ampm}`;
    } catch {
      return "2PM";
    }
  };

  // ---------------------------------------------------------
  // Convert time to schedule format
  // ---------------------------------------------------------

  const convertTimeToSchedule = (timeStr, dateStr) => {
    if (!timeStr || !dateStr) return null;

    try {
      const hour = parseInt(timeStr);
      const ampm = timeStr.slice(-2);

      let hours = hour;

      if (ampm === "PM" && hour !== 12) {
        hours = hour + 12;
      }

      if (ampm === "AM" && hour === 12) {
        hours = 0;
      }

      const date = new Date(dateStr);

      date.setHours(hours, 0, 0, 0);

      return date.toISOString().slice(0, 19).replace("T", " ");
    } catch {
      return null;
    }
  };

  // ---------------------------------------------------------
  // Fetch program data
  // ---------------------------------------------------------

  useEffect(() => {
    if (!program) return;

    const fetchProgramData = async () => {
      setLoading(true);

      try {
        const [
          programInfoResult,
          goalsResult,
          thresholdResult,
        ] = await Promise.all([
          smartReachApi.getProgramInfo(program.id),
          smartReachApi.getGoals(),
          smartReachApi.getProgramThreshold(),
        ]);

        console.log("Program Info Response:", programInfoResult);
        console.log(
          "Threshold Response (totalThreshold):",
          thresholdResult
        );

        let infoData = programInfoResult;

        if (
          Array.isArray(programInfoResult) &&
          programInfoResult.length > 0
        ) {
          infoData = programInfoResult[0];
        }

        setProgramInfo(infoData);

        setGoals(Array.isArray(goalsResult) ? goalsResult : []);

        // -----------------------------------------------------
        // Total threshold
        // -----------------------------------------------------

        let totalThresholdValue = 0;

        if (
          thresholdResult !== null &&
          thresholdResult !== undefined
        ) {
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

        console.log("Total Threshold Value:", totalThresholdValue);

        setTotalThreshold(totalThresholdValue);

        // -----------------------------------------------------
        // Populate form
        // -----------------------------------------------------

        if (infoData) {
          const matchedGoal = Array.isArray(goalsResult)
            ? goalsResult.find((g) => g.id === infoData.goalId)
            : null;

          const initialThresholdValue = infoData.threshold || 0;

          setInitialThreshold(initialThresholdValue);

          const externalDataRequired =
            infoData.externalData === 1;

          setVptc(infoData.vptc || false);

          setPayerTeamCustomer(
            infoData.payerTeamCustomer || null
          );

          setPayerTeamCustomerName(
            infoData.payerTeamCustomerName || ""
          );

          setFormData({
            programName:
              infoData.programName ?? program.name ?? "",

            externalDataRequired,

            goalId:
              infoData.goalId !== undefined &&
              infoData.goalId !== null
                ? String(infoData.goalId)
                : "",

            goalName:
              infoData.goalName ??
              matchedGoal?.name ??
              "Visit Follow-up",

            textTime: extractTimeFromSchedule(
              infoData.scheduleTime
            ),

            fromDate: infoData.startDate ?? "",

            toDate: infoData.endDate ?? "",

            threshold:
              infoData.threshold !== null &&
              infoData.threshold !== undefined
                ? String(infoData.threshold)
                : "",
          });
        }
      } catch (error) {
        console.error("Error fetching program data:", error);

        shared.toast?.error?.(
          apiErrorText(
            error,
            "Failed to load program data"
          )
        );

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

  // ---------------------------------------------------------
  // Change handlers
  // ---------------------------------------------------------

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ---------------------------------------------------------
  // Threshold
  // ---------------------------------------------------------

  const handleThresholdChange = (value) => {
    const cleanValue = value.replace(/,/g, "");

    if (cleanValue === "" || /^\d*$/.test(cleanValue)) {
      if (cleanValue.length <= 4) {
        const newValue = parseInt(cleanValue) || 0;

        const practiceRole =
          shared.userDetails?.roles?.practicerole?.[0];

        const totalTextLimit =
          practiceRole?.practiceTextLimit || 0;

        const remainingWithNewValue =
          totalTextLimit -
          totalThreshold +
          initialThreshold -
          newValue;

        if (remainingWithNewValue >= 0) {
          handleChange("threshold", cleanValue);
        } else {
          shared.toast?.warning?.(
            `Threshold cannot exceed ${formatPlainNumber(
              totalTextLimit -
                totalThreshold +
                initialThreshold
            )}`
          );

          const maxAllowed =
            totalTextLimit -
            totalThreshold +
            initialThreshold;

          handleChange(
            "threshold",
            String(maxAllowed)
          );
        }
      } else {
        shared.toast?.warning?.(
          "Threshold cannot exceed 4 digits"
        );
      }
    }
  };

  // ---------------------------------------------------------
  // Allocation calculations
  // ---------------------------------------------------------

  const userDetails = shared.userDetails;

  const practiceRole =
    userDetails?.roles?.practicerole?.[0];

  const totalTextLimit =
    practiceRole?.practiceTextLimit || 0;

  const thresholdValue =
    parseNumber(formData.threshold);

  const perOccupied =
    totalTextLimit > 0
      ? (thresholdValue / totalTextLimit) * 100
      : 0;

  const perOccupiedFormatted =
    perOccupied.toFixed(2);

  const remaining =
    totalTextLimit -
    totalThreshold +
    initialThreshold -
    thresholdValue;

  // ---------------------------------------------------------
  // Close
  // ---------------------------------------------------------

  const handleClose = () => {
    const hasChanges =
      formData.threshold !==
      String(programInfo?.threshold || "");

    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = (confirmed) => {
    setShowConfirmDialog(false);

    if (confirmed === true) {
      onClose();
    }
  };

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------

  const handleSubmit = async () => {
    if (
      !formData.threshold ||
      parseNumber(formData.threshold) === 0
    ) {
      shared.toast?.error?.(
        "Please enter a threshold value"
      );
      return;
    }

    setLoading(true);

    try {
      const scheduleTime = convertTimeToSchedule(
        formData.textTime,
        formData.fromDate
      );

      const payload = {
        programId: Number(program.id),

        programName: formData.programName,

        externalDataRequired:
          formData.externalDataRequired ? 1 : 0,

        goalId: Number(formData.goalId) || 2,

        goalName: formData.goalName,

        scheduleTime:
          scheduleTime ||
          `${formData.fromDate} ${formData.textTime}`,

        startDate: formData.fromDate,

        endDate: formData.toDate,

        threshold: parseNumber(formData.threshold),
      };

      await smartReachApi.updateProgramInfo(payload);

      onUpdate({
        ...program,
        ...formData,
        threshold: parseNumber(
          formData.threshold
        ),
      });

      shared.toast?.success?.(
        "Program updated successfully"
      );
    } catch (error) {
      console.error(
        "Error updating program:",
        error
      );

      shared.toast?.error?.(
        apiErrorText(
          error,
          "Failed to update program"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Common styles
  // ---------------------------------------------------------

  const inputClass =
    "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70";

  const labelClass =
    "text-sm font-semibold text-slate-700";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleClose();
          }
        }}
      >
        {/* Modal */}
        <div
          className="my-8 w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Program Edit

              {loading && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  Loading...
                </span>
              )}
            </h2>

            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 px-6 py-5">
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

                  <span>
                    Loading program data...
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* Program Name */}
                <div className="flex items-center gap-3">
                  <label className="w-32 shrink-0 text-sm font-semibold text-slate-700">
                    Program Name
                  </label>

                  <input
                    type="text"
                    value={formData.programName}
                    onChange={(event) =>
                      handleChange(
                        "programName",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Enter program name"
                    disabled={loading}
                  />
                </div>

                {/* Program ID */}
                <div className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm font-semibold text-slate-700">
                    Program ID
                  </span>

                  <span className="text-sm text-slate-700">
                    {program.id}
                  </span>
                </div>

                {/* External Data / PAC / Payer */}
                <div className="grid grid-cols-3 gap-5">
                  {/* External Data */}
                  <div>
                    <div className="mb-1.5 flex items-center ">
                      <span className={labelClass}>
                        External Data Required
                      </span>

                      <Info
                        size={16}
                        className="shrink-0 fill-blue-600 text-white"
                      />
                    </div>

                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                      <button
                        type="button"
                        onClick={() =>
                          handleChange(
                            "externalDataRequired",
                            true
                          )
                        }
                        disabled={loading}
                        className={`h-10 min-w-[68px] border-r border-slate-300 px-4 text-sm font-semibold transition ${
                          formData.externalDataRequired
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        } ${
                          loading
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        Yes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleChange(
                            "externalDataRequired",
                            false
                          )
                        }
                        disabled={loading}
                        className={`h-10 min-w-[68px] px-4 text-sm font-semibold transition ${
                          !formData.externalDataRequired
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        } ${
                          loading
                            ? "cursor-not-allowed opacity-60"
                            : "cursor-pointer"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Payer Analytics Customer */}
                  {vptc && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className={labelClass}>
                          Payer Analytics Customer
                        </span>

                      
                      </div>

                      <div className="flex h-10 w-full items-center  px-3 text-sm text-slate-800">
                        {payerTeamCustomerName ||
                          "Not assigned"}
                      </div>
                    </div>
                  )}

                  {/* PAC */}
                  {vptc && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className={labelClass}>
                          PAC
                        </span>

                      
                      </div>

                      <div className="flex h-10 w-full items-center  px-3 text-sm text-slate-800">
                        {vptc ? "Yes" : "No"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Goal / Text Time */}
                <div className="grid grid-cols-2 gap-5">
                  {/* Goal */}
                  <div className="flex items-center gap-3">
                    <label className="w-32 shrink-0 text-sm font-semibold text-slate-700">
                      Goal
                    </label>

                    <select
                      value={formData.goalId}
                      onChange={(event) => {
                        const selectedGoal =
                          goals.find(
                            (g) =>
                              String(g.id) ===
                              event.target.value
                          );

                        handleChange(
                          "goalId",
                          event.target.value
                        );

                        handleChange(
                          "goalName",
                          selectedGoal?.name || ""
                        );
                      }}
                      className={inputClass}
                      disabled={loading}
                    >
                      <option value="">
                        Select a goal...
                      </option>

                      {goals.length > 0 ? (
                        goals.map((goal) => (
                          <option
                            key={goal.id}
                            value={goal.id}
                          >
                            {goal.name ||
                              goal.label ||
                              goal.value}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="1">
                            Visit Follow-up
                          </option>

                          <option value="2">
                            Appointment Reminder
                          </option>

                          <option value="3">
                            Patient Follow-up
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Text Time */}
                  <div className="flex items-center gap-3">
                    <label className="w-20 shrink-0 text-sm font-semibold text-slate-700">
                      Text Time
                    </label>

                    <select
                      value={formData.textTime}
                      onChange={(event) =>
                        handleChange(
                          "textTime",
                          event.target.value
                        )
                      }
                      className={inputClass}
                      disabled={loading}
                    >
                      {timeOptions.map((time) => (
                        <option
                          key={time}
                          value={time}
                        >
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700">
                    Dates
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    {/* From */}
                    <div className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-sm font-medium text-slate-600">
                        From
                      </span>

                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.fromDate}
                          onChange={(event) =>
                            handleChange(
                              "fromDate",
                              event.target.value
                            )
                          }
                          className={`${inputClass} pr-10`}
                          disabled={loading}
                        />

                        
                      </div>
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-sm font-medium text-slate-600">
                        To
                      </span>

                      <div className="relative flex-1">
                        <input
                          type="date"
                          value={formData.toDate}
                          onChange={(event) =>
                            handleChange(
                              "toDate",
                              event.target.value
                            )
                          }
                          className={`${inputClass} pr-10`}
                          disabled={loading}
                        />

                        
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threshold */}
                <div>
                  <div className="flex items-center gap-3">
                    <label className="w-32 shrink-0 text-sm font-semibold text-slate-700">
                      Threshold
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={
                          formData.threshold
                            ? formatPlainNumber(
                                formData.threshold
                              )
                            : ""
                        }
                        onChange={(event) =>
                          handleThresholdChange(
                            event.target.value
                          )
                        }
                        className="h-10 w-24 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        disabled={loading}
                        placeholder="0"
                        maxLength={4}
                      />

                      <span className="text-sm text-slate-500">
                        /
                        {" "}
                        {formatPlainNumber(
                          totalTextLimit
                        )}
                      </span>

                      <span className="ml-2 text-sm text-slate-500">
                        {perOccupiedFormatted}%
                        {" "}
                        allocated
                      </span>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="mt-2 pl-[140px] text-sm">
                    {remaining === 0 ? (
                      <span className="font-medium text-emerald-600">
                        0 Remaining
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        {formatPlainNumber(
                          remaining
                        )}{" "}
                        Remaining
                      </span>
                    )}
                  </div>

                  {/* Allocation bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(
                          perOccupied,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading || !formData.programName
              }
              className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : "Update Program"}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-md border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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

