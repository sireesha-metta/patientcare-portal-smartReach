// src/config/smartReachConstants.js

/**
 * SmartReach constants — port of Angular SmartReachConstants.
 * Criteria are matched by the exact `name` the backend returns.
 */
export const REQUEST_FROM = "SR";

export const PROGRAM_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  TESTING: 2,
  IN_BUILD: 3,
};

export const PROGRAM_STATUS_LABELS = {
  [PROGRAM_STATUS.INACTIVE]: "Inactive",
  [PROGRAM_STATUS.ACTIVE]: "Active",
  [PROGRAM_STATUS.TESTING]: "Testing",
  [PROGRAM_STATUS.IN_BUILD]: "In Build",
};

export const PROGRAM_STATUS_OPTIONS = [
  { value: PROGRAM_STATUS.INACTIVE, label: "Inactive" },
  { value: PROGRAM_STATUS.ACTIVE, label: "Active" },
  { value: PROGRAM_STATUS.TESTING, label: "Testing" },
  { value: PROGRAM_STATUS.IN_BUILD, label: "In Build" },
];

// src/config/smartReachConstants.js

// IMPORTANT: These IDs must match what the API returns
// Based on your logs: Age has ID 8, Frequency has ID 9
export const PROGRAM_CRITERIA = {
  AGE: 8,  // From your log: Age id: 8
  FREQUENCY: 9,  // From your log: Frequency id: 9
  GENDER: 2,  // Keep as is if correct
  ACTIVITY_TYPE: 4,  // Keep as is if correct
  INSURANCE_PLAN: 5,  // Keep as is if correct
  LOCATION: 6,  // Keep as is if correct
  PROVIDER: 7,  // Keep as is if correct
  ACTIVITY_SET_TYPE: 1,  // Changed from 8 to 1 (since Age took 8, Frequency took 9)
  REFERRING_PROVIDER: 10,  // Changed from 9 to 10
  PATIENT_ZIP: 11,  // Changed from 10 to 11
  RACE: 12,  // Changed from 11 to 12
  APPOINTMENT_TYPE_HAVE_HAD: 13,  // Changed from 12 to 13
  APPOINTMENT_TYPE_HAVE_NOT_HAD: 14,  // Changed from 13 to 14
  LOCATION_BILLED: 15,  // Changed from 14 to 15
  LOCATION_SCHEDULED: 16,  // Changed from 15 to 16
};
export const CRITERIA_NAMES = {
  AGE: "Age",
  GENDER: "Gender",
  FREQUENCY: "Frequency",
  APPOINTMENT_TYPE: "Appointment Type",
  APPOINTMENT_TYPE_HAVE_HAD: "Appointment Type Have Had",
  APPOINTMENT_TYPE_HAVE_NOT_HAD: "Appointment Type Have Not Had",
  ACTIVITY_SET_TYPE: "Activity Set Type",
  INSURANCE_PLAN: "Insurance Plan",
  PROVIDER: "Provider",
  LOCATION: "Location",
  LOCATION_BILLED: "Location - Billed",
  LOCATION_SCHEDULED: "Location - Scheduled",
  PATIENT_ZIP: "Patient Zip",
  RACE: "Race",
  REFERRING_PROVIDER: "Referring Provider",
  DISPLAY_LOCATION: "Display Location",
  DISPLAY_CRITERIA: "Display Criteria",
};

export const ACTION_TYPES = {
  SCHEDULED: "scheduled",
  TEXT: "text",
};

export const ACTION_TYPE_LABELS = {
  [ACTION_TYPES.SCHEDULED]: "Scheduled Action",
  [ACTION_TYPES.TEXT]: "Text Message",
};

/** Criteria id -> dialog key used by the Add/Edit modal */
export const CRITERIA_DIALOG_BY_ID = {
  [PROGRAM_CRITERIA.AGE]: "age",
  [PROGRAM_CRITERIA.GENDER]: "gender",
  [PROGRAM_CRITERIA.FREQUENCY]: "frequency",
  [PROGRAM_CRITERIA.ACTIVITY_TYPE]: "activityType",
  [PROGRAM_CRITERIA.INSURANCE_PLAN]: "insurance",
  [PROGRAM_CRITERIA.LOCATION]: "location",
  [PROGRAM_CRITERIA.PROVIDER]: "providers",
  [PROGRAM_CRITERIA.ACTIVITY_SET_TYPE]: "activitySet",
  [PROGRAM_CRITERIA.REFERRING_PROVIDER]: "referring",
  [PROGRAM_CRITERIA.PATIENT_ZIP]: "patientZip",
  [PROGRAM_CRITERIA.RACE]: "race",
  [PROGRAM_CRITERIA.APPOINTMENT_TYPE_HAVE_HAD]: "appointmentTypeHad",
  [PROGRAM_CRITERIA.APPOINTMENT_TYPE_HAVE_NOT_HAD]: "appointmentTypeNotHad",
  [PROGRAM_CRITERIA.LOCATION_BILLED]: "locationBilled",
  [PROGRAM_CRITERIA.LOCATION_SCHEDULED]: "locationScheduled",
};

