// SmartReachPage.jsx - Updated with API refresh after status change

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSharedUi } from "patientcare-portal-sharedui/useSharedUi";
import DataGrid from "patientcare-portal-sharedui/DataGrid";
import ConfirmDialog from "patientcare-portal-sharedui/ConfirmDialog";
import { SHARED_SERVICES_CONSTANTS } from "patientcare-portal-sharedui/constants";
import { ModuleLayout } from "patientcare-portal-sharedui/SideNav";
import smartReachApi from "../services/smartReachApi";
import ProgramInfoEdit from "../components/ProgramInfoEdit";
import ProgramDetailsEdit from "../components/ProgramDetailsEdit";
import CreateProgram from "../components/CreateProgram";
import ReactDOM from "react-dom";

// Status mapping
const STATUS_OPTIONS = [
  { value: 0, label: "Inactive" },
  { value: 1, label: "Active" },
  { value: 2, label: "Testing" },
  { value: 3, label: "In Build" },
];

const closedEditor = { open: false, program: null };

// ============= ActionMenu Component =============
const ActionMenu = ({
  row,
  onProgramEdit,
  onProgramDetails,
  onProgramDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);

  const handleToggle = (event) => {
    event.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 170;
    const menuHeight = 136;
    const spacing = 6;

    let top = rect.bottom + spacing;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - spacing;
    }
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setPosition({ top, left });
    setOpen((prev) => !prev);
  };

  const handleProgramInfoEdit = (event) => {
    event.stopPropagation();
    onProgramEdit?.(row);
    setOpen(false);
  };

  const handleProgramDetailsEdit = (event) => {
    event.stopPropagation();
    onProgramDetails?.(row);
    setOpen(false);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onProgramDelete?.(row);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleScroll = () => setOpen(false);

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          aria-label="Program actions"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            border: "none",
            background: "transparent",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#64748b",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = "#f1f5f9";
            event.currentTarget.style.color = "#334155";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "transparent";
            event.currentTarget.style.color = "#64748b";
          }}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>

      {open &&
        position &&
        ReactDOM.createPortal(
          <div
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: 170,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.15)",
              padding: 6,
              zIndex: 999999,
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={handleProgramInfoEdit}
              style={{
                width: "100%",
                height: 40,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: "#334155",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Program Edit</span>
            </button>

            <div
              style={{ height: 1, background: "#e2e8f0", margin: "4px 6px" }}
            />

            <button
              type="button"
              onClick={handleProgramDetailsEdit}
              style={{
                width: "100%",
                height: 40,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: "#334155",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Program Details</span>
            </button>

            <div
              style={{ height: 1, background: "#e2e8f0", margin: "4px 6px" }}
            />

            <button
              type="button"
              onClick={handleDelete}
              style={{
                width: "100%",
                height: 40,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 10px",
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

// ============= SmartReachPage =============
export default function SmartReachPage() {
  const shared = useSharedUi();
  const [programData, setProgramData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("smartreach");
  const [editor, setEditor] = useState(closedEditor);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    program: null,
  });
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    program: null,
  });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await smartReachApi.getPracticePrograms();
      const programs = Array.isArray(response) ? response : [];
      const mappedData = programs.map((program, index) => ({
        id: String(program.programId ?? index + 1),
        name: program.programName ?? "",
        total: program.programTotalPatients ?? 0,
        status: program.programStatus,
        patientsContacted: program.patientsContacted ?? 0,
        description: program.description ?? "",
      }));
      setProgramData(mappedData);
      return mappedData;
    } catch (error) {
      console.error("Error fetching programs:", error);
      setProgramData([]);
      shared.toast?.error?.(error?.message || "Failed to load programs");
      return [];
    } finally {
      setLoading(false);
    }
  }, [shared]);

  useEffect(() => {
    const loadProgramData = async () => {
      await loadPrograms();
    };

    loadProgramData();
  }, [loadPrograms]);

  const refreshPrograms = () => {
    setLoading(true);
    return loadPrograms();
  };

  // Updated handleStatusChange with API refresh after status change
  const handleStatusChange = useCallback(
    async (programId, newStatus) => {
      const status = Number(newStatus);

      // Find the current program to check its current status
      const currentProgram = programData.find(
        (p) => p.id === String(programId),
      );
      if (!currentProgram) {
        shared.toast?.error?.("Program not found");
        return;
      }

      // Validate if status change is allowed (similar to Angular's disabled logic)
      const currentStatus = String(currentProgram.status);

      // Check if this status change is disabled
      const isDisabled = (() => {
        // If program is In Build (3), only allow In Build (3)
        if (currentStatus === "3" && status !== 3) return true;
        // If program is Active (1), allow Active (1) and Inactive (0)
        if (currentStatus === "1" && !(status === 1 || status === 0))
          return true;
        // If program is Inactive (0), allow Inactive (0) and Active (1)
        if (currentStatus === "0" && !(status === 0 || status === 1))
          return true;
        // If program is Testing (2), allow Testing (2)
        if (currentStatus === "2" && status !== 2) return true;
        return false;
      })();

      if (isDisabled) {
        shared.toast?.warning?.(
          "This status change is not allowed for the current program state",
        );
        // Refresh to reset the dropdown
        await refreshPrograms();
        return;
      }

      // Prevent multiple simultaneous status updates
      if (isStatusUpdating) return;
      setIsStatusUpdating(true);

      try {
        // Call the API with the correct payload format
        await smartReachApi.updateProgramStatus(programId, status);

        // Call the practice program API to refresh the data
        await refreshPrograms();

        shared.toast?.success?.("Program status updated successfully");
      } catch (error) {
        console.error("Failed to update program status:", error);
        shared.toast?.error?.(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to update program status",
        );
        // Refresh to reset the dropdown to the correct state
        await refreshPrograms();
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [shared, programData, isStatusUpdating, refreshPrograms],
  );

  const onProgramSaved = () => {
    setEditor(closedEditor);
    refreshPrograms();
  };

  const onDeleteProgram = async () => {
    const program = confirmDelete.program;
    setConfirmDelete({ open: false, program: null });
    if (!program) return;

    try {
      await smartReachApi.deleteProgram(Number(program.id));
      await refreshPrograms();
      shared.toast?.success?.("Program deleted successfully");
    } catch (error) {
      console.error("Failed to delete program:", error);
      shared.toast?.error?.(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete program",
      );
    }
  };

  // Handle Create New Program - opens modal
  const handleCreateProgram = () => {
    setCreateModalOpen(true);
  };

  // Get status color for dropdown styling
  const getStatusColor = (statusValue) => {
    const status = Number(statusValue);
    if (status === 3) return "text-yellow-600";
    if (status === 2) return "text-blue-600";
    if (status === 1) return "text-green-600";
    return "text-slate-700";
  };

  // Check if status option should be disabled (matching Angular logic)
  const isStatusDisabled = (program, optionValue) => {
    const currentStatus = String(program.status);
    const newStatus = Number(optionValue);

    // In Build (3) - only In Build allowed
    if (currentStatus === "3" && newStatus !== 3) return true;
    // Active (1) - only Active and Inactive allowed
    if (currentStatus === "1" && !(newStatus === 1 || newStatus === 0))
      return true;
    // Inactive (0) - only Inactive and Active allowed
    if (currentStatus === "0" && !(newStatus === 0 || newStatus === 1))
      return true;
    // Testing (2) - only Testing allowed
    if (currentStatus === "2" && newStatus !== 2) return true;

    return false;
  };

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Programs",
        flex: 1,
        minWidth: 180,
        sortable: true,
        filter: true,
        cellRenderer: (params) => (
          <div
            className="w-full overflow-hidden text-ellipsis whitespace-nowrap"
            title={params.value ?? ""}
          >
            {params.value ?? ""}
          </div>
        ),
      },
      {
        field: "total",
        headerName: "Program Total",
        width: 150,
        minWidth: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params) => (
          <span className="whitespace-nowrap">{params.value ?? 0}</span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 180,
        minWidth: 180,
        sortable: true,
        filter: true,
        cellRenderer: (params) => {
          const statusValue = Number(params.value);
          const program = params.data;

          return (
            <select
              value={statusValue}
              onChange={(event) => {
                event.stopPropagation();
                const newStatus = Number(event.target.value);
                handleStatusChange(program.id, newStatus);
              }}
              onClick={(event) => event.stopPropagation()}
              disabled={isStatusUpdating}
              className={`cursor-pointer rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm outline-none hover:border-slate-300 focus:border-slate-300 ${
                isStatusUpdating ? "opacity-50 cursor-not-allowed" : ""
              } ${getStatusColor(statusValue)}`}
            >
              {STATUS_OPTIONS.map((status) => {
                const isDisabled = isStatusDisabled(program, status.value);
                return (
                  <option
                    key={status.value}
                    value={status.value}
                    disabled={isDisabled}
                  >
                    {status.label}
                  </option>
                );
              })}
            </select>
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filter: false,
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        cellRenderer: (params) => (
          <ActionMenu
            row={params.data}
            onProgramEdit={(program) => setEditor({ open: true, program })}
            onProgramDetails={(program) =>
              setDetailsModal({ open: true, program })
            }
            onProgramDelete={(program) =>
              setConfirmDelete({ open: true, program })
            }
          />
        ),
      },
    ],
    [handleStatusChange, isStatusUpdating],
  );

  const navItems = useMemo(
    () => [
      {
        id: "smartreach",
        label: "SmartReach Engine",
        badge: programData.length,
      },
    ],
    [programData.length],
  );

  const navActions = useMemo(
    () => [
      {
        id: "create",
        label: "Create New Program",
        icon: (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        ),
        onClick: handleCreateProgram,
      },
    ],
    [],
  );

  return (
    <ModuleLayout
      title="Practice"
      items={navItems}
      activeId={activeTab}
      onSelect={setActiveTab}
      actions={navActions}
    >
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">SmartReach</h1>
                <p className="text-xs text-slate-500">
                  Practice / SmartReach Engine
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshPrograms}
              disabled={loading || isStatusUpdating}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition disabled:opacity-60"
            >
              <svg
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
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
              <span>{loading ? "Refreshing..." : "Refresh Data"}</span>
            </button>
          </div>
        </div>

        <DataGrid
          columns={columns}
          data={programData}
          fileName="programs-export"
          pageSize={10}
          loading={loading || isStatusUpdating}
          quickFilterPlaceholder="Search Program..."
          overlayNoRowsTemplate="No Programs Found."
          getRowId={(params) => String(params.data.id)}
          height={450}
        />
      </div>

      {/* Create Program Modal */}
      {createModalOpen && (
        <CreateProgram
          onClose={() => setCreateModalOpen(false)}
          onUpdate={() => {
            refreshPrograms();
          }}
        />
      )}

      {/* Program Edit Modal */}
      {editor.open && editor.program && (
        <ProgramInfoEdit
          program={editor.program}
          onClose={() => setEditor(closedEditor)}
          onUpdate={(updatedProgram) => {
            setProgramData((prev) =>
              prev.map((program) =>
                program.id === updatedProgram.id
                  ? { ...program, name: updatedProgram.programName }
                  : program,
              ),
            );
            shared.toast?.success?.("Program updated successfully");
            setEditor(closedEditor);
          }}
        />
      )}

      {/* Program Details Modal */}
      {detailsModal.open && detailsModal.program && (
        <ProgramDetailsEdit
          program={detailsModal.program}
          onClose={() => setDetailsModal({ open: false, program: null })}
        />
      )}

      <ConfirmDialog
        open={confirmDelete.open}
        data={{
          title: SHARED_SERVICES_CONSTANTS?.WARNINGTITLE || "Confirm Action",
          message: `Do you want to remove the program "${confirmDelete.program?.name || ""}"?`,
        }}
        onClose={(ok) => {
          if (ok) onDeleteProgram();
          else setConfirmDelete({ open: false, program: null });
        }}
      />
    </ModuleLayout>
  );
}
