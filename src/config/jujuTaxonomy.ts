import type { Category } from "@/types/question";

export const CATEGORY_LABELS: Record<Category, string> = {
  accounting_software: "Accounting Software",
  core_platform: "Core Platform",
  growth: "Growth",
  integrations: "Integrations",
  ai: "AI",
  operator: "Operator",
  general: "General",
};

export const SUB_CATEGORIES: Record<Category, readonly string[]> = {
  accounting_software: ["Quickbooks Desktop", "Quickbooks Online", "Xero"],
  core_platform: [
    "API",
    "Assets",
    "Automatic Tax Rate",
    "Booking Portal",
    "Booking Requests",
    "Clearpath",
    "Comments",
    "Commission",
    "Company Settings",
    "Custom Fields",
    "Custom Status Workflow",
    "Customer",
    "Customer Communications",
    "Customer Portal",
    "Dashboard",
    "Dynamic Proposals",
    "File Library",
    "Files",
    "Find Availability",
    "General UI/UX",
    "Inbound Leads",
    "Internal Activity",
    "Invoices/Estimates",
    "Item List/Inventory/Hubs",
    "Job Costing",
    "Jobs",
    "Location Services/Map",
    "Maintenance Agreement",
    "Material Lists",
    "Notepad",
    "Platform Messaging",
    "Price Tiers",
    "Pricebook",
    "Projects",
    "Purchase Orders",
    "Recurring Billing",
    "Recurring Job",
    "Reminders",
    "Reporting",
    "Review Management",
    "Sales Pipeline",
    "Schedule",
    "Site Visits",
    "Subtasks",
    "Supplier Chat",
    "Templates",
    "Time Sheets",
    "User Management",
    "User Notifications",
    "User Permissions",
    "Variant Proposals",
  ],
  growth: [
    "Acorn",
    "Credit Card Payments",
    "Custom Forms",
    "Engage",
    "Finturf/ChargeAfter",
    "Fleet Tracking (Azuga)",
    "FP Payments",
    "Lending",
    "Marketing",
    "Payment",
    "PDF Form Filler",
    "Wisetack",
  ],
  integrations: [
    "City Electric Supply",
    "Other Integration",
    "Reece ANZ",
    "Reece US",
    "The Granite Group",
  ],
  ai: ["Chat AI"],
  operator: ["Operator AI"],
  general: [],
};

export interface OwnerEntry {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

export const OWNER_MAPPING: Record<Category, OwnerEntry> = {
  accounting_software: { primary: "U099JQU52H5", secondary: "U060UTZ220M" },
  core_platform: {
    primary: "U060UTZ220M",
    secondary: "U036Y4VSSNA",
    tertiary: "U08HQFVMPCZ",
  },
  growth: { primary: "U08KR30Q6H3" },
  integrations: { primary: "U08KR30Q6H3" },
  ai: { primary: "U0ABMMCQ7U3" },
  operator: { primary: "U0ABMMCQ7U3", secondary: "U060UTZ220M" },
  general: { primary: "U0ABMMCQ7U3" },
};

export const CC_ALL: readonly string[] = ["U085CUEJX9Q", "U092ER5MY73"];

export const OWNER_DISPLAY: Record<string, string> = {
  U060UTZ220M: "Teancum",
  U099JQU52H5: "Carson",
  U08KR30Q6H3: "Mo",
  U0ABMMCQ7U3: "Evan",
  U036Y4VSSNA: "Saxon",
  U08HQFVMPCZ: "Jaden",
  U085CUEJX9Q: "Ashli",
  U092ER5MY73: "Addi",
};

export function ownerName(slackId: string | null | undefined): string {
  if (!slackId) return "Unknown";
  return OWNER_DISPLAY[slackId] ?? slackId;
}