/** Criteria name -> dialog key whose selections go into `listValuesCriteria` */
export const LIST_VALUE_DIALOG_BY_NAME = {
  [CRITERIA_NAMES.APPOINTMENT_TYPE]: "activityType",
  [CRITERIA_NAMES.APPOINTMENT_TYPE_HAVE_HAD]: "appointmentTypeHad",
  [CRITERIA_NAMES.APPOINTMENT_TYPE_HAVE_NOT_HAD]: "appointmentTypeNotHad",
  [CRITERIA_NAMES.LOCATION]: "location",
  [CRITERIA_NAMES.LOCATION_BILLED]: "locationBilled",
  [CRITERIA_NAMES.LOCATION_SCHEDULED]: "locationScheduled",
  [CRITERIA_NAMES.PROVIDER]: "providers",
  [CRITERIA_NAMES.ACTIVITY_SET_TYPE]: "activitySet",
  [CRITERIA_NAMES.GENDER]: "gender",
  [CRITERIA_NAMES.INSURANCE_PLAN]: "insurance",
  [CRITERIA_NAMES.PATIENT_ZIP]: "patientZip",
  [CRITERIA_NAMES.RACE]: "race",
  [CRITERIA_NAMES.REFERRING_PROVIDER]: "referring",
};

/**
 * Per-criteria "values are required" checks.
 * `dialog` is the selection bucket to test; Age is checked against its min/max pair.
 */
export const CRITERIA_VALUE_RULES = [
  {
    name: CRITERIA_NAMES.PROVIDER,
    dialog: "providers",
    error: "Provider criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.LOCATION,
    dialog: "location",
    error: "Location criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.LOCATION_BILLED,
    dialog: "locationBilled",
    error: "Location - Billed criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.LOCATION_SCHEDULED,
    dialog: "locationScheduled",
    error: "Location - Scheduled criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.AGE,
    dialog: "age",
    error: "Age criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.APPOINTMENT_TYPE,
    dialog: "activityType",
    error: "Appointment type criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.APPOINTMENT_TYPE_HAVE_HAD,
    dialog: "appointmentTypeHad",
    error: "Appointment Type Have Had criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.APPOINTMENT_TYPE_HAVE_NOT_HAD,
    dialog: "appointmentTypeNotHad",
    error: "Appointment Type Have Not Had criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.ACTIVITY_SET_TYPE,
    dialog: "activitySet",
    error: "Activity Set type criteria value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.GENDER,
    dialog: "gender",
    error: "Gender value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.INSURANCE_PLAN,
    dialog: "insurance",
    error: "Insurance Plan value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.PATIENT_ZIP,
    dialog: "patientZip",
    error: "Patient Zip value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.RACE,
    dialog: "race",
    error: "Race value(s) is/are required.",
  },
  {
    name: CRITERIA_NAMES.REFERRING_PROVIDER,
    dialog: "referring",
    error: "Referring Provider value(s) is/are required.",
  },
];

export const SR_TEXT = {
  WARNING_TITLE: "Are you Sure?",
  WARNING_MESSAGE: "Do you want to discard the changes?",
  NOT_IMPLEMENTED: "Not Implemented",
  NAME_REQUIRED: "Program name is required.",
  NAME_EXISTS: "Program name already exists.",
  NAME_EXISTS_FIELD: "Program Name already exists",
  NAME_LEADING_SPACE: "First letter cannot be space",
  CRITERIA_REQUIRED: "Program criteria is required.",
  DISPLAY_LOCATION_REQUIRED: "Program display location is/are required.",
  THRESHOLD_REQUIRED: "Threshold value is required.",
  THRESHOLD_EXCEEDS_LIMIT: "Threshold cannot exceed remaining limit.",
  THRESHOLD_MAX_DIGITS: "Threshold cannot exceed 4 digits.",
  GOAL_REQUIRED: "Program goal is required.",
  TEXT_TIME_REQUIRED: "Text time is required.",
  DATES_REQUIRED: "Start and end dates are required.",
  FROM_DATE_REQUIRED: "Start date is required.",
  TO_DATE_REQUIRED: "End date is required.",
  EXTERNAL_DATA_REQUIRED: "External data selection is required.",
};

/**
 * Time options from 1AM to 12PM
 */
export const TIME_OPTIONS = [
  "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM", "12AM",
  "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM", "12PM"
];

/**
 * Goal options for programs
 */
export const GOAL_OPTIONS = [
  { value: "Visit Follow-up", label: "Visit Follow-up" },
  { value: "Appointment Reminder", label: "Appointment Reminder" },
  { value: "Patient Follow-up", label: "Patient Follow-up" },
  { value: "Annual Screening", label: "Annual Screening" },
  { value: "Pre-authorization Required", label: "Pre-authorization Required" },
];

/**
 * Default values for program edit form
 */
export const DEFAULT_PROGRAM_VALUES = {
  programName: "",
  externalDataRequired: false,
  goalId: "",
  goalName: "Visit Follow-up",
  textTime: "2PM",
  fromDate: "",
  toDate: "",
  threshold: "",
};