// src/components/ProgramInfoEdit.jsx
import { useState, useEffect } from "react";
import { CalendarDays, Info, X } from "lucide-react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import smartReachApi from "../services/smartReachApi";
import { apiErrorText } from "../utils/apiErrorText";

const ProgramInfoEdit = ({ program, onClose, onUpdate }) => {
  const shared = useSharedUi();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [threshold, setThreshold] = useState(null);
  
  const [formData, setFormData] = useState({
    programName: "",
    externalDataRequired: false,
    goalOfProgram: "Visit Follow-up",
    textTime: "2PM",
    fromDate: "",
    toDate: "2026-01-10",
    textAllocation: "",
  });

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

        setProgramInfo(programInfoResult);
        setGoals(Array.isArray(goalsResult) ? goalsResult : []);
        setThreshold(thresholdResult);

        // Populate form data from program info
        if (programInfoResult) {
          setFormData({
            programName: programInfoResult.programName ?? program.name ?? "",
            externalDataRequired: programInfoResult.externalDataRequired ?? false,
            goalOfProgram: programInfoResult.goalOfProgram ?? "Visit Follow-up",
            textTime: programInfoResult.textTime ?? "2PM",
            fromDate: programInfoResult.fromDate ?? "",
            toDate: programInfoResult.toDate ?? "2026-01-10",
            textAllocation: programInfoResult.textAllocation ?? "",
          });
        }
      } catch (error) {
        console.error("Error fetching program data:", error);
        shared.toast?.error?.(apiErrorText(error, "Failed to load program data"));
        
        // Fallback to program data
        setFormData({
          programName: program.name ?? "",
          externalDataRequired: false,
          goalOfProgram: "Visit Follow-up",
          textTime: "2PM",
          fromDate: "",
          toDate: "2026-01-10",
          textAllocation: "",
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

  const allocation = Number(formData.textAllocation) || 0;
  const totalPatients = Number(program.total) || 0;
  const remaining = Math.max(totalPatients - allocation, 0);
  const allocationPercentage = totalPatients > 0 ? ((allocation / totalPatients) * 100).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!formData.textAllocation) {
      shared.toast?.error?.("Please enter a text allocation value");
      return;
    }

    setLoading(true);
    try {
      // Call the update API
      const payload = {
        programId: Number(program.id),
        programName: formData.programName,
        externalDataRequired: formData.externalDataRequired,
        goalOfProgram: formData.goalOfProgram,
        textTime: formData.textTime,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        textAllocation: allocation,
      };

      await smartReachApi.updateProgramInfo(payload);
      
      // Call the onUpdate callback with the updated data
      onUpdate({
        ...program,
        ...formData,
        textAllocation: allocation,
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
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
            onClick={onClose}
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

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-700">External Data Required</span>
                  <Info size={20} className="fill-blue-600 text-white" />
                </div>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => handleChange("externalDataRequired", true)}
                    className={`h-11 w-[84px] rounded-l-lg border border-slate-300 text-sm font-semibold ${
                      formData.externalDataRequired
                        ? "bg-emerald-200 text-slate-700"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    disabled={loading}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("externalDataRequired", false)}
                    className={`h-11 w-[58px] rounded-r-lg border border-l-0 border-slate-300 text-sm font-semibold ${
                      !formData.externalDataRequired
                        ? "bg-emerald-200 text-slate-700"
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
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
                    value={formData.goalOfProgram}
                    onChange={(event) => handleChange("goalOfProgram", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    disabled={loading}
                  >
                    {goals.length > 0 ? (
                      goals.map((goal) => (
                        <option key={goal.id || goal.value} value={goal.name || goal.value}>
                          {goal.name || goal.label || goal.value}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Visit Follow-up">Visit Follow-up</option>
                        <option value="Appointment Reminder">Appointment Reminder</option>
                        <option value="Patient Follow-up">Patient Follow-up</option>
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
                    {["8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM"].map((time) => (
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

              <div>
                <div className="flex items-center gap-3">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max={totalPatients}
                      value={formData.textAllocation}
                      onChange={(event) => handleChange("textAllocation", event.target.value)}
                      className="h-11 w-[128px] rounded-lg border border-slate-700 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      disabled={loading}
                    />
                  </div>
                  <span className="text-sm text-slate-600">/ {totalPatients}</span>
                  <span className="text-sm text-slate-600">{allocationPercentage}% Text Allocation</span>
                </div>
                <div className="mt-1 text-sm text-slate-600">{remaining} Remaining</div>
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
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramInfoEdit;