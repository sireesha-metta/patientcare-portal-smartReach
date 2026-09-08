// src/components/CreateProgram.jsx

import { useState, useEffect } from "react";
import { Info, X } from "lucide-react";

import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import ConfirmDialog from "patientcare-portal-sharedui/ConfirmDialog";

import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";

// ============================================================
// Reusable Input / Select Styles
// ============================================================

const inputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const subLabelClass =
  "mb-1.5 block text-xs font-medium text-slate-500";

// ============================================================
// Toggle Button
// ============================================================

const ToggleButton = ({
  value,
  currentValue,
  label,
  onChange,
  disabled,
}) => {
  const isActive = value === currentValue;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      disabled={disabled}
      className={`h-10 min-w-[76px] px-4 text-sm font-semibold transition-all ${
        isActive
          ? "bg-emerald-600 text-white"
          : "bg-white text-slate-600 hover:bg-slate-50"
      } ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer"
      }`}
    >
      {label}
    </button>
  );
};

// ============================================================
// Main Component
// ============================================================

const CreateProgram = ({ onClose, onUpdate }) => {
  const shared = useSharedUi();

  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [payers, setPayers] = useState([]);

  const [totalThreshold, setTotalThreshold] = useState(0);
  const [initialThreshold, setInitialThreshold] = useState(0);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [parentSite, setParentSite] = useState(null);

  // ============================================================
  // Date Helpers
  // ============================================================

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const getFutureDate = (days = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  // ============================================================
  // Time Options
  // ============================================================

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
  const defaultTime = "9AM";

  // ============================================================
  // Form Data
  // ============================================================

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

  // ============================================================
  // Number Helpers
  // ============================================================

  const formatNumber = (num) => {
    if (
      num === null ||
      num === undefined ||
      isNaN(num)
    ) {
      return "0";
    }

    return Number(num).toLocaleString("en-US");
  };

  const formatPlainNumber = (num) => {
    if (
      num === null ||
      num === undefined ||
      isNaN(num)
    ) {
      return "0";
    }

    return String(num);
  };

  const parseNumber = (str) => {
    if (!str) return 0;

    return (
      parseInt(String(str).replace(/,/g, ""), 10) || 0
    );
  };

  // ============================================================
  // Time Conversion
  // ============================================================

  const getTimeIn24Hour = (timeStr) => {
    if (!timeStr) return "9";

    const hour = parseInt(timeStr, 10);
    const ampm = timeStr.slice(-2);

    let hours = hour;

    if (ampm === "PM" && hour !== 12) {
      hours = hour + 12;
    }

    if (ampm === "AM" && hour === 12) {
      hours = 0;
    }

    return String(hours);
  };

  // ============================================================
  // Fetch Parent Site
  // ============================================================

  const fetchParentSite = async () => {
    try {
      const response = await smartReachApi.getParentSite();

      console.log("Parent Site Response:", response);

      setParentSite(response);

      return response;
    } catch (error) {
      console.error(
        "Error fetching parent site:",
        error
      );

      return null;
    }
  };

  // ============================================================
  // Fetch Payers
  // ============================================================

  const fetchPayers = async () => {
    try {
      const response =
        await smartReachApi.getSmartReachPayer();

      console.log("Full response:", response);

      let payerData = [];

      if (response) {
        const dataSource =
          response.response || response;

        if (
          dataSource.smartReachPayers &&
          Array.isArray(dataSource.smartReachPayers)
        ) {
          payerData = dataSource.smartReachPayers;
        } else if (Array.isArray(dataSource)) {
          payerData = dataSource;
        } else if (Array.isArray(response)) {
          payerData = response;
        } else {
          const possibleArrays = Object.values(
            dataSource
          ).filter((value) =>
            Array.isArray(value)
          );

          if (possibleArrays.length > 0) {
            payerData = possibleArrays[0];
          }
        }
      }

      console.log("Payers loaded:", payerData);
      console.log(
        "Number of payers:",
        payerData.length
      );

      setPayers(payerData);
    } catch (error) {
      console.error(
        "Error fetching payers:",
        error
      );

      setPayers([
        { id: 22, name: "Ajayt" },
        { id: 1, name: "Suneel Payer" },
        { id: 2, name: "PyaerGroup43" },
        { id: 3, name: "California" },
        { id: 4, name: "PayerGroup21" },
      ]);
    }
  };

  // ============================================================
  // Initial Data
  // ============================================================

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);

      try {
        const [
          goalsResult,
          thresholdResult,
        ] = await Promise.all([
          smartReachApi.getGoals(),
          smartReachApi.getProgramThreshold(),
        ]);

        setGoals(
          Array.isArray(goalsResult)
            ? goalsResult
            : []
        );

        await Promise.all([
          fetchPayers(),
          fetchParentSite(),
        ]);

        let totalThresholdValue = 0;

        if (
          thresholdResult !== null &&
          thresholdResult !== undefined
        ) {
          if (
            typeof thresholdResult === "number"
          ) {
            totalThresholdValue =
              thresholdResult;
          } else if (
            typeof thresholdResult === "object" &&
            thresholdResult.totalThreshold !==
              undefined
          ) {
            totalThresholdValue =
              thresholdResult.totalThreshold;
          } else if (
            typeof thresholdResult === "object" &&
            thresholdResult.value !== undefined
          ) {
            totalThresholdValue =
              thresholdResult.value;
          }
        }

        setTotalThreshold(
          totalThresholdValue
        );
      } catch (error) {
        console.error(
          "Error fetching data:",
          error
        );

        shared.toast?.error?.(
          apiErrorText(
            error,
            "Failed to load data"
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [shared]);

  // ============================================================
  // Generic Change
  // ============================================================

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // PAC Change
  // ============================================================

  const handlePACChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      pacEnabled: value,
      selectedCustomer: value
        ? prev.selectedCustomer
        : "",
    }));
  };

  // ============================================================
  // Customer Change
  // ============================================================

  const handleCustomerChange = (event) => {
    const customerId =
      event.target.value;

    setFormData((prev) => ({
      ...prev,
      selectedCustomer: customerId,
    }));
  };

  // ============================================================
  // Threshold Change
  // ============================================================

  const handleThresholdChange = (value) => {
    const cleanValue = value.replace(/,/g, "");

    if (
      cleanValue === "" ||
      /^\d*$/.test(cleanValue)
    ) {
      if (cleanValue.length <= 4) {
        const newValue =
          parseInt(cleanValue, 10) || 0;

        const practiceRole =
          shared.userDetails?.roles
            ?.practicerole?.[0];

        const totalTextLimit =
          practiceRole?.practiceTextLimit || 0;

        const remainingWithNewValue =
          totalTextLimit -
          totalThreshold +
          initialThreshold -
          newValue;

        if (remainingWithNewValue >= 0) {
          handleChange(
            "threshold",
            cleanValue
          );
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

  // ============================================================
  // User / Threshold Calculations
  // ============================================================

  const userDetails = shared.userDetails;

  const practiceRole =
    userDetails?.roles?.practicerole?.[0];

  const totalTextLimit =
    practiceRole?.practiceTextLimit || 0;

  const thresholdValue =
    parseNumber(formData.threshold);

  const perOccupied =
    totalTextLimit > 0
      ? (thresholdValue /
          totalTextLimit) *
        100
      : 0;

  const perOccupiedFormatted =
    perOccupied.toFixed(2);

  const remaining =
    totalTextLimit -
    totalThreshold +
    initialThreshold -
    thresholdValue;

  // ============================================================
  // Close
  // ============================================================

  const handleClose = () => {
    const hasChanges =
      formData.programName ||
      formData.threshold;

    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // ============================================================
  // Confirm Close
  // ============================================================

  const handleConfirmClose = (confirmed) => {
    setShowConfirmDialog(false);

    if (confirmed === true) {
      onClose();
    }
  };

  // ============================================================
  // Submit
  // ============================================================

  const handleSubmit = async () => {
    if (!formData.programName.trim()) {
      shared.toast?.error?.(
        "Please enter a program name"
      );
      return;
    }

    if (
      !formData.threshold ||
      parseNumber(formData.threshold) === 0
    ) {
      shared.toast?.error?.(
        "Please enter a threshold value"
      );
      return;
    }

    if (
      formData.pacEnabled &&
      !formData.selectedCustomer
    ) {
      shared.toast?.error?.(
        "Please select a Payer Analytics Customer"
      );
      return;
    }

    setLoading(true);

    try {
      const selectedGoal = goals.find(
        (goal) =>
          String(goal.id) ===
          formData.goalId
      );

      const selectedPayer = payers.find(
        (payer) =>
          String(payer.id) ===
          formData.selectedCustomer
      );

      const pmsId =
        parentSite?.id ||
        parentSite?.pmsId ||
        "4";

      const payload = {
        programName:
          formData.programName.trim(),

        goalId:
          selectedGoal?.id ||
          Number(formData.goalId) ||
          2,

        goalName:
          selectedGoal?.name ||
          formData.goalName ||
          "Visit Follow-up",

        programGoalInformationalStatus:
          null,

        noThresholdMessages:
          formData.threshold + "",

        programScheduledTime:
          getTimeIn24Hour(
            formData.textTime
          ),

        programOldScheduledTime: "0",

        publishChannel: [1],

        updateFlag: true,

        activeStatus: 1,

        externalData:
          formData.externalDataRequired
            ? 1
            : 0,

        vptc: formData.pacEnabled
          ? 1
          : 0,

        pmsId,

        programStartDate:
          formData.fromDate,

        programEndDate:
          formData.toDate,

        payerId: formData.pacEnabled
          ? Number(
              formData.selectedCustomer
            )
          : null,

        payerName: formData.pacEnabled
          ? selectedPayer?.name || ""
          : "",
      };

      console.log(
        "Creating program with payload:",
        payload
      );

      const response =
        await smartReachApi.createProgram(
          payload
        );

      console.log(
        "Create program response:",
        response
      );

      if (
        response &&
        response.message ===
          "Program created successfully"
      ) {
        shared.toast?.success?.(
          response.message
        );

        onUpdate();
        onClose();
      } else if (
        response &&
        response.message
      ) {
        shared.toast?.error?.(
          response.message
        );
      } else {
        shared.toast?.success?.(
          "Program created successfully"
        );

        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error(
        "Error creating program:",
        error
      );

      if (
        error.response?.data?.message
      ) {
        shared.toast?.error?.(
          error.response.data.message
        );
      } else if (error.message) {
        shared.toast?.error?.(
          error.message
        );
      } else {
        shared.toast?.error?.(
          "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
        onMouseDown={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            handleClose();
          }
        }}
      >
        {/* Modal */}
        <div
          className="my-8 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* ================================================== */}
          {/* Header */}
          {/* ================================================== */}

          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
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
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60"
              aria-label="Close"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          {/* ================================================== */}
          {/* Body */}
          {/* ================================================== */}

          <div className="space-y-6 px-6 py-5">
            {loading &&
            !formData.programName ? (
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
                    Loading...
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* ================================================== */}
                {/* Program Name */}
                {/* ================================================== */}

                <div className="flex items-center">
                  <label className="w-32 shrink-0 text-sm font-semibold text-slate-700">
                    Program Name
                  </label>

                  <input
                    type="text"
                    value={
                      formData.programName
                    }
                    onChange={(event) =>
                      handleChange(
                        "programName",
                        event.target.value
                      )
                    }
                    className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                    placeholder="Enter program name"
                    disabled={loading}
                  />
                </div>

                {/* ================================================== */}
                {/* External Data + PAC */}
                {/* ================================================== */}

                <div className="grid grid-cols-2 gap-6">
                  {/* External Data */}

                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        External Data Required
                      </span>
                    </div>

                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 shadow-sm divide-x divide-slate-300">
                      <ToggleButton
                        value={true}
                        currentValue={
                          formData.externalDataRequired
                        }
                        label="Yes"
                        onChange={(value) =>
                          handleChange(
                            "externalDataRequired",
                            value
                          )
                        }
                        disabled={loading}
                      />

                      <ToggleButton
                        value={false}
                        currentValue={
                          formData.externalDataRequired
                        }
                        label="No"
                        onChange={(value) =>
                          handleChange(
                            "externalDataRequired",
                            value
                          )
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* PAC */}

                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        PAC
                      </span>
                    </div>

                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 shadow-sm divide-x divide-slate-300">
                      <ToggleButton
                        value={true}
                        currentValue={
                          formData.pacEnabled
                        }
                        label="Yes"
                        onChange={
                          handlePACChange
                        }
                        disabled={loading}
                      />

                      <ToggleButton
                        value={false}
                        currentValue={
                          formData.pacEnabled
                        }
                        label="No"
                        onChange={
                          handlePACChange
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* ================================================== */}
                {/* Payer Analytics Customer */}
                {/* ================================================== */}

                {formData.pacEnabled && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-700">
                        Payer Analytics Customer
                      </span>

                      <Info
                        size={15}
                        className="shrink-0 text-slate-400"
                      />
                    </div>

                    <select
                      value={
                        formData.selectedCustomer
                      }
                      onChange={
                        handleCustomerChange
                      }
                      className={inputClass}
                      disabled={loading}
                    >
                      <option value="">
                        Select a customer...
                      </option>

                      {payers.length > 0 ? (
                        payers.map(
                          (payer) => (
                            <option
                              key={payer.id}
                              value={payer.id}
                            >
                              {payer.name}
                            </option>
                          )
                        )
                      ) : (
                        <>
                          <option value="22">
                            Ajayt
                          </option>

                          <option value="1">
                            Suneel Payer
                          </option>

                          <option value="2">
                            PyaerGroup43
                          </option>

                          <option value="3">
                            California
                          </option>

                          <option value="4">
                            PayerGroup21
                          </option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* ================================================== */}
                {/* Goal + Text Time */}
                {/* ================================================== */}

                <div className="grid grid-cols-2 gap-6">
                  {/* Goal */}

                  <div>
                    <label
                      className={labelClass}
                    >
                      Goal of Program
                    </label>

                    <select
                      value={
                        formData.goalId
                      }
                      onChange={(event) => {
                        const selectedGoal =
                          goals.find(
                            (goal) =>
                              String(
                                goal.id
                              ) ===
                              event.target
                                .value
                          );

                        handleChange(
                          "goalId",
                          event.target.value
                        );

                        handleChange(
                          "goalName",
                          selectedGoal?.name ||
                            ""
                        );
                      }}
                      className={
                        inputClass
                      }
                      disabled={loading}
                    >
                      <option value="">
                        Select a goal...
                      </option>

                      {goals.length > 0 ? (
                        goals.map(
                          (goal) => (
                            <option
                              key={goal.id}
                              value={goal.id}
                            >
                              {goal.name ||
                                goal.label ||
                                goal.value}
                            </option>
                          )
                        )
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

                  <div>
                    <label
                      className={labelClass}
                    >
                      Text Time
                    </label>

                    <select
                      value={
                        formData.textTime
                      }
                      onChange={(event) =>
                        handleChange(
                          "textTime",
                          event.target.value
                        )
                      }
                      className={
                        inputClass
                      }
                      disabled={loading}
                    >
                      {timeOptions.map(
                        (time) => (
                          <option
                            key={time}
                            value={time}
                          >
                            {time}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* ================================================== */}
                {/* Dates */}
                {/* ================================================== */}

                <div>
                  <label
                    className={labelClass}
                  >
                    Dates
                  </label>

                  <div className="grid grid-cols-2 gap-6">
                    {/* From */}

                    <div>
                      <span
                        className={
                          subLabelClass
                        }
                      >
                        From
                      </span>

                      <input
                        type="date"
                        value={
                          formData.fromDate
                        }
                        onChange={(event) =>
                          handleChange(
                            "fromDate",
                            event.target.value
                          )
                        }
                        className={`${inputClass} [color-scheme:light]`}
                        disabled={loading}
                      />
                    </div>

                    {/* To */}

                    <div>
                      <span
                        className={
                          subLabelClass
                        }
                      >
                        To
                      </span>

                      <input
                        type="date"
                        value={
                          formData.toDate
                        }
                        onChange={(event) =>
                          handleChange(
                            "toDate",
                            event.target.value
                          )
                        }
                        className={`${inputClass} [color-scheme:light]`}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* ================================================== */}
                {/* Threshold */}
                {/* ================================================== */}

                <div>
                  <label
                    className={labelClass}
                  >
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
                      className="h-10 w-28 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                      disabled={loading}
                      placeholder="0"
                      maxLength={4}
                    />

                    <span className="text-sm text-slate-500">
                      /{" "}
                      {formatPlainNumber(
                        totalTextLimit
                      )}
                    </span>

                    <span className="text-sm text-slate-500">
                      {perOccupiedFormatted}%
                      allocated
                    </span>
                  </div>

                  {/* Allocation Bar */}

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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

                  {/* Remaining */}

                  <div className="mt-1.5 text-sm">
                    {remaining === 0 ? (
                      <span className="font-medium text-emerald-600">
                        0 remaining
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        {formatPlainNumber(
                          remaining
                        )}{" "}
                        remaining
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ================================================== */}
          {/* Footer */}
          {/* ================================================== */}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="h-10 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                loading ||
                !formData.programName
              }
              className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Creating..."
                : "Create Program"}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* Confirm Dialog */}
      {/* ================================================== */}

      <ConfirmDialog
        open={showConfirmDialog}
        onClose={handleConfirmClose}
      />
    </>
  );
};

export default CreateProgram;