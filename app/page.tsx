"use client";

import { getFirebaseServices } from "@/lib/firebase";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { toJpeg } from "html-to-image";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const DEMO_MASTER_ID = "GH45";
const DEMO_MASTER_PASSWORD = "2706";
const DEMO_USERS_KEY = "demo-calendar-users";
const DEMO_ENTRIES_KEY = "demo-calendar-entries";
const ALL_BUILDING_LABEL = "전체";

const SECTION1_COLUMNS = [ALL_BUILDING_LABEL, "101동", "102동", "103동", "104동", "114동", "115동", "116동", "117동", "상가"];
const SECTION2_COLUMNS = [ALL_BUILDING_LABEL, "105동", "106동", "107동", "108동", "109동", "110동", "111동", "112동", "113동"];

const FIRE_WORK_COLUMNS = [
  ALL_BUILDING_LABEL,
  ...Array.from({ length: 17 }, (_, i) => `${101 + i}동`),
  "상가",
];
const HIGH_RISK_BUILDINGS = [
  ALL_BUILDING_LABEL,
  "101동", "102동", "103동", "104동", "105동", "106동", "107동", "108동", "109동",
  "110동", "111동", "112동", "113동", "114동", "115동", "116동", "117동", "상가",
];
const SOLO_WORKER_COLUMNS = [ALL_BUILDING_LABEL, ...Array.from({ length: 17 }, (_, i) => `${101 + i}동`), "상가"];
const MATERIAL_TIMES = Array.from({ length: 12 }, (_, i) => String(i + 6).padStart(2, "0"));
const MAX_HEATWAVE_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_HEATWAVE_EXCEL_FILE_SIZE = 10 * 1024 * 1024;

const EQUIPMENT_OPTIONS = [  { value: "concrete_pump_truck", label: "콘크리트 펌프카" },
  { value: "concrete_mixer_truck", label: "콘크리트 믹서트럭" },
  { value: "excavator", label: "굴착기" },
  { value: "roller", label: "롤러" },
  { value: "boom_lift_truck", label: "차량형 고소작업대" },
  { value: "scissor_lift", label: "시저형 고소작업대" },
  { value: "forklift", label: "지게차" },
  { value: "mobile_crane", label: "이동식 크레인" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("rounded-[24px] border border-black bg-white shadow-sm", className)}>{children}</div>;
}

function CardHeader({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-4 pt-4 lg:px-5 sm:pt-5", className)}>{children}</div>;
}

function CardContent({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-4 pb-4 lg:px-5 sm:pb-5", className)}>{children}</div>;
}

function CardTitle({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("text-base font-semibold text-slate-900 lg:text-lg", className)}>{children}</div>;
}

function Button({
  className = "",
  variant = "default",
  size = "default",
  type = "button",
  children,
  ...props
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "icon" | "sm";
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass = {
    default: "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
    outline: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
  }[variant];

  const sizeClass = {
    default: "h-10 px-4",
    icon: "h-10 w-10 p-0",
    sm: "h-8 px-2",
  }[size];

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({
  className = "",
  ...props
}: {
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        className
      )}
      {...props}
    />
  );
}

function TextArea({
  className = "",
  ...props
}: {
  className?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[140px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        className
      )}
      {...props}
    />
  );
}

function Badge({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full bg-slate-100 px-2 py-0 text-[10px] font-medium text-slate-700", className)}>{children}</span>;
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthDay(dateKey: string) {
  if (!dateKey) return "-";
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getDefaultSelectedDateKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);

  if (d.getDay() === 0) {
    d.setDate(d.getDate() + 1);
  }

  return formatDateKey(d);
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getSaturdayKeyFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const daysUntilSaturday = (6 - d.getDay() + 7) % 7;

  d.setDate(d.getDate() + daysUntilSaturday);

  return formatDateKey(d);
}

function getMonthGrid(currentDate: Date) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function getTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const excluded = (hour >= 0 && hour < 9) || (hour >= 11 && hour < 13) || (hour >= 15 && hour < 16) || (hour >= 18 && hour < 24);
    if (!excluded) options.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return options;
}

function getEndTime(startTime: string) {
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + 120;
  const endHour = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string) {
  const toMinutes = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

function getRoleLabel(role: string) {
  if (role === "master") return "마스터";
  if (role === "admin") return "관리자";
  return "일반";
}

function getStatusLabel(status: string) {
  if (status === "approved") return "승인완료";
  if (status === "rejected") return "반려";
  return "승인대기";
}

function getDemoMasterUser(): UserItem {
  return {
    uid: "demo-master",
    email: DEMO_MASTER_ID,
    password: DEMO_MASTER_PASSWORD,
    companyName: "마스터",
    name: "최고관리자",
    role: "master",
    status: "approved",
  };
}

function loadDemoUsers(): UserItem[] {
  if (typeof window === "undefined") return [getDemoMasterUser()];
  try {
    const raw = window.localStorage.getItem(DEMO_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(parsed) ? parsed.filter((user) => String(user.uid) !== "demo-master") : [];
    return [getDemoMasterUser(), ...filtered];
  } catch {
    return [getDemoMasterUser()];
  }
}

function saveDemoUsers(users: Array<{ uid: string } & Record<string, unknown>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DEMO_USERS_KEY,
    JSON.stringify(users.filter((user) => String(user.uid) !== "demo-master"))
  );
}

function loadDemoEntries(): EntryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_ENTRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDemoEntries(entries: Array<Record<string, unknown>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_ENTRIES_KEY, JSON.stringify(entries));
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type UserItem = {
  uid: string;
  email?: string;
  password?: string;
  companyName?: string;
  name?: string;
  role?: string;
  status?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt?: string | null;
};

type EntryItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  companyName?: string;
  createdByUid?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string | null;
};

type ActivityLogItem = {
  id: string;
  action: string;
  page?: string;
  target?: string;
  detail?: string;
  actorUid?: string;
  actorName?: string;
  actorCompany?: string;
  actorRole?: string;
  createdAt?: any;
};

type HeatwaveUploadItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: "image" | "excel" | "thermoPhoto" | "thermoLedger" | "breakTimeLedger";
  storagePath?: string;
  companyName?: string;
  uploadedByUid?: string;
  uploadedByName?: string;
  createdAt?: string | null;
};

type HeatwaveDateValue = {
  date?: string;
  uploads?: Record<string, HeatwaveUploadItem[]>;
};

type HeatwaveSharedFileItem = {
  fileName: string;
  fileUrl: string;
  storagePath?: string;
  uploadedByUid?: string;
  uploadedByName?: string;
  createdAt?: string | null;
};

type HeatwaveSharedDateValue = {
  date?: string;
  thermoHygrometerImage?: HeatwaveSharedFileItem | null;
  breakTimeExcel?: HeatwaveSharedFileItem | null;
};

type DabsRowItem = {
  id: string;
  company?: string;
  createdByUid?: string;
  createdByName?: string;
  content?: string;
  contentRedRanges?: TextColorRange[];
  name?: string;
  elderly?: string;
  gate?: string;
  material?: string;
  vehicle?: string;
  location?: string;
  time?: string;
};

type OverlayMarkerItem = {
  id: string;
  createdByUid?: string;
  createdByName?: string;
  x: number;
  y: number;
  building?: string;
  company?: string;
  note?: string;
  equipmentType?: string;
};

type OverlayArrowItem = {
  id: string;
  createdByUid?: string;
  createdByName?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type DabsTabValue =
  | string
  | {
      rows?: Record<string, DabsRowItem[]>;
      list?: DabsRowItem[];
    };

type DabsDateValue = {
  soloWorker?: {
    rows?: Record<string, DabsRowItem[]>;
  };
  [key: string]: DabsTabValue | { rows?: Record<string, DabsRowItem[]> } | undefined;
};

const COMPANY_COLOR_PALETTE = [
  { bg: "bg-rose-50/95", border: "border-rose-300", text: "text-rose-800" },
  { bg: "bg-blue-50/95", border: "border-blue-300", text: "text-blue-800" },
  { bg: "bg-emerald-50/95", border: "border-emerald-300", text: "text-emerald-800" },
  { bg: "bg-amber-50/95", border: "border-amber-300", text: "text-amber-800" },
  { bg: "bg-violet-50/95", border: "border-violet-300", text: "text-violet-800" },
  { bg: "bg-cyan-50/95", border: "border-cyan-300", text: "text-cyan-800" },
  { bg: "bg-pink-50/95", border: "border-pink-300", text: "text-pink-800" },
  { bg: "bg-lime-50/95", border: "border-lime-300", text: "text-lime-800" },
];

function getUniqueCompaniesFromMarkers(markers: OverlayMarkerItem[]) {
  return Array.from(
    new Set(
      markers
        .map((marker) => String(marker.company || "-").trim() || "-")
        .sort((a, b) => a.localeCompare(b, "ko"))
    )
  );
}

function getUniqueCompaniesFromRows(rows: Record<string, DabsRowItem[]>) {
  return Array.from(
    new Set(
      Object.values(rows)
        .flat()
        .map((item) => String(item.company || "-").trim() || "-")
        .sort((a, b) => a.localeCompare(b, "ko"))
    )
  );
}

function getCompanyColorByList(company: string, companyList: string[]) {
  const safeCompany = String(company || "-").trim() || "-";
  const index = companyList.indexOf(safeCompany);

  return COMPANY_COLOR_PALETTE[
    index >= 0 ? index % COMPANY_COLOR_PALETTE.length : 0
  ];
}

function getBuildingColor(building: string) {
  const buildingColorMap: Record<string, string> = {
  "전체": "text-black",
  "101동": "text-red-700",
    "102동": "text-blue-700",
    "103동": "text-emerald-700",
    "104동": "text-amber-700",
    "105동": "text-violet-700",
    "106동": "text-cyan-700",
    "107동": "text-pink-700",
    "108동": "text-lime-700",
    "109동": "text-orange-700",
    "110동": "text-indigo-700",
    "111동": "text-teal-700",
    "112동": "text-rose-700",
    "113동": "text-sky-700",
    "114동": "text-fuchsia-700",
    "115동": "text-green-700",
    "116동": "text-purple-700",
    "117동": "text-slate-800",
    "상가": "text-stone-800",
  };

  return buildingColorMap[building] || "text-slate-800";
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function getTextVisualLineCount(text: string, charsPerLine: number) {
  const normalizedText = String(text || "").trim();

  if (!normalizedText) return 1;

  return normalizedText.split("\n").reduce((sum, line) => {
    const safeLine = line.trim();

    if (!safeLine) return sum + 1;

    return sum + Math.max(1, Math.ceil(safeLine.length / charsPerLine));
  }, 0);
}

function getItemVisualRowCount(item: DabsRowItem, mode: "section" | "solo" = "section") {
  const content = String(item.content || "");

  const charsPerLine = mode === "solo" ? 120 : 160;

  return Math.max(getTextVisualLineCount(content, charsPerLine), 1);
}

function getRowCountByColumns(
  columns: string[],
  rows: Record<string, DabsRowItem[]>
) {
  return columns.reduce((sum, column) => {
    const list = rows[column] || [];

    if (list.length === 0) return sum + 1;

    const visualRows = list.reduce(
      (acc, item) => acc + getItemVisualRowCount(item),
      0
    );

    return sum + visualRows;
  }, 0);
}

function splitColumnsByMaxRows(
  columns: string[],
  rows: Record<string, DabsRowItem[]>,
  maxRows: number
) {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentRows = 0;

  columns.forEach((column) => {
    const list = rows[column] || [];

const rowCount =
  list.length === 0
    ? 1
    : list.reduce(
        (sum, item) => sum + getItemVisualRowCount(item, "section"),
        0
      );

    if (currentChunk.length > 0 && currentRows + rowCount > maxRows) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentRows = 0;
    }

    currentChunk.push(column);
    currentRows += rowCount;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function uniqueColumns(columns: string[]) {
  return Array.from(new Set(columns));
}

function isSectionWorkTabKey(tabKey: string) {
  return [
    "archWork",
    "mepWork",
    "section1_arch",
    "section1_mep",
    "section2_arch",
    "section2_mep",
    "fireWork",
  ].includes(tabKey);
}

function getMergedSectionKeys(tabKey: string) {
  if (tabKey === "archWork") return ["section1_arch", "section2_arch"];
  if (tabKey === "mepWork") return ["section1_mep", "section2_mep"];
  return [tabKey];
}

function getSectionStorageKey(tabKey: string, building: string) {
  if (tabKey === "archWork") {
    if (building !== ALL_BUILDING_LABEL && SECTION2_COLUMNS.includes(building)) return "section2_arch";
    return "section1_arch";
  }

  if (tabKey === "mepWork") {
    if (building !== ALL_BUILDING_LABEL && SECTION2_COLUMNS.includes(building)) return "section2_mep";
    return "section1_mep";
  }

  return tabKey;
}

function getDabsColumnsByTabKey(tabKey: string) {
  if (tabKey === "archWork" || tabKey === "mepWork") {
    return uniqueColumns([...SECTION1_COLUMNS, ...SECTION2_COLUMNS]);
  }

  if (tabKey === "section1_arch" || tabKey === "section1_mep") return SECTION1_COLUMNS;
  if (tabKey === "section2_arch" || tabKey === "section2_mep") return SECTION2_COLUMNS;
  if (tabKey === "fireWork") return FIRE_WORK_COLUMNS;
  return [];
}

function groupSoloWorkersByCompany(list: DabsRowItem[]): Array<[string, DabsRowItem[]]> {
  const sorted = [...list].sort((a, b) => {
    const companyCompare = String(a.company || "").localeCompare(String(b.company || ""), "ko");
    if (companyCompare !== 0) return companyCompare;
    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });

  const map = new Map<string, DabsRowItem[]>();

  sorted.forEach((item) => {
    const key = item.company || "-";
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(item);
  });

  return Array.from(map.entries());
}

function getSoloWorkerRowsByCompany(
  rows: Record<string, DabsRowItem[]>,
  companyFilter = ""
) {
  const keyword = companyFilter.trim().toLowerCase();

  return Object.entries(rows)
    .flatMap(([building, list]) =>
      (list || []).map((item) => ({
        ...item,
        building,
      }))
    )
    .filter((item) =>
      String(item.company || "").toLowerCase().includes(keyword)
    )
    .sort((a, b) => {
      const companyCompare = String(a.company || "").localeCompare(
        String(b.company || ""),
        "ko"
      );

      if (companyCompare !== 0) return companyCompare;

      const buildingCompare = String(a.building || "").localeCompare(
        String(b.building || ""),
        "ko"
      );

      if (buildingCompare !== 0) return buildingCompare;

      return String(a.name || "").localeCompare(String(b.name || ""), "ko");
    });
}

function splitSoloWorkersByMaxRows(
  rows: Array<DabsRowItem & { building: string }>,
  maxRows: number
) {
  const chunks: Array<Array<DabsRowItem & { building: string }>> = [];

  let currentChunk: Array<DabsRowItem & { building: string }> = [];
let currentRows = 0;

rows.forEach((item) => {
  const rowCount = getItemVisualRowCount(item, "solo");

  if (currentChunk.length > 0 && currentRows + rowCount > maxRows) {
    chunks.push(currentChunk);
    currentChunk = [];
    currentRows = 0;
  }

  currentChunk.push(item);
  currentRows += rowCount;
});

if (currentChunk.length > 0) {
  chunks.push(currentChunk);
}

  return chunks.length > 0 ? chunks : [[]];
}

function getEquipmentLabel(type: string) {
  return EQUIPMENT_OPTIONS.find((item) => item.value === type)?.label || "장비";
}

function EquipmentIcon({
  type,
  className = "h-6 w-6",
}: {
  type: string;
  className?: string;
}) {
  const common = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const wrap = (children: ReactNode) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {children}
    </svg>
  );

  switch (type) {
    case "concrete_pump_truck":
      return wrap(
        <>
          <path {...common} d="M2 16h13M4 16V9h4v7M8 11l5-4 2 1-3 3m2-2 2 8" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="15" cy="18" r="2" fill="currentColor" />
        </>
      );
    case "concrete_mixer_truck":
      return wrap(
        <>
          <path {...common} d="M2 16h15M4 16V10h4v6M10 10h5l2 3v3" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="14" cy="18" r="2" fill="currentColor" />
          <path {...common} d="M10.5 9.5 14 8l2 3-3.5 1.5Z" />
        </>
      );
    case "excavator":
      return wrap(
        <>
          <path {...common} d="M13 14h5v2h-5m-8 0h6M7 16v-2l3-2 2-5 3 1-1 4" />
          <path {...common} d="M14 7l3 2-2 4" />
          <path {...common} d="M8 12l-2 3 2 1" />
          <circle cx="7" cy="18" r="2" fill="currentColor" />
          <circle cx="11" cy="18" r="2" fill="currentColor" />
        </>
      );
    case "roller":
      return wrap(
        <>
          <circle cx="7" cy="15" r="4" {...common} />
          <path {...common} d="M11 15h4m0 0v-4h4v6h-3" />
          <circle cx="18" cy="17" r="2" fill="currentColor" />
        </>
      );
    case "boom_lift_truck":
      return wrap(
        <>
          <path {...common} d="M2 16h11M4 16v-3h5v3M6 13l7-5 2 2" />
          <path {...common} d="M15 10l3-3h2v2l-3 3" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="13" cy="18" r="2" fill="currentColor" />
        </>
      );
    case "scissor_lift":
      return wrap(
        <>
          <path {...common} d="M5 18h10M6 6h8v3H6Z" />
          <path {...common} d="m7 15 6-6m-6 0 6 6" />
          <path {...common} d="M6 18v-2h8v2" />
          <circle cx="7" cy="20" r="1" fill="currentColor" />
          <circle cx="13" cy="20" r="1" fill="currentColor" />
        </>
      );
    case "forklift":
      return wrap(
        <>
          <path {...common} d="M5 6v8m0 0h4m-4 0v4m10-8v6" />
          <path {...common} d="M9 10h4a3 3 0 0 1 3 3v1H9Z" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
          <circle cx="16" cy="18" r="2" fill="currentColor" />
        </>
      );
    case "mobile_crane":
      return wrap(
        <>
          <path {...common} d="M3 16h11M5 16v-3h4v3M9 13l6-5 3 2" />
          <path {...common} d="M18 10v5m0 0-1.5 2M18 15l1.5 2" />
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <circle cx="13" cy="18" r="2" fill="currentColor" />
        </>
      );
    default:
      return wrap(<rect x="5" y="5" width="14" height="14" {...common} />);
  }
}

function MobileListCard({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black bg-white p-4 shadow-sm lg:hidden">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {action}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

const TABLE_BASE_CLASS = "w-full table-fixed border-collapse text-[21px]";

const dottedRow = (index: number) =>
  index > 0 ? "border-t border-dashed border-black pt-2" : "";

type TextColorRange = {
  start: number;
  end: number;
};

const normalizeTextColorRanges = (ranges: TextColorRange[], textLength: number) =>
  ranges
    .map((range) => ({
      start: Math.max(0, Math.min(range.start, textLength)),
      end: Math.max(0, Math.min(range.end, textLength)),
    }))
    .filter((range) => range.start < range.end)
    .sort((a, b) => a.start - b.start);

const addRedTextRange = (ranges: TextColorRange[], start: number, end: number, textLength: number) => {
  if (start === end) return ranges;

  const nextRange = {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };

  return normalizeTextColorRanges([...ranges, nextRange], textLength);
};

const removeRedTextRange = (ranges: TextColorRange[], start: number, end: number) => {
  if (start === end) return ranges;

  const removeStart = Math.min(start, end);
  const removeEnd = Math.max(start, end);

  return ranges.flatMap((range) => {
    if (range.end <= removeStart || range.start >= removeEnd) return [range];

    const next: TextColorRange[] = [];

    if (range.start < removeStart) {
      next.push({ start: range.start, end: removeStart });
    }

    if (range.end > removeEnd) {
      next.push({ start: removeEnd, end: range.end });
    }

    return next;
  });
};

const renderTextWithRedRanges = (text = "", ranges: TextColorRange[] = []) => {
  const safeRanges = normalizeTextColorRanges(ranges, text.length);

  if (safeRanges.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;

  safeRanges.forEach((range, index) => {
    if (cursor < range.start) {
      nodes.push(text.slice(cursor, range.start));
    }

    nodes.push(
      <span key={`red-${index}`} className="text-red-600">
        {text.slice(range.start, range.end)}
      </span>
    );

    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

export default function MonthlyCalendarTextEntrySite() {
  const { auth, db, isConfigured } = getFirebaseServices();
const isDemoMode = false;
const storage = isConfigured ? getStorage() : null;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [entries, setEntries] = useState<EntryItem[]>([]);
const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
const [heatwaveImageSelectedCompanies, setHeatwaveImageSelectedCompanies] = useState<string[]>([]);
const [heatwaveExcelSelectedCompanies, setHeatwaveExcelSelectedCompanies] = useState<string[]>([]);
const [heatwaveUploads, setHeatwaveUploads] = useState<Record<string, HeatwaveDateValue>>({});
const [heatwaveMessage, setHeatwaveMessage] = useState("");
const [heatwaveStatusPopupOpen, setHeatwaveStatusPopupOpen] = useState(false);
const [heatwaveSharedFiles, setHeatwaveSharedFiles] = useState<Record<string, HeatwaveSharedDateValue>>({});
  const [selectedDate, setSelectedDate] = useState(() => getDefaultSelectedDateKey());
const [manualSelectedDate, setManualSelectedDate] = useState("");
const [manualSelectedDateSavedToday, setManualSelectedDateSavedToday] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [loginId, setLoginId] = useState("");
const [loginPassword, setLoginPassword] = useState("");
const [loginMessage, setLoginMessage] = useState("");
const [loginLoading, setLoginLoading] = useState(false);
  const [signupId, setSignupId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("general");
  const [signupMessage, setSignupMessage] = useState("");
  const [deleteNoticeOpen, setDeleteNoticeOpen] = useState(false);
const [entryMessage, setEntryMessage] = useState("");

const [editEntryPopup, setEditEntryPopup] = useState({
  open: false,
  entryId: "",
  date: "",
  startTime: "09:00",
  companyName: "",
});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState("menu");
const [portfolioSlideIndex, setPortfolioSlideIndex] = useState(0);
const [isExportingPortfolioImages, setIsExportingPortfolioImages] = useState(false);
  const [dabsTabIndex, setDabsTabIndex] = useState(0);
  const [dabsData, setDabsData] = useState<Record<string, DabsDateValue>>({});
  const [dabsImages, setDabsImages] = useState<Record<string, string>>({});
  const [dabsOverlays, setDabsOverlays] = useState<
  Record<
    string,
    Record<
      string,
      {
        markers?: OverlayMarkerItem[];
        arrows?: OverlayArrowItem[];
      }
    >
  >
>({});
  const [dabsDraft, setDabsDraft] = useState("");
  const [dabsMessage, setDabsMessage] = useState("");
  const [sectionInput, setSectionInput] = useState<{
  building: string;
  company: string;
  content: string;
  contentRedRanges: TextColorRange[];
}>({
  building: "",
  company: "",
  content: "",
  contentRedRanges: [],
});

const [sectionTextSelection, setSectionTextSelection] = useState({ start: 0, end: 0 });

const [editSectionPopup, setEditSectionPopup] = useState<{
  open: boolean;
  itemId: string;
  oldBuilding: string;
  building: string;
  company: string;
  content: string;
  contentRedRanges: TextColorRange[];
}>({
  open: false,
  itemId: "",
  oldBuilding: "",
  building: "",
  company: "",
  content: "",
  contentRedRanges: [],
});

const [editSectionTextSelection, setEditSectionTextSelection] = useState({ start: 0, end: 0 });
  const [materialsInput, setMaterialsInput] = useState({ gate: "1", company: "", material: "", vehicle: "", location: "", time: "06" });
  const [imagePopup, setImagePopup] = useState({
  open: false,
  x: 0,
  y: 0,
  company: "",
  note: "",
  equipmentType: "concrete_pump_truck",
  building: "",
  targetKey: "highRisk",
});

const [editOverlayPopup, setEditOverlayPopup] = useState({
  open: false,
  itemId: "",
  targetKey: "highRisk",
  company: "",
  note: "",
  building: "",
  equipmentType: "concrete_pump_truck",
});

const [moveOverlayTarget, setMoveOverlayTarget] = useState<{
  itemId: string;
  targetKey: string;
  mode: "marker" | "arrow";
} | null>(null);

const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
const [arrowPreview, setArrowPreview] = useState<
  { startX: number; startY: number; endX: number; endY: number } | null
>(null);

const [pendingEquipmentMarker, setPendingEquipmentMarker] = useState<{
  arrowId: string;
  company: string;
  note: string;
  equipmentType: string;
  logAction?: "입력" | "수정";
  createdByUid?: string;
  createdByName?: string;
} | null>(null);
  const [soloWorkerInput, setSoloWorkerInput] = useState({ building: "", company: "", name: "", content: "", elderly: "x" });
const [heatSensitiveInput, setHeatSensitiveInput] = useState({ building: "", company: "", name: "", content: "", elderly: "유질환자" });
const [heatwaveTab, setHeatwaveTab] = useState<"upload" | "heatSensitive">("upload");

const [supplementTab, setSupplementTab] = useState<"nightMorning" | "tomorrow" | "weekend">("nightMorning");
const [supplementNoticeText, setSupplementNoticeText] = useState("");
const [supplementNoticeImage, setSupplementNoticeImage] = useState("");
const [supplementNightText, setSupplementNightText] = useState("");
const [supplementMorningText, setSupplementMorningText] = useState("");
const [supplementMessage, setSupplementMessage] = useState("");

const supplementNightMorningDateKey = selectedDate;

const [supplementNightMorningRows, setSupplementNightMorningRows] = useState<Array<{
  id: string;
  company: string;
  nightText: string;
  morningText: string;
  createdByUid?: string;
  createdByName?: string;
}>>([]);

const [editSupplementNightMorningPopup, setEditSupplementNightMorningPopup] = useState({
  open: false,
  id: "",
  company: "",
  nightText: "",
  morningText: "",
});

const [supplementTomorrowNoticeText, setSupplementTomorrowNoticeText] = useState("");
const [supplementTomorrowNoticeImage, setSupplementTomorrowNoticeImage] = useState("");
const [supplementTomorrowRows, setSupplementTomorrowRows] = useState<Array<{
  id: string;
  workType: string;
  company: string;
  location: string;
  workerCount: string;
  supervisorCount: string;
  content: string;
  safetyAction: string;
  createdByUid?: string;
  createdByName?: string;
}>>([]);

const [supplementTomorrowInput, setSupplementTomorrowInput] = useState({
  workType: "조출",
  location: "",
  workerCount: "",
  supervisorCount: "",
  content: "",
  safetyAction: "",
});

const [editSupplementTomorrowPopup, setEditSupplementTomorrowPopup] = useState({
  open: false,
  id: "",
  workType: "조출",
  company: "",
  location: "",
  workerCount: "",
  supervisorCount: "",
  content: "",
  safetyAction: "",
});

const [manualSupplementWeekendDate, setManualSupplementWeekendDate] = useState("");
const [manualSupplementWeekendDateSavedToday, setManualSupplementWeekendDateSavedToday] = useState("");

const supplementWeekendDefaultDateKey = getSaturdayKeyFromDateKey(selectedDate);

const supplementWeekendDateKey =
  manualSupplementWeekendDate && manualSupplementWeekendDateSavedToday === getTodayKey()
    ? manualSupplementWeekendDate
    : supplementWeekendDefaultDateKey;

const [supplementWeekendNoticeText, setSupplementWeekendNoticeText] = useState("");
const [supplementWeekendNoticeImage, setSupplementWeekendNoticeImage] = useState("");
const [supplementWeekendRows, setSupplementWeekendRows] = useState<Array<{
  id: string;
  workType: string;
  company: string;
  location: string;
  workerCount: string;
  supervisorCount: string;
  content: string;
  safetyAction: string;
  createdByUid?: string;
  createdByName?: string;
}>>([]);

const [supplementWeekendInput, setSupplementWeekendInput] = useState({
  location: "",
  workerCount: "",
  supervisorCount: "",
  content: "",
  safetyAction: "",
});

const [editSupplementWeekendPopup, setEditSupplementWeekendPopup] = useState({
  open: false,
  id: "",
  company: "",
  location: "",
  workerCount: "",
  supervisorCount: "",
  content: "",
  safetyAction: "",
});
  const [editSoloPopup, setEditSoloPopup] = useState({
  open: false,
  itemId: "",
  oldBuilding: "",
  building: "",
  company: "",
  name: "",
  content: "",
  elderly: "x",
});

const [editHeatSensitivePopup, setEditHeatSensitivePopup] = useState({
  open: false,
  itemId: "",
  oldBuilding: "",
  building: "",
  company: "",
  name: "",
  content: "",
  elderly: "유질환자",
});

const [editMaterialPopup, setEditMaterialPopup] = useState({
  open: false,
  itemId: "",
  gate: "",
  time: "",
  company: "",
  material: "",
  vehicle: "",
  location: "",
});
  const [loadSourceDate, setLoadSourceDate] = useState(() => {
  const d = new Date();
  return formatDateKey(d);
});

const [soloCompanyFilter, setSoloCompanyFilter] = useState("");
const [heatSensitiveCompanyFilter, setHeatSensitiveCompanyFilter] = useState("");
const [isCapturingImage, setIsCapturingImage] = useState(false);
const [companyListPopupOpen, setCompanyListPopupOpen] = useState(false);

const [adjustedOverlayPositions, setAdjustedOverlayPositions] = useState<
  Record<string, { x: number; y: number }>
>({});

const overlayMarkerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const imageAreaRef = useRef<HTMLDivElement | null>(null);
const dabsCaptureRef = useRef<HTMLDivElement | null>(null);
const soloWorkerCaptureRef = useRef<HTMLDivElement | null>(null);
const heatSensitiveCaptureRef = useRef<HTMLDivElement | null>(null);
const portfolioCaptureRef = useRef<HTMLDivElement | null>(null);const educationCaptureRef = useRef<HTMLDivElement | null>(null);
  const lastTouchTimeRef = useRef(0);
  const touchGestureRef = useRef({ moved: false, startX: 0, startY: 0 });

  useEffect(() => {
  if (isDemoMode || !db || !currentUser) return;

  const unsubscribeDabs = onSnapshot(doc(db, "dabsMeetings", selectedDate), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data() as DabsDateValue;

    setDabsData((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        ...data,
      },
    }));
  });

  const unsubscribeSolo = onSnapshot(doc(db, "soloWorkers", selectedDate), (snap) => {
    if (!snap.exists()) return;

    const data = snap.data() as { rows?: Record<string, DabsRowItem[]> };

    setDabsData((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        soloWorker: {
          rows: data.rows || {},
        },
      },
    }));
  });

const unsubscribeHeatSensitive = () => {};

const unsubscribeOverlays = onSnapshot(doc(db, "dabsOverlays", selectedDate), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data();

  setDabsOverlays((prev) => ({
    ...prev,
    [selectedDate]: {
      ...(prev[selectedDate] || {}),
      highRisk: {
        markers: data.highRisk?.markers || [],
        arrows: data.highRisk?.arrows || [],
      },
      equipmentFlow: {
        markers: data.equipmentFlow?.markers || [],
        arrows: data.equipmentFlow?.arrows || [],
      },
    },
  }));
});

const unsubscribeImages = onSnapshot(doc(db, "dabsImages", "shared"), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data() as Record<string, string>;

  setDabsImages({
    highRisk: data.highRisk || "",
    equipmentFlow: data.equipmentFlow || "",
  });
});

  return () => {
  unsubscribeDabs();
unsubscribeSolo();
unsubscribeHeatSensitive();
unsubscribeOverlays();
unsubscribeImages();
};
}, [db, isDemoMode, currentUser, selectedDate]);

  useEffect(() => {
    if (isDemoMode) {
      setUsers(loadDemoUsers());
      setEntries(loadDemoEntries());
      setIsAuthReady(true);
      return undefined;
    }
    if (!isConfigured || !auth || !db) {
      setIsAuthReady(true);
      setLoginMessage("Firebase 환경변수가 설정되지 않았습니다.");
      return undefined;
    }

    let unsubscribeUsers = () => {};
    let unsubscribeEntries = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeUsers();
      unsubscribeEntries();
      setUsers([]);
      setEntries([]);
      setCurrentUser(null);
      setCurrentPage("menu");

      if (!firebaseUser) {
        setIsAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await signOut(auth);
          setLoginMessage("회원 정보가 없습니다. 관리자에게 문의하세요.");
          setIsAuthReady(true);
          return;
        }
        const userData: UserItem = { uid: firebaseUser.uid, ...(snap.data() as Partial<UserItem>) };
        if (userData.status !== "approved") {
          await signOut(auth);
          setLoginMessage("승인 완료된 계정만 로그인할 수 있습니다.");
          setIsAuthReady(true);
          return;
        }
        setCurrentUser(userData);
        setCurrentPage("menu");
        unsubscribeUsers = onSnapshot(
  collection(db, "users"),
  (snapshot) =>
    setUsers(
      snapshot.docs.map(
        (item) =>
          ({
            uid: item.id,
            ...(item.data() as Omit<UserItem, "uid">),
          }) satisfies UserItem
      )
    )
);
        unsubscribeEntries = onSnapshot(
  collection(db, "entries"),
  (snapshot) =>
    setEntries(
      snapshot.docs
        .map(
          (item) =>
            ({
              id: item.id,
              ...(item.data() as Omit<EntryItem, "id">),
            }) satisfies EntryItem
        )
        .sort((a, b) => {
          const dateCompare = String(a.date).localeCompare(String(b.date));
          if (dateCompare !== 0) return dateCompare;
          return String(a.startTime).localeCompare(String(b.startTime));
        })
    ),
  (error) => {
    console.log("ENTRIES SNAPSHOT ERROR:", error);
    setLoginMessage("일정 데이터를 불러오지 못했습니다.");
  }
);
      } catch {
        setCurrentUser(null);
        setUsers([]);
        setEntries([]);
        setLoginMessage("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUsers();
      unsubscribeEntries();
    };
  }, [auth, db, isConfigured, isDemoMode]);

  const monthGrid = useMemo(() => getMonthGrid(currentDate), [currentDate]);
  const todayKey = formatDateKey(new Date());
  const timeOptions = useMemo(() => getTimeOptions(), []);
  const monthLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  const dayEntries = useMemo(() => entries.filter((entry) => entry.date === selectedDate).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))), [entries, selectedDate]);
  const unavailableTimes = useMemo(() => timeOptions.filter((time) => dayEntries.some((entry) => isTimeOverlapping(time, getEndTime(time), entry.startTime, entry.endTime))), [dayEntries, timeOptions]);
  const availableTimes = useMemo(() => timeOptions.filter((time) => !unavailableTimes.includes(time)), [timeOptions, unavailableTimes]);
  const effectiveSelectedTime = availableTimes.includes(selectedTime) ? selectedTime : availableTimes[0] || "";
  const effectiveEndTime = effectiveSelectedTime ? getEndTime(effectiveSelectedTime) : "";
  const pendingUsers = useMemo(() => users.filter((user) => user.status === "pending"), [users]);
  const approvedUsers = useMemo(() => users.filter((user) => user.status === "approved"), [users]);
  const canApproveGeneral = currentUser?.role === "master" || currentUser?.role === "admin";
  const canApproveAdmin = currentUser?.role === "master";
  const canManageApprovals =
  currentUser?.role === "master" ||
  currentUser?.role === "admin";

const canViewActivityLogs =
  currentUser?.role === "master";
  const canEditDabs = Boolean(currentUser && currentUser.status === "approved");
  const canUploadDabsImage = currentUser?.role === "master" || currentUser?.role === "admin";
  const canAdminEditDabsItem = currentUser?.role === "master" || currentUser?.role === "admin";
const canManualChangeSelectedDate = currentUser?.role === "master" || currentUser?.role === "admin";
const canManageHeatwaveCompanies = currentUser?.role === "master" || currentUser?.role === "admin";
  const canDeleteOwnItem = (item?: { createdByUid?: string }) => {
  if (!currentUser) return false;
  if (currentUser.role === "master" || currentUser.role === "admin") return true;
  return item?.createdByUid === currentUser.uid;
};

useEffect(() => {
  const today = getTodayKey();

  if (manualSelectedDate && manualSelectedDateSavedToday !== today) {
    setManualSelectedDate("");
    setManualSelectedDateSavedToday("");
    setSelectedDate(getDefaultSelectedDateKey());
  }
}, [manualSelectedDate, manualSelectedDateSavedToday]);

useEffect(() => {
  const today = getTodayKey();

  if (manualSupplementWeekendDate && manualSupplementWeekendDateSavedToday !== today) {
    setManualSupplementWeekendDate("");
    setManualSupplementWeekendDateSavedToday("");
  }
}, [manualSupplementWeekendDate, manualSupplementWeekendDateSavedToday]);

const handleManualSelectedDateChange = (dateKey: string) => {
  if (!canManualChangeSelectedDate) return;

  setManualSelectedDate(dateKey);
  setManualSelectedDateSavedToday(getTodayKey());
  setSelectedDate(dateKey);
};

const handleResetSelectedDateToDefault = () => {
  setManualSelectedDate("");
  setManualSelectedDateSavedToday("");
  setSelectedDate(getDefaultSelectedDateKey());
};

const saveDabsMeetingToFirestore = async (dateKey: string, dateData: DabsDateValue) => {
  if (isDemoMode || !db || !currentUser) return;

  await setDoc(
    doc(db, "dabsMeetings", dateKey),
    {
      date: dateKey,
      ...dateData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const saveSoloWorkersToFirestore = async (
  dateKey: string,
  rows: Record<string, DabsRowItem[]>
) => {
  if (isDemoMode || !db || !currentUser) return;

  await setDoc(
    doc(db, "soloWorkers", dateKey),
    {
      date: dateKey,
      rows,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const saveHeatSensitiveWorkersToFirestore = async (
  dateKey: string,
  rows: Record<string, DabsRowItem[]>
) => {
  if (isDemoMode || !db || !currentUser) return;

  await setDoc(
    doc(db, "dabsMeetings", dateKey),
    {
      date: dateKey,
      heatSensitive: {
        rows,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const heatSensitiveRows = useMemo<Record<string, DabsRowItem[]>>(() => {
  const value = dabsData[selectedDate]?.heatSensitive;

  if (typeof value === "object" && value && "rows" in value) {
    return value.rows || {};
  }

  return {};
}, [dabsData, selectedDate]);

const saveDabsOverlaysToFirestore = async (
  dateKey: string,
  overlayData: Record<
    string,
    {
      markers?: OverlayMarkerItem[];
      arrows?: OverlayArrowItem[];
    }
  >
) => {
  if (isDemoMode || !db || !currentUser) return;

  await setDoc(
    doc(db, "dabsOverlays", dateKey),
    {
      date: dateKey,
      ...overlayData,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const writeActivityLog = async ({
  action,
  page,
  target,
  detail,
}: {
  action: string;
  page: string;
  target?: string;
  detail?: string;
}) => {
  if (isDemoMode || !db || !currentUser) return;

  await addDoc(collection(db, "activityLogs"), {
    action,
    page,
    target: target || "",
    detail: detail || "",
    actorUid: currentUser.uid || "",
    actorName: currentUser.name || "",
    actorCompany: currentUser.companyName || "",
    actorRole: currentUser.role || "general",
    createdAt: serverTimestamp(),
  });
};  
  
useEffect(() => {
  if (isDemoMode || !db || !currentUser) {
    setActivityLogs([]);
    return;
  }

  if (currentUser.role !== "master") {
    setActivityLogs([]);
    return;
  }

  const logsQuery = query(
    collection(db, "activityLogs"),
    orderBy("createdAt", "desc"),
    limit(200)
  );

  const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
    setActivityLogs(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<ActivityLogItem, "id">),
      }))
    );
  });

  return () => unsubscribeLogs();
}, [db, isDemoMode, currentUser]);

const approvedCompanyNames = useMemo(
  () =>
    Array.from(
      new Set(
        users
          .filter((user) => user.status === "approved")
          .map((user) => String(user.companyName || "").trim())
          .filter((companyName) => companyName && companyName !== "마스터")
      )
    ).sort((a, b) => a.localeCompare(b, "ko")),
  [users]
);

useEffect(() => {
  if (isDemoMode || !db || !currentUser) return;

  let isActiveSupplementSnapshot = true;

  setSupplementNoticeText("");
  setSupplementNoticeImage("");
  setSupplementNightText("");
  setSupplementMorningText("");
  setSupplementNightMorningRows([]);

  setSupplementTomorrowNoticeText("");
  setSupplementTomorrowNoticeImage("");
  setSupplementTomorrowRows([]);

  setSupplementWeekendNoticeText("");
  setSupplementWeekendNoticeImage("");
  setSupplementWeekendRows([]);

  const unsubscribeSupplementNightMorning = onSnapshot(
  doc(db, "supplementWorks", supplementNightMorningDateKey),
  (snap) => {
    if (!isActiveSupplementSnapshot) return;

    if (!snap.exists()) {
      setSupplementNoticeText("");
      setSupplementNoticeImage("");
      setSupplementNightText("");
      setSupplementMorningText("");
      setSupplementNightMorningRows([]);
      return;
    }

    const data = snap.data();

    setSupplementNoticeText(String(data.noticeText || ""));
    setSupplementNoticeImage(String(data.noticeImage || ""));
    setSupplementNightText("");
    setSupplementMorningText("");
    setSupplementNightMorningRows(Array.isArray(data.nightMorningRows) ? data.nightMorningRows : []);
  }
);

const unsubscribeSupplementTomorrow = onSnapshot(
  doc(db, "supplementWorks", selectedDate),
  (snap) => {
    if (!isActiveSupplementSnapshot) return;

    if (!snap.exists()) {
      setSupplementTomorrowNoticeText("");
      setSupplementTomorrowNoticeImage("");
      setSupplementTomorrowRows([]);
      return;
    }

    const data = snap.data();

    setSupplementTomorrowNoticeText(String(data.tomorrowNoticeText || ""));
    setSupplementTomorrowNoticeImage(String(data.tomorrowNoticeImage || ""));
    setSupplementTomorrowRows(Array.isArray(data.tomorrowRows) ? data.tomorrowRows : []);
  }
);

const unsubscribeSupplementWeekend = onSnapshot(
  doc(db, "supplementWorks", supplementWeekendDateKey),
  (snap) => {
    if (!isActiveSupplementSnapshot) return;

    if (!snap.exists()) {
      setSupplementWeekendNoticeText("");
      setSupplementWeekendNoticeImage("");
      setSupplementWeekendRows([]);
      return;
    }

    const data = snap.data();

    setSupplementWeekendNoticeText(String(data.weekendNoticeText || ""));
    setSupplementWeekendNoticeImage(String(data.weekendNoticeImage || ""));
    setSupplementWeekendRows(Array.isArray(data.weekendRows) ? data.weekendRows : []);
  }
);

  const unsubscribeSettings = onSnapshot(doc(db, "heatwaveSettings", "companies"), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data();
  const oldCompanies = Array.isArray(data.selectedCompanies)
    ? data.selectedCompanies.map(String)
    : [];

  const imageCompanies = Array.isArray(data.selectedImageCompanies)
    ? data.selectedImageCompanies.map(String)
    : oldCompanies;

  const excelCompanies = Array.isArray(data.selectedExcelCompanies)
    ? data.selectedExcelCompanies.map(String)
    : oldCompanies;

  setHeatwaveImageSelectedCompanies(imageCompanies);
  setHeatwaveExcelSelectedCompanies(excelCompanies);
});

const unsubscribeUploads = onSnapshot(doc(db, "heatwaveUploads", selectedDate), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data() as HeatwaveDateValue;

  setHeatwaveUploads((prev) => ({
    ...prev,
    [selectedDate]: {
      date: selectedDate,
      uploads: data.uploads || {},
    },
  }));
});
  const unsubscribeSharedFiles = onSnapshot(doc(db, "heatwaveSharedFiles", selectedDate), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data() as HeatwaveSharedDateValue;

  setHeatwaveSharedFiles((prev) => ({
    ...prev,
    [selectedDate]: {
      date: selectedDate,
      thermoHygrometerImage: data.thermoHygrometerImage || null,
      breakTimeExcel: data.breakTimeExcel || null,
    },
  }));
});
  return () => {
    isActiveSupplementSnapshot = false;

    unsubscribeSupplementNightMorning();
unsubscribeSupplementTomorrow();
unsubscribeSupplementWeekend();
    unsubscribeSettings();
    unsubscribeUploads();
    unsubscribeSharedFiles();
  };
}, [db, isDemoMode, currentUser, selectedDate, supplementWeekendDateKey]);

const handleToggleHeatwaveCompany = async (
  companyName: string,
  fileType: "image" | "excel"
) => {
  if (!canManageHeatwaveCompanies || !db || !currentUser) return;

  const currentList =
    fileType === "image"
      ? heatwaveImageSelectedCompanies
      : heatwaveExcelSelectedCompanies;

  const nextList = currentList.includes(companyName)
    ? currentList.filter((item) => item !== companyName)
    : [...currentList, companyName].sort((a, b) => a.localeCompare(b, "ko"));

  const nextImageCompanies =
    fileType === "image" ? nextList : heatwaveImageSelectedCompanies;

  const nextExcelCompanies =
    fileType === "excel" ? nextList : heatwaveExcelSelectedCompanies;

  setHeatwaveImageSelectedCompanies(nextImageCompanies);
  setHeatwaveExcelSelectedCompanies(nextExcelCompanies);

  await setDoc(
    doc(db, "heatwaveSettings", "companies"),
    {
      selectedImageCompanies: nextImageCompanies,
      selectedExcelCompanies: nextExcelCompanies,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
updatedByName: currentUser.name || "",
    },
    { merge: true }
  );
};
const getHeatwaveCompanyUploads = (companyName: string) =>
  heatwaveUploads[selectedDate]?.uploads?.[companyName] || [];

const getHeatwaveCompanyStatus = (companyName: string) => {
  const uploads = getHeatwaveCompanyUploads(companyName);

  const thermoPhotoCount = uploads.filter(
    (item) => item.fileType === "thermoPhoto" || item.fileType === "image"
  ).length;

  const thermoLedgerCount = uploads.filter(
    (item) => item.fileType === "thermoLedger"
  ).length;

  const breakTimeLedgerCount = uploads.filter(
    (item) => item.fileType === "breakTimeLedger" || item.fileType === "excel"
  ).length;

  return {
    uploads,
    imageCount: thermoPhotoCount,
    excelCount: breakTimeLedgerCount,
    thermoPhotoCount,
    thermoLedgerCount,
    breakTimeLedgerCount,
    isComplete:
  thermoPhotoCount >= 4 &&
  thermoLedgerCount >= 1 &&
  breakTimeLedgerCount >= 1,
  };
};

const getHeatwaveFileTypeLabel = (
  fileType: "image" | "excel" | "thermoPhoto" | "thermoLedger" | "breakTimeLedger"
) => {
  if (fileType === "thermoPhoto" || fileType === "image") return "온습도계 사진";
  if (fileType === "thermoLedger") return "온습도계 관리대장";
  if (fileType === "breakTimeLedger" || fileType === "excel") return "휴게시간 관리대장";
  return "파일";
};

const getHeatwaveSharedFileKindLabel = (
  fileKind: "thermoHygrometerImage" | "breakTimeExcel"
) => {
  if (fileKind === "thermoHygrometerImage") return "온습도계 이미지";
  return "휴게시간 엑셀파일";
};

const handleHeatwaveUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  fileType: "thermoPhoto" | "thermoLedger" | "breakTimeLedger"
) => {
  setHeatwaveMessage("");

  const file = event.target.files?.[0];
  if (!file) return;

  const companyName = String(currentUser?.companyName || "").trim();

  if (!currentUser || !companyName) {
    setHeatwaveMessage("로그인 후 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  const isTargetCompany =
    fileType === "thermoPhoto" || fileType === "thermoLedger"
      ? heatwaveImageSelectedCompanies.includes(companyName)
      : heatwaveExcelSelectedCompanies.includes(companyName);

  if (!isTargetCompany) {
    setHeatwaveMessage(
      fileType === "thermoPhoto" || fileType === "thermoLedger"
        ? "온습도계 업로드 대상 업체로 체크된 업체만 업로드할 수 있습니다."
        : "휴게시간 관리대장 업로드 대상 업체로 체크된 업체만 업로드할 수 있습니다."
    );
    event.target.value = "";
    return;
  }

  if (!db || !storage) {
    setHeatwaveMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

  const maxSize =
    fileType === "thermoPhoto"
      ? MAX_HEATWAVE_IMAGE_FILE_SIZE
      : MAX_HEATWAVE_EXCEL_FILE_SIZE;

  if (file.size > maxSize) {
    setHeatwaveMessage(
      fileType === "thermoPhoto"
        ? "온습도계 사진은 5MB 이하만 업로드할 수 있습니다."
        : "관리대장은 10MB 이하만 업로드할 수 있습니다."
    );
    event.target.value = "";
    return;
  }

  const currentUploads = getHeatwaveCompanyUploads(companyName);

  const thermoPhotoCount = currentUploads.filter(
    (item) => item.fileType === "thermoPhoto" || item.fileType === "image"
  ).length;

  const thermoLedgerCount = currentUploads.filter(
    (item) => item.fileType === "thermoLedger"
  ).length;

  const breakTimeLedgerCount = currentUploads.filter(
    (item) => item.fileType === "breakTimeLedger" || item.fileType === "excel"
  ).length;

  if (fileType === "thermoPhoto" && thermoPhotoCount >= 4) {
  setHeatwaveMessage("온습도계 사진은 하루 4개까지만 업로드할 수 있습니다.");
  event.target.value = "";
  return;
}

  if (fileType === "thermoLedger" && thermoLedgerCount >= 1) {
    setHeatwaveMessage("온습도계 관리대장은 하루 1개까지만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  if (fileType === "breakTimeLedger" && breakTimeLedgerCount >= 1) {
    setHeatwaveMessage("휴게시간 관리대장은 하루 1개까지만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  try {
    const safeCompanyName = companyName.replace(/[\\/:*?"<>|]/g, "-");
    const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "-");
    const storagePath = `heatwaveUploads/${selectedDate}/${safeCompanyName}/${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    const newUpload: HeatwaveUploadItem = {
      id: createLocalId("heatwave"),
      fileName: file.name,
      fileUrl,
      fileType,
      storagePath,
      companyName,
      uploadedByUid: currentUser.uid || "",
      uploadedByName: currentUser.name || "",
      createdAt: new Date().toISOString(),
    };

    const latestUploadSnap = await getDoc(doc(db, "heatwaveUploads", selectedDate));

    const latestUploadData = latestUploadSnap.exists()
      ? (latestUploadSnap.data() as HeatwaveDateValue)
      : { uploads: {} };

    const latestUploads = latestUploadData.uploads || {};
    const latestCompanyUploads = latestUploads[companyName] || [];

    const nextUploads = {
      ...latestUploads,
      [companyName]: [...latestCompanyUploads, newUpload],
    };

    setHeatwaveUploads((prev) => ({
      ...prev,
      [selectedDate]: {
        date: selectedDate,
        uploads: nextUploads,
      },
    }));

    await setDoc(
      doc(db, "heatwaveUploads", selectedDate),
      {
        date: selectedDate,
        uploads: nextUploads,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await writeActivityLog({
  action: "입력",
  page: "혹서기",
  target: companyName,
  detail: `${getHeatwaveFileTypeLabel(fileType)} 업로드 / ${file.name}`,
});

setHeatwaveMessage("업로드되었습니다.");
  } catch (error) {
    console.log("HEATWAVE UPLOAD ERROR:", error);

    setHeatwaveMessage(
      error instanceof Error
        ? `업로드 오류: ${error.message}`
        : "업로드 중 오류가 발생했습니다."
    );
  }

  event.target.value = "";
};
const isHeatwaveAdmin = currentUser?.role === "master" || currentUser?.role === "admin";

const canAccessHeatwaveCompanyFiles = (companyName: string) => {
  const myCompanyName = String(currentUser?.companyName || "").trim();
  return isHeatwaveAdmin || myCompanyName === companyName;
};

const canManageHeatwaveUploadFile = (file?: HeatwaveUploadItem) => {
  if (!currentUser || !file) return false;

  const myCompanyName = String(currentUser.companyName || "").trim();
  const fileCompanyName = String(file.companyName || "").trim();

  return isHeatwaveAdmin || myCompanyName === fileCompanyName;
};

const openHeatwaveFilePreview = (fileUrl?: string) => {
  if (!fileUrl) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
};

const downloadHeatwaveFile = (fileUrl?: string, fileName = "download") => {
  if (!fileUrl) return;

  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleDeleteHeatwaveUpload = async (companyName: string, uploadId: string) => {
  setHeatwaveMessage("");

  if (!db || !storage) {
    setHeatwaveMessage("Firebase 연결 오류");
    return;
  }

  const currentUploads = getHeatwaveCompanyUploads(companyName);
  const targetFile = currentUploads.find((item) => item.id === uploadId);

  if (!targetFile) {
    setHeatwaveMessage("삭제할 파일을 찾을 수 없습니다.");
    return;
  }

  if (!canManageHeatwaveUploadFile(targetFile)) {
    setHeatwaveMessage("업로드한 업체 또는 관리자만 삭제할 수 있습니다.");
    return;
  }

  try {
    if (targetFile.storagePath) {
      try {
        await deleteObject(storageRef(storage, targetFile.storagePath));
      } catch (error) {
        console.log("HEATWAVE STORAGE DELETE SKIPPED:", error);
      }
    }

    const nextUploads = {
      ...(heatwaveUploads[selectedDate]?.uploads || {}),
      [companyName]: currentUploads.filter((item) => item.id !== uploadId),
    };

    setHeatwaveUploads((prev) => ({
      ...prev,
      [selectedDate]: {
        date: selectedDate,
        uploads: nextUploads,
      },
    }));

    await setDoc(
      doc(db, "heatwaveUploads", selectedDate),
      {
        date: selectedDate,
        uploads: nextUploads,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await writeActivityLog({
  action: "삭제",
  page: "혹서기",
  target: companyName,
  detail: `${getHeatwaveFileTypeLabel(targetFile.fileType)} 삭제 / ${targetFile.fileName}`,
});

setHeatwaveMessage("파일이 삭제되었습니다.");
  } catch (error) {
    console.log("HEATWAVE DELETE ERROR:", error);
    setHeatwaveMessage("파일 삭제 중 오류가 발생했습니다.");
  }
};

const renderHeatwaveUploadFileList = (companyName: string) => {
  if (!canAccessHeatwaveCompanyFiles(companyName)) return null;

  const uploads = getHeatwaveCompanyUploads(companyName);

  if (uploads.length === 0) {
    return <div className="text-xs text-slate-400">업로드된 파일 없음</div>;
  }

  return (
    <div className="space-y-2">
      {uploads.map((file) => {
        const canManage = canManageHeatwaveUploadFile(file);

        return (
          <div key={file.id} className="rounded-xl border border-slate-200 bg-white p-2 text-xs">
            <div className="font-semibold text-slate-800">
              {file.fileType === "thermoPhoto" || file.fileType === "image"
  ? "온습도계 사진"
  : file.fileType === "thermoLedger"
    ? "온습도계 관리대장"
    : "휴게시간 관리대장"} · {file.fileName}
            </div>

            {(file.fileType === "thermoPhoto" || file.fileType === "image") && (
              <img
                src={file.fileUrl}
                alt={file.fileName}
                className="mt-2 max-h-40 rounded-xl border border-slate-200 object-contain"
              />
            )}

            {canManage && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openHeatwaveFilePreview(file.fileUrl)}>
                  미리보기
                </Button>

                <Button variant="outline" size="sm" onClick={() => downloadHeatwaveFile(file.fileUrl, file.fileName)}>
                  다운로드
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleDeleteHeatwaveUpload(companyName, file.id)}>
                  삭제
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const handleDeleteHeatwaveSharedFile = async (
  fileKind: "thermoHygrometerImage" | "breakTimeExcel"
) => {
  setHeatwaveMessage("");

  if (!isHeatwaveAdmin) {
    setHeatwaveMessage("공통 파일은 마스터, 관리자만 삭제할 수 있습니다.");
    return;
  }

  if (!db || !storage) {
    setHeatwaveMessage("Firebase 연결 오류");
    return;
  }

  const targetFile = heatwaveSharedFiles[selectedDate]?.[fileKind];

  if (!targetFile) {
    setHeatwaveMessage("삭제할 파일이 없습니다.");
    return;
  }

  try {
    if (targetFile.storagePath) {
      try {
        await deleteObject(storageRef(storage, targetFile.storagePath));
      } catch (error) {
        console.log("HEATWAVE SHARED STORAGE DELETE SKIPPED:", error);
      }
    }

    const nextSharedFiles = {
      ...(heatwaveSharedFiles[selectedDate] || { date: selectedDate }),
      [fileKind]: null,
    };

    setHeatwaveSharedFiles((prev) => ({
      ...prev,
      [selectedDate]: nextSharedFiles,
    }));

    await setDoc(
      doc(db, "heatwaveSharedFiles", selectedDate),
      {
        date: selectedDate,
        ...nextSharedFiles,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await writeActivityLog({
  action: "삭제",
  page: "혹서기",
  target: "공통 파일",
  detail: `${getHeatwaveSharedFileKindLabel(fileKind)} 삭제 / ${targetFile.fileName}`,
});

setHeatwaveMessage("공통 파일이 삭제되었습니다.");
  } catch (error) {
    console.log("HEATWAVE SHARED DELETE ERROR:", error);
    setHeatwaveMessage("공통 파일 삭제 중 오류가 발생했습니다.");
  }
};

const renderHeatwaveSharedFileBox = (
  title: string,
  fileKind: "thermoHygrometerImage" | "breakTimeExcel"
) => {
  const file = heatwaveSharedFiles[selectedDate]?.[fileKind];

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      {file ? (
        <div className="mt-2 space-y-2">
          <div className="break-all text-sm text-slate-700">{file.fileName}</div>

          {fileKind === "thermoHygrometerImage" && (
            <img
              src={file.fileUrl}
              alt={title}
              className="max-h-48 rounded-xl border border-slate-200 object-contain"
            />
          )}

          {isHeatwaveAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openHeatwaveFilePreview(file.fileUrl)}>
                미리보기
              </Button>

              <Button variant="outline" size="sm" onClick={() => downloadHeatwaveFile(file.fileUrl, file.fileName)}>
                다운로드
              </Button>

              <Button variant="outline" size="sm" onClick={() => handleDeleteHeatwaveSharedFile(fileKind)}>
                삭제
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-400">업로드 없음</div>
      )}
    </div>
  );
};

const handleHeatwaveSharedFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>,
  fileKind: "thermoHygrometerImage" | "breakTimeExcel"
) => {
  setHeatwaveMessage("");

  const file = event.target.files?.[0];
  if (!file) return;

  if (!canManageHeatwaveCompanies) {
    setHeatwaveMessage("온습도계와 휴게시간 파일은 마스터, 관리자만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

    if (!db || !storage) {
    setHeatwaveMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

    const maxSize =
    fileKind === "thermoHygrometerImage"
      ? MAX_HEATWAVE_IMAGE_FILE_SIZE
      : MAX_HEATWAVE_EXCEL_FILE_SIZE;

  if (file.size > maxSize) {
    setHeatwaveMessage(
      fileKind === "thermoHygrometerImage"
        ? "온습도계 이미지는 5MB 이하만 업로드할 수 있습니다."
        : "휴게시간 엑셀파일은 10MB 이하만 업로드할 수 있습니다."
    );
    event.target.value = "";
    return;
  }

  try {
    const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "-");
    const storagePath = `heatwaveSharedFiles/${selectedDate}/${fileKind}-${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    const newFile: HeatwaveSharedFileItem = {
      fileName: file.name,
      fileUrl,
      storagePath,
      uploadedByUid: currentUser?.uid || "",
uploadedByName: currentUser?.name || "",
createdAt: new Date().toISOString(),
    };

    const nextSharedFiles = {
      ...(heatwaveSharedFiles[selectedDate] || { date: selectedDate }),
      [fileKind]: newFile,
    };

    setHeatwaveSharedFiles((prev) => ({
      ...prev,
      [selectedDate]: nextSharedFiles,
    }));

    await setDoc(
      doc(db, "heatwaveSharedFiles", selectedDate),
      {
        date: selectedDate,
        ...nextSharedFiles,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await writeActivityLog({
  action: "입력",
  page: "혹서기",
  target: "공통 파일",
  detail: `${getHeatwaveSharedFileKindLabel(fileKind)} 업로드 / ${file.name}`,
});

setHeatwaveMessage(
  fileKind === "thermoHygrometerImage"
    ? "온습도계 이미지가 업로드되었습니다."
    : "휴게시간 엑셀파일이 업로드되었습니다."
);
  } catch (error) {
    console.log("HEATWAVE SHARED FILE UPLOAD ERROR:", error);

console.error(error);

setHeatwaveMessage(
  `파일 업로드 오류: ${
    error instanceof Error ? error.message : JSON.stringify(error)
  }`
);
  }

    event.target.value = "";
};

const canManageSupplementNotice = currentUser?.role === "master" || currentUser?.role === "admin";

const getSupplementCopyText = () => {
  return supplementNightMorningRows
    .map((row) => [row.nightText.trim(), row.morningText.trim()].filter(Boolean).join("\n\n"))
    .filter(Boolean)
    .join("\n\n");
};

const saveSupplementNightMorningRows = async (
  rows: typeof supplementNightMorningRows,
  action: string,
  target: string,
  detail: string
) => {
  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  setSupplementNightMorningRows(rows);

  await setDoc(
    doc(db, "supplementWorks", supplementNightMorningDateKey),
    {
      date: supplementNightMorningDateKey,
      nightMorningRows: rows,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action,
    page: "보충작업",
    target,
    detail,
  });
};

const handleSaveSupplementNightMorning = async () => {
  setSupplementMessage("");

  if (!currentUser) {
    setSupplementMessage("로그인 후 입력할 수 있습니다.");
    return;
  }

  if (!supplementNightText.trim() && !supplementMorningText.trim()) {
    setSupplementMessage("금일 야간 또는 명일 조출 내용을 입력하세요.");
    return;
  }

  const companyName = String(currentUser.companyName || "").trim();

  const newRow = {
    id: createLocalId("supplement-night-morning"),
    company: companyName,
    nightText: supplementNightText.trim(),
    morningText: supplementMorningText.trim(),
    createdByUid: currentUser.uid,
    createdByName: currentUser.name,
  };

  await saveSupplementNightMorningRows(
    [...supplementNightMorningRows, newRow],
    "입력",
    companyName,
    `금일야간 ${newRow.nightText.length}자 / 명일조출 ${newRow.morningText.length}자`
  );

  setSupplementNightText("");
  setSupplementMorningText("");
  setSupplementMessage("저장되었습니다.");
};

const handleUpdateSupplementNightMorningRow = async () => {
  setSupplementMessage("");

  if (!canAdminEditDabsItem) {
    setSupplementMessage("수정은 마스터, 관리자만 가능합니다.");
    return;
  }

  if (!editSupplementNightMorningPopup.id) return;

  const targetRow = supplementNightMorningRows.find(
    (row) => row.id === editSupplementNightMorningPopup.id
  );

  const nextRows = supplementNightMorningRows.map((row) =>
    row.id === editSupplementNightMorningPopup.id
      ? {
          ...row,
          company: editSupplementNightMorningPopup.company.trim(),
          nightText: editSupplementNightMorningPopup.nightText.trim(),
          morningText: editSupplementNightMorningPopup.morningText.trim(),
        }
      : row
  );

  await saveSupplementNightMorningRows(
    nextRows,
    "수정",
    editSupplementNightMorningPopup.company.trim(),
    `${targetRow?.company || ""} → ${editSupplementNightMorningPopup.company.trim()}`
  );

  setEditSupplementNightMorningPopup({
    open: false,
    id: "",
    company: "",
    nightText: "",
    morningText: "",
  });

  setSupplementMessage("수정되었습니다.");
};

const handleDeleteSupplementNightMorningRow = async (rowId: string) => {
  setSupplementMessage("");

  const targetRow = supplementNightMorningRows.find((row) => row.id === rowId);

  if (!canDeleteOwnItem(targetRow)) {
    setSupplementMessage("본인이 입력한 항목 또는 관리자만 삭제할 수 있습니다.");
    return;
  }

  await saveSupplementNightMorningRows(
    supplementNightMorningRows.filter((row) => row.id !== rowId),
    "삭제",
    targetRow?.company || "",
    `${targetRow?.nightText || ""} / ${targetRow?.morningText || ""}`
  );

  setSupplementMessage("삭제되었습니다.");
};

const handleCopySupplementNightMorning = async () => {
  const copyText = getSupplementCopyText();

  if (!copyText) {
    setSupplementMessage("복사할 내용이 없습니다.");
    return;
  }

  await navigator.clipboard.writeText(copyText);
  setSupplementMessage("복사되었습니다.");
};

const handleDownloadSupplementTomorrowExcel = () => {
  const headers = ["작업구분", "업체명", "작업위치", "작업인원", "관리감독자", "작업내용", "안전대책, 조치사항"];

  const rows = supplementTomorrowRows.map((row) => [
    row.workType,
    row.company,
    row.location,
    row.workerCount,
    row.supervisorCount,
    row.content,
    row.safetyAction,
  ]);

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell) => `<td>${String(cell || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`)
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `명일보충작업-${selectedDate}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleSaveSupplementNotice = async () => {
  setSupplementMessage("");

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지는 마스터, 관리자만 저장할 수 있습니다.");
    return;
  }

  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  await setDoc(
    doc(db, "supplementWorks", supplementNightMorningDateKey),
    {
      date: supplementNightMorningDateKey,
      noticeText: supplementNoticeText,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action: "수정",
    page: "보충작업",
    target: "공지",
    detail: supplementNoticeText,
  });

  setSupplementMessage("공지가 저장되었습니다.");
};

const handleSupplementNoticeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  setSupplementMessage("");

  const file = event.target.files?.[0];
  if (!file) return;

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지 이미지는 마스터, 관리자만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  if (!db || !storage || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

  try {
    const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "-");
    const storagePath = `supplementWorks/${supplementNightMorningDateKey}/notice-${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    setSupplementNoticeImage(fileUrl);

    await setDoc(
      doc(db, "supplementWorks", supplementNightMorningDateKey),
      {
        date: supplementNightMorningDateKey,
        noticeImage: fileUrl,
        noticeImageStoragePath: storagePath,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid || "",
        updatedByName: currentUser.name || "",
      },
      { merge: true }
    );

    await writeActivityLog({
      action: "수정",
      page: "보충작업",
      target: "공지 이미지",
      detail: file.name,
    });

    setSupplementMessage("공지 이미지가 업로드되었습니다.");
  } catch (error) {
    console.log("SUPPLEMENT NOTICE IMAGE UPLOAD ERROR:", error);
    setSupplementMessage("공지 이미지 업로드 중 오류가 발생했습니다.");
  }

  event.target.value = "";
};

const handleSaveSupplementTomorrowNotice = async () => {
  setSupplementMessage("");

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지는 마스터, 관리자만 저장할 수 있습니다.");
    return;
  }

  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  await setDoc(
    doc(db, "supplementWorks", selectedDate),
    {
      date: selectedDate,
      tomorrowNoticeText: supplementTomorrowNoticeText,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action: "수정",
    page: "보충작업",
    target: "명일 보충작업 공지",
    detail: supplementTomorrowNoticeText,
  });

  setSupplementMessage("공지가 저장되었습니다.");
};

const handleSupplementTomorrowNoticeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  setSupplementMessage("");

  const file = event.target.files?.[0];
  if (!file) return;

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지 이미지는 마스터, 관리자만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  if (!db || !storage || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

  try {
    const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "-");
    const storagePath = `supplementWorks/${selectedDate}/tomorrow-notice-${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    setSupplementTomorrowNoticeImage(fileUrl);

    await setDoc(
      doc(db, "supplementWorks", selectedDate),
      {
        date: selectedDate,
        tomorrowNoticeImage: fileUrl,
        tomorrowNoticeImageStoragePath: storagePath,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid || "",
        updatedByName: currentUser.name || "",
      },
      { merge: true }
    );

    await writeActivityLog({
      action: "수정",
      page: "보충작업",
      target: "명일 보충작업 공지 이미지",
      detail: file.name,
    });

    setSupplementMessage("공지 이미지가 업로드되었습니다.");
  } catch (error) {
    console.log("SUPPLEMENT TOMORROW NOTICE IMAGE UPLOAD ERROR:", error);
    setSupplementMessage("공지 이미지 업로드 중 오류가 발생했습니다.");
  }

  event.target.value = "";
};

const saveSupplementTomorrowRows = async (
  rows: typeof supplementTomorrowRows,
  action: string,
  target: string,
  detail: string
) => {
  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  setSupplementTomorrowRows(rows);

  await setDoc(
    doc(db, "supplementWorks", selectedDate),
    {
      date: selectedDate,
      tomorrowRows: rows,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action,
    page: "보충작업",
    target,
    detail,
  });
};

const handleAddSupplementTomorrowRow = async () => {
  setSupplementMessage("");

  if (!currentUser) {
    setSupplementMessage("로그인 후 입력할 수 있습니다.");
    return;
  }

  if (
    !supplementTomorrowInput.location.trim() ||
    !supplementTomorrowInput.workerCount.trim() ||
    !supplementTomorrowInput.supervisorCount.trim() ||
    !supplementTomorrowInput.content.trim() ||
    !supplementTomorrowInput.safetyAction.trim()
  ) {
    setSupplementMessage("모든 입력값을 입력하세요.");
    return;
  }

  const companyName = String(currentUser.companyName || "").trim();

  const newRow = {
    id: createLocalId("supplement-tomorrow"),
    workType: supplementTomorrowInput.workType,
    company: companyName,
    location: supplementTomorrowInput.location.trim(),
    workerCount: supplementTomorrowInput.workerCount.trim(),
    supervisorCount: supplementTomorrowInput.supervisorCount.trim(),
    content: supplementTomorrowInput.content.trim(),
    safetyAction: supplementTomorrowInput.safetyAction.trim(),
    createdByUid: currentUser.uid,
    createdByName: currentUser.name,
  };

  const nextRows = [...supplementTomorrowRows, newRow];

  await saveSupplementTomorrowRows(
    nextRows,
    "입력",
    companyName,
    `${newRow.workType} / ${newRow.location} / 작업인원 ${newRow.workerCount} / 관리감독자 ${newRow.supervisorCount} / ${newRow.content}`
  );

  setSupplementTomorrowInput({
    workType: "조출",
    location: "",
    workerCount: "",
    supervisorCount: "",
    content: "",
    safetyAction: "",
  });

  setSupplementMessage("저장되었습니다.");
};

const handleUpdateSupplementTomorrowRow = async () => {
  setSupplementMessage("");

  if (!canAdminEditDabsItem) {
    setSupplementMessage("수정은 마스터, 관리자만 가능합니다.");
    return;
  }

  if (
    !editSupplementTomorrowPopup.id ||
    !editSupplementTomorrowPopup.company.trim() ||
    !editSupplementTomorrowPopup.location.trim() ||
    !editSupplementTomorrowPopup.workerCount.trim() ||
    !editSupplementTomorrowPopup.supervisorCount.trim() ||
    !editSupplementTomorrowPopup.content.trim() ||
    !editSupplementTomorrowPopup.safetyAction.trim()
  ) {
    setSupplementMessage("모든 입력값을 입력하세요.");
    return;
  }

  const targetRow = supplementTomorrowRows.find(
    (row) => row.id === editSupplementTomorrowPopup.id
  );

  const nextRows = supplementTomorrowRows.map((row) =>
    row.id === editSupplementTomorrowPopup.id
      ? {
          ...row,
          workType: editSupplementTomorrowPopup.workType,
          company: editSupplementTomorrowPopup.company.trim(),
          location: editSupplementTomorrowPopup.location.trim(),
          workerCount: editSupplementTomorrowPopup.workerCount.trim(),
          supervisorCount: editSupplementTomorrowPopup.supervisorCount.trim(),
          content: editSupplementTomorrowPopup.content.trim(),
          safetyAction: editSupplementTomorrowPopup.safetyAction.trim(),
        }
      : row
  );

  await saveSupplementTomorrowRows(
    nextRows,
    "수정",
    editSupplementTomorrowPopup.company.trim(),
    `${targetRow?.workType || ""} / ${targetRow?.location || ""} → ${editSupplementTomorrowPopup.workType} / ${editSupplementTomorrowPopup.location.trim()}`
  );

  setEditSupplementTomorrowPopup({
    open: false,
    id: "",
    workType: "조출",
    company: "",
    location: "",
    workerCount: "",
    supervisorCount: "",
    content: "",
    safetyAction: "",
  });

  setSupplementMessage("수정되었습니다.");
};

const handleDeleteSupplementTomorrowRow = async (rowId: string) => {
  setSupplementMessage("");

  const targetRow = supplementTomorrowRows.find((row) => row.id === rowId);

  if (!canDeleteOwnItem(targetRow)) {
    setSupplementMessage("본인이 입력한 항목 또는 관리자만 삭제할 수 있습니다.");
    return;
  }

  const nextRows = supplementTomorrowRows.filter((row) => row.id !== rowId);

  await saveSupplementTomorrowRows(
    nextRows,
    "삭제",
    targetRow?.company || "",
    `${targetRow?.workType || ""} / ${targetRow?.location || ""} / ${targetRow?.content || ""}`
  );

  setSupplementMessage("삭제되었습니다.");
};

const handleSupplementWeekendDateChange = (dateKey: string) => {
  if (!canAdminEditDabsItem) return;

  setManualSupplementWeekendDate(dateKey);
  setManualSupplementWeekendDateSavedToday(getTodayKey());
};

const handleResetSupplementWeekendDate = () => {
  setManualSupplementWeekendDate("");
  setManualSupplementWeekendDateSavedToday("");
};

const handleSaveSupplementWeekendNotice = async () => {
  setSupplementMessage("");

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지는 마스터, 관리자만 저장할 수 있습니다.");
    return;
  }

  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  await setDoc(
    doc(db, "supplementWorks", supplementWeekendDateKey),
    {
      date: supplementWeekendDateKey,
      weekendNoticeText: supplementWeekendNoticeText,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action: "수정",
    page: "보충작업",
    target: "주말 보충작업 공지",
    detail: supplementWeekendNoticeText,
  });

  setSupplementMessage("공지가 저장되었습니다.");
};

const handleSupplementWeekendNoticeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  setSupplementMessage("");

  const file = event.target.files?.[0];
  if (!file) return;

  if (!canManageSupplementNotice) {
    setSupplementMessage("공지 이미지는 마스터, 관리자만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }

  if (!db || !storage || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

  try {
    const safeFileName = file.name.replace(/[\\/:*?"<>|]/g, "-");
    const storagePath = `supplementWorks/${supplementWeekendDateKey}/weekend-notice-${Date.now()}-${safeFileName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    setSupplementWeekendNoticeImage(fileUrl);

    await setDoc(
      doc(db, "supplementWorks", supplementWeekendDateKey),
      {
        date: supplementWeekendDateKey,
        weekendNoticeImage: fileUrl,
        weekendNoticeImageStoragePath: storagePath,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser.uid || "",
        updatedByName: currentUser.name || "",
      },
      { merge: true }
    );

    await writeActivityLog({
      action: "수정",
      page: "보충작업",
      target: "주말 보충작업 공지 이미지",
      detail: file.name,
    });

    setSupplementMessage("공지 이미지가 업로드되었습니다.");
  } catch (error) {
    console.log("SUPPLEMENT WEEKEND NOTICE IMAGE UPLOAD ERROR:", error);
    setSupplementMessage("공지 이미지 업로드 중 오류가 발생했습니다.");
  }

  event.target.value = "";
};

const saveSupplementWeekendRows = async (
  rows: typeof supplementWeekendRows,
  action: string,
  target: string,
  detail: string
) => {
  if (!db || !currentUser) {
    setSupplementMessage("Firebase 연결 오류");
    return;
  }

  setSupplementWeekendRows(rows);

  await setDoc(
    doc(db, "supplementWorks", supplementWeekendDateKey),
    {
      date: supplementWeekendDateKey,
      weekendRows: rows,
      updatedAt: serverTimestamp(),
      updatedByUid: currentUser.uid || "",
      updatedByName: currentUser.name || "",
    },
    { merge: true }
  );

  await writeActivityLog({
    action,
    page: "보충작업",
    target,
    detail,
  });
};

const handleAddSupplementWeekendRow = async () => {
  setSupplementMessage("");

  if (!currentUser) {
    setSupplementMessage("로그인 후 입력할 수 있습니다.");
    return;
  }

  if (
    !supplementWeekendInput.location.trim() ||
    !supplementWeekendInput.workerCount.trim() ||
    !supplementWeekendInput.supervisorCount.trim() ||
    !supplementWeekendInput.content.trim() ||
    !supplementWeekendInput.safetyAction.trim()
  ) {
    setSupplementMessage("모든 입력값을 입력하세요.");
    return;
  }

  const companyName = String(currentUser.companyName || "").trim();

  const newRow = {
    id: createLocalId("supplement-weekend"),
    workType: "주말",
    company: companyName,
    location: supplementWeekendInput.location.trim(),
    workerCount: supplementWeekendInput.workerCount.trim(),
    supervisorCount: supplementWeekendInput.supervisorCount.trim(),
    content: supplementWeekendInput.content.trim(),
    safetyAction: supplementWeekendInput.safetyAction.trim(),
    createdByUid: currentUser.uid,
    createdByName: currentUser.name,
  };

  const nextRows = [...supplementWeekendRows, newRow];

  await saveSupplementWeekendRows(
    nextRows,
    "입력",
    companyName,
    `주말 / ${newRow.location} / 작업인원 ${newRow.workerCount} / 관리감독자 ${newRow.supervisorCount} / ${newRow.content}`
  );

  setSupplementWeekendInput({
    location: "",
    workerCount: "",
    supervisorCount: "",
    content: "",
    safetyAction: "",
  });

  setSupplementMessage("저장되었습니다.");
};

const handleUpdateSupplementWeekendRow = async () => {
  setSupplementMessage("");

  if (!canAdminEditDabsItem) {
    setSupplementMessage("수정은 마스터, 관리자만 가능합니다.");
    return;
  }

  if (
    !editSupplementWeekendPopup.id ||
    !editSupplementWeekendPopup.company.trim() ||
    !editSupplementWeekendPopup.location.trim() ||
    !editSupplementWeekendPopup.workerCount.trim() ||
    !editSupplementWeekendPopup.supervisorCount.trim() ||
    !editSupplementWeekendPopup.content.trim() ||
    !editSupplementWeekendPopup.safetyAction.trim()
  ) {
    setSupplementMessage("모든 입력값을 입력하세요.");
    return;
  }

  const targetRow = supplementWeekendRows.find(
    (row) => row.id === editSupplementWeekendPopup.id
  );

  const nextRows = supplementWeekendRows.map((row) =>
    row.id === editSupplementWeekendPopup.id
      ? {
          ...row,
          workType: "주말",
          company: editSupplementWeekendPopup.company.trim(),
          location: editSupplementWeekendPopup.location.trim(),
          workerCount: editSupplementWeekendPopup.workerCount.trim(),
          supervisorCount: editSupplementWeekendPopup.supervisorCount.trim(),
          content: editSupplementWeekendPopup.content.trim(),
          safetyAction: editSupplementWeekendPopup.safetyAction.trim(),
        }
      : row
  );

  await saveSupplementWeekendRows(
    nextRows,
    "수정",
    editSupplementWeekendPopup.company.trim(),
    `${targetRow?.location || ""} → ${editSupplementWeekendPopup.location.trim()}`
  );

  setEditSupplementWeekendPopup({
    open: false,
    id: "",
    company: "",
    location: "",
    workerCount: "",
    supervisorCount: "",
    content: "",
    safetyAction: "",
  });

  setSupplementMessage("수정되었습니다.");
};

const handleDeleteSupplementWeekendRow = async (rowId: string) => {
  setSupplementMessage("");

  const targetRow = supplementWeekendRows.find((row) => row.id === rowId);

  if (!canDeleteOwnItem(targetRow)) {
    setSupplementMessage("본인이 입력한 항목 또는 관리자만 삭제할 수 있습니다.");
    return;
  }

  const nextRows = supplementWeekendRows.filter((row) => row.id !== rowId);

  await saveSupplementWeekendRows(
    nextRows,
    "삭제",
    targetRow?.company || "",
    `${targetRow?.workType || ""} / ${targetRow?.location || ""} / ${targetRow?.content || ""}`
  );

  setSupplementMessage("삭제되었습니다.");
};

const handleDownloadSupplementWeekendExcel = () => {
  const headers = ["작업구분", "업체명", "작업위치", "작업인원", "관리감독자", "작업내용", "안전대책, 조치사항"];

  const rows = supplementWeekendRows.map((row) => [
    row.workType,
    row.company,
    row.location,
    row.workerCount,
    row.supervisorCount,
    row.content,
    row.safetyAction,
  ]);

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell) => `<td>${String(cell || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`)
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `주말보충작업-${supplementWeekendDateKey}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  const menuItems = [
  { key: "dabs", title: "DAB's회의", description: "회의 관련 페이지로 이동", icon: MessageSquare },
  { key: "education", title: "교육일정", description: "현재 교육일정 페이지로 이동", icon: CalendarDays },
  { key: "soloWorker", title: "단독작업자", description: "단독작업자 관리 페이지로 이동", icon: Users },
  { key: "heatwave", title: "혹서기", description: "혹서기 온습도계·휴게시간 관리대장 업로드 현황 관리", icon: CalendarDays },
{ key: "supplementWork", title: "보충작업", description: "금일야간/명일조출, 명일·주말 보충작업 관리", icon: CalendarDays },
  ...(canManageApprovals
    ? [{ key: "approval", title: "회원 승인 관리", description: "가입 신청 승인/반려 관리", icon: UserPlus }]
    : []),
  ...(canViewActivityLogs
    ? [{ key: "activityLog", title: "활동 로그", description: "입력·수정·삭제 기록 확인", icon: LayoutGrid }]
    : []),
];

  const selectedDateObject = useMemo(() => {
  const [year, month, day] = selectedDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}, [selectedDate]);

const selectedDatePlusZero = selectedDateObject;

const selectedDatePlusOne = useMemo(() => {
  const d = new Date(selectedDateObject);
  d.setDate(d.getDate() + 1);
  return d;
}, [selectedDateObject]);
 
  const dabsTabs = useMemo(() => [
  { key: "highRisk", label: "고위험작업" },
  { key: "equipmentFlow", label: "장비동선" },
  { key: "archWork", label: "건축토목 작업" },
  { key: "mepWork", label: "기전부 작업" },
  { key: "fireWork", label: "화기작업" },
  { key: "materialsAfter0", label: `${formatShortDate(selectedDatePlusZero)} 자재반입` },
  { key: "materialsAfter1", label: `${formatShortDate(selectedDatePlusOne)} 자재반입` },
], [selectedDatePlusZero, selectedDatePlusOne]);

  const activeDabsTab = dabsTabs[dabsTabIndex] || dabsTabs[0];
const activeDabsKey = activeDabsTab.key;

const soloRows = useMemo<Record<string, DabsRowItem[]>>(
  () => dabsData[selectedDate]?.soloWorker?.rows || {},
  [dabsData, selectedDate]
);

const getMergedSectionRows = (tabKey: string) => {
  const mergedRows: Record<string, DabsRowItem[]> = {};

  getMergedSectionKeys(tabKey).forEach((sourceKey) => {
    const tabValue = dabsData[selectedDate]?.[sourceKey];
    const rows =
      typeof tabValue === "object" && tabValue && "rows" in tabValue
        ? tabValue.rows || {}
        : {};

    Object.entries(rows).forEach(([building, list]) => {
      mergedRows[building] = [
        ...(mergedRows[building] || []),
        ...(list || []),
      ];
    });
  });

  return mergedRows;
};

const portfolioSlides = useMemo(() => {
  const slides: Array<{
    type: "overlay" | "section" | "material" | "soloWorker";
    key: string;
    tabKey?: string;
    label: string;
    columns?: string[];
soloItems?: Array<DabsRowItem & { building: string }>;
  }> = [];

  const maxRowsPerSlide = 17

  dabsTabs.forEach((tab) => {
    if (tab.key === "highRisk" || tab.key === "equipmentFlow") {
      slides.push({
        type: "overlay",
        key: tab.key,
        tabKey: tab.key,
        label: tab.label,
      });
      return;
    }

    if (
      tab.key === "archWork" ||
tab.key === "mepWork" ||
tab.key === "fireWork"
    ) {
      const rows = getMergedSectionRows(tab.key);

      const columnChunks = splitColumnsByMaxRows(
        getDabsColumnsByTabKey(tab.key),
        rows,
        maxRowsPerSlide
      );

      columnChunks.forEach((columns, index) => {
        slides.push({
          type: "section",
          key: `${tab.key}-${index}`,
          tabKey: tab.key,
          label:
            columnChunks.length > 1
              ? `${tab.label} (${index + 1}/${columnChunks.length})`
              : tab.label,
          columns,
        });
      });

      return;
    }

    if (tab.key === "materialsAfter0" || tab.key === "materialsAfter1") {
      slides.push({
        type: "material",
        key: tab.key,
        tabKey: tab.key,
        label: tab.label,
      });
    }
  });

  const sortedSoloItems = getSoloWorkerRowsByCompany(soloRows);
const soloChunks = splitSoloWorkersByMaxRows(sortedSoloItems, maxRowsPerSlide);

soloChunks.forEach((soloItems, index) => {
  slides.push({
    type: "soloWorker",
    key: `soloWorker-${index}`,
    label:
      soloChunks.length > 1
        ? `단독작업자 (${index + 1}/${soloChunks.length})`
        : "단독작업자",
    soloItems,
  });
});

  return slides;
}, [dabsTabs, dabsData, selectedDate, soloRows]);

const soloCompanyColorList = useMemo(
  () => getUniqueCompaniesFromRows(soloRows),
  [soloRows]
);

const heatSensitiveCompanyColorList = useMemo(
  () => getUniqueCompaniesFromRows(heatSensitiveRows),
  [heatSensitiveRows]
);

useEffect(() => {
  if (portfolioSlideIndex >= portfolioSlides.length) {
    setPortfolioSlideIndex(0);
  }
}, [portfolioSlideIndex, portfolioSlides.length]);

useEffect(() => {
  if (currentPage !== "portfolio") return;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      setPortfolioSlideIndex((prev) =>
        prev >= portfolioSlides.length - 1 ? 0 : prev + 1
      );
    }

    if (event.key === "ArrowLeft") {
      setPortfolioSlideIndex((prev) =>
        prev <= 0 ? portfolioSlides.length - 1 : prev - 1
      );
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [currentPage, portfolioSlides.length]);

useEffect(() => {
  if (currentPage !== "portfolio") return;

  const slide = portfolioSlides[portfolioSlideIndex];
  if (!slide?.tabKey) return;

  const nextDabsTabIndex = dabsTabs.findIndex((tab) => tab.key === slide.tabKey);

  if (nextDabsTabIndex >= 0 && nextDabsTabIndex !== dabsTabIndex) {
    setDabsTabIndex(nextDabsTabIndex);
  }
}, [currentPage, portfolioSlideIndex, portfolioSlides, dabsTabs, dabsTabIndex]);

 useEffect(() => {
  const nextValue = dabsData[selectedDate]?.[activeDabsKey];
  setDabsDraft(typeof nextValue === "string" ? nextValue : "");
  setDabsMessage("");
  setArrowStart(null);
  setArrowPreview(null);
  setPendingEquipmentMarker(null);
}, [selectedDate, activeDabsKey, dabsData]);

  const getRelativePoint = (clientX: number, clientY: number) => {
  if (!imageAreaRef.current) return null;
  const rect = imageAreaRef.current.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
};

useLayoutEffect(() => {
  const isImageTab = activeDabsKey === "highRisk" || activeDabsKey === "equipmentFlow";
  const imageArea = imageAreaRef.current;

  if (!isImageTab || !imageArea) {
    setAdjustedOverlayPositions({});
    return;
  }

  const overlayBundle = getOverlayBundle();
  const markers = overlayBundle.markers || [];
  const areaRect = imageArea.getBoundingClientRect();

  if (!areaRect.width || !areaRect.height || markers.length === 0) {
    setAdjustedOverlayPositions({});
    return;
  }

  const padding = 6;
const gap = 0;
  const placedRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
  const nextPositions: Record<string, { x: number; y: number }> = {};

  const isOverlapping = (rect: { left: number; top: number; right: number; bottom: number }) =>
    placedRects.some(
      (placed) =>
        rect.left < placed.right + gap &&
        rect.right > placed.left - gap &&
        rect.top < placed.bottom + gap &&
        rect.bottom > placed.top - gap
    );

  const clampRect = (centerX: number, centerY: number, width: number, height: number) => {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const safeX = Math.min(
      Math.max(centerX, halfWidth + padding),
      areaRect.width - halfWidth - padding
    );

    const safeY = Math.min(
      Math.max(centerY, halfHeight + padding),
      areaRect.height - halfHeight - padding
    );

    return { x: safeX, y: safeY };
  };

  markers.forEach((marker) => {
    const markerKey = `${activeDabsKey}-${marker.id}`;
    const markerElement = overlayMarkerRefs.current[markerKey];

    if (!markerElement) return;

    const markerRect = markerElement.getBoundingClientRect();
    const width = markerRect.width;
    const height = markerRect.height;

    const originalX = (marker.x / 100) * areaRect.width;
    const originalY = (marker.y / 100) * areaRect.height;

    const candidates: Array<{ x: number; y: number }> = [];

    const base = clampRect(originalX, originalY, width, height);
    candidates.push(base);

    const stepX = width + gap;
    const stepY = height + gap;

    for (let ring = 1; ring <= 8; ring += 1) {
      candidates.push(
        { x: originalX + stepX * ring, y: originalY },
        { x: originalX - stepX * ring, y: originalY },
        { x: originalX, y: originalY + stepY * ring },
        { x: originalX, y: originalY - stepY * ring },
        { x: originalX + stepX * ring, y: originalY + stepY * ring },
        { x: originalX - stepX * ring, y: originalY + stepY * ring },
        { x: originalX + stepX * ring, y: originalY - stepY * ring },
        { x: originalX - stepX * ring, y: originalY - stepY * ring }
      );
    }

    const safePoint =
      candidates
        .map((candidate) => clampRect(candidate.x, candidate.y, width, height))
        .find((candidate) => {
          const rect = {
            left: candidate.x - width / 2,
            top: candidate.y - height / 2,
            right: candidate.x + width / 2,
            bottom: candidate.y + height / 2,
          };

          return !isOverlapping(rect);
        }) || base;

    const finalRect = {
      left: safePoint.x - width / 2,
      top: safePoint.y - height / 2,
      right: safePoint.x + width / 2,
      bottom: safePoint.y + height / 2,
    };

    placedRects.push(finalRect);

    nextPositions[markerKey] = {
      x: (safePoint.x / areaRect.width) * 100,
      y: (safePoint.y / areaRect.height) * 100,
    };
  });

  setAdjustedOverlayPositions((prev) => {
    if (JSON.stringify(prev) === JSON.stringify(nextPositions)) return prev;
    return nextPositions;
  });
}, [activeDabsKey, selectedDate, dabsOverlays, dabsImages, isCapturingImage]);

  const vibrateBriefly = () => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(25);
};

const handleDownloadCaptureImage = async (
  targetRef: React.RefObject<HTMLDivElement | null>,
  fileName: string
) => {
  const target = targetRef.current;

  if (!target) {
    alert("다운로드할 화면을 찾을 수 없습니다.");
    return;
  }

  try {

    setIsCapturingImage(true);
await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, "-");

    const image = await toJpeg(target, {
      cacheBust: true,
      quality: 0.8,
      pixelRatio: 1,
      backgroundColor: "#ffffff",
      style: {
        backgroundColor: "#ffffff",
      },
    });

    const link = document.createElement("a");
    link.href = image;
    link.download = `${safeFileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.log("IMAGE DOWNLOAD ERROR:", error);
    alert("이미지 저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
  } finally {
    setIsCapturingImage(false);
  }
};

const waitForNextPaint = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};

const handleDownloadPortfolioImages = async () => {
  if (portfolioSlides.length === 0) {
    alert("저장할 발표 페이지가 없습니다.");
    return;
  }

  setIsExportingPortfolioImages(true);
  setIsCapturingImage(true);
  setCurrentPage("portfolio");

  await waitForNextPaint();

  try {
    for (let index = 0; index < portfolioSlides.length; index += 1) {
      setPortfolioSlideIndex(index);
      await waitForNextPaint();

      const target = portfolioCaptureRef.current;

      if (!target) continue;

      const slide = portfolioSlides[index];
      const safeLabel = String(slide.label || `page-${index + 1}`).replace(/[\\/:*?"<>|]/g, "-");

      const image = await toJpeg(target, {
        cacheBust: true,
        quality: 0.9,
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        style: {
          backgroundColor: "#ffffff",
        },
      });

      const link = document.createElement("a");
      link.href = image;
      link.download = `${String(index + 1).padStart(2, "0")}-${safeLabel}-${selectedDate}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.log("PORTFOLIO IMAGE DOWNLOAD ERROR:", error);
    alert("발표 이미지 저장 중 오류가 발생했습니다. 콘솔을 확인하세요.");
  } finally {
    setIsExportingPortfolioImages(false);
setIsCapturingImage(false);
setCurrentPage("menu");
setPortfolioSlideIndex(0);
  }
};

  const addEntry = async () => {
  setEntryMessage("");

  if (!currentUser || currentUser.status !== "approved") {
    setEntryMessage("승인된 계정만 일정을 등록할 수 있습니다.");
    return;
  }

  if (!selectedDate || !effectiveSelectedTime) {
    setEntryMessage("등록 가능한 시간이 없습니다.");
    return;
  }

  const isDuplicateTime = dayEntries.some((entry) =>
    isTimeOverlapping(effectiveSelectedTime, effectiveEndTime, entry.startTime, entry.endTime)
  );

  if (isDuplicateTime) {
    setEntryMessage("이미 등록된 시간과 겹칩니다.");
    return;
  }

  const newEntryData = {
    date: selectedDate,
    startTime: effectiveSelectedTime,
    endTime: effectiveEndTime,
    companyName: currentUser.companyName,
    createdByUid: currentUser.uid,
    createdByName: currentUser.name,
    createdByRole: currentUser.role,
    createdAt: new Date().toISOString(),
  };

  if (isDemoMode) {
    const nextEntries = [
      ...loadDemoEntries(),
      {
        id: createLocalId("demo-entry"),
        ...newEntryData,
      },
    ];

    saveDemoEntries(nextEntries);
    setEntries(nextEntries);
    setEntryMessage("일정이 등록되었습니다.");
    return;
  }

  if (!db) {
    setEntryMessage("Firebase 연결이 없습니다.");
    return;
  }

  try {
    await addDoc(collection(db, "entries"), {
      ...newEntryData,
      createdAt: serverTimestamp(),
    });

    await writeActivityLog({
      action: "입력",
      page: "교육일정",
      target: currentUser.companyName || "",
      detail: `${selectedDate} ${effectiveSelectedTime}~${effectiveEndTime}`,
    });

    setEntryMessage("일정이 등록되었습니다.");
  } catch (error) {
    console.log("ENTRY ADD ERROR:", error);
    setEntryMessage("일정 등록 중 오류가 발생했습니다.");
  }
};

  const deleteEntry = async (entryId: string) => {
  setEntryMessage("");

  if (!currentUser) {
    setEntryMessage("로그인 후 삭제할 수 있습니다.");
    return;
  }

  const targetEntry = entries.find((entry) => entry.id === entryId);

  if (!canDeleteOwnItem(targetEntry)) {
    setDeleteNoticeOpen(true);
    setEntryMessage("본인이 입력한 일정만 삭제할 수 있습니다.");
    return;
  }

  if (isDemoMode) {
    const nextEntries = loadDemoEntries().filter((entry) => entry.id !== entryId);
    saveDemoEntries(nextEntries);
    setEntries(nextEntries);
    setEntryMessage("일정이 삭제되었습니다.");
    return;
  }

  if (!db) {
    setEntryMessage("Firebase 연결이 없습니다.");
    return;
  }

  try {
    await deleteDoc(doc(db, "entries", entryId));

    await writeActivityLog({
      action: "삭제",
      page: "교육일정",
      target: targetEntry?.companyName || "",
      detail: `${targetEntry?.date || ""} ${targetEntry?.startTime || ""}~${targetEntry?.endTime || ""}`,
    });

    setEntryMessage("일정이 삭제되었습니다.");
  } catch (error: any) {
    console.log("ENTRY DELETE ERROR:", error);
    setEntryMessage(error?.message || "일정 삭제 중 오류가 발생했습니다.");
  }
};

const handleUpdateEntry = async () => {
  if (!currentUser) {
    setEntryMessage("로그인 후 수정할 수 있습니다.");
    return;
  }

  if (!editEntryPopup.companyName.trim()) {
    setEntryMessage("업체명을 입력하세요.");
    return;
  }

  const targetEntry = entries.find((entry) => entry.id === editEntryPopup.entryId);

  if (!targetEntry) {
    setEntryMessage("수정할 일정을 찾을 수 없습니다.");
    return;
  }

  if (!canDeleteOwnItem(targetEntry)) {
    setDeleteNoticeOpen(true);
    setEntryMessage("본인이 입력한 일정만 수정할 수 있습니다.");
    return;
  }

  const nextEndTime = getEndTime(editEntryPopup.startTime);

  const isDuplicateTime = entries.some((entry) => {
    if (entry.id === editEntryPopup.entryId) return false;
    if (entry.date !== editEntryPopup.date) return false;

    return isTimeOverlapping(
      editEntryPopup.startTime,
      nextEndTime,
      entry.startTime,
      entry.endTime
    );
  });

  if (isDuplicateTime) {
    setEntryMessage("이미 등록된 시간과 겹칩니다.");
    return;
  }

  if (isDemoMode) {
    const nextEntries = loadDemoEntries().map((entry) =>
      entry.id === editEntryPopup.entryId
        ? {
            ...entry,
            date: editEntryPopup.date,
            startTime: editEntryPopup.startTime,
            endTime: nextEndTime,
            companyName: editEntryPopup.companyName.trim(),
          }
        : entry
    );

    saveDemoEntries(nextEntries);
    setEntries(nextEntries);
    setSelectedDate(editEntryPopup.date);
    setEditEntryPopup({
      open: false,
      entryId: "",
      date: "",
      startTime: "09:00",
      companyName: "",
    });
    setEntryMessage("일정이 수정되었습니다.");
    return;
  }

  if (!db) {
    setEntryMessage("Firebase 연결이 없습니다.");
    return;
  }

  try {
    await updateDoc(doc(db, "entries", editEntryPopup.entryId), {
      date: editEntryPopup.date,
      startTime: editEntryPopup.startTime,
      endTime: nextEndTime,
      companyName: editEntryPopup.companyName.trim(),
    });

    await writeActivityLog({
      action: "수정",
      page: "교육일정",
      target: editEntryPopup.companyName.trim(),
      detail: `${targetEntry.date} ${targetEntry.startTime}~${targetEntry.endTime} → ${editEntryPopup.date} ${editEntryPopup.startTime}~${nextEndTime}`,
    });

    setSelectedDate(editEntryPopup.date);
    setEditEntryPopup({
      open: false,
      entryId: "",
      date: "",
      startTime: "09:00",
      companyName: "",
    });

    setEntryMessage("일정이 수정되었습니다.");
  } catch (error: any) {
    console.log("ENTRY UPDATE ERROR:", error);
    setEntryMessage(error?.message || "일정 수정 중 오류가 발생했습니다.");
  }
};

  const handleLogin = async () => {
  if (loginLoading) return;

  setLoginLoading(true);
  setLoginMessage("");

  try {
    if (isDemoMode) {
      const demoUsers = loadDemoUsers();
      const foundUser = demoUsers.find(
        (user) =>
          String(user.email).toLowerCase() === loginId.trim().toLowerCase() &&
          user.password === loginPassword.trim()
      );

      if (!foundUser) {
        setLoginMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }

      if (foundUser.status !== "approved") {
        setLoginMessage("승인 완료된 계정만 로그인할 수 있습니다.");
        return;
      }

      setCurrentUser(foundUser);
      setUsers(demoUsers);
      setEntries(loadDemoEntries());
      setCurrentPage("menu");
      setLoginId("");
      setLoginPassword("");
      return;
    }

    if (!auth) {
      setLoginMessage("Firebase 설정이 없어 로그인할 수 없습니다.");
      return;
    }

    await signInWithEmailAndPassword(auth, loginId.trim(), loginPassword.trim());
    setLoginId("");
    setLoginPassword("");
  } catch {
    setLoginMessage("아이디(이메일) 또는 비밀번호가 올바르지 않습니다.");
  } finally {
    setLoginLoading(false);
  }
};

const handlePasswordReset = async () => {
  const email = loginId.trim();

  if (isDemoMode) {
    setLoginMessage("데모 모드에서는 사용할 수 없습니다.");
    return;
  }

  if (!auth) {
    setLoginMessage("Firebase 설정이 없습니다.");
    return;
  }

  if (!email) {
    setLoginMessage("아이디(이메일)를 먼저 입력하세요.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setLoginMessage("비밀번호 재설정 메일을 보냈습니다.");
  } catch {
    setLoginMessage("이메일을 확인하세요.");
  }
};

  const handleLogout = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      setLoginMessage("로그아웃되었습니다.");
      setCurrentPage("menu");
      return;
    }
    if (!auth) return;
    await signOut(auth);
    setLoginMessage("로그아웃되었습니다.");
    setCurrentPage("menu");
  };

  const handleSignup = async () => {
    const email = signupId.trim();
    const password = signupPassword.trim();
    const companyName = signupCompanyName.trim();
    const name = signupName.trim();
    if (!email || !password || !companyName || !name) return setSignupMessage("업체명, 이름, 아이디, 비밀번호를 모두 입력하세요.");
    if (isDemoMode) {
      const demoUsers = loadDemoUsers();
      if (demoUsers.some((user) => String(user.email).toLowerCase() === email.toLowerCase())) return setSignupMessage("이미 사용 중인 아이디입니다.");
      const newUser = { uid: createLocalId("demo-user"), email, password, companyName, name, role: signupRole, status: "pending", createdAt: new Date().toISOString(), approvedAt: null, approvedBy: null };
      const nextUsers = [...demoUsers, newUser];
      saveDemoUsers(nextUsers);
      setUsers(nextUsers);
      setSignupId("");
      setSignupPassword("");
      setSignupCompanyName("");
      setSignupName("");
      setSignupRole("general");
      setSignupMessage(signupRole === "admin" ? "관리자 계정 가입 신청이 접수되었습니다. 마스터 승인이 필요합니다." : "일반 계정 가입 신청이 접수되었습니다. 마스터 또는 관리자의 승인이 필요합니다.");
      return;
    }
    if (!auth || !db) return setSignupMessage("Firebase 설정이 없어 회원가입을 진행할 수 없습니다.");
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);

if (methods.length > 0) {
  setSignupMessage("이미 가입된 이메일입니다. 왼쪽 로그인 창에서 로그인하세요.");
  return;
}

const credential = await createUserWithEmailAndPassword(auth, email, password);

await setDoc(doc(db, "users", credential.user.uid), {
  email,
  companyName,
  name,
  role: signupRole,
  status: "pending",
  createdAt: serverTimestamp(),
  approvedAt: null,
  approvedBy: null,
});

// 🔥 성공 메시지
setSignupMessage(
  signupRole === "admin"
    ? "관리자 계정 가입 신청이 완료되었습니다. 마스터 승인을 기다리세요."
    : "회원가입 신청이 완료되었습니다. 승인 후 로그인 가능합니다."
);

// 🔥 입력값 초기화
setSignupId("");
setSignupPassword("");
setSignupCompanyName("");
setSignupName("");
setSignupRole("general");

await signOut(auth);
    } catch (error: any) {
  console.log("SIGNUP ERROR:", error.code);

  if (error.code === "auth/email-already-in-use") {
    setSignupMessage("이미 사용 중인 이메일입니다.");
  } else if (error.code === "auth/weak-password") {
    setSignupMessage("비밀번호는 6자 이상이어야 합니다.");
  } else if (error.code === "auth/invalid-email") {
    setSignupMessage("이메일 형식이 올바르지 않습니다.");
  } else {
    setSignupMessage("회원가입 중 오류가 발생했습니다.");
  }
}
  };

  const approveUser = async (uid: string) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const demoUsers = loadDemoUsers();
      const targetUser = demoUsers.find((user) => user.uid === uid);
      if (!targetUser) return;
      const canApprove = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
      if (!canApprove) return;
      const nextUsers = demoUsers.map((user) => user.uid === uid ? { ...user, status: "approved", approvedAt: new Date().toISOString(), approvedBy: currentUser.uid } : user);
      saveDemoUsers(nextUsers);
      setUsers(nextUsers);
      return;
    }
    if (!db) return;
    const targetUser = users.find((user) => user.uid === uid);
    if (!targetUser) return;
    const canApprove = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
    if (!canApprove) return;
    await updateDoc(doc(db, "users", uid), { status: "approved", approvedAt: serverTimestamp(), approvedBy: currentUser.uid });
  };

  const rejectUser = async (uid: string) => {
    if (!currentUser) return;
    if (isDemoMode) {
      const demoUsers = loadDemoUsers();
      const targetUser = demoUsers.find((user) => user.uid === uid);
      if (!targetUser) return;
      const canReject = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
      if (!canReject) return;
      const nextUsers = demoUsers.map((user) => user.uid === uid ? { ...user, status: "rejected", approvedAt: null, approvedBy: currentUser.uid } : user);
      saveDemoUsers(nextUsers);
      setUsers(nextUsers);
      return;
    }
    if (!db) return;
    const targetUser = users.find((user) => user.uid === uid);
    if (!targetUser) return;
    const canReject = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
    if (!canReject) return;
    await updateDoc(doc(db, "users", uid), { status: "rejected", approvedAt: null, approvedBy: currentUser.uid });
  };

const cancelApprovalUser = async (uid: string) => {
  if (!currentUser) return;

  if (isDemoMode) {
    const demoUsers = loadDemoUsers();
    const targetUser = demoUsers.find((user) => user.uid === uid);
    if (!targetUser) return;

    const canCancel = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
    if (!canCancel) return;

    const nextUsers = demoUsers.map((user) =>
      user.uid === uid
        ? {
            ...user,
            status: "rejected",
            approvedAt: null,
            approvedBy: currentUser.uid,
          }
        : user
    );

    saveDemoUsers(nextUsers);
    setUsers(nextUsers);
    return;
  }

  if (!db) return;

  const targetUser = users.find((user) => user.uid === uid);
  if (!targetUser) return;

  const canCancel = targetUser.role === "admin" ? canApproveAdmin : canApproveGeneral;
  if (!canCancel) return;

  await updateDoc(doc(db, "users", uid), {
  status: "rejected",
  approvedAt: null,
  approvedBy: currentUser.uid,
});
};

  const handleSaveDabsText = async () => {
  if (!canEditDabs) {
    setDabsMessage("권한 없음");
    return;
  }

  const nextData = {
    ...(dabsData[selectedDate] || {}),
    [activeDabsKey]: dabsDraft,
  };

  setDabsData((prev) => ({
    ...prev,
    [selectedDate]: nextData,
  }));

  await saveDabsMeetingToFirestore(selectedDate, nextData);

  setDabsMessage("저장 완료");
};

  const handleAddSectionWork = async () => {
  if (!canEditDabs || !sectionInput.building || !sectionInput.content.trim()) return;

  const canManualCompany = currentUser?.role === "master" || currentUser?.role === "admin";
  const companyName = canManualCompany
    ? sectionInput.company.trim()
    : currentUser?.companyName || "";

  if (!companyName) {
    setDabsMessage("업체명을 입력하세요.");
    return;
  }

  const inputContent = sectionInput.content.trim();
  const inputRedRanges = normalizeTextColorRanges(
    sectionInput.contentRedRanges,
    inputContent.length
  );

  const storageKey = getSectionStorageKey(activeDabsKey, sectionInput.building);
  const currentTabValue = dabsData[selectedDate]?.[storageKey];
  const currentRows =
    typeof currentTabValue === "object" && currentTabValue && "rows" in currentTabValue
      ? currentTabValue.rows || {}
      : {};

  const buildingRows = currentRows[sectionInput.building] || [];
  const existingIndex = buildingRows.findIndex((item) => item.company === companyName);

  const nextBuildingRows =
    existingIndex >= 0
      ? buildingRows.map((item, index) => {
          if (index !== existingIndex) return item;

          const oldContent = item.content || "";
          const joiner = oldContent ? "/" : "";
          const offset = oldContent.length + joiner.length;

          return {
            ...item,
            content: `${oldContent}${joiner}${inputContent}`,
            contentRedRanges: [
              ...(item.contentRedRanges || []),
              ...inputRedRanges.map((range) => ({
                start: range.start + offset,
                end: range.end + offset,
              })),
            ],
          };
        })
      : [
          ...buildingRows,
          {
            id: createLocalId("section"),
            company: companyName,
            content: inputContent,
            contentRedRanges: inputRedRanges,
            createdByUid: currentUser?.uid,
            createdByName: currentUser?.name,
          },
        ];

  const nextRows = {
    ...currentRows,
    [sectionInput.building]: nextBuildingRows,
  };

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      [storageKey]: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: existingIndex >= 0 ? "수정" : "입력",
    page: "DAB's회의",
    target: companyName,
    detail: `${activeDabsTab.label} / ${sectionInput.building} / ${inputContent}`,
  });

  setSectionInput({ building: "", company: "", content: "", contentRedRanges: [] });
  setSectionTextSelection({ start: 0, end: 0 });
  setDabsMessage("저장되었습니다.");
};

  const handleAddMaterial = async () => {
  const { gate, material, vehicle, location, time } = materialsInput;
  if (!canEditDabs || !material.trim() || !vehicle.trim() || !location.trim()) return;

  const canManualCompany = currentUser?.role === "master" || currentUser?.role === "admin";
  const companyName = canManualCompany
    ? materialsInput.company.trim()
    : currentUser?.companyName || "";

  if (!companyName) {
    setDabsMessage("업체명을 입력하세요.");
    return;
  }

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
  const list =
    typeof currentTabValue === "object" && currentTabValue && "list" in currentTabValue
      ? currentTabValue.list || []
      : [];

  const nextList = [
    ...list,
    {
      id: createLocalId("material"),
      gate,
      material: material.trim(),
      vehicle: vehicle.trim(),
      location: location.trim(),
      time,
      company: companyName,
      createdByUid: currentUser?.uid,
      createdByName: currentUser?.name,
    },
  ];

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      [activeDabsKey]: { list: nextList },
    },
  };

  setDabsData(nextData);

  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "입력",
    page: "DAB's회의",
    target: companyName,
    detail: `${activeDabsTab.label} / ${time}시 / ${gate}게이트 / ${material.trim()} / ${vehicle.trim()} / ${location.trim()}`,
  });

  setMaterialsInput({ gate: "1", company: "", material: "", vehicle: "", location: "", time: "06" });
  setDabsMessage("저장되었습니다.");
};

const handleUpdateMaterial = async () => {
  if (!canAdminEditDabsItem) return;

  if (
    !editMaterialPopup.itemId ||
    !editMaterialPopup.gate ||
    !editMaterialPopup.time ||
    !editMaterialPopup.company.trim() ||
    !editMaterialPopup.material.trim() ||
    !editMaterialPopup.vehicle.trim() ||
    !editMaterialPopup.location.trim()
  ) {
    return;
  }

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];

  const currentList =
    typeof currentTabValue === "object" && currentTabValue && "list" in currentTabValue
      ? currentTabValue.list || []
      : [];

  const targetItem = currentList.find((item) => item.id === editMaterialPopup.itemId);

  const nextList = currentList.map((item) =>
    item.id === editMaterialPopup.itemId
      ? {
          ...item,
          gate: editMaterialPopup.gate,
          time: editMaterialPopup.time,
          company: editMaterialPopup.company.trim(),
          material: editMaterialPopup.material.trim(),
          vehicle: editMaterialPopup.vehicle.trim(),
          location: editMaterialPopup.location.trim(),
        }
      : item
  );

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      [activeDabsKey]: { list: nextList },
    },
  };

  setDabsData(nextData);

  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "수정",
    page: "DAB's회의",
    target: editMaterialPopup.company.trim(),
    detail: `${activeDabsTab.label} / ${targetItem?.time || ""}시 ${targetItem?.gate || ""}게이트 ${targetItem?.material || ""} → ${editMaterialPopup.time}시 ${editMaterialPopup.gate}게이트 ${editMaterialPopup.material.trim()}`,
  });

  setEditMaterialPopup({
    open: false,
    itemId: "",
    gate: "",
    time: "",
    company: "",
    material: "",
    vehicle: "",
    location: "",
  });

  setDabsMessage("수정되었습니다.");
};

  const handleUpdateSectionWork = async () => {
  if (!canAdminEditDabsItem) return;
  if (!editSectionPopup.itemId || !editSectionPopup.building || !editSectionPopup.company.trim() || !editSectionPopup.content.trim()) return;

  const oldBuilding = editSectionPopup.oldBuilding;
const newBuilding = editSectionPopup.building;

const sourceKey =
  getMergedSectionKeys(activeDabsKey).find((key) => {
    const tabValue = dabsData[selectedDate]?.[key];
    const rows =
      typeof tabValue === "object" && tabValue && "rows" in tabValue
        ? tabValue.rows || {}
        : {};

    return (rows[oldBuilding] || []).some((item) => item.id === editSectionPopup.itemId);
  }) || getSectionStorageKey(activeDabsKey, oldBuilding);

const targetKey = getSectionStorageKey(activeDabsKey, newBuilding);

const sourceTabValue = dabsData[selectedDate]?.[sourceKey];
const sourceRows =
  typeof sourceTabValue === "object" && sourceTabValue && "rows" in sourceTabValue
    ? sourceTabValue.rows || {}
    : {};

const targetItem = (sourceRows[oldBuilding] || []).find(
  (item) => item.id === editSectionPopup.itemId
);
if (!targetItem) return;

const nextContent = editSectionPopup.content.trim();

const nextDateData = {
  ...(dabsData[selectedDate] || {}),
};

const nextSourceRows = {
  ...sourceRows,
  [oldBuilding]: (sourceRows[oldBuilding] || []).filter(
    (item) => item.id !== editSectionPopup.itemId
  ),
};

nextDateData[sourceKey] = { rows: nextSourceRows };

const targetTabValue = sourceKey === targetKey ? nextDateData[targetKey] : dabsData[selectedDate]?.[targetKey];
const targetRows =
  typeof targetTabValue === "object" && targetTabValue && "rows" in targetTabValue
    ? targetTabValue.rows || {}
    : {};

const nextTargetRows = {
  ...targetRows,
  [newBuilding]: [
    ...(targetRows[newBuilding] || []),
    {
      ...targetItem,
      company: editSectionPopup.company.trim(),
      content: nextContent,
      contentRedRanges: normalizeTextColorRanges(
        editSectionPopup.contentRedRanges,
        nextContent.length
      ),
    },
  ],
};

nextDateData[targetKey] = { rows: nextTargetRows };

const nextData = {
  ...dabsData,
  [selectedDate]: nextDateData,
};

  setDabsData(nextData);

  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "수정",
    page: "DAB's회의",
    target: editSectionPopup.company.trim(),
    detail: `${activeDabsTab.label} / ${oldBuilding} / ${targetItem.content || ""} → ${newBuilding} / ${nextContent}`,
  });

  setEditSectionPopup({
    open: false,
    itemId: "",
    oldBuilding: "",
    building: "",
    company: "",
    content: "",
    contentRedRanges: [],
  });

  setEditSectionTextSelection({ start: 0, end: 0 });
  setDabsMessage("수정되었습니다.");
};
  const handleDeleteDabsItem = async (itemId: string, building: string | null = null) => {
  if (isSectionWorkTabKey(activeDabsKey)) {
    const sourceKey =
      getMergedSectionKeys(activeDabsKey).find((key) => {
        const tabValue = dabsData[selectedDate]?.[key];
        const rows =
          typeof tabValue === "object" && tabValue && "rows" in tabValue
            ? tabValue.rows || {}
            : {};

        return building ? (rows[building] || []).some((item) => item.id === itemId) : false;
      }) || activeDabsKey;

    const currentTabValue = dabsData[selectedDate]?.[sourceKey];
    const currentRows =
      typeof currentTabValue === "object" && currentTabValue && "rows" in currentTabValue
        ? currentTabValue.rows || {}
        : {};

    const nextRows = { ...currentRows };
    const targetItem = building ? (nextRows[building] || []).find((item) => item.id === itemId) : undefined;

    if (!canDeleteOwnItem(targetItem)) return;

    if (building) {
      nextRows[building] = (nextRows[building] || []).filter((item) => item.id !== itemId);
    }

    const nextData = {
      ...dabsData,
      [selectedDate]: {
        ...(dabsData[selectedDate] || {}),
        [sourceKey]: { rows: nextRows },
      },
    };

    setDabsData(nextData);

    await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

    await writeActivityLog({
      action: "삭제",
      page: "DAB's회의",
      target: targetItem?.company || "",
      detail: `${activeDabsTab.label} / ${building || ""} / ${targetItem?.content || ""}`,
    });

    return;
  }

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
  const currentList =
    typeof currentTabValue === "object" && currentTabValue && "list" in currentTabValue
      ? currentTabValue.list || []
      : [];

  const targetItem = currentList.find((item) => item.id === itemId);

  if (!canDeleteOwnItem(targetItem)) return;

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      [activeDabsKey]: {
        list: currentList.filter((item) => item.id !== itemId),
      },
    },
  };

  setDabsData(nextData);

  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "삭제",
    page: "DAB's회의",
    target: targetItem?.company || "",
    detail: `${activeDabsTab.label} / ${targetItem?.time || ""}시 / ${targetItem?.gate || ""}게이트 / ${targetItem?.material || ""} / ${targetItem?.vehicle || ""} / ${targetItem?.location || ""}`,
  });
};

const handleLoadPreviousCompanyData = async (targetKey: string) => {
  if (!currentUser?.companyName) return;

  if (!loadSourceDate || loadSourceDate === selectedDate) {
    setDabsMessage("불러올 날짜를 확인하세요.");
    return;
  }

  if (!db) {
    setDabsMessage("Firebase 연결이 없습니다.");
    return;
  }

  const companyName = currentUser.companyName;

  if (targetKey === "soloWorker") {
    const sourceSnap = await getDoc(doc(db, "soloWorkers", loadSourceDate));
    const sourceRows = sourceSnap.exists()
      ? ((sourceSnap.data() as { rows?: Record<string, DabsRowItem[]> }).rows || {})
      : {};

    const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};
    const nextRows = { ...currentRows };

    Object.entries(sourceRows).forEach(([building, list]) => {
      const myItems = (list || []).filter((item) => item.company === companyName);
      if (myItems.length === 0) return;

      nextRows[building] = [
        ...(nextRows[building] || []),
        ...myItems.map((item) => ({
          ...item,
          id: createLocalId("solo-worker"),
          createdByUid: currentUser.uid,
          createdByName: currentUser.name,
        })),
      ];
    });

    const nextData = {
      ...dabsData,
      [selectedDate]: {
        ...(dabsData[selectedDate] || {}),
        soloWorker: { rows: nextRows },
      },
    };

    setDabsData(nextData);
    await saveSoloWorkersToFirestore(selectedDate, nextRows);
    setDabsMessage(`${formatMonthDay(loadSourceDate)} 단독작업자 데이터를 불러왔습니다.`);
    return;
  }

  const sourceSnap = await getDoc(doc(db, "dabsMeetings", loadSourceDate));
  const sourceData = sourceSnap.exists() ? (sourceSnap.data() as DabsDateValue) : {};
  const sourceKeys = getMergedSectionKeys(targetKey);
const nextDateData = {
  ...(dabsData[selectedDate] || {}),
};

sourceKeys.forEach((sourceKey) => {
  const sourceTabValue = sourceData[sourceKey];

  const sourceRows =
    typeof sourceTabValue === "object" && sourceTabValue && "rows" in sourceTabValue
      ? sourceTabValue.rows || {}
      : {};

  const currentTabValue = dabsData[selectedDate]?.[sourceKey];
  const currentRows =
    typeof currentTabValue === "object" && currentTabValue && "rows" in currentTabValue
      ? currentTabValue.rows || {}
      : {};

  const nextRows = { ...currentRows };

  Object.entries(sourceRows).forEach(([building, list]) => {
    const myItems = (list || []).filter((item) => item.company === companyName);
    if (myItems.length === 0) return;

    nextRows[building] = [
      ...(nextRows[building] || []),
      ...myItems.map((item) => ({
        ...item,
        id: createLocalId("section"),
        createdByUid: currentUser.uid,
        createdByName: currentUser.name,
      })),
    ];
  });

  nextDateData[sourceKey] = { rows: nextRows };
});

const nextData = {
  ...dabsData,
  [selectedDate]: nextDateData,
};

  setDabsData(nextData);
  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
  setDabsMessage(`${formatMonthDay(loadSourceDate)} 데이터를 불러왔습니다.`);
};

const handleAddSoloWorker = async () => {
  if (!canEditDabs || !soloWorkerInput.building || !soloWorkerInput.name.trim() || !soloWorkerInput.content.trim()) return;

  const canManualCompany = currentUser?.role === "master" || currentUser?.role === "admin";
  const companyName = canManualCompany
    ? soloWorkerInput.company.trim()
    : currentUser?.companyName || "";

  if (!companyName) {
    setDabsMessage("업체명을 입력하세요.");
    return;
  }

  const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};

  const nextRows = {
    ...currentRows,
    [soloWorkerInput.building]: [
      ...(currentRows[soloWorkerInput.building] || []),
      {
        id: createLocalId("solo-worker"),
        company: companyName,
        name: soloWorkerInput.name.trim(),
        content: soloWorkerInput.content.trim(),
        elderly: soloWorkerInput.elderly,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.name,
      },
    ],
  };

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      soloWorker: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveSoloWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "입력",
    page: "단독작업자",
    target: companyName,
    detail: `${soloWorkerInput.building} / ${soloWorkerInput.name.trim()} / ${soloWorkerInput.content.trim()} / 고령자 ${soloWorkerInput.elderly}`,
  });

  setSoloWorkerInput({ building: "", company: "", name: "", content: "", elderly: "x" });
};

  const handleUpdateSoloWorker = async () => {
  if (!canAdminEditDabsItem) return;
  if (!editSoloPopup.itemId || !editSoloPopup.building || !editSoloPopup.company.trim() || !editSoloPopup.name.trim() || !editSoloPopup.content.trim()) return;

  const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};
  const nextRows = { ...currentRows };

  const targetItem = (nextRows[editSoloPopup.oldBuilding] || []).find(
    (item) => item.id === editSoloPopup.itemId
  );

  if (!targetItem) return;

  nextRows[editSoloPopup.oldBuilding] = (nextRows[editSoloPopup.oldBuilding] || []).filter(
    (item) => item.id !== editSoloPopup.itemId
  );

  nextRows[editSoloPopup.building] = [
    ...(nextRows[editSoloPopup.building] || []),
    {
      ...targetItem,
      company: editSoloPopup.company.trim(),
      name: editSoloPopup.name.trim(),
      content: editSoloPopup.content.trim(),
      elderly: editSoloPopup.elderly,
    },
  ];

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      soloWorker: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveSoloWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "수정",
    page: "단독작업자",
    target: editSoloPopup.company.trim(),
    detail: `${editSoloPopup.oldBuilding} / ${targetItem.name || ""} / ${targetItem.content || ""} → ${editSoloPopup.building} / ${editSoloPopup.name.trim()} / ${editSoloPopup.content.trim()}`,
  });

  setEditSoloPopup({
    open: false,
    itemId: "",
    oldBuilding: "",
    building: "",
    company: "",
    name: "",
    content: "",
    elderly: "x",
  });
};

  const handleDeleteSoloWorker = async (itemId: string, building: string) => {
  const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};
  const targetItem = (currentRows[building] || []).find((item) => item.id === itemId);

  if (!canDeleteOwnItem(targetItem)) return;

  const nextRows = {
    ...currentRows,
    [building]: (currentRows[building] || []).filter((item) => item.id !== itemId),
  };

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      soloWorker: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveSoloWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "삭제",
    page: "단독작업자",
    target: targetItem?.company || "",
    detail: `${building} / ${targetItem?.name || ""} / ${targetItem?.content || ""}`,
  });
};

const handleAddHeatSensitive = async () => {
  if (!canEditDabs || !heatSensitiveInput.building || !heatSensitiveInput.name.trim() || !heatSensitiveInput.content.trim()) return;

  const canManualCompany = currentUser?.role === "master" || currentUser?.role === "admin";
  const companyName = canManualCompany
    ? heatSensitiveInput.company.trim()
    : currentUser?.companyName || "";

  if (!companyName) {
    setDabsMessage("업체명을 입력하세요.");
    return;
  }

  const heatSensitiveValue = dabsData[selectedDate]?.heatSensitive;

  const currentRows =
    typeof heatSensitiveValue === "object" &&
    heatSensitiveValue &&
    "rows" in heatSensitiveValue
      ? heatSensitiveValue.rows || {}
      : {};

  const nextRows = {
    ...currentRows,
    [heatSensitiveInput.building]: [
      ...(currentRows[heatSensitiveInput.building] || []),
      {
        id: createLocalId("heat-sensitive"),
        company: companyName,
        name: heatSensitiveInput.name.trim(),
        content: heatSensitiveInput.content.trim(),
        elderly: heatSensitiveInput.elderly,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.name,
      },
    ],
  };

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      heatSensitive: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveHeatSensitiveWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "입력",
    page: "온열민감자",
    target: companyName,
    detail: `${heatSensitiveInput.building} / ${heatSensitiveInput.name.trim()} / ${heatSensitiveInput.content.trim()} / ${heatSensitiveInput.elderly}`,
  });

  setHeatSensitiveInput({ building: "", company: "", name: "", content: "", elderly: "유질환자" });
};

const handleUpdateHeatSensitive = async () => {
  if (!canAdminEditDabsItem) return;
  if (!editHeatSensitivePopup.itemId || !editHeatSensitivePopup.building || !editHeatSensitivePopup.company.trim() || !editHeatSensitivePopup.name.trim() || !editHeatSensitivePopup.content.trim()) return;

  const heatSensitiveValue = dabsData[selectedDate]?.heatSensitive;

  const currentRows =
    typeof heatSensitiveValue === "object" &&
    heatSensitiveValue &&
    "rows" in heatSensitiveValue
      ? heatSensitiveValue.rows || {}
      : {};

  const nextRows = { ...currentRows };

  const targetItem = (nextRows[editHeatSensitivePopup.oldBuilding] || []).find(
    (item) => item.id === editHeatSensitivePopup.itemId
  );

  if (!targetItem) return;

  nextRows[editHeatSensitivePopup.oldBuilding] = (nextRows[editHeatSensitivePopup.oldBuilding] || []).filter(
    (item) => item.id !== editHeatSensitivePopup.itemId
  );

  nextRows[editHeatSensitivePopup.building] = [
    ...(nextRows[editHeatSensitivePopup.building] || []),
    {
      ...targetItem,
      company: editHeatSensitivePopup.company.trim(),
      name: editHeatSensitivePopup.name.trim(),
      content: editHeatSensitivePopup.content.trim(),
      elderly: editHeatSensitivePopup.elderly,
    },
  ];

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      heatSensitive: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveHeatSensitiveWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "수정",
    page: "온열민감자",
    target: editHeatSensitivePopup.company.trim(),
    detail: `${editHeatSensitivePopup.oldBuilding} / ${targetItem.name || ""} / ${targetItem.content || ""} / ${targetItem.elderly || ""} → ${editHeatSensitivePopup.building} / ${editHeatSensitivePopup.name.trim()} / ${editHeatSensitivePopup.content.trim()} / ${editHeatSensitivePopup.elderly}`,
  });

  setEditHeatSensitivePopup({
    open: false,
    itemId: "",
    oldBuilding: "",
    building: "",
    company: "",
    name: "",
    content: "",
    elderly: "유질환자",
  });
};

const handleDeleteHeatSensitive = async (itemId: string, building: string) => {
  const heatSensitiveValue = dabsData[selectedDate]?.heatSensitive;

  const currentRows =
    typeof heatSensitiveValue === "object" &&
    heatSensitiveValue &&
    "rows" in heatSensitiveValue
      ? heatSensitiveValue.rows || {}
      : {};

  const targetItem = (currentRows[building] || []).find((item) => item.id === itemId);

  if (!canDeleteOwnItem(targetItem)) return;

  const nextRows = {
    ...currentRows,
    [building]: (currentRows[building] || []).filter((item) => item.id !== itemId),
  };

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      heatSensitive: { rows: nextRows },
    },
  };

  setDabsData(nextData);

  await saveHeatSensitiveWorkersToFirestore(selectedDate, nextRows);

  await writeActivityLog({
    action: "삭제",
    page: "온열민감자",
    target: targetItem?.company || "",
    detail: `${building} / ${targetItem?.name || ""} / ${targetItem?.content || ""} / ${targetItem?.elderly || ""}`,
  });
};

const getOverlayBundle = (key = activeDabsKey) => dabsOverlays[selectedDate]?.[key] || { markers: [], arrows: [] };

const getCompanyListFromWorkTabs = () => {
  const workTabs = [
    { key: "archWork", label: "건축토목 작업" },
    { key: "mepWork", label: "기전부 작업" },
  ];

  return workTabs.map((tab) => {
    const rows = getMergedSectionRows(tab.key);

    const companies = Array.from(
      new Set(
        Object.values(rows)
          .flat()
          .map((item) => String(item.company || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "ko"));

    return {
      ...tab,
      companies,
    };
  });
};

const handleUpdateOverlayInfo = async () => {
  if (!canAdminEditDabsItem) return;

  if (!editOverlayPopup.itemId || !editOverlayPopup.company.trim() || !editOverlayPopup.note.trim()) {
    return;
  }

  if (editOverlayPopup.targetKey === "highRisk" && !editOverlayPopup.building) {
    return;
  }

  const currentValue = getOverlayBundle(editOverlayPopup.targetKey);
  const targetMarker = (currentValue.markers || []).find((marker) => marker.id === editOverlayPopup.itemId);

  const nextMarkers =
    editOverlayPopup.targetKey === "equipmentFlow"
      ? (currentValue.markers || []).filter(
          (marker) => marker.id !== editOverlayPopup.itemId
        )
      : (currentValue.markers || []).map((marker) =>
          marker.id === editOverlayPopup.itemId
            ? {
                ...marker,
                company: editOverlayPopup.company.trim(),
                note: editOverlayPopup.note.trim(),
                building: editOverlayPopup.building,
                equipmentType: "",
              }
            : marker
        );

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      [editOverlayPopup.targetKey]: {
        ...currentValue,
        markers: nextMarkers,
      },
    },
  };

  setDabsOverlays(nextData);

  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "수정",
    page: "DAB's회의",
    target: editOverlayPopup.company.trim(),
    detail:
      editOverlayPopup.targetKey === "equipmentFlow"
        ? `장비동선 / ${targetMarker?.company || ""} / ${targetMarker?.note || ""} → ${editOverlayPopup.company.trim()} / ${editOverlayPopup.note.trim()} / ${getEquipmentLabel(editOverlayPopup.equipmentType)}`
        : `고위험작업 / ${targetMarker?.building || ""} / ${targetMarker?.company || ""} / ${targetMarker?.note || ""} → ${editOverlayPopup.building} / ${editOverlayPopup.company.trim()} / ${editOverlayPopup.note.trim()}`,
  });

  if (editOverlayPopup.targetKey === "equipmentFlow") {
    setMoveOverlayTarget({
      itemId: editOverlayPopup.itemId,
      targetKey: "equipmentFlow",
      mode: "arrow",
    });

    setPendingEquipmentMarker({
      arrowId: editOverlayPopup.itemId,
      company: editOverlayPopup.company.trim(),
      note: editOverlayPopup.note.trim(),
      equipmentType: editOverlayPopup.equipmentType,
      logAction: "수정",
      createdByUid: currentUser?.uid,
      createdByName: currentUser?.name,
    });
  } else {
    setMoveOverlayTarget({
      itemId: editOverlayPopup.itemId,
      targetKey: editOverlayPopup.targetKey,
      mode: "marker",
    });
  }

  setEditOverlayPopup({
    open: false,
    itemId: "",
    targetKey: "highRisk",
    company: "",
    note: "",
    building: "",
    equipmentType: "concrete_pump_truck",
  });

  setArrowStart(null);
  setArrowPreview(null);

  setDabsMessage(
    editOverlayPopup.targetKey === "equipmentFlow"
      ? "수정되었습니다. 새 화살표 시작점과 종료점을 다시 선택하세요."
      : "수정되었습니다. 새 위치를 선택하세요."
  );
};

const handleDeleteOverlayItem = async (itemId: string, targetKey = activeDabsKey) => {
  const currentValue = getOverlayBundle(targetKey);

  const targetMarker = (currentValue.markers || []).find((item) => item.id === itemId);
  const targetArrow = (currentValue.arrows || []).find((item) => item.id === itemId);
  const targetItem = targetMarker || targetArrow;

  if (!canDeleteOwnItem(targetItem)) return;

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      [targetKey]: {
        markers: (currentValue.markers || []).filter((item) => item.id !== itemId),
        arrows: (currentValue.arrows || []).filter((item) => item.id !== itemId),
      },
    },
  };

  setDabsOverlays(nextData);

  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "삭제",
    page: "DAB's회의",
    target: targetMarker?.company || "",
    detail:
      targetKey === "equipmentFlow"
        ? `장비동선 / ${targetMarker?.company || ""} / ${targetMarker?.note || ""} / ${targetMarker?.equipmentType ? getEquipmentLabel(targetMarker.equipmentType) : ""}`
        : `고위험작업 / ${targetMarker?.building || ""} / ${targetMarker?.company || ""} / ${targetMarker?.note || ""}`,
  });
};

  const handleHighRiskImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  if (!canUploadDabsImage) {
    setDabsMessage("사진 업로드는 마스터, 관리자만 가능합니다.");
    return;
  }

  const file = event.target.files?.[0];
  if (!file) return;

  if (!db || !storage) {
    setDabsMessage("Firebase 연결 오류");
    event.target.value = "";
    return;
  }

  try {
    const imageDocRef = doc(db, "dabsImages", "shared");
    const oldImageSnap = await getDoc(imageDocRef);
    const oldStoragePath = oldImageSnap.exists()
      ? String(oldImageSnap.data().storagePath || "")
      : "";

    if (oldStoragePath) {
      try {
        await deleteObject(storageRef(storage, oldStoragePath));
      } catch (error) {
        console.log("OLD IMAGE DELETE SKIPPED:", error);
      }
    }

    const newStoragePath = `dabsImages/shared-${Date.now()}-${file.name}`;
    const imageRef = storageRef(storage, newStoragePath);

    await uploadBytes(imageRef, file);

    const imageUrl = await getDownloadURL(imageRef);

    const nextImages = {
      highRisk: imageUrl,
      equipmentFlow: imageUrl,
    };

    setDabsImages(nextImages);

    await setDoc(
      doc(db, "dabsImages", "shared"),
      {
        ...nextImages,
        storagePath: newStoragePath,
        updatedAt: serverTimestamp(),
        updatedByUid: currentUser?.uid,
        updatedByName: currentUser?.name,
      },
      { merge: true }
    );

    await writeActivityLog({
      action: "수정",
      page: "DAB's회의",
      target: "공통 사진",
      detail: `고위험작업/장비동선 사진 변경 / ${file.name}`,
    });

    setDabsMessage("사진이 저장되었습니다.");
  } catch (error) {
    console.log("IMAGE UPLOAD ERROR:", error);
    setDabsMessage("사진 저장 중 오류가 발생했습니다.");
  }

  event.target.value = "";
};

  const openMarkerPopup = async (event: React.MouseEvent<HTMLDivElement>) => {
  if (activeDabsKey !== "highRisk" || !dabsImages?.highRisk) return;

  const point = getRelativePoint(event.clientX, event.clientY);
  if (!point) return;

  if (moveOverlayTarget?.targetKey === "highRisk" && moveOverlayTarget.mode === "marker") {
    const currentValue = getOverlayBundle("highRisk");
    const targetMarker = (currentValue.markers || []).find(
      (marker) => marker.id === moveOverlayTarget.itemId
    );

    const nextMarkers = (currentValue.markers || []).map((marker) =>
      marker.id === moveOverlayTarget.itemId
        ? {
            ...marker,
            x: point.x,
            y: point.y,
          }
        : marker
    );

    const nextData = {
      ...dabsOverlays,
      [selectedDate]: {
        ...(dabsOverlays[selectedDate] || {}),
        highRisk: {
          ...currentValue,
          markers: nextMarkers,
        },
      },
    };

    setDabsOverlays(nextData);

    await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

    await writeActivityLog({
      action: "수정",
      page: "DAB's회의",
      target: targetMarker?.company || "",
      detail: `고위험작업 위치 수정 / ${targetMarker?.building || ""} / ${targetMarker?.note || ""}`,
    });

    setMoveOverlayTarget(null);
    setDabsMessage("위치가 수정되었습니다.");
    return;
  }

  setImagePopup({
    open: true,
    x: point.x,
    y: point.y,
    company: "",
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "highRisk",
  });
};

  const openMarkerPopupByTouch = async (touch: { clientX: number; clientY: number }) => {
  if (activeDabsKey !== "highRisk" || !dabsImages?.highRisk) return;

  const point = getRelativePoint(touch.clientX, touch.clientY);
  if (!point) return;

  lastTouchTimeRef.current = Date.now();
  vibrateBriefly();

  if (moveOverlayTarget?.targetKey === "highRisk" && moveOverlayTarget.mode === "marker") {
    const currentValue = getOverlayBundle("highRisk");
    const targetMarker = (currentValue.markers || []).find(
      (marker) => marker.id === moveOverlayTarget.itemId
    );

    const nextMarkers = (currentValue.markers || []).map((marker) =>
      marker.id === moveOverlayTarget.itemId
        ? {
            ...marker,
            x: point.x,
            y: point.y,
          }
        : marker
    );

    const nextData = {
      ...dabsOverlays,
      [selectedDate]: {
        ...(dabsOverlays[selectedDate] || {}),
        highRisk: {
          ...currentValue,
          markers: nextMarkers,
        },
      },
    };

    setDabsOverlays(nextData);

    await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

    await writeActivityLog({
      action: "수정",
      page: "DAB's회의",
      target: targetMarker?.company || "",
      detail: `고위험작업 위치 수정 / ${targetMarker?.building || ""} / ${targetMarker?.note || ""}`,
    });

    setMoveOverlayTarget(null);
    setDabsMessage("위치가 수정되었습니다.");
    return;
  }

  setImagePopup({
    open: true,
    x: point.x,
    y: point.y,
    company: "",
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "highRisk",
  });
};

  const cancelMarkerPopup = async () => {
  if (imagePopup.targetKey === "equipmentFlow") {
    const currentValue = getOverlayBundle("equipmentFlow");
    const nextArrows = [...(currentValue.arrows || [])];

    if (nextArrows.length > 0) nextArrows.pop();

    const nextData = {
      ...dabsOverlays,
      [selectedDate]: {
        ...(dabsOverlays[selectedDate] || {}),
        equipmentFlow: {
          ...currentValue,
          arrows: nextArrows,
        },
      },
    };

    setDabsOverlays(nextData);
    await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);
  }

  setArrowStart(null);
  setArrowPreview(null);
  setPendingEquipmentMarker(null);
  setImagePopup({
    open: false,
    x: 0,
    y: 0,
    company: "",
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "highRisk",
  });
};

  const submitMarkerPopup = async () => {
  if (!canEditDabs || !imagePopup.note.trim()) return;
  if (imagePopup.targetKey === "highRisk" && !imagePopup.building) return;

  const canManualCompany = currentUser?.role === "master" || currentUser?.role === "admin";
  const companyName = canManualCompany
    ? imagePopup.company.trim()
    : currentUser?.companyName || "";

  if (!companyName) {
    setDabsMessage("업체명을 입력하세요.");
    return;
  }

  const targetKey = imagePopup.targetKey || activeDabsKey;
  const currentValue = getOverlayBundle(targetKey);

  if (targetKey === "equipmentFlow") {
    const lastArrow = currentValue.arrows?.[currentValue.arrows.length - 1];
    if (!lastArrow) return;

    setPendingEquipmentMarker({
      arrowId: lastArrow.id,
      company: companyName,
      note: imagePopup.note.trim(),
      equipmentType: imagePopup.equipmentType,
      logAction: "입력",
      createdByUid: currentUser?.uid,
      createdByName: currentUser?.name,
    });

    setImagePopup({
      open: false,
      x: 0,
      y: 0,
      company: "",
      note: "",
      equipmentType: "concrete_pump_truck",
      building: "",
      targetKey: "highRisk",
    });

    setDabsMessage("상자를 표시할 위치를 한 번 더 클릭하세요.");
    return;
  }

  const marker = {
    id: createLocalId("marker"),
    x: imagePopup.x,
    y: imagePopup.y,
    building: imagePopup.building,
    company: companyName,
    note: imagePopup.note.trim(),
    equipmentType: "",
    createdByUid: currentUser?.uid,
    createdByName: currentUser?.name,
  };

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      [targetKey]: {
        ...currentValue,
        markers: [...(currentValue.markers || []), marker],
      },
    },
  };

  setDabsOverlays(nextData);

  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
    action: "입력",
    page: "DAB's회의",
    target: companyName,
    detail: `고위험작업 / ${imagePopup.building} / ${imagePopup.note.trim()}`,
  });

  setImagePopup({
    open: false,
    x: 0,
    y: 0,
    company: "",
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "highRisk",
  });
};

 const completeEquipmentArrow = async (endX: number, endY: number) => {
  if (!arrowStart) return;

  const currentValue = getOverlayBundle("equipmentFlow");

// 화살표는 겹쳐도 입력 가능.
// 상자 중복 검사는 상자 위치를 클릭하는 단계에서만 처리합니다.

if (moveOverlayTarget?.targetKey === "equipmentFlow" && moveOverlayTarget.mode === "arrow") {
  const nextArrows = (currentValue.arrows || []).map((arrow) =>
    arrow.id === moveOverlayTarget.itemId
      ? {
          ...arrow,
          startX: arrowStart.x,
          startY: arrowStart.y,
          endX,
          endY,
        }
      : arrow
  );

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      equipmentFlow: {
        ...currentValue,
        arrows: nextArrows,
      },
    },
  };

  setDabsOverlays(nextData);
  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  setMoveOverlayTarget(null);
  setArrowStart(null);
  setArrowPreview(null);
  setDabsMessage("화살표가 수정되었습니다. 상자를 표시할 위치를 한 번 더 클릭하세요.");
  return;
}

  const arrow = {
    id: createLocalId("arrow"),
    startX: arrowStart.x,
    startY: arrowStart.y,
    endX,
    endY,
    createdByUid: currentUser?.uid,
    createdByName: currentUser?.name,
  };

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      equipmentFlow: {
        ...currentValue,
        arrows: [...(currentValue.arrows || []), arrow],
      },
    },
  };

  setDabsOverlays(nextData);

  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  setArrowStart(null);
  setArrowPreview(null);
  setImagePopup({
    open: true,
    x: (arrow.startX + arrow.endX) / 2,
    y: (arrow.startY + arrow.endY) / 2,
    company: "",
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "equipmentFlow",
  });
  vibrateBriefly();
};

  const handleEquipmentClick = async (event: React.MouseEvent<HTMLDivElement>) => {
  if (Date.now() - lastTouchTimeRef.current < 500) return;
  if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !canEditDabs) return;

  const point = getRelativePoint(event.clientX, event.clientY);
  if (!point) return;

  if (
    pendingEquipmentMarker &&
    !(moveOverlayTarget?.targetKey === "equipmentFlow" && moveOverlayTarget.mode === "arrow")
  ) {
    const currentValue = getOverlayBundle("equipmentFlow");

    const marker = {
      id: pendingEquipmentMarker.arrowId,
      x: point.x,
      y: point.y,
      building: "",
      company: pendingEquipmentMarker.company,
      note: pendingEquipmentMarker.note,
      equipmentType: pendingEquipmentMarker.equipmentType,
      createdByUid: pendingEquipmentMarker.createdByUid,
      createdByName: pendingEquipmentMarker.createdByName,
    };

    const nextData = {
      ...dabsOverlays,
      [selectedDate]: {
        ...(dabsOverlays[selectedDate] || {}),
        equipmentFlow: {
          ...currentValue,
          markers: [...(currentValue.markers || []), marker],
        },
      },
    };

    setDabsOverlays(nextData);

    await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

    await writeActivityLog({
      action: pendingEquipmentMarker.logAction || "입력",
      page: "DAB's회의",
      target: pendingEquipmentMarker.company,
      detail: `장비동선 / ${getEquipmentLabel(pendingEquipmentMarker.equipmentType)} / ${pendingEquipmentMarker.note}`,
    });

    setPendingEquipmentMarker(null);
    setDabsMessage("장비동선이 저장되었습니다.");
    return;
  }

  if (!arrowStart) {
    setArrowStart({ x: point.x, y: point.y });
    setArrowPreview({
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
    });
    return;
  }

  completeEquipmentArrow(point.x, point.y);
};

  const handleEquipmentMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !arrowStart) return;
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;
    setArrowPreview({ startX: arrowStart.x, startY: arrowStart.y, endX: point.x, endY: point.y });
  };

  const handleOverlayTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    if (activeDabsKey === "highRisk") {
      touchGestureRef.current = { moved: false, startX: touch.clientX, startY: touch.clientY };
      return;
    }
    if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !canEditDabs) return;
    const point = getRelativePoint(touch.clientX, touch.clientY);
    if (!point) return;
    lastTouchTimeRef.current = Date.now();
    if (!arrowStart) {
      setArrowStart({ x: point.x, y: point.y });
      setArrowPreview({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
      touchGestureRef.current = { moved: false, startX: touch.clientX, startY: touch.clientY };
      vibrateBriefly();
      return;
    }
    setArrowPreview({ startX: arrowStart.x, startY: arrowStart.y, endX: point.x, endY: point.y });
    touchGestureRef.current = { moved: false, startX: touch.clientX, startY: touch.clientY };
  };

  const handleOverlayTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    const gesture = touchGestureRef.current;
    if (Math.abs(touch.clientX - gesture.startX) > 6 || Math.abs(touch.clientY - gesture.startY) > 6) touchGestureRef.current.moved = true;
    if (activeDabsKey !== "equipmentFlow" || !arrowStart) return;
    const point = getRelativePoint(touch.clientX, touch.clientY);
    if (!point) return;
    setArrowPreview({ startX: arrowStart.x, startY: arrowStart.y, endX: point.x, endY: point.y });
  };

  const handleOverlayTouchEnd = async (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const point = getRelativePoint(touch.clientX, touch.clientY);
    if (!point) return;
    lastTouchTimeRef.current = Date.now();
    if (activeDabsKey === "highRisk") {
      if (!touchGestureRef.current.moved) openMarkerPopupByTouch(touch);
      return;
    }
    if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !canEditDabs) return;

if (
  pendingEquipmentMarker &&
  !(moveOverlayTarget?.targetKey === "equipmentFlow" && moveOverlayTarget.mode === "arrow")
) {
  const currentValue = getOverlayBundle("equipmentFlow");

  const marker = {
    id: pendingEquipmentMarker.arrowId,
    x: point.x,
    y: point.y,
    building: "",
    company: pendingEquipmentMarker.company,
    note: pendingEquipmentMarker.note,
    equipmentType: pendingEquipmentMarker.equipmentType,
    createdByUid: pendingEquipmentMarker.createdByUid,
    createdByName: pendingEquipmentMarker.createdByName,
  };

  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      equipmentFlow: {
        ...currentValue,
        markers: [...(currentValue.markers || []), marker],
      },
    },
  };

  setDabsOverlays(nextData);
  await saveDabsOverlaysToFirestore(selectedDate, nextData[selectedDate]);

  await writeActivityLog({
  action: pendingEquipmentMarker.logAction || "입력",
  page: "DAB's회의",
  target: pendingEquipmentMarker.company,
  detail: `장비동선 / ${getEquipmentLabel(pendingEquipmentMarker.equipmentType)} / ${pendingEquipmentMarker.note}`,
});

setPendingEquipmentMarker(null);
setDabsMessage("장비동선이 저장되었습니다.");
return;
}

if (!arrowStart) return;

if (touchGestureRef.current.moved) {
  completeEquipmentArrow(point.x, point.y);
  return;
}
    if (arrowPreview && (Math.abs((arrowPreview.endX || point.x) - arrowStart.x) > 2 || Math.abs((arrowPreview.endY || point.y) - arrowStart.y) > 2)) {
      completeEquipmentArrow(point.x, point.y);
      return;
    }
    setArrowPreview({ startX: arrowStart.x, startY: arrowStart.y, endX: point.x, endY: point.y });
  };

  const renderTopBar = () => {
    if (!currentUser) return null;
    return (
      <motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35 }}
  className="grid grid-cols-[1fr_auto] items-start gap-2 md:flex md:items-center md:justify-between"
>
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-slate-600">
      <CalendarDays className="h-4 w-4 shrink-0 md:h-5 md:w-5" />
      <span className="truncate text-xs md:text-sm">현장 안전정보 통합 시스템</span>
    </div>

    <h1 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 md:text-xl lg:text-2xl">
      HS 어울림 청주사직
    </h1>

    <p className="mt-1 hidden text-sm text-slate-500 sm:block">
      로그인 후 원하는 메뉴를 선택해 이동하세요.
    </p>
  </div>

  <Card className="w-[190px] shrink-0 rounded-xl border-0 shadow-sm md:w-auto md:rounded-2xl">
  <CardContent className="flex items-center justify-between gap-2 p-2 md:gap-3 md:p-3">
    <div className="min-w-0 text-right">
      <div className="truncate text-xs font-semibold text-slate-900 md:text-sm">
        {currentUser.name}
      </div>
      <div className="truncate text-[10px] text-slate-500 md:text-xs">
        {currentUser.companyName} · {getRoleLabel(currentUser.role || "general")}
      </div>
    </div>

    <Button
      variant="outline"
      onClick={handleLogout}
      className="h-8 shrink-0 whitespace-nowrap rounded-lg px-2 text-[11px] leading-none md:h-10 md:rounded-2xl md:px-4 md:text-sm"
    >
      <LogOut className="mr-1 h-3 w-3 md:mr-2 md:h-4 md:w-4" />
      로그아웃
    </Button>
  </CardContent>
</Card>
</motion.div>
    );
  };

  const renderOverlayImage = (
  selectedImage: string | undefined,
  isImageTab: boolean,
  targetKey = activeDabsKey
) => {
  const overlayBundle = getOverlayBundle(targetKey);
    const markers = overlayBundle.markers || [];
const arrows = overlayBundle.arrows || [];
const overlayCompanyList = getUniqueCompaniesFromMarkers(markers);

return (
  <div
    ref={imageAreaRef}
    className="relative h-[260px] overflow-hidden rounded-xl border border-black bg-slate-50 touch-none md:h-auto md:rounded-2xl"
    onClick={activeDabsKey === "highRisk" ? openMarkerPopup : activeDabsKey === "equipmentFlow" ? handleEquipmentClick : undefined}
        onMouseMove={activeDabsKey === "equipmentFlow" ? handleEquipmentMouseMove : undefined}
        onTouchStart={isImageTab ? handleOverlayTouchStart : undefined}
        onTouchMove={activeDabsKey === "equipmentFlow" ? handleOverlayTouchMove : undefined}
        onTouchEnd={isImageTab ? handleOverlayTouchEnd : undefined}
      >
  {selectedImage ? (
  <img
  src={selectedImage}
  alt={activeDabsTab.label}
  crossOrigin="anonymous"
  className="block h-full w-full object-cover md:h-auto"
/>
) : (
  <div className="flex h-64 items-center justify-center text-sm text-slate-400">
    등록된 사진이 없습니다.
  </div>
)}
  {selectedImage && (
          <>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" fill="#ef4444"><polygon points="0 0, 4 2, 0 4" /></marker>
              </defs>
              {arrows.map((arrow) => <line key={arrow.id} x1={arrow.startX} y1={arrow.startY} x2={arrow.endX} y2={arrow.endY} stroke="#ef4444" strokeWidth="0.6" markerEnd="url(#arrowhead)" />)}
              {activeDabsKey === "equipmentFlow" && arrowPreview && <line x1={arrowPreview.startX} y1={arrowPreview.startY} x2={arrowPreview.endX} y2={arrowPreview.endY} stroke="#f97316" strokeWidth="0.5" strokeDasharray="1.5 1.5" markerEnd="url(#arrowhead)" />}
              {activeDabsKey === "equipmentFlow" && arrowStart && <circle cx={arrowStart.x} cy={arrowStart.y} r="1.3" fill="#f97316" />}
            </svg>
            {markers.map((marker) => {
              const markerKey = `${targetKey}-${marker.id}`;
              const adjustedPosition = adjustedOverlayPositions[markerKey];
              const posX = adjustedPosition?.x ?? marker.x;
const posY = adjustedPosition?.y ?? marker.y;
              const color = getCompanyColorByList(marker.company || "-", overlayCompanyList);
              const buildingColor = getBuildingColor(marker.building || "");
              const isHighRiskMarker = targetKey === "highRisk";
              return (
                <div
  key={marker.id}
  ref={(element) => {
    overlayMarkerRefs.current[markerKey] = element;
  }}
  className="absolute"
  style={{
    left: `${posX}%`,
    top: `${posY}%`,
    transform: "translate(-50%, -50%)",
  }}
>
  <div
    className={cn(
  "relative origin-center scale-[0.73] rounded-lg border px-[3px] py-[1px] shadow-md backdrop-blur-[1px] lg:scale-100 lg:rounded-2xl lg:px-1 lg:py-1",
  color.bg,
  color.text
)}
  >
                  <div className={cn("flex flex-col items-center text-center", isHighRiskMarker
  ? "min-w-[69px] max-w-[96px] gap-0 lg:min-w-[139px] lg:max-w-[187px] lg:gap-1"
: "min-w-[85px] max-w-[112px] gap-0 lg:min-w-[200px] lg:max-w-[253px] lg:gap-1")}>
                    {marker.equipmentType ? <><span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold leading-none shadow-sm lg:text-[11px]">{getEquipmentLabel(marker.equipmentType)}</span><span className="rounded-full bg-white/70 p-0.5 shadow-sm lg:p-1"><EquipmentIcon type={marker.equipmentType} className="h-4 w-4 lg:h-10 lg:w-10" /></span></> : null}
                    {isHighRiskMarker ? (
  <div className="w-full rounded-md bg-white/65 px-1 py-0.5 shadow-sm lg:rounded-xl lg:px-2 lg:py-2">
    <div className={cn("text-[15px] font-bold leading-tight tracking-tight lg:text-[17px]", buildingColor)}>
      {marker.building || "동 미선택"}
    </div>
    <div className="mt-1 text-[15px] font-bold leading-tight lg:text-[17px]">
      {marker.company || "업체명 없음"}
    </div>
    <div className="mt-1 break-words text-[15px] font-bold leading-tight lg:text-[17px]">
      {marker.note || "작업내용 없음"}
    </div>
  </div>
) : (
  <div className="w-full rounded-md bg-white/65 px-1 py-0.5 shadow-sm lg:rounded-xl lg:px-2 lg:py-2">
    <div className="text-[15px] font-bold leading-tight lg:text-[17px]">
      {marker.company || "업체명 없음"}
    </div>
    <div className="mt-1 break-words text-[15px] font-bold leading-tight lg:text-[17px]">
      {marker.note || "작업내용 없음"}
    </div>
  </div>
)}
                  </div>
                  {!isCapturingImage && (
<div className="absolute -top-8 -right-2 z-20 flex gap-1 lg:-top-6 lg:right-1">
  {canAdminEditDabsItem && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setEditOverlayPopup({
          open: true,
          itemId: marker.id,
          targetKey,
          company: marker.company || "",
          note: marker.note || "",
          building: marker.building || "",
          equipmentType: marker.equipmentType || "concrete_pump_truck",
        });
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{ touchAction: "manipulation" }}
      className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-[10px] font-semibold text-slate-600 shadow lg:h-5 lg:min-w-5 lg:px-1 lg:text-[9px]"
    >
      수정
    </button>
  )}

  {canDeleteOwnItem(marker) && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleDeleteOverlayItem(marker.id, targetKey);
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{ touchAction: "manipulation" }}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow lg:h-5 lg:w-5"
    >
      <X className="h-4 w-4 lg:h-3 lg:w-3" />
    </button>
  )}
</div>
)}
  </div>
</div>
              );
            })}
                      </>
        )}
      </div>
    );
  };

  const renderAuthScreen = () => (
    <div className="grid min-h-[80vh] place-items-center">
      <div className="w-full max-w-5xl space-y-4 sm:space-y-6">
        <div className="text-center">
          <div className="text-sm font-medium text-slate-500">회원 전용 포털</div>
          {mounted && isDemoMode && <div className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">데모 로그인: GH45 / 2706</div>}
          <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">HS 어울림 청주사직</h1>
          <p className="mt-2 text-sm text-slate-500">로그인 또는 회원가입 후 메뉴를 선택해 이동할 수 있습니다.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5" />로그인</CardTitle></CardHeader>
            <CardContent className="space-y-3 py-3">
              <form
  onSubmit={(e) => {
    e.preventDefault();
    handleLogin();
  }}
  className="space-y-3 max-w-sm"
>
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-600">아이디</label>
    <Input
      value={loginId}
      onChange={(e) => setLoginId(e.target.value)}
      placeholder={isDemoMode ? "GH45" : "이메일 입력"}
      className="h-9"
      disabled={loginLoading}
    />
  </div>

  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-600">비밀번호</label>
    <Input
      type="password"
      value={loginPassword}
      onChange={(e) => setLoginPassword(e.target.value)}
      placeholder={isDemoMode ? "2706" : "비밀번호 입력"}
      className="h-9"
      disabled={loginLoading}
    />
  </div>

  <div className="flex gap-2">
  <Button
    type="submit"
    className="h-9 flex-1"
    disabled={loginLoading}
  >
    {loginLoading ? "로그인 중..." : "로그인"}
  </Button>

  <Button
    type="button"
    variant="outline"
    className="h-9 flex-1"
    onClick={handlePasswordReset}
    disabled={loginLoading}
  >
    비밀번호 재설정
  </Button>
</div>
</form>
              {loginMessage && <div className="text-sm text-slate-600">{loginMessage}</div>}
              {!isAuthReady && <div className="text-xs text-slate-400">로그인 상태 확인 중...</div>}
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="h-5 w-5" />회원가입</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">업체명</label><Input value={signupCompanyName} onChange={(e) => setSignupCompanyName(e.target.value)} placeholder="업체명 입력" className="h-9" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">이름</label><Input value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="이름 입력" className="h-9" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">{isDemoMode ? "아이디" : "아이디(이메일)"}</label><Input value={signupId} onChange={(e) => setSignupId(e.target.value)} placeholder={isDemoMode ? "아이디 입력" : "이메일 입력"} className="h-9" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">비밀번호</label><Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="비밀번호 입력" className="h-9" /></div>
              </div>
              <div className="space-y-2"><label className="text-xs font-medium text-slate-600">회원 등급 신청</label><select value={signupRole} onChange={(e) => setSignupRole(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"><option value="general">협력사</option><option value="admin">현대건설</option></select><div className="text-xs text-slate-500">협력사는 마스터 또는 현대건설이 승인 가능, 현대건설 계정은 마스터만 승인 가능합니다.</div></div>
              <div className="flex justify-end"><Button className="w-full lg:w-auto" onClick={handleSignup}>가입 신청</Button></div>
              {signupMessage && <div className="text-sm text-slate-600">{signupMessage}</div>}
            </CardContent>
          </Card>
        </div>
     
      </div>
    </div>
  );

  const renderMenuScreen = () => (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}

      {canManualChangeSelectedDate && (
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="text-sm font-semibold text-slate-900">
              기준일 설정
            </div>

            <div className="mt-1 text-xs text-slate-500">
              현재 기준일: {formatMonthDay(selectedDate)}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleManualSelectedDateChange(e.target.value)}
                className="h-9 bg-white"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSelectedDateToDefault}
              >
                자동 기준일로 복귀
              </Button>
            </div>

            {manualSelectedDate && manualSelectedDateSavedToday === getTodayKey() && (
              <div className="mt-2 text-[11px] text-amber-700">
                오늘만 수동 기준일 적용 중입니다. 다음날 접속 시 자동 기준일로 돌아갑니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              전체화면 발표 모드
            </div>
            <div className="mt-1 text-xs text-slate-500">
              DAB&apos;s 회의와 단독작업자를 PPT처럼 넘겨서 볼 수 있습니다.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
  <Button
    variant="outline"
    onClick={handleDownloadPortfolioImages}
    disabled={isExportingPortfolioImages}
  >
    {isExportingPortfolioImages ? "저장 중..." : "발표 이미지 저장"}
  </Button>

  <Button
    onClick={() => {
      setPortfolioSlideIndex(0);
      setCurrentPage("portfolio");
    }}
    disabled={isExportingPortfolioImages}
  >
    발표 모드 보기
  </Button>
</div>
        </CardContent>
      </Card>

      {!isConfigured && (
  <Card className="border-amber-300 bg-amber-50">
    <CardContent className="p-4">
      <div className="text-sm font-medium text-amber-900">
        Firebase 환경변수가 설정되지 않았습니다.
        <div className="mt-1 text-xs text-amber-800">
          Firebase 미설정 상태입니다. 환경변수를 설정해야 로그인할 수 있습니다.
        </div>
      </div>
    </CardContent>
  </Card>
)}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">{menuItems.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => {
  setCurrentPage(item.key);
}} className="rounded-[24px] border border-black bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Icon className="h-6 w-6" /></div><div><div className="text-base font-semibold text-slate-900 lg:text-lg">{item.title}</div><div className="mt-1 text-sm text-slate-500">{item.description}</div></div></div></button>; })}</div>
    </div>
  );

  const renderBottomCalendar = () => (
  <Card className="rounded-[24px] border-0 bg-white shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>월간 달력</CardTitle>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-28 text-center text-sm font-semibold lg:min-w-36 lg:text-base">
          {monthLabel}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </CardHeader>

    <CardContent>
      <div className="grid grid-cols-7 gap-1 lg:gap-2">
        {weekLabels.map((label) => (
          <div key={label} className="rounded-xl bg-slate-100 py-2 text-center text-[10px] font-semibold text-slate-600 lg:text-xs">
            {label}
          </div>
        ))}

        {monthGrid.map((date) => {
          const key = formatDateKey(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const cellEntries = entries.filter((entry) => entry.date === key);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(key)}
              className={cn(
                "min-h-[72px] rounded-xl border p-1.5 text-left transition sm:min-h-[82px] sm:p-2",
                isSelected
                  ? "border-slate-900 bg-slate-100"
                  : isCurrentMonth
                    ? "border-slate-200 bg-white shadow-sm"
                    : "border-slate-100 bg-slate-50 text-slate-400"
              )}
            >
              <div className="mb-1 flex items-center justify-between sm:mb-2">
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold lg:h-6 lg:w-6 lg:text-xs",
                    isToday ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {date.getDate()}
                </div>

                <Badge className="px-1.5 py-0">{cellEntries.length}</Badge>
              </div>

              <div className="space-y-1">
                {cellEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg bg-slate-50 p-1 text-[9px] text-slate-700 lg:p-1.5 lg:text-[10px]">
                    <div className="font-semibold text-slate-900">
                      {entry.startTime}
                    </div>
                    <div className="whitespace-pre-wrap break-words leading-tight">
                      {entry.companyName}
                    </div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </CardContent>
  </Card>
);

const renderSectionMobileCards = (
  columns: string[],
  rows: Record<string, DabsRowItem[]>
) => (
  <div className="space-y-3 lg:hidden">
    {columns.map((col) => {
      const list = rows[col] || [];

      return (
        <MobileListCard key={col} title={col}>
          {list.length === 0 ? (
            <div className="text-slate-400">입력 없음</div>
          ) : (
            list.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">
                  {item.company}
                </div>

                <div className="mt-1 flex items-start justify-between gap-2">
                  <span className="text-slate-900 whitespace-pre-wrap break-all leading-relaxed">
                    {renderTextWithRedRanges(item.content, item.contentRedRanges)}
                  </span>

                  {!isCapturingImage && (
                    <div className="flex shrink-0 gap-1">
                      {canAdminEditDabsItem && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditSectionPopup({
                              open: true,
                              itemId: item.id,
                              oldBuilding: col,
                              building: col,
                              company: item.company || "",
                              content: item.content || "",
                              contentRedRanges: item.contentRedRanges || [],
                            })
                          }
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                        >
                          수정
                        </button>
                      )}

                      {canDeleteOwnItem(item) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDabsItem(item.id, col)}
                          className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </MobileListCard>
      );
    })}
  </div>
);

  const renderMaterialsMobileCards = (list: DabsRowItem[]) => (
  <div className="space-y-3 lg:hidden">
    {MATERIAL_TIMES.map((time) => {
      const row = list.filter((item) => item.time === time);
      const gate1 = row.filter((item) => item.gate === "1");
      const gate7 = row.filter((item) => item.gate === "7");

      return (
        <MobileListCard key={time} title={`${time}시`}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">1게이트</div>

              {gate1.length === 0 ? (
                <div className="text-slate-400">입력 없음</div>
              ) : (
                gate1.map((item) => (
                  <div key={item.id} className="mb-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500">{item.company}</div>
                    <div className="mt-1 text-sm">자재명: {item.material}</div>
                    <div className="text-sm">차종: {item.vehicle}</div>

                    <div className="mt-1 flex items-start justify-between gap-2 text-sm">
                      <span>하역장소: {item.location}</span>

                      {!isCapturingImage && (
                        <div className="flex shrink-0 gap-1">
                          {canAdminEditDabsItem && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditMaterialPopup({
                                  open: true,
                                  itemId: item.id,
                                  gate: item.gate || "",
                                  time: item.time || "",
                                  company: item.company || "",
                                  material: item.material || "",
                                  vehicle: item.vehicle || "",
                                  location: item.location || "",
                                })
                              }
                              className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                            >
                              수정
                            </button>
                          )}

                          {canDeleteOwnItem(item) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDabsItem(item.id)}
                              className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-slate-500">7게이트</div>

              {gate7.length === 0 ? (
                <div className="text-slate-400">입력 없음</div>
              ) : (
                gate7.map((item) => (
                  <div key={item.id} className="mb-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-medium text-slate-500">{item.company}</div>
                    <div className="mt-1 text-sm">자재명: {item.material}</div>
                    <div className="text-sm">차종: {item.vehicle}</div>

                    <div className="mt-1 flex items-start justify-between gap-2 text-sm">
                      <span>하역장소: {item.location}</span>

                      {!isCapturingImage && (
                        <div className="flex shrink-0 gap-1">
                          {canAdminEditDabsItem && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditMaterialPopup({
                                  open: true,
                                  itemId: item.id,
                                  gate: item.gate || "",
                                  time: item.time || "",
                                  company: item.company || "",
                                  material: item.material || "",
                                  vehicle: item.vehicle || "",
                                  location: item.location || "",
                                })
                              }
                              className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                            >
                              수정
                            </button>
                          )}

                          {canDeleteOwnItem(item) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDabsItem(item.id)}
                              className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </MobileListCard>
      );
    })}
  </div>
);

  const renderSoloWorkerDesktopTable = () => {
  const rows = getSoloWorkerRowsByCompany(soloRows, soloCompanyFilter);

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, item) => {
    const key = item.company || "-";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-black lg:block">
      <table className={TABLE_BASE_CLASS}>
        <thead>
          <tr className="bg-slate-100 text-slate-700">
            <th className="border border-black px-3 py-2 text-left w-[16%]">업체명</th>
            <th className="border border-black px-3 py-2 text-left w-[9%]">동</th>
            <th className="border border-black px-3 py-2 text-left w-[16%]">성명</th>
            <th className="border border-black px-3 py-2 text-left">작업 내용</th>
            <th className="border border-black px-3 py-2 text-left w-[10%]">고령자</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border border-black px-3 py-2 text-center text-slate-300" colSpan={5}>
                입력 없음
              </td>
            </tr>
          ) : (
            Object.entries(grouped).map(([company, list]) =>
              list.map((item, index) => {
                const color = getCompanyColorByList(company, soloCompanyColorList);
                const elderlyHighlight =
                  item.elderly === "o"
                    ? "bg-amber-50 text-amber-700 font-semibold"
                    : "text-slate-600";

                return (
                  <tr key={`${item.building}-${item.id}`}>
                    {index === 0 && (
                      <td
                        rowSpan={list.length}
                        className={cn(
                          "border border-black px-3 py-2 align-top font-semibold",
                          color.bg,
                          color.text
                        )}
                      >
                        {company}
                      </td>
                    )}

                    <td className="border border-black px-3 py-2 align-top font-medium text-slate-700">
                      {item.building}
                    </td>

                    <td className="border border-black px-3 py-2 align-top">
                      {item.name}
                    </td>

                    <td className="border border-black px-3 py-2 align-top">
                      <div className="flex items-center justify-between gap-2">
                        <span className="whitespace-pre-wrap break-all leading-relaxed">
                          {item.content}
                        </span>

                        {!isCapturingImage && (
                          <div className="flex shrink-0 gap-1">
                            {canAdminEditDabsItem && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditSoloPopup({
                                    open: true,
                                    itemId: item.id,
                                    oldBuilding: item.building || "",
                                    building: item.building || "",
                                    company: item.company || "",
                                    name: item.name || "",
                                    content: item.content || "",
                                    elderly: item.elderly || "x",
                                  })
                                }
                                className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                              >
                                수정
                              </button>
                            )}

                            {canDeleteOwnItem(item) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteSoloWorker(item.id, item.building || "")
                                }
                                className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className={cn("border border-black px-3 py-2 align-top", elderlyHighlight)}>
                      {item.elderly}
                    </td>
                  </tr>
                );
              })
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

  const renderSoloWorkerMobileCards = () => {
  const blocks = getSoloWorkerRowsByCompany(soloRows, soloCompanyFilter);

  return (
    <div className="space-y-3 lg:hidden">
      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
          조건에 맞는 단독작업자가 없습니다.
        </div>
      ) : (
        blocks.map((item) => {
          const color = getCompanyColorByList(item.company || "-", soloCompanyColorList);

          return (
            <div key={item.id} className="rounded-2xl border border-black bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.building}</div>
                  <div
                    className={cn(
                      "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                      color.bg,
                      color.border,
                      color.text
                    )}
                  >
                    {item.company}
                  </div>
                </div>

                {!isCapturingImage && (
                  <div className="flex shrink-0 gap-1">
                    {canAdminEditDabsItem && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditSoloPopup({
                            open: true,
                            itemId: item.id,
                            oldBuilding: item.building,
                            building: item.building,
                            company: item.company || "",
                            name: item.name || "",
                            content: item.content || "",
                            elderly: item.elderly || "x",
                          })
                        }
                        className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                      >
                        수정
                      </button>
                    )}

                    {canDeleteOwnItem(item) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSoloWorker(item.id, item.building)}
                        className="rounded-full border border-slate-300 p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="mr-2 font-medium text-slate-500">성명</span>
                  <span className="text-slate-900">{item.name}</span>
                </div>

                <div>
                  <span className="mr-2 font-medium text-slate-500">작업</span>
                  <span className="text-slate-900">{item.content}</span>
                </div>

                <div>
                  <span className="mr-2 font-medium text-slate-500">고령자</span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                      item.elderly === "o"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.elderly}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

const renderEditPopups = () => (
  <>
    {editSectionPopup.open && (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
          <div className="text-base font-semibold text-slate-900">작업 내용 수정</div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">동 선택</label>
            <select
              value={editSectionPopup.building}
              onChange={(e) =>
                setEditSectionPopup((prev) => ({ ...prev, building: e.target.value }))
              }
              className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">동 선택</option>
              {getDabsColumnsByTabKey(activeDabsKey).map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">업체명</label>
            <Input
              value={editSectionPopup.company}
              onChange={(e) =>
                setEditSectionPopup((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="업체명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">작업내용</label>
            <Input
              value={editSectionPopup.content}
              onSelect={(e) =>
                setEditSectionTextSelection({
                  start: e.currentTarget.selectionStart || 0,
                  end: e.currentTarget.selectionEnd || 0,
                })
              }
              onChange={(e) =>
                setEditSectionPopup((prev) => ({
                  ...prev,
                  content: e.target.value,
                  contentRedRanges: normalizeTextColorRanges(
                    prev.contentRedRanges,
                    e.target.value.length
                  ),
                }))
              }
              placeholder="작업내용 입력"
            />

            {activeDabsKey !== "fireWork" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    setEditSectionPopup((prev) => ({
                      ...prev,
                      contentRedRanges: addRedTextRange(
                        prev.contentRedRanges,
                        editSectionTextSelection.start,
                        editSectionTextSelection.end,
                        prev.content.length
                      ),
                    }))
                  }
                >
                  선택 빨강
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    setEditSectionPopup((prev) => ({
                      ...prev,
                      contentRedRanges: removeRedTextRange(
                        prev.contentRedRanges,
                        editSectionTextSelection.start,
                        editSectionTextSelection.end
                      ),
                    }))
                  }
                >
                  선택 해제
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full lg:w-auto"
              onClick={() =>
                setEditSectionPopup({
                  open: false,
                  itemId: "",
                  oldBuilding: "",
                  building: "",
                  company: "",
                  content: "",
                  contentRedRanges: [],
                })
              }
            >
              취소
            </Button>

            <Button className="w-full lg:w-auto" onClick={handleUpdateSectionWork}>
              저장
            </Button>
          </div>
        </div>
      </div>
    )}

    {editMaterialPopup.open && (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
          <div className="text-base font-semibold text-slate-900">자재반입 수정</div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">게이트</label>
            <select
              value={editMaterialPopup.gate}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, gate: e.target.value }))
              }
              className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="1">1게이트</option>
              <option value="7">7게이트</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">시간</label>
            <select
              value={editMaterialPopup.time}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, time: e.target.value }))
              }
              className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              {MATERIAL_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}시
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">업체명</label>
            <Input
              value={editMaterialPopup.company}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="업체명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">자재명</label>
            <Input
              value={editMaterialPopup.material}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, material: e.target.value }))
              }
              placeholder="자재명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">차종</label>
            <Input
              value={editMaterialPopup.vehicle}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, vehicle: e.target.value }))
              }
              placeholder="차종 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">하역장소</label>
            <Input
              value={editMaterialPopup.location}
              onChange={(e) =>
                setEditMaterialPopup((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="하역장소 입력"
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full lg:w-auto"
              onClick={() =>
                setEditMaterialPopup({
                  open: false,
                  itemId: "",
                  gate: "",
                  time: "",
                  company: "",
                  material: "",
                  vehicle: "",
                  location: "",
                })
              }
            >
              취소
            </Button>

            <Button className="w-full lg:w-auto" onClick={handleUpdateMaterial}>
              저장
            </Button>
          </div>
        </div>
      </div>
    )}

    {editSoloPopup.open && (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
          <div className="text-base font-semibold text-slate-900">단독작업자 수정</div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">동 선택</label>
            <select
              value={editSoloPopup.building}
              onChange={(e) =>
                setEditSoloPopup((prev) => ({ ...prev, building: e.target.value }))
              }
              className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">동 선택</option>
              {SOLO_WORKER_COLUMNS.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">업체명</label>
            <Input
              value={editSoloPopup.company}
              onChange={(e) =>
                setEditSoloPopup((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="업체명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">성명</label>
            <Input
              value={editSoloPopup.name}
              onChange={(e) =>
                setEditSoloPopup((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="성명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">작업내용</label>
            <Input
              value={editSoloPopup.content}
              onChange={(e) =>
                setEditSoloPopup((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="작업내용 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">고령자</label>
            <select
              value={editSoloPopup.elderly}
              onChange={(e) =>
                setEditSoloPopup((prev) => ({ ...prev, elderly: e.target.value }))
              }
              className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="o">고령자 o</option>
              <option value="x">고령자 x</option>
            </select>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full lg:w-auto"
              onClick={() =>
                setEditSoloPopup({
                  open: false,
                  itemId: "",
                  oldBuilding: "",
                  building: "",
                  company: "",
                  name: "",
                  content: "",
                  elderly: "x",
                })
              }
            >
              취소
            </Button>

            <Button className="w-full lg:w-auto" onClick={handleUpdateSoloWorker}>
              저장
            </Button>
          </div>
        </div>
      </div>
    )}
  </>
);

const renderDabsPage = () => {
    const selectedTabValue = dabsData[selectedDate]?.[activeDabsKey];
    const isImageTab = activeDabsKey === "highRisk" || activeDabsKey === "equipmentFlow";
    const isSectionTab = isSectionWorkTabKey(activeDabsKey);

const isMaterialTab = activeDabsKey === "materialsAfter1" || activeDabsKey === "materialsAfter0";

const activeColumns = getDabsColumnsByTabKey(activeDabsKey);
    const sectionRows = getMergedSectionRows(activeDabsKey);
    const materialList =
  typeof selectedTabValue === "object" && selectedTabValue && "list" in selectedTabValue
    ? selectedTabValue.list || []
    : [];

return (
      <div className="space-y-4 sm:space-y-6">
{renderTopBar()}
{renderEditPopups()}

{companyListPopupOpen && (
  <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            작업내용 업체명 목록
          </div>
          <div className="mt-1 text-xs text-slate-500">
            기준일: {formatMonthDay(selectedDate)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCompanyListPopupOpen(false)}
          className="rounded-full border border-slate-300 p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {getCompanyListFromWorkTabs().map((tab) => (
          <div key={tab.key} className="rounded-2xl border border-slate-200 p-3">
            <div className="text-sm font-semibold text-slate-900">
              {tab.label}
            </div>

            {tab.companies.length === 0 ? (
              <div className="mt-2 text-sm text-slate-400">
                입력된 업체명 없음
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {tab.companies.map((company) => (
                  <span
                    key={company}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    {company}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          variant="outline"
          onClick={() => setCompanyListPopupOpen(false)}
        >
          닫기
        </Button>
      </div>
    </div>
  </div>
)}

        {imagePopup.open && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="text-base font-semibold text-slate-900">작업내용 입력</div>

      {imagePopup.targetKey === "highRisk" && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-slate-600">동 선택</label>
          <select
            value={imagePopup.building}
            onChange={(e) =>
              setImagePopup((prev) => ({ ...prev, building: e.target.value }))
            }
            className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">동 선택</option>
            {HIGH_RISK_BUILDINGS.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </div>
      )}

      {imagePopup.targetKey === "equipmentFlow" && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-slate-600">장비 선택</label>
          <select
            value={imagePopup.equipmentType}
            onChange={(e) =>
              setImagePopup((prev) => ({ ...prev, equipmentType: e.target.value }))
            }
            className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            {EQUIPMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {canAdminEditDabsItem && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-slate-600">업체명</label>
          <Input
            value={imagePopup.company}
            onChange={(e) =>
              setImagePopup((prev) => ({ ...prev, company: e.target.value }))
            }
            placeholder="업체명 입력"
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-slate-600">작업내용</label>
        <Input
          value={imagePopup.note}
          onChange={(e) =>
            setImagePopup((prev) => ({ ...prev, note: e.target.value }))
          }
          placeholder="작업내용 입력"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" className="w-full lg:w-auto" onClick={cancelMarkerPopup}>
          취소
        </Button>
        <Button className="w-full lg:w-auto" onClick={submitMarkerPopup}>
          입력
        </Button>
      </div>
    </div>
  </div>
)}
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
  <CardTitle className="flex items-center gap-2">
    <MessageSquare className="h-5 w-5" />DAB&apos;s회의
  </CardTitle>

  <div className="flex flex-wrap gap-2">
    <Button
      variant="outline"
      onClick={() => setCompanyListPopupOpen(true)}
    >
      업체명 목록
    </Button>

    <Button
      variant="outline"
      onClick={() =>
        handleDownloadCaptureImage(
          dabsCaptureRef,
          `${activeDabsTab.label}-${selectedDate}`
        )
      }
    >
      이미지 다운로드
    </Button>

    <Button variant="outline" onClick={() => setCurrentPage("menu")}>
      메뉴로 돌아가기
    </Button>
  </div>
</CardHeader>
          <CardContent className="space-y-5">
            <div
  className={cn(
    "fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 flex-wrap justify-center gap-2 rounded-2xl border border-black bg-white/95 p-2 shadow-xl backdrop-blur lg:static lg:w-auto lg:max-w-none lg:translate-x-0 lg:justify-start lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
    imagePopup.open && "hidden lg:flex"
  )}
>
  {dabsTabs.map((tab, index) => (
    <button
      key={tab.key}
      onClick={() => setDabsTabIndex(index)}
      className={cn(
        "rounded-2xl px-3 py-2 text-sm font-medium transition lg:px-4",
        dabsTabIndex === index
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>
            <Card className="border-slate-200 shadow-none">
              <CardHeader><CardTitle className="text-base">{activeDabsTab.label}</CardTitle></CardHeader>
<CardContent className="space-y-3 p-2 md:p-6">
  <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
  선택 날짜: {formatMonthDay(selectedDate)}
</div>
  {isImageTab && <>{activeDabsKey === "highRisk" && canUploadDabsImage && <div className="space-y-2"><label className="text-xs font-medium text-slate-600">사진 업로드</label><Input type="file" accept="image/*" onChange={handleHighRiskImageUpload} className="h-auto py-2" /><div className="text-xs text-slate-500">업로드한 사진은 날짜와 관계없이 고위험작업과 장비동선 탭에 공통으로 표시됩니다.</div></div>}{activeDabsKey === "equipmentFlow" && (
  <div className="text-xs text-slate-500">
    첫 번째 클릭은 시작점, 두 번째 클릭은 종료점입니다. 작업내용 입력 후 상자를 표시할 위치를 한 번 더 클릭하세요. 수정 시에도 화살표를 다시 지정한 뒤 상자 위치를 선택합니다.
  </div>
)}{activeDabsKey === "highRisk" && <div className="text-xs text-slate-500">사진을 클릭하면 동, 업체명, 작업내용이 사진 위에 표시됩니다.</div>}<div ref={dabsCaptureRef} className="-mx-2 bg-white md:mx-0">
  {renderOverlayImage(
    activeDabsKey === "highRisk" ? dabsImages?.highRisk : dabsImages?.equipmentFlow,
    isImageTab
  )}
</div></>}
                {isSectionTab && <>
  <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_auto] md:items-end">
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-600">이전 날짜 선택</label>
      <Input
        type="date"
        value={loadSourceDate}
        onChange={(e) => setLoadSourceDate(e.target.value)}
        className="h-9"
      />
    </div>
    <Button
      variant="outline"
      onClick={() =>
  handleLoadPreviousCompanyData(activeDabsKey)
}
    >
      내 업체 작업 불러오기
    </Button>
  </div>

  <div className="grid gap-3 md:grid-cols-[180px_200px_1fr_auto]">
  <select
    value={sectionInput.building}
    onChange={(e) => setSectionInput({ ...sectionInput, building: e.target.value })}
    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
  >
    <option value="">동 선택</option>
    {activeColumns.map((column) => (
      <option key={column} value={column}>
        {column}
      </option>
    ))}
  </select>

  {(currentUser?.role === "master" || currentUser?.role === "admin") && (
    <Input
      value={sectionInput.company}
      onChange={(e) => setSectionInput({ ...sectionInput, company: e.target.value })}
      placeholder="업체명 입력"
    />
  )}

  <div className="space-y-2">
    <Input
      value={sectionInput.content}
      onSelect={(e) =>
        setSectionTextSelection({
          start: e.currentTarget.selectionStart || 0,
          end: e.currentTarget.selectionEnd || 0,
        })
      }
      onChange={(e) =>
        setSectionInput({
          ...sectionInput,
          content: e.target.value,
          contentRedRanges: normalizeTextColorRanges(
            sectionInput.contentRedRanges,
            e.target.value.length
          ),
        })
      }
      placeholder="작업내용 입력"
    />

    {activeDabsKey !== "fireWork" && (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            setSectionInput((prev) => ({
              ...prev,
              contentRedRanges: addRedTextRange(
                prev.contentRedRanges,
                sectionTextSelection.start,
                sectionTextSelection.end,
                prev.content.length
              ),
            }))
          }
        >
          선택 빨강
        </Button>

        <Button
          variant="outline"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            setSectionInput((prev) => ({
              ...prev,
              contentRedRanges: removeRedTextRange(
                prev.contentRedRanges,
                sectionTextSelection.start,
                sectionTextSelection.end
              ),
            }))
          }
        >
          선택 해제
        </Button>
      </div>
    )}
  </div>

  <Button onClick={handleAddSectionWork} disabled={!canEditDabs} className="w-full md:w-auto">
    추가
  </Button>
</div>

<div
  ref={dabsCaptureRef}
  className={cn(
    "bg-white",
  )}
>
  {renderSectionMobileCards(activeColumns, sectionRows)}

  <div
    className={cn(
  "hidden rounded-2xl border border-black bg-white lg:block",
  !isCapturingImage && "overflow-x-auto"
)}
    
  >
    <table
      className={TABLE_BASE_CLASS}
      
    >
      <colgroup>
  <col style={{ width: "9%" }} />
  <col style={{ width: "18%" }} />
  <col />
</colgroup>

      <thead>
        <tr className="bg-slate-100 text-slate-700">
          <th className="border border-black px-3 py-2 text-left">동</th>
          <th className="border border-black px-3 py-2 text-left">업체명</th>
          <th className="border border-black px-3 py-2 text-left">작업내용</th>
        </tr>
      </thead>

      <tbody>
  {activeColumns.flatMap((col) => {
    const list = sectionRows[col] || [];

    if (list.length === 0) {
      return [
        <tr key={col}>
          <td className="border border-black px-3 py-2 font-medium text-slate-700">
            {col}
          </td>

          <td className="border border-black px-3 py-2 text-slate-300">
            -
          </td>

          <td className="border border-black px-3 py-2 text-slate-300">
            -
          </td>
        </tr>,
      ];
    }

    return list.map((item, index) => (
      <tr key={`${col}-${item.id}`}>
        {index === 0 && (
          <td
            rowSpan={list.length}
            className="border border-black px-3 py-2 align-top font-medium text-slate-700"
          >
            {col}
          </td>
        )}

        <td
          className={cn(
            "border border-black px-3 py-2 align-top",
            index > 0 && "border-t border-dashed border-black"
          )}
        >
          {item.company}
        </td>

        <td
          className={cn(
            "border border-black px-3 py-2 align-top",
            index > 0 && "border-t border-dashed border-black"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="block w-full whitespace-pre-wrap break-all leading-relaxed">
              {renderTextWithRedRanges(item.content, item.contentRedRanges)}
            </span>

            {!isCapturingImage && (
              <div className="flex shrink-0 items-center gap-1">
                {canAdminEditDabsItem && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionPopup({
                        open: true,
                        itemId: item.id,
                        oldBuilding: col,
                        building: col,
                        company: item.company || "",
                        content: item.content || "",
                        contentRedRanges: item.contentRedRanges || [],
                      })
                    }
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                    title="수정"
                  >
                    수정
                  </button>
                )}

                {canDeleteOwnItem(item) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteDabsItem(item.id, col)}
                    className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                    title="삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    ));
  })}
</tbody>
    </table>
  </div>
</div></>}
                {isMaterialTab && <><div className="grid gap-3 md:grid-cols-7">
  <select
    value={materialsInput.gate}
    onChange={(e) => setMaterialsInput({ ...materialsInput, gate: e.target.value })}
    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
  >
    <option value="1">1게이트</option>
    <option value="7">7게이트</option>
  </select>

  <select
    value={materialsInput.time}
    onChange={(e) => setMaterialsInput({ ...materialsInput, time: e.target.value })}
    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
  >
    {MATERIAL_TIMES.map((time) => (
      <option key={time} value={time}>
        {time}시
      </option>
    ))}
  </select>

  {(currentUser?.role === "master" || currentUser?.role === "admin") && (
    <Input
      value={materialsInput.company}
      onChange={(e) => setMaterialsInput({ ...materialsInput, company: e.target.value })}
      placeholder="업체명"
    />
  )}

  <Input
    value={materialsInput.material}
    onChange={(e) => setMaterialsInput({ ...materialsInput, material: e.target.value })}
    placeholder="자재명"
  />

  <Input
    value={materialsInput.vehicle}
    onChange={(e) => setMaterialsInput({ ...materialsInput, vehicle: e.target.value })}
    placeholder="차종"
  />

  <Input
    value={materialsInput.location}
    onChange={(e) => setMaterialsInput({ ...materialsInput, location: e.target.value })}
    placeholder="하역장소"
  />

  <Button onClick={handleAddMaterial} disabled={!canEditDabs} className="w-full md:w-auto">
    추가
  </Button>
</div><div ref={dabsCaptureRef} className="bg-white">
  {renderMaterialsMobileCards(materialList)}
  <div className="hidden overflow-x-auto rounded-2xl border border-black bg-white lg:block"><table className={TABLE_BASE_CLASS}><thead>
  <tr className="bg-slate-100 text-slate-700">
    <th rowSpan={2} className="w-[8%] border border-black px-2 py-2 text-left">시간</th>
    <th colSpan={4} className="border border-black px-2 py-2 text-center">1게이트</th>
    <th colSpan={4} className="border border-black px-2 py-2 text-center">7게이트</th>
  </tr>
  <tr className="bg-slate-100 text-slate-700">
    <th className="w-[9%] border border-black px-2 py-2 text-left">업체명</th>
    <th className="w-[10%] border border-black px-2 py-2 text-left">자재명</th>
    <th className="w-[8%] border border-black px-2 py-2 text-left">차종</th>
    <th className="w-[13%] border border-black px-2 py-2 text-left">하역장소</th>
    <th className="w-[9%] border border-black px-2 py-2 text-left">업체명</th>
    <th className="w-[10%] border border-black px-2 py-2 text-left">자재명</th>
    <th className="w-[8%] border border-black px-2 py-2 text-left">차종</th>
    <th className="w-[13%] border border-black px-2 py-2 text-left">하역장소</th>
  </tr>
</thead><tbody>{MATERIAL_TIMES.map((time) => { const row = materialList.filter((item) => item.time === time); const gate1 = row.filter((item) => item.gate === "1"); const gate7 = row.filter((item) => item.gate === "7"); const renderCell = (items: DabsRowItem[], field: keyof DabsRowItem) =>
  items.map((item, index) => (
    <div
      key={`${field}-${item.id}`}
      className={cn(
        "mb-2 flex items-center justify-between gap-1",
        dottedRow(index)
      )}
    >
      <span className="whitespace-pre-wrap break-all leading-relaxed">
        {String(item[field] || "")}
      </span>

      {field === "location" && !isCapturingImage && (
        <div className="flex shrink-0 gap-1">
          {canAdminEditDabsItem && (
            <button
              type="button"
              onClick={() =>
                setEditMaterialPopup({
                  open: true,
                  itemId: item.id,
                  gate: item.gate || "",
                  time: item.time || "",
                  company: item.company || "",
                  material: item.material || "",
                  vehicle: item.vehicle || "",
                  location: item.location || "",
                })
              }
              className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
            >
              수정
            </button>
          )}

          {canDeleteOwnItem(item) && (
            <button
              type="button"
              onClick={() => handleDeleteDabsItem(item.id)}
              className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )); return <tr key={time}><td className="border border-black px-3 py-2 font-medium">{time}시</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate1, "company")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate1, "material")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate1, "vehicle")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate1, "location")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate7, "company")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate7, "material")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate7, "vehicle")}</td><td className="border border-black px-3 py-2 align-top">{renderCell(gate7, "location")}</td></tr>; })}</tbody></table></div>
</div></>}
                {!isImageTab && !isSectionTab && !isMaterialTab && <><TextArea value={dabsDraft} onChange={(e) => setDabsDraft(e.target.value)} placeholder="회의 내용, 작업사항, 확인사항 등을 입력하세요." /><div className="flex justify-end"><Button onClick={handleSaveDabsText} disabled={!canEditDabs} className="w-full lg:w-auto">저장</Button></div></>}
                {dabsMessage && <div className="text-sm text-slate-600">{dabsMessage}</div>}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none"><CardHeader><CardTitle className="text-base">하단 달력</CardTitle></CardHeader><CardContent><div className="grid grid-cols-7 gap-1 text-xs">{weekLabels.map((label) => <div key={label} className="rounded-lg bg-slate-100 py-2 text-center font-medium text-slate-600">{label}</div>)}{monthGrid.map((date) => { const key = formatDateKey(date); const isSelected = key === selectedDate; const isCurrentMonth = date.getMonth() === currentDate.getMonth(); return <button key={key} onClick={() => setSelectedDate(key)} className={cn("rounded-lg p-2 text-center transition", isSelected ? "bg-slate-900 text-white" : isCurrentMonth ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-50 text-slate-400")}>{date.getDate()}</button>; })}</div></CardContent></Card>
          </CardContent>
        </Card>
      </div>
    );
  };

const renderPortfolioActionButtons = (
  item: DabsRowItem,
  onEdit: () => void,
  onDelete: () => void
) => {
  if (isExportingPortfolioImages) return null;

  return (
    <div className="flex shrink-0 gap-1">
      {canAdminEditDabsItem && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-600 shadow-sm"
        >
          수정
        </button>
      )}

      {canDeleteOwnItem(item) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-red-600 shadow-sm"
        >
          삭제
        </button>
      )}
    </div>
  );
};

const renderPortfolioInputPanel = () => {
  if (isExportingPortfolioImages) return null;

  const currentSlide = portfolioSlides[portfolioSlideIndex];
  const isSoloTab = currentSlide?.type === "soloWorker";
  const inputKey = isSoloTab ? "soloWorker" : currentSlide?.tabKey || activeDabsKey;

  const isSectionTab = !isSoloTab && isSectionWorkTabKey(inputKey);
  const isMaterialTab =
    !isSoloTab && (inputKey === "materialsAfter0" || inputKey === "materialsAfter1");

  return (
    <div className="shrink-0 border-b border-black bg-slate-50 p-2 text-slate-900">
      {isSectionTab && (
        <div className="grid gap-2 md:grid-cols-[130px_160px_1fr_auto]">
          <select
            value={sectionInput.building}
            onChange={(e) =>
              setSectionInput({ ...sectionInput, building: e.target.value })
            }
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">동 선택</option>
            {getDabsColumnsByTabKey(inputKey).map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>

          {(currentUser?.role === "master" || currentUser?.role === "admin") && (
            <Input
              value={sectionInput.company}
              onChange={(e) =>
                setSectionInput({ ...sectionInput, company: e.target.value })
              }
              placeholder="업체명"
              className="h-9"
            />
          )}

          <Input
            value={sectionInput.content}
            onChange={(e) =>
              setSectionInput({
                ...sectionInput,
                content: e.target.value,
                contentRedRanges: normalizeTextColorRanges(
                  sectionInput.contentRedRanges,
                  e.target.value.length
                ),
              })
            }
            placeholder="작업내용"
            className="h-9"
          />

          <Button onClick={handleAddSectionWork} disabled={!canEditDabs} className="h-9">
            추가
          </Button>
        </div>
      )}

      {isMaterialTab && (
        <div className="grid gap-2 md:grid-cols-[100px_100px_140px_1fr_1fr_1fr_auto]">
          <select
            value={materialsInput.gate}
            onChange={(e) =>
              setMaterialsInput({ ...materialsInput, gate: e.target.value })
            }
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="1">1게이트</option>
            <option value="7">7게이트</option>
          </select>

          <select
            value={materialsInput.time}
            onChange={(e) =>
              setMaterialsInput({ ...materialsInput, time: e.target.value })
            }
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm"
          >
            {MATERIAL_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}시
              </option>
            ))}
          </select>

          {(currentUser?.role === "master" || currentUser?.role === "admin") && (
            <Input
              value={materialsInput.company}
              onChange={(e) =>
                setMaterialsInput({ ...materialsInput, company: e.target.value })
              }
              placeholder="업체명"
              className="h-9"
            />
          )}

          <Input
            value={materialsInput.material}
            onChange={(e) =>
              setMaterialsInput({ ...materialsInput, material: e.target.value })
            }
            placeholder="자재명"
            className="h-9"
          />

          <Input
            value={materialsInput.vehicle}
            onChange={(e) =>
              setMaterialsInput({ ...materialsInput, vehicle: e.target.value })
            }
            placeholder="차종"
            className="h-9"
          />

          <Input
            value={materialsInput.location}
            onChange={(e) =>
              setMaterialsInput({ ...materialsInput, location: e.target.value })
            }
            placeholder="하역장소"
            className="h-9"
          />

          <Button onClick={handleAddMaterial} disabled={!canEditDabs} className="h-9">
            추가
          </Button>
        </div>
      )}

      {isSoloTab && (
        <div className="grid gap-2 md:grid-cols-[110px_150px_130px_1fr_110px_auto]">
          <select
            value={soloWorkerInput.building}
            onChange={(e) =>
              setSoloWorkerInput({ ...soloWorkerInput, building: e.target.value })
            }
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">동 선택</option>
            {SOLO_WORKER_COLUMNS.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>

          {(currentUser?.role === "master" || currentUser?.role === "admin") && (
            <Input
              value={soloWorkerInput.company}
              onChange={(e) =>
                setSoloWorkerInput({ ...soloWorkerInput, company: e.target.value })
              }
              placeholder="업체명"
              className="h-9"
            />
          )}

          <Input
            value={soloWorkerInput.name}
            onChange={(e) =>
              setSoloWorkerInput({ ...soloWorkerInput, name: e.target.value })
            }
            placeholder="성명"
            className="h-9"
          />

          <Input
            value={soloWorkerInput.content}
            onChange={(e) =>
              setSoloWorkerInput({ ...soloWorkerInput, content: e.target.value })
            }
            placeholder="작업 내용"
            className="h-9"
          />

          <select
            value={soloWorkerInput.elderly}
            onChange={(e) =>
              setSoloWorkerInput({ ...soloWorkerInput, elderly: e.target.value })
            }
            className="h-9 rounded-xl border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="o">고령자 o</option>
            <option value="x">고령자 x</option>
          </select>

          <Button onClick={handleAddSoloWorker} disabled={!canEditDabs} className="h-9">
            추가
          </Button>
        </div>
      )}
    </div>
  );
};

const renderPortfolioSectionTable = (tabKey: string, columns: string[], title: string) => {

  const rows = getMergedSectionRows(tabKey);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-1">
  <table className="w-[96vw] max-w-[100vw] table-fixed border-collapse bg-white text-[17px] xl:text-[18px]">
  <caption className="caption-top pb-1 text-left font-bold text-slate-900">
    {title}
  </caption>
        <colgroup>
  <col style={{ width: "9%" }} />
  <col style={{ width: "11%" }} />
  <col />
</colgroup>

        <thead>
          <tr className="bg-slate-100 text-slate-800">
            <th className="border border-black px-3 py-2 text-left">동</th>
            <th className="border border-black px-3 py-2 text-left">업체명</th>
            <th className="border border-black px-3 py-2 text-left">작업내용</th>
          </tr>
        </thead>

        <tbody>
          {columns.flatMap((col) => {
            const list = rows[col] || [];

            if (list.length === 0) {
              return [
                <tr key={col}>
                  <td className="border border-black px-3 py-2 font-semibold text-slate-700">
                    {col}
                  </td>
                  <td className="border border-black px-3 py-2 text-slate-300">-</td>
                  <td className="border border-black px-3 py-2 text-slate-300">-</td>
                </tr>,
              ];
            }

            return list.map((item, index) => (
              <tr key={`${col}-${item.id}`}>
                {index === 0 && (
                  <td
                    rowSpan={list.length}
                    className="border border-black px-3 py-2 align-top font-semibold text-slate-700"
                  >
                    {col}
                  </td>
                )}

                <td
                  className={cn(
                    "border border-black px-3 py-2 align-top font-semibold",
                    index > 0 && "border-t border-dashed border-black"
                  )}
                >
                  {item.company}
                </td>

                <td
                  className={cn(
                    "border border-black px-3 py-2 align-top",
                    index > 0 && "border-t border-dashed border-black"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
  <span className="whitespace-pre-wrap break-all leading-relaxed">
    {renderTextWithRedRanges(item.content, item.contentRedRanges)}
  </span>

  {renderPortfolioActionButtons(
    item,
    () =>
      setEditSectionPopup({
        open: true,
        itemId: item.id,
        oldBuilding: col,
        building: col,
        company: item.company || "",
        content: item.content || "",
        contentRedRanges: item.contentRedRanges || [],
      }),
    () => handleDeleteDabsItem(item.id, col)
  )}
</div>
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
};

const renderPortfolioMaterialTable = (tabKey: string, title: string) => {
  const tabValue = dabsData[selectedDate]?.[tabKey];
  const list =
    typeof tabValue === "object" && tabValue && "list" in tabValue
      ? tabValue.list || []
      : [];

  return (
    <div className="flex h-full w-full items-start justify-center overflow-auto p-6">
      <table className="w-[88vw] table-fixed border-collapse bg-white text-[20px]">
  <caption className="caption-top pb-1 text-left font-bold text-slate-900">
    {title}
  </caption>
        <thead>
          <tr className="bg-slate-100 text-slate-800">
            <th rowSpan={2} className="w-[8%] border border-black px-3 py-3 text-left">
              시간
            </th>
            <th colSpan={4} className="border border-black px-3 py-3 text-center">
              1게이트
            </th>
            <th colSpan={4} className="border border-black px-3 py-3 text-center">
              7게이트
            </th>
          </tr>
          <tr className="bg-slate-100 text-slate-800">
            <th className="border border-black px-3 py-3 text-left">업체명</th>
            <th className="border border-black px-3 py-3 text-left">자재명</th>
            <th className="border border-black px-3 py-3 text-left">차종</th>
            <th className="border border-black px-3 py-3 text-left">하역장소</th>
            <th className="border border-black px-3 py-3 text-left">업체명</th>
            <th className="border border-black px-3 py-3 text-left">자재명</th>
            <th className="border border-black px-3 py-3 text-left">차종</th>
            <th className="border border-black px-3 py-3 text-left">하역장소</th>
          </tr>
        </thead>

        <tbody>
          {MATERIAL_TIMES.map((time) => {
            const row = list.filter((item) => item.time === time);
            const gate1 = row.filter((item) => item.gate === "1");
            const gate7 = row.filter((item) => item.gate === "7");

            const renderCell = (items: DabsRowItem[], field: keyof DabsRowItem) =>
  items.length === 0
    ? "-"
    : items.map((item, index) => (
        <div
          key={`${field}-${item.id}`}
          className={cn(
            "whitespace-pre-wrap break-all leading-relaxed",
            index > 0 && "mt-2 border-t border-dashed border-black pt-2"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span>{String(item[field] || "")}</span>

            {field === "location" &&
              renderPortfolioActionButtons(
                item,
                () =>
                  setEditMaterialPopup({
                    open: true,
                    itemId: item.id,
                    gate: item.gate || "",
                    time: item.time || "",
                    company: item.company || "",
                    material: item.material || "",
                    vehicle: item.vehicle || "",
                    location: item.location || "",
                  }),
                () => handleDeleteDabsItem(item.id)
              )}
          </div>
        </div>
      ));

            return (
              <tr key={time}>
                <td className="border border-black px-3 py-3 font-semibold">{time}시</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate1, "company")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate1, "material")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate1, "vehicle")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate1, "location")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate7, "company")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate7, "material")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate7, "vehicle")}</td>
                <td className="border border-black px-3 py-3 align-top">{renderCell(gate7, "location")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const renderPortfolioSoloWorkerTable = (
  items: Array<DabsRowItem & { building: string }>,
  title: string
) => {
  const grouped = items.reduce<Record<string, Array<DabsRowItem & { building: string }>>>(
    (acc, item) => {
      const key = item.company || "-";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-1">
      <table className="w-[96vw] max-w-[100vw] table-fixed border-collapse bg-white text-[17px] xl:text-[18px]">
        <caption className="caption-top pb-1 text-left font-bold text-slate-900">
          {title}
        </caption>

        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "14%" }} />
          <col />
          <col style={{ width: "8%" }} />
        </colgroup>

        <thead>
          <tr className="bg-slate-100 text-slate-800">
            <th className="border border-black px-3 py-2 text-left">업체명</th>
            <th className="border border-black px-3 py-2 text-left">동</th>
            <th className="border border-black px-3 py-2 text-left">성명</th>
            <th className="border border-black px-3 py-2 text-left">작업내용</th>
            <th className="border border-black px-3 py-2 text-left">고령자</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                className="border border-black px-3 py-2 text-center text-slate-300"
                colSpan={5}
              >
                입력 없음
              </td>
            </tr>
          ) : (
            Object.entries(grouped).map(([company, list]) =>
              list.map((item, index) => (
                <tr key={`${item.building}-${item.id}`}>
                  {index === 0 && (
                    <td
                      rowSpan={list.length}
                      className="border border-black px-3 py-2 align-top font-semibold"
                    >
                      {company}
                    </td>
                  )}

                  <td className="border border-black px-3 py-2 align-top font-medium text-slate-700">
                    {item.building}
                  </td>

                  <td className="border border-black px-3 py-2 align-top">
                    {item.name}
                  </td>

                  <td className="border border-black px-3 py-2 align-top">
                    <div className="flex items-start justify-between gap-2">
  <span className="whitespace-pre-wrap break-all leading-relaxed">
    {item.content}
  </span>

  {renderPortfolioActionButtons(
    item,
    () =>
      setEditSoloPopup({
        open: true,
        itemId: item.id,
        oldBuilding: item.building || "",
        building: item.building || "",
        company: item.company || "",
        name: item.name || "",
        content: item.content || "",
        elderly: item.elderly || "x",
      }),
    () => handleDeleteSoloWorker(item.id, item.building || "")
  )}
</div>
                  </td>

                  <td
                    className={cn(
                      "border border-black px-3 py-2 align-top",
                      item.elderly === "o"
                        ? "bg-amber-50 font-semibold text-amber-700"
                        : "text-slate-600"
                    )}
                  >
                    {item.elderly}
                  </td>
                </tr>
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

const renderPortfolioPage = () => {
  const slide = portfolioSlides[portfolioSlideIndex];

  if (!slide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        표시할 페이지가 없습니다.
      </div>
    );
  }

  const goPrev = () => {
    setPortfolioSlideIndex((prev) =>
      prev <= 0 ? portfolioSlides.length - 1 : prev - 1
    );
  };

  const goNext = () => {
    setPortfolioSlideIndex((prev) =>
      prev >= portfolioSlides.length - 1 ? 0 : prev + 1
    );
  };

  return (
  <>
    {renderEditPopups()}

    <div
      ref={portfolioCaptureRef}
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div>
          <div className="text-sm font-bold leading-tight">{slide.label}</div>
          <div className="text-[10px] leading-tight text-slate-300">
            기준일: {formatMonthDay(selectedDate)} · {portfolioSlideIndex + 1} / {portfolioSlides.length}
          </div>
        </div>

        {!isExportingPortfolioImages && (
  <div className="flex gap-2">
    <Button variant="outline" onClick={goPrev}>
      이전
    </Button>
    <Button variant="outline" onClick={goNext}>
      다음
    </Button>
    <Button
      onClick={() => {
        setCurrentPage("menu");
        setPortfolioSlideIndex(0);
      }}
    >
      종료
    </Button>
  </div>
)}
      </div>

      {renderPortfolioInputPanel()}

<div className="min-h-0 flex-1 bg-white text-slate-900">
        {slide.type === "overlay" && (
  <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white p-4">
    <div className="h-full w-full origin-center scale-90">
      {renderOverlayImage(
        slide.key === "highRisk" ? dabsImages?.highRisk : dabsImages?.equipmentFlow,
        true,
        slide.key
      )}
    </div>
  </div>
)}

        {slide.type === "section" &&
          slide.tabKey &&
          renderPortfolioSectionTable(slide.tabKey, slide.columns || [], slide.label)}

        {slide.type === "material" &&
          slide.tabKey &&
          renderPortfolioMaterialTable(slide.tabKey, slide.label)}

        {slide.type === "soloWorker" &&
          renderPortfolioSoloWorkerTable(slide.soloItems || [], slide.label)}
      </div>

      {!isExportingPortfolioImages && (
  <div className="flex h-6 shrink-0 items-center justify-center gap-1 border-t border-white/10 bg-slate-950 px-2">
        {portfolioSlides.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPortfolioSlideIndex(index)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === portfolioSlideIndex
                ? "w-5 bg-white"
: "w-1.5 bg-white/30 hover:bg-white/60"
            )}
            title={item.label}
          />
        ))}
        </div>
)}
        </div>
  </>
  );
};
const renderHeatwavePage = () => {
  const myCompanyName = String(currentUser?.companyName || "").trim();
  const myStatus = myCompanyName ? getHeatwaveCompanyStatus(myCompanyName) : null;
const myImageTarget = myCompanyName ? heatwaveImageSelectedCompanies.includes(myCompanyName) : false;
const myExcelTarget = myCompanyName ? heatwaveExcelSelectedCompanies.includes(myCompanyName) : false;
const myComplete =
  (!myImageTarget ||
    ((myStatus?.thermoPhotoCount || 0) >= 4 &&
      (myStatus?.thermoLedgerCount || 0) >= 1)) &&
  (!myExcelTarget || (myStatus?.breakTimeLedgerCount || 0) >= 1);

  const heatSensitiveList = getSoloWorkerRowsByCompany(
    heatSensitiveRows,
    heatSensitiveCompanyFilter
  );

  const heatSensitiveGrouped = heatSensitiveList.reduce(
    (acc, item) => {
      const key = item.company || "-";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, Array<DabsRowItem & { building: string }>>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}
{renderEditPopups()}

{heatwaveStatusPopupOpen && (
  <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">
            혹서기 업로드 현황
          </div>
          <div className="mt-1 text-xs text-slate-500">
            기준일: {formatMonthDay(selectedDate)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHeatwaveStatusPopupOpen(false)}
          className="rounded-full border border-slate-300 p-1 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-[22%] border border-black px-3 py-2 text-left">업체명</th>
<th className="w-[18%] border border-black px-3 py-2 text-left">온습도계 사진</th>
<th className="w-[20%] border border-black px-3 py-2 text-left">온습도계 관리대장</th>
<th className="w-[20%] border border-black px-3 py-2 text-left">휴게시간 관리대장</th>
<th className="border border-black px-3 py-2 text-left">상태</th>
            </tr>
          </thead>

          <tbody>
            {Array.from(new Set([...heatwaveImageSelectedCompanies, ...heatwaveExcelSelectedCompanies]))
  .filter((companyName) => isHeatwaveAdmin || companyName === myCompanyName)
  .sort((a, b) => a.localeCompare(b, "ko"))
  .map((companyName) => {
                const status = getHeatwaveCompanyStatus(companyName);
                const imageTarget = heatwaveImageSelectedCompanies.includes(companyName);
                const excelTarget = heatwaveExcelSelectedCompanies.includes(companyName);

                const complete =
  (!imageTarget || (status.thermoPhotoCount >= 4 && status.thermoLedgerCount >= 1)) &&
  (!excelTarget || status.breakTimeLedgerCount >= 1);

                return (
                  <tr key={companyName}>
                    <td className="border border-black px-3 py-2 font-semibold">
                      {companyName}
                    </td>

                    <td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    imageTarget && status.thermoPhotoCount >= 4
      ? "bg-green-100 text-green-700"
      : imageTarget
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {imageTarget ? `${Math.min(status.thermoPhotoCount, 4)}/4` : "대상 아님"}
</td>

<td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    imageTarget && status.thermoLedgerCount >= 1
      ? "bg-green-100 text-green-700"
      : imageTarget
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {imageTarget ? `${Math.min(status.thermoLedgerCount, 1)}/1` : "대상 아님"}
</td>

<td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    excelTarget && status.breakTimeLedgerCount >= 1
      ? "bg-green-100 text-green-700"
      : excelTarget
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {excelTarget ? `${Math.min(status.breakTimeLedgerCount, 1)}/1` : "대상 아님"}
</td>

                    <td className="border border-black px-3 py-2 font-semibold">
                      {complete ? "완료" : "미완료"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={() => setHeatwaveStatusPopupOpen(false)}>
          닫기
        </Button>
      </div>
    </div>
  </div>
)}

<Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            혹서기
          </CardTitle>

          <div className="flex flex-wrap gap-2">
  {isHeatwaveAdmin && (
  <Button variant="outline" onClick={() => setHeatwaveStatusPopupOpen(true)}>
    업로드 현황
  </Button>
)}

  <Button variant="outline" onClick={() => setCurrentPage("menu")}>
    메뉴로 돌아가기
  </Button>
</div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHeatwaveTab("upload")}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                heatwaveTab === "upload"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              혹서기 업로드
            </button>

            <button
              type="button"
              onClick={() => setHeatwaveTab("heatSensitive")}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                heatwaveTab === "heatSensitive"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              온열질환 민감군
            </button>
          </div>

          {heatwaveTab === "upload" && (
            <>
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                선택 날짜: {formatMonthDay(selectedDate)} · 온습도계 사진 4개, 온습도계 관리대장 1개, 휴게시간 관리대장 1개 업로드
              </div>

              <Card className="border-slate-200 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">내 업체 업로드</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {!myCompanyName ? (
                    <div className="text-sm text-slate-500">업체 정보가 없습니다.</div>
                  ) : !myImageTarget && !myExcelTarget ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      현재 업체는 온습도계/휴게시간 관리대장 업로드 대상 업체로 체크되어 있지 않습니다.
                    </div>
                  ) : (
                    <>
  <div
  className={cn(
    "grid gap-3",
    myImageTarget && myExcelTarget ? "md:grid-cols-2" : "md:grid-cols-1"
  )}
>
  {myImageTarget && (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-900">온습도계 사진 업로드</div>
        <div className="mt-1 text-xs text-slate-500">
          현재 {myStatus?.thermoPhotoCount || 0}/4개
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => handleHeatwaveUpload(event, "thermoPhoto")}
          className="mt-3 h-auto py-2"
          disabled={(myStatus?.thermoPhotoCount || 0) >= 4}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-900">온습도계 관리대장 업로드</div>
        <div className="mt-1 text-xs text-slate-500">
          현재 {myStatus?.thermoLedgerCount || 0}/1개
        </div>
        <Input
          type="file"
          accept=".xls,.xlsx,.pdf,image/*"
          onChange={(event) => handleHeatwaveUpload(event, "thermoLedger")}
          className="mt-3 h-auto py-2"
          disabled={(myStatus?.thermoLedgerCount || 0) >= 1}
        />
      </div>
    </div>
  )}

  {myExcelTarget && (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">휴게시간 관리대장 업로드</div>
      <div className="mt-1 text-xs text-slate-500">
        현재 {myStatus?.breakTimeLedgerCount || 0}/1개
      </div>
      <Input
        type="file"
        accept=".xls,.xlsx,.pdf,image/*"
        onChange={(event) => handleHeatwaveUpload(event, "breakTimeLedger")}
        className="mt-3 h-auto py-2"
        disabled={(myStatus?.breakTimeLedgerCount || 0) >= 1}
      />
    </div>
  )}
</div>
                      <div
                        className={cn(
                          "rounded-2xl p-4 text-sm font-semibold",
                          myComplete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {myComplete ? "오늘 혹서기 업로드 완료" : "오늘 혹서기 업로드 미완료"}
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-900">
                          내 업체 업로드 파일
                        </div>
                        {renderHeatwaveUploadFileList(myCompanyName)}
                      </div>
                    </>
                  )}

                  {heatwaveMessage && <div className="text-sm text-slate-600">{heatwaveMessage}</div>}
                </CardContent>
              </Card>

                {canManageHeatwaveCompanies && (
  <Card className="border-slate-200 shadow-none">
    <CardHeader>
      <CardTitle className="text-base">혹서기 대상 업체 선택</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {approvedCompanyNames.map((companyName) => {
                        const imageChecked = heatwaveImageSelectedCompanies.includes(companyName);
const excelChecked = heatwaveExcelSelectedCompanies.includes(companyName);
const checked = imageChecked || excelChecked;
const status = getHeatwaveCompanyStatus(companyName);
const thermoPhotoDone = status.thermoPhotoCount >= 4;
const thermoLedgerDone = status.thermoLedgerCount >= 1;
const breakTimeDone = status.breakTimeLedgerCount >= 1;

                        return (
                          <label
                            key={companyName}
                            className={cn(
                              "flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 text-sm transition",
                              checked ? "border-slate-900 bg-white" : "border-slate-200 bg-slate-50",
                              checked && "border-slate-900 bg-white"
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-semibold">{companyName}</span>

<label className="ml-auto flex items-center gap-1 text-xs">
  <input
    type="checkbox"
    checked={imageChecked}
    onChange={() => handleToggleHeatwaveCompany(companyName, "image")}
    className="h-4 w-4"
  />
  온습도계
</label>

<label className="flex items-center gap-1 text-xs">
  <input
    type="checkbox"
    checked={excelChecked}
    onChange={() => handleToggleHeatwaveCompany(companyName, "excel")}
    className="h-4 w-4"
  />
  휴게시간 관리대장
</label>
                            </span>

                            {checked && (
  <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
    <span
      className={cn(
        "rounded px-2 py-1",
        thermoPhotoDone
          ? "bg-green-100 text-green-700"
          : "bg-red-50 text-red-700"
      )}
    >
      온습도계 사진 {Math.min(status.thermoPhotoCount, 4)}/4
    </span>

    <span
      className={cn(
        "rounded px-2 py-1",
        thermoLedgerDone
          ? "bg-green-100 text-green-700"
          : "bg-red-50 text-red-700"
      )}
    >
      온습도계 관리대장 {Math.min(status.thermoLedgerCount, 1)}/1
    </span>

    <span
      className={cn(
        "rounded px-2 py-1",
        breakTimeDone
          ? "bg-green-100 text-green-700"
          : "bg-red-50 text-red-700"
      )}
    >
      휴게시간 관리대장 {Math.min(status.breakTimeLedgerCount, 1)}/1
    </span>
  </div>
)}
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
</Card>
)}

              <Card className="border-slate-200 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">업체별 업로드 현황</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-black">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="w-[22%] border border-black px-3 py-2 text-left">업체명</th>
<th className="w-[18%] border border-black px-3 py-2 text-left">온습도계 사진</th>
<th className="w-[20%] border border-black px-3 py-2 text-left">온습도계 관리대장</th>
<th className="w-[20%] border border-black px-3 py-2 text-left">휴게시간 관리대장</th>
<th className="border border-black px-3 py-2 text-left">상태</th>
                        </tr>
                      </thead>

                      <tbody>
                        {Array.from(new Set([...heatwaveImageSelectedCompanies, ...heatwaveExcelSelectedCompanies]))
  .filter((companyName) => isHeatwaveAdmin || companyName === myCompanyName)
  .sort((a, b) => a.localeCompare(b, "ko"))
  .map((companyName) => {
                          const status = getHeatwaveCompanyStatus(companyName);

                          return (
                            <tr key={companyName}>
  <td className="border border-black px-3 py-2 font-semibold">{companyName}</td>

  <td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    heatwaveImageSelectedCompanies.includes(companyName) &&
      status.thermoPhotoCount >= 4
      ? "bg-green-100 text-green-700"
      : heatwaveImageSelectedCompanies.includes(companyName)
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {heatwaveImageSelectedCompanies.includes(companyName)
    ? `${Math.min(status.thermoPhotoCount, 4)}/4`
    : "대상 아님"}
</td>

  <td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    heatwaveImageSelectedCompanies.includes(companyName) &&
      status.thermoLedgerCount >= 1
      ? "bg-green-100 text-green-700"
      : heatwaveImageSelectedCompanies.includes(companyName)
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {heatwaveImageSelectedCompanies.includes(companyName)
    ? `${Math.min(status.thermoLedgerCount, 1)}/1`
    : "대상 아님"}
</td>

  <td
  className={cn(
    "border border-black px-3 py-2 font-semibold",
    heatwaveExcelSelectedCompanies.includes(companyName) &&
      status.breakTimeLedgerCount >= 1
      ? "bg-green-100 text-green-700"
      : heatwaveExcelSelectedCompanies.includes(companyName)
      ? "bg-red-50 text-red-700"
      : ""
  )}
>
  {heatwaveExcelSelectedCompanies.includes(companyName)
    ? `${Math.min(status.breakTimeLedgerCount, 1)}/1`
    : "대상 아님"}
</td>

  <td className="border border-black px-3 py-2 font-semibold">
    <div>
      {(!heatwaveImageSelectedCompanies.includes(companyName) ||
  (status.thermoPhotoCount >= 4 && status.thermoLedgerCount >= 1)) &&
(!heatwaveExcelSelectedCompanies.includes(companyName) ||
  status.breakTimeLedgerCount >= 1)
  ? "완료"
  : "미완료"}
    </div>

    <div className="mt-2">
      {renderHeatwaveUploadFileList(companyName)}
    </div>
  </td>
</tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {heatwaveTab === "heatSensitive" && (
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">온열질환 민감군</CardTitle>

                <Button
                  variant="outline"
                  onClick={() =>
                    handleDownloadCaptureImage(
                      heatSensitiveCaptureRef,
                      `온열질환민감군-${selectedDate}`
                    )
                  }
                >
                  이미지 다운로드
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                  선택 날짜: {formatMonthDay(selectedDate)}
                </div>

                <div className="grid gap-3 xl:grid-cols-[140px_180px_150px_1fr_120px_auto]">
                  <select
                    value={heatSensitiveInput.building}
                    onChange={(e) =>
                      setHeatSensitiveInput({ ...heatSensitiveInput, building: e.target.value })
                    }
                    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">동 선택</option>
                    {SOLO_WORKER_COLUMNS.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>

                  {(currentUser?.role === "master" || currentUser?.role === "admin") && (
                    <Input
                      value={heatSensitiveInput.company}
                      onChange={(e) =>
                        setHeatSensitiveInput({ ...heatSensitiveInput, company: e.target.value })
                      }
                      placeholder="업체명 입력"
                    />
                  )}

                  <Input
                    value={heatSensitiveInput.name}
                    onChange={(e) =>
                      setHeatSensitiveInput({ ...heatSensitiveInput, name: e.target.value })
                    }
                    placeholder="성명 입력"
                  />

                  <div className="space-y-2">
  <Input
    value={heatSensitiveInput.content}
    onChange={(e) =>
      setHeatSensitiveInput({ ...heatSensitiveInput, content: e.target.value })
    }
    placeholder="작업 내용 입력"
  />

  <div className="ml-auto w-1/2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
  <div className="font-semibold text-amber-900">민감군 작성 기준</div>

  <div className="mt-1">
    <span className="font-semibold">건설업신규자</span>
    {" : "}
    2주내 건설현장 근무이력 X
  </div>

  <div>
    <span className="font-semibold">유질환자</span>
    {" : "}
    고혈압 등 개인지병 유질환자, 특정(정신질환)약물 복용자, 과거 온열질환 병력자
  </div>
</div>
</div>

<select
  value={heatSensitiveInput.elderly}
                    onChange={(e) =>
                      setHeatSensitiveInput({ ...heatSensitiveInput, elderly: e.target.value })
                    }
                    className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="유질환자">유질환자</option>
<option value="고령자">고령자</option>
<option value="건설업신규자">건설업신규자</option>
                  </select>

                  <Button onClick={handleAddHeatSensitive} disabled={!canEditDabs} className="w-full xl:w-auto">
                    추가
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      value={heatSensitiveCompanyFilter}
                      onChange={(e) => setHeatSensitiveCompanyFilter(e.target.value)}
                      placeholder="업체명 검색"
                    />
                  </div>
                  <div className="text-xs text-slate-500">
                    민감군 o는 강조 표시되며, 업체별 색상이 자동 적용됩니다.
                  </div>
                </div>

                {dabsMessage && <div className="text-sm text-slate-600">{dabsMessage}</div>}

                <div ref={heatSensitiveCaptureRef} className="bg-white">
                  <div className="space-y-3 lg:hidden">
                    {heatSensitiveList.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                        조건에 맞는 온열질환 민감군이 없습니다.
                      </div>
                    ) : (
                      heatSensitiveList.map((item) => {
                        const color = getCompanyColorByList(item.company || "-", heatSensitiveCompanyColorList);

                        return (
                          <div key={item.id} className="rounded-2xl border border-black bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{item.building}</div>
                                <div
                                  className={cn(
                                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                                    color.bg,
                                    color.border,
                                    color.text
                                  )}
                                >
                                  {item.company}
                                </div>
                              </div>

                              {!isCapturingImage && (
                                <div className="flex shrink-0 gap-1">
                                  {canAdminEditDabsItem && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditHeatSensitivePopup({
                                          open: true,
                                          itemId: item.id,
                                          oldBuilding: item.building,
                                          building: item.building,
                                          company: item.company || "",
                                          name: item.name || "",
                                          content: item.content || "",
                                          elderly: item.elderly || "x",
                                        })
                                      }
                                      className="rounded-full border border-slate-300 px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                                    >
                                      수정
                                    </button>
                                  )}

                                  {canDeleteOwnItem(item) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteHeatSensitive(item.id, item.building)}
                                      className="rounded-full border border-slate-300 p-1 text-slate-500 hover:bg-slate-100"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="mr-2 font-medium text-slate-500">성명</span>
                                <span className="text-slate-900">{item.name}</span>
                              </div>

                              <div>
                                <span className="mr-2 font-medium text-slate-500">작업</span>
                                <span className="text-slate-900">{item.content}</span>
                              </div>

                              <div>
                                <span className="mr-2 font-medium text-slate-500">민감군</span>
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                                    item.elderly
  ? "bg-amber-100 text-amber-700"
  : "bg-slate-100 text-slate-600"
                                  )}
                                >
                                  {item.elderly}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="hidden overflow-x-auto rounded-2xl border border-black lg:block">
                    <table className={TABLE_BASE_CLASS}>
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="border border-black px-3 py-2 text-left w-[16%]">업체명</th>
                          <th className="border border-black px-3 py-2 text-left w-[9%]">동</th>
                          <th className="border border-black px-3 py-2 text-left w-[16%]">성명</th>
                          <th className="border border-black px-3 py-2 text-left">작업 내용</th>
                          <th className="border border-black px-3 py-2 text-left w-[10%]">민감군</th>
                        </tr>
                      </thead>

                      <tbody>
                        {heatSensitiveList.length === 0 ? (
                          <tr>
                            <td className="border border-black px-3 py-2 text-center text-slate-300" colSpan={5}>
                              입력 없음
                            </td>
                          </tr>
                        ) : (
                          Object.entries(heatSensitiveGrouped).map(([company, list]) =>
                            list.map((item, index) => {
                              const color = getCompanyColorByList(company, heatSensitiveCompanyColorList);
                              const sensitiveHighlight =
  item.elderly
    ? "bg-amber-50 text-amber-700 font-semibold"
    : "text-slate-600";

                              return (
                                <tr key={`${item.building}-${item.id}`}>
                                  {index === 0 && (
                                    <td
                                      rowSpan={list.length}
                                      className={cn(
                                        "border border-black px-3 py-2 align-top font-semibold",
                                        color.bg,
                                        color.text
                                      )}
                                    >
                                      {company}
                                    </td>
                                  )}

                                  <td className="border border-black px-3 py-2 align-top font-medium text-slate-700">
                                    {item.building}
                                  </td>

                                  <td className="border border-black px-3 py-2 align-top">
                                    {item.name}
                                  </td>

                                  <td className="border border-black px-3 py-2 align-top">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="whitespace-pre-wrap break-all leading-relaxed">
                                        {item.content}
                                      </span>

                                      {!isCapturingImage && (
                                        <div className="flex shrink-0 gap-1">
                                          {canAdminEditDabsItem && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setEditHeatSensitivePopup({
                                                  open: true,
                                                  itemId: item.id,
                                                  oldBuilding: item.building || "",
                                                  building: item.building || "",
                                                  company: item.company || "",
                                                  name: item.name || "",
                                                  content: item.content || "",
                                                  elderly: item.elderly || "x",
                                                })
                                              }
                                              className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                                            >
                                              수정
                                            </button>
                                          )}

                                          {canDeleteOwnItem(item) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDeleteHeatSensitive(item.id, item.building || "")
                                              }
                                              className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  <td className={cn("border border-black px-3 py-2 align-top", sensitiveHighlight)}>
                                    {item.elderly}
                                  </td>
                                </tr>
                              );
                            })
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
                </CardContent>
      </Card>

      <div className="bg-white">
        {renderBottomCalendar()}
      </div>
    </div>
  );
};

  const renderEducationPage = () => (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}
{editEntryPopup.open && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="text-base font-semibold text-slate-900">교육일정 수정</div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-slate-600">일자 선택</label>
        <Input
          type="date"
          value={editEntryPopup.date}
          onChange={(e) =>
            setEditEntryPopup((prev) => ({
              ...prev,
              date: e.target.value,
            }))
          }
          className="h-9"
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-slate-600">업체명</label>
        <Input
          value={editEntryPopup.companyName}
          onChange={(e) =>
            setEditEntryPopup((prev) => ({
              ...prev,
              companyName: e.target.value,
            }))
          }
          placeholder="업체명 입력"
        />
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-xs font-medium text-slate-600">시간 선택</label>
        <select
          value={editEntryPopup.startTime}
          onChange={(e) =>
            setEditEntryPopup((prev) => ({
              ...prev,
              startTime: e.target.value,
            }))
          }
          className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          {timeOptions.map((time) => (
            <option key={time} value={time}>
              {time} ~ {getEndTime(time)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="w-full lg:w-auto"
          onClick={() =>
            setEditEntryPopup({
              open: false,
              entryId: "",
              date: "",
              startTime: "09:00",
              companyName: "",
            })
          }
        >
          취소
        </Button>

        <Button className="w-full lg:w-auto" onClick={handleUpdateEntry}>
          저장
        </Button>
      </div>
    </div>
  </div>
)}
      {deleteNoticeOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><div className="text-lg font-semibold text-slate-900">안내</div><div className="mt-3 text-sm text-slate-600">삭제는 관리자에게 요청</div><div className="mt-6 flex justify-end"><Button onClick={() => setDeleteNoticeOpen(false)}>확인</Button></div></div></div>}
      <div className="flex flex-wrap justify-between gap-3">
  <div className="flex flex-wrap gap-2">
    <Button
      variant="outline"
      onClick={() =>
        handleDownloadCaptureImage(
          educationCaptureRef,
          `교육일정-${selectedDate}`
        )
      }
    >
      이미지 다운로드
    </Button>

    <Button variant="outline" onClick={() => setCurrentPage("menu")}>
  메뉴로 돌아가기
</Button>
  </div>
</div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6"><div className="space-y-6"><div ref={educationCaptureRef} className="bg-white">
  {renderBottomCalendar()}
</div></div><div className="space-y-6"><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle>일정 입력</CardTitle></CardHeader><CardContent className="space-y-4">{!currentUser ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">일정 등록은 승인된 계정으로 로그인한 뒤 사용할 수 있습니다.</div> : <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-xs font-medium text-slate-600">일자 선택</label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9" /></div><div className="space-y-2"><label className="text-xs font-medium text-slate-600">시간 선택</label><select value={effectiveSelectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100" disabled={availableTimes.length === 0}>{availableTimes.length === 0 ? <option value="">선택 가능한 시간이 없습니다</option> : availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select><div className="text-xs text-slate-500">{availableTimes.length === 0 ? "해당 일자는 선택 가능한 시간이 없습니다" : `자동 표기 시간: ${effectiveSelectedTime} ~ ${effectiveEndTime}`}</div></div></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-500">작성자: {currentUser.name} · {currentUser.companyName} · {getRoleLabel(currentUser.role || "general")}</div><Button className="w-full lg:w-auto" onClick={addEntry} disabled={availableTimes.length === 0}>일정 등록</Button></div></>}{entryMessage && (
  <div className="text-sm text-slate-600">{entryMessage}</div>
)}

<div className="mt-2 text-xs text-slate-400">시간 중복 불가</div></CardContent></Card><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle>선택 일자 등록 목록</CardTitle></CardHeader><CardContent className="space-y-3"><div><div className="text-sm text-slate-500">현재 선택 일자</div><div className="text-xl font-bold text-slate-900">{formatMonthDay(selectedDate)}</div></div>{dayEntries.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">등록된 일정이 없습니다.</div> : dayEntries.map((entry) => <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="text-base font-semibold text-slate-900">{entry.companyName}</div><div className="mt-1 text-sm text-slate-600">{formatMonthDay(entry.date)}</div><div className="mt-1 text-sm text-slate-600">{entry.startTime} ~ {entry.endTime}</div><div className="mt-1 text-xs text-slate-500">작성자: {entry.createdByName || "-"} ({getRoleLabel(entry.createdByRole || "general")})</div></div><div className="flex shrink-0 gap-1">
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setEditEntryPopup({
        open: true,
        entryId: entry.id,
        date: entry.date,
        startTime: entry.startTime,
        companyName: entry.companyName || "",
      });
    }}
    className="inline-flex h-10 items-center justify-center rounded-2xl px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
    disabled={!canDeleteOwnItem(entry)}
    title="일정 수정"
  >
    수정
  </button>

  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteEntry(entry.id);
    }}
    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
    disabled={!canDeleteOwnItem(entry)}
    title="일정 삭제"
  >
    <Trash2 className="h-4 w-4" />
  </button>
</div></div></motion.div>)}</CardContent></Card></div></div>
    </div>
  );

  const formatActivityLogTime = (value: any) => {
  if (!value) return "-";

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

const renderActivityLogPage = () => (
  <div className="space-y-4 sm:space-y-6">
    {renderTopBar()}

    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="outline" onClick={() => setCurrentPage("menu")}>
        메뉴로 돌아가기
      </Button>
    </div>

    <Card className="rounded-[24px] border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          활동 로그
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!canViewActivityLogs ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            활동 로그는 마스터만 볼 수 있습니다.
          </div>
        ) : activityLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            기록된 로그가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-black">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="w-[17%] border border-black px-3 py-2 text-left">시간</th>
                  <th className="w-[10%] border border-black px-3 py-2 text-left">구분</th>
                  <th className="w-[14%] border border-black px-3 py-2 text-left">페이지</th>
                  <th className="w-[18%] border border-black px-3 py-2 text-left">작성자</th>
                  <th className="border border-black px-3 py-2 text-left">내용</th>
                </tr>
              </thead>

              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="border border-black px-3 py-2 align-top">
                      {formatActivityLogTime(log.createdAt)}
                    </td>

                    <td className="border border-black px-3 py-2 align-top font-semibold">
                      {log.action}
                    </td>

                    <td className="border border-black px-3 py-2 align-top">
                      {log.page || "-"}
                    </td>

                    <td className="border border-black px-3 py-2 align-top">
                      <div className="font-medium">{log.actorName || "-"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {log.actorCompany || "-"} · {getRoleLabel(log.actorRole || "general")}
                      </div>
                    </td>

                    <td className="border border-black px-3 py-2 align-top">
                      <div className="font-medium">{log.target || "-"}</div>
                      <div className="mt-1 whitespace-pre-wrap break-all text-xs text-slate-600">
                        {log.detail || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

const renderApprovalPage = () => (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={() => setCurrentPage("menu")}>
          메뉴로 돌아가기
        </Button>
      </div>

      <Card className="rounded-[24px] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            가입 승인 관리
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!canManageApprovals ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              가입 승인 관리는 관리자 또는 마스터만 접근할 수 있습니다.
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              현재 승인 대기 중인 계정이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => {
                const canApproveThisUser =
                  user.role === "admin" ? canApproveAdmin : canApproveGeneral;

                return (
                  <div
                    key={user.uid}
                    className="rounded-2xl border border-black bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-slate-900">
                          {user.name} ({user.email || user.uid})
                        </div>
                        <div className="text-sm text-slate-600">
                          업체명: {user.companyName}
                        </div>
                        <div className="text-sm text-slate-600">
                          신청 권한: {getRoleLabel(user.role || "general")}
                        </div>
                        <div className="text-xs text-slate-500">
                          상태: {getStatusLabel(user.status || "pending")}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => rejectUser(user.uid)}
                          disabled={!canApproveThisUser}
                        >
                          반려
                        </Button>
                        <Button
                          onClick={() => approveUser(user.uid)}
                          disabled={!canApproveThisUser}
                        >
                          승인
                        </Button>
                      </div>
                    </div>

                    {!canApproveThisUser && (
                      <div className="mt-3 text-xs text-red-500">
                        이 계정은 현재 로그인한 권한으로 승인할 수 없습니다.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-0 shadow-sm">
        <CardHeader>
          <CardTitle>승인된 회원 목록</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {approvedUsers.map((user) => {
            const canCancelThisUser =
              user.role === "admin" ? canApproveAdmin : canApproveGeneral;

            return (
              <div
                key={user.uid}
                className="rounded-2xl border border-black bg-white p-3 text-sm shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {user.name} ({user.email || user.uid})
                    </div>
                    <div className="text-slate-600">{user.companyName}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {getRoleLabel(user.role || "general")} ·{" "}
                      {getStatusLabel(user.status || "pending")}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelApprovalUser(user.uid)}
                    disabled={!canCancelThisUser || user.uid === currentUser?.uid}
                  >
                    승인 취소
                  </Button>
                </div>

                {user.uid === currentUser?.uid && (
                  <div className="mt-2 text-xs text-slate-400">
                    본인 계정은 승인 취소할 수 없습니다.
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );

const renderSupplementWorkPage = () => (
  <div className="space-y-4 sm:space-y-6">
    {renderTopBar()}

    {editSupplementNightMorningPopup.open && (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="text-base font-semibold text-slate-900">
        금일야간/명일조출 수정
      </div>

      <div className="mt-4 space-y-3">
        <Input
          value={editSupplementNightMorningPopup.company}
          onChange={(e) =>
            setEditSupplementNightMorningPopup((prev) => ({ ...prev, company: e.target.value }))
          }
          placeholder="업체명"
        />

        <TextArea
          value={editSupplementNightMorningPopup.nightText}
          onChange={(e) =>
            setEditSupplementNightMorningPopup((prev) => ({ ...prev, nightText: e.target.value }))
          }
          placeholder="금일 야간"
        />

        <TextArea
          value={editSupplementNightMorningPopup.morningText}
          onChange={(e) =>
            setEditSupplementNightMorningPopup((prev) => ({ ...prev, morningText: e.target.value }))
          }
          placeholder="명일 조출"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="w-full lg:w-auto"
          onClick={() =>
            setEditSupplementNightMorningPopup({
              open: false,
              id: "",
              company: "",
              nightText: "",
              morningText: "",
            })
          }
        >
          취소
        </Button>

        <Button className="w-full lg:w-auto" onClick={handleUpdateSupplementNightMorningRow}>
          저장
        </Button>
      </div>
    </div>
  </div>
)}

{editSupplementWeekendPopup.open && (
  <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
    <div className="w-full max-w-2xl rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="text-base font-semibold text-slate-900">
        주말 보충작업 수정
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input value="주말" disabled />

        <Input
          value={editSupplementWeekendPopup.company}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, company: e.target.value }))
          }
          placeholder="업체명"
        />

        <Input
          value={editSupplementWeekendPopup.location}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="작업위치"
        />

        <Input
          type="number"
          min="0"
          value={editSupplementWeekendPopup.workerCount}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, workerCount: e.target.value }))
          }
          placeholder="작업인원"
        />

        <Input
          type="number"
          min="0"
          value={editSupplementWeekendPopup.supervisorCount}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, supervisorCount: e.target.value }))
          }
          placeholder="관리감독자"
        />

        <Input
          value={editSupplementWeekendPopup.content}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="작업내용"
        />

        <Input
          value={editSupplementWeekendPopup.safetyAction}
          onChange={(e) =>
            setEditSupplementWeekendPopup((prev) => ({ ...prev, safetyAction: e.target.value }))
          }
          placeholder="안전대책, 조치사항"
          className="md:col-span-2"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          className="w-full lg:w-auto"
          onClick={() =>
            setEditSupplementWeekendPopup({
              open: false,
              id: "",
              company: "",
              location: "",
              workerCount: "",
              supervisorCount: "",
              content: "",
              safetyAction: "",
            })
          }
        >
          취소
        </Button>

        <Button className="w-full lg:w-auto" onClick={handleUpdateSupplementWeekendRow}>
          저장
        </Button>
      </div>
    </div>
  </div>
)}

    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          보충작업
        </CardTitle>

        <Button variant="outline" onClick={() => setCurrentPage("menu")}>
          메뉴로 돌아가기
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "nightMorning", label: "금일야간/명일조출" },
            { key: "tomorrow", label: "명일 보충작업" },
            { key: "weekend", label: "주말 보충작업" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSupplementTab(tab.key as typeof supplementTab)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                supplementTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {supplementTab === "nightMorning" && (
          <Card className="border-slate-200 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">금일야간/명일조출</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                선택 날짜: {formatMonthDay(selectedDate)}
              </div>

              {canManageSupplementNotice && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    관리자 공지 입력
                  </div>

                  <TextArea
                    value={supplementNoticeText}
                    onChange={(e) => setSupplementNoticeText(e.target.value)}
                    placeholder="공지 내용을 입력하세요."
                  />

                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleSupplementNoticeImageUpload}
                    className="h-auto py-2"
                  />

                  <Button onClick={handleSaveSupplementNotice}>
                    공지 저장
                  </Button>
                </div>
              )}

              {(supplementNoticeText || supplementNoticeImage) && (
                <div className="space-y-3 rounded-2xl border border-black bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    공지
                  </div>

                  {supplementNoticeText && (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {supplementNoticeText}
                    </div>
                  )}

                  {supplementNoticeImage && (
                    <img
                      src={supplementNoticeImage}
                      alt="보충작업 공지 이미지"
                      className="max-h-80 rounded-2xl border border-slate-200 object-contain"
                    />
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
  이 탭은 선택 날짜({formatMonthDay(selectedDate)}) 기준으로 저장됩니다.
</div>

<div className="grid gap-4 lg:grid-cols-2">
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-600">
      금일 야간
    </label>
    <TextArea
  value={supplementNightText}
  onChange={(e) => setSupplementNightText(e.target.value)}
  className="min-h-[260px]"
/>
  </div>

  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-600">
      명일 조출
    </label>
    <TextArea
  value={supplementMorningText}
  onChange={(e) => setSupplementMorningText(e.target.value)}
  className="min-h-[260px]"
/>
  </div>
</div>

<div className="flex flex-wrap gap-2">
  <Button onClick={handleSaveSupplementNightMorning}>
    입력
  </Button>

  <Button variant="outline" onClick={handleCopySupplementNightMorning}>
    표 내용 복사
  </Button>
</div>

{supplementMessage && (
  <div className="text-sm text-slate-600">
    {supplementMessage}
  </div>
)}

<div className="overflow-x-auto rounded-2xl border border-black">
  <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
    <thead>
      <tr className="bg-slate-100 text-slate-700">
        <th className="w-[150px] border border-black px-3 py-2 text-left">업체명</th>
        <th className="border border-black px-3 py-2 text-left">금일 야간</th>
        <th className="border border-black px-3 py-2 text-left">명일 조출</th>
        <th className="w-[100px] border border-black px-3 py-2 text-left">관리</th>
      </tr>
    </thead>

    <tbody>
      {supplementNightMorningRows.length === 0 ? (
        <tr>
          <td className="border border-black px-3 py-3 text-center text-slate-400" colSpan={4}>
            입력 없음
          </td>
        </tr>
      ) : (
        supplementNightMorningRows.map((row) => (
          <tr key={row.id}>
            <td className="border border-black px-3 py-2 align-top font-semibold">
              {row.company}
            </td>

            <td className="border border-black px-3 py-2 align-top">
              <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">
                {row.nightText || "입력 없음"}
              </pre>
            </td>

            <td className="border border-black px-3 py-2 align-top">
              <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed">
                {row.morningText || "입력 없음"}
              </pre>
            </td>

            <td className="border border-black px-3 py-2 align-top">
              <div className="flex flex-wrap gap-1">
                {canAdminEditDabsItem && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditSupplementNightMorningPopup({
                        open: true,
                        id: row.id,
                        company: row.company || "",
                        nightText: row.nightText || "",
                        morningText: row.morningText || "",
                      })
                    }
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    수정
                  </button>
                )}

                {canDeleteOwnItem(row) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplementNightMorningRow(row.id)}
                    className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    삭제
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
            </CardContent>
          </Card>
        )}

        {supplementTab === "tomorrow" && (
  <Card className="border-slate-200 shadow-none">
    <CardHeader>
      <CardTitle className="text-base">명일 보충작업</CardTitle>
    </CardHeader>

    <CardContent className="space-y-5">
      <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
        선택 날짜: {formatMonthDay(selectedDate)}
      </div>

      {canManageSupplementNotice && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">
            관리자 공지 입력
          </div>

          <TextArea
            value={supplementTomorrowNoticeText}
            onChange={(e) => setSupplementTomorrowNoticeText(e.target.value)}
            placeholder="명일 보충작업 공지 내용을 입력하세요."
          />

          <Input
            type="file"
            accept="image/*"
            onChange={handleSupplementTomorrowNoticeImageUpload}
            className="h-auto py-2"
          />

          <Button onClick={handleSaveSupplementTomorrowNotice}>
            공지 저장
          </Button>
        </div>
      )}

      {(supplementTomorrowNoticeText || supplementTomorrowNoticeImage) && (
        <div className="space-y-3 rounded-2xl border border-black bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">
            공지
          </div>

          {supplementTomorrowNoticeText && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {supplementTomorrowNoticeText}
            </div>
          )}

          {supplementTomorrowNoticeImage && (
            <img
              src={supplementTomorrowNoticeImage}
              alt="명일 보충작업 공지 이미지"
              className="max-h-80 rounded-2xl border border-slate-200 object-contain"
            />
          )}
        </div>
      )}

      <div className="grid gap-2 xl:grid-cols-[110px_1fr_100px_110px_1fr_1fr_auto]">
        <select
          value={supplementTomorrowInput.workType}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, workType: e.target.value }))
          }
          className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
        >
          <option value="조출">조출</option>
          <option value="점심">점심</option>
          <option value="야간">야간</option>
        </select>

        <Input
          value={supplementTomorrowInput.location}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="작업위치"
        />

        <Input
          type="number"
          min="0"
          value={supplementTomorrowInput.workerCount}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, workerCount: e.target.value }))
          }
          placeholder="작업인원"
        />

        <Input
          type="number"
          min="0"
          value={supplementTomorrowInput.supervisorCount}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, supervisorCount: e.target.value }))
          }
          placeholder="관리감독자"
        />

        <Input
          value={supplementTomorrowInput.content}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="작업내용"
        />

        <Input
          value={supplementTomorrowInput.safetyAction}
          onChange={(e) =>
            setSupplementTomorrowInput((prev) => ({ ...prev, safetyAction: e.target.value }))
          }
          placeholder="안전대책, 조치사항"
        />

        <Button onClick={handleAddSupplementTomorrowRow}>
  입력
</Button>

<Button variant="outline" onClick={handleDownloadSupplementTomorrowExcel}>
  엑셀 다운로드
</Button>
      </div>

      {supplementMessage && (
        <div className="text-sm text-slate-600">
          {supplementMessage}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-[90px] border border-black px-2 py-2 text-left">작업구분</th>
              <th className="w-[140px] border border-black px-2 py-2 text-left">업체명</th>
              <th className="w-[150px] border border-black px-2 py-2 text-left">작업위치</th>
              <th className="w-[90px] border border-black px-2 py-2 text-left">작업인원</th>
              <th className="w-[100px] border border-black px-2 py-2 text-left">관리감독자</th>
              <th className="border border-black px-2 py-2 text-left">작업내용</th>
              <th className="border border-black px-2 py-2 text-left">안전대책, 조치사항</th>
              <th className="w-[100px] border border-black px-2 py-2 text-left">관리</th>
            </tr>
          </thead>

          <tbody>
            {supplementTomorrowRows.length === 0 ? (
              <tr>
                <td className="border border-black px-3 py-3 text-center text-slate-400" colSpan={8}>
                  입력 없음
                </td>
              </tr>
            ) : (
              supplementTomorrowRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-2 py-2 align-top">{row.workType}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.company}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.location}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.workerCount}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.supervisorCount}</td>
                  <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">{row.content}</td>
                  <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">{row.safetyAction}</td>
                  <td className="border border-black px-2 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {canAdminEditDabsItem && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditSupplementTomorrowPopup({
                              open: true,
                              id: row.id,
                              workType: row.workType || "조출",
                              company: row.company || "",
                              location: row.location || "",
                              workerCount: row.workerCount || "",
                              supervisorCount: row.supervisorCount || "",
                              content: row.content || "",
                              safetyAction: row.safetyAction || "",
                            })
                          }
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          수정
                        </button>
                      )}

                      {canDeleteOwnItem(row) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplementTomorrowRow(row.id)}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)}

        {supplementTab === "weekend" && (
  <Card className="border-slate-200 shadow-none">
    <CardHeader>
      <CardTitle className="text-base">주말 보충작업</CardTitle>
    </CardHeader>

    <CardContent className="space-y-5">
      <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
        이 탭의 기준일: {formatMonthDay(supplementWeekendDateKey)}
        {manualSupplementWeekendDate && manualSupplementWeekendDateSavedToday === getTodayKey()
  ? " · 주말 보충작업 탭 임시 날짜 적용 중"
  : ` · 선택 날짜(${formatMonthDay(selectedDate)})가 속한 주의 토요일`}
      </div>

      {canAdminEditDabsItem && (
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <Input
            type="date"
            value={supplementWeekendDateKey}
            onChange={(e) => handleSupplementWeekendDateChange(e.target.value)}
            className="h-9 bg-white"
          />

          <Button variant="outline" size="sm" onClick={handleResetSupplementWeekendDate}>
            토요일 기본값으로 복귀
          </Button>

          <div className="text-[11px] text-slate-500 md:col-span-2">
            이 날짜 변경은 주말 보충작업 탭에만 적용됩니다. 다음날 접속 시 자동으로 이번 주 토요일 기준으로 돌아갑니다.
          </div>
        </div>
      )}

      {canManageSupplementNotice && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">
            관리자 공지 입력
          </div>

          <TextArea
            value={supplementWeekendNoticeText}
            onChange={(e) => setSupplementWeekendNoticeText(e.target.value)}
            placeholder="주말 보충작업 공지 내용을 입력하세요."
          />

          <Input
            type="file"
            accept="image/*"
            onChange={handleSupplementWeekendNoticeImageUpload}
            className="h-auto py-2"
          />

          <Button onClick={handleSaveSupplementWeekendNotice}>
            공지 저장
          </Button>
        </div>
      )}

      {(supplementWeekendNoticeText || supplementWeekendNoticeImage) && (
        <div className="space-y-3 rounded-2xl border border-black bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">
            공지
          </div>

          {supplementWeekendNoticeText && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {supplementWeekendNoticeText}
            </div>
          )}

          {supplementWeekendNoticeImage && (
            <img
              src={supplementWeekendNoticeImage}
              alt="주말 보충작업 공지 이미지"
              className="max-h-80 rounded-2xl border border-slate-200 object-contain"
            />
          )}
        </div>
      )}

      <div className="grid gap-2 xl:grid-cols-[110px_1fr_100px_110px_1fr_1fr_auto_auto]">
        <Input value="주말" disabled />

        <Input
          value={supplementWeekendInput.location}
          onChange={(e) =>
            setSupplementWeekendInput((prev) => ({ ...prev, location: e.target.value }))
          }
          placeholder="작업위치"
        />

        <Input
          type="number"
          min="0"
          value={supplementWeekendInput.workerCount}
          onChange={(e) =>
            setSupplementWeekendInput((prev) => ({ ...prev, workerCount: e.target.value }))
          }
          placeholder="작업인원"
        />

        <Input
          type="number"
          min="0"
          value={supplementWeekendInput.supervisorCount}
          onChange={(e) =>
            setSupplementWeekendInput((prev) => ({ ...prev, supervisorCount: e.target.value }))
          }
          placeholder="관리감독자"
        />

        <Input
          value={supplementWeekendInput.content}
          onChange={(e) =>
            setSupplementWeekendInput((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="작업내용"
        />

        <Input
          value={supplementWeekendInput.safetyAction}
          onChange={(e) =>
            setSupplementWeekendInput((prev) => ({ ...prev, safetyAction: e.target.value }))
          }
          placeholder="안전대책, 조치사항"
        />

        <Button onClick={handleAddSupplementWeekendRow}>
          입력
        </Button>

        <Button variant="outline" onClick={handleDownloadSupplementWeekendExcel}>
          엑셀 다운로드
        </Button>
      </div>

      {supplementMessage && (
        <div className="text-sm text-slate-600">
          {supplementMessage}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="w-[90px] border border-black px-2 py-2 text-left">작업구분</th>
              <th className="w-[140px] border border-black px-2 py-2 text-left">업체명</th>
              <th className="w-[150px] border border-black px-2 py-2 text-left">작업위치</th>
              <th className="w-[90px] border border-black px-2 py-2 text-left">작업인원</th>
              <th className="w-[100px] border border-black px-2 py-2 text-left">관리감독자</th>
              <th className="border border-black px-2 py-2 text-left">작업내용</th>
              <th className="border border-black px-2 py-2 text-left">안전대책, 조치사항</th>
              <th className="w-[100px] border border-black px-2 py-2 text-left">관리</th>
            </tr>
          </thead>

          <tbody>
            {supplementWeekendRows.length === 0 ? (
              <tr>
                <td className="border border-black px-3 py-3 text-center text-slate-400" colSpan={8}>
                  입력 없음
                </td>
              </tr>
            ) : (
              supplementWeekendRows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-black px-2 py-2 align-top">{row.workType}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.company}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.location}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.workerCount}</td>
                  <td className="border border-black px-2 py-2 align-top">{row.supervisorCount}</td>
                  <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">{row.content}</td>
                  <td className="whitespace-pre-wrap break-words border border-black px-2 py-2 align-top">{row.safetyAction}</td>
                  <td className="border border-black px-2 py-2 align-top">
                    <div className="flex flex-wrap gap-1">
                      {canAdminEditDabsItem && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditSupplementWeekendPopup({
                              open: true,
                              id: row.id,
                              company: row.company || "",
                              location: row.location || "",
                              workerCount: row.workerCount || "",
                              supervisorCount: row.supervisorCount || "",
                              content: row.content || "",
                              safetyAction: row.safetyAction || "",
                            })
                          }
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          수정
                        </button>
                      )}

                      {canDeleteOwnItem(row) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplementWeekendRow(row.id)}
                          className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)}
      </CardContent>
    </Card>
  </div>
);

const renderSoloWorkerPage = () => (
  <div className="space-y-4 sm:space-y-6">
    {renderTopBar()}
    {renderEditPopups()}

    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          단독작업자
        </CardTitle>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              handleDownloadCaptureImage(
                soloWorkerCaptureRef,
                `단독작업자-${selectedDate}`
              )
            }
          >
            이미지 다운로드
          </Button>

          <Button variant="outline" onClick={() => setCurrentPage("menu")}>
            메뉴로 돌아가기
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Card className="border-slate-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">단독작업자</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
              선택 날짜: {formatMonthDay(selectedDate)}
            </div>

            <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  이전 날짜 선택
                </label>
                <Input
                  type="date"
                  value={loadSourceDate}
                  onChange={(e) => setLoadSourceDate(e.target.value)}
                  className="h-9"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => handleLoadPreviousCompanyData("soloWorker")}
              >
                내 업체 단독작업자 불러오기
              </Button>
            </div>

            <div className="grid gap-3 xl:grid-cols-[140px_180px_150px_1fr_120px_auto]">
              <select
                value={soloWorkerInput.building}
                onChange={(e) =>
                  setSoloWorkerInput({
                    ...soloWorkerInput,
                    building: e.target.value,
                  })
                }
                className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="">동 선택</option>
                {SOLO_WORKER_COLUMNS.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>

              {(currentUser?.role === "master" ||
                currentUser?.role === "admin") && (
                <Input
                  value={soloWorkerInput.company}
                  onChange={(e) =>
                    setSoloWorkerInput({
                      ...soloWorkerInput,
                      company: e.target.value,
                    })
                  }
                  placeholder="업체명 입력"
                />
              )}

              <Input
                value={soloWorkerInput.name}
                onChange={(e) =>
                  setSoloWorkerInput({
                    ...soloWorkerInput,
                    name: e.target.value,
                  })
                }
                placeholder="성명 입력"
              />

              <Input
                value={soloWorkerInput.content}
                onChange={(e) =>
                  setSoloWorkerInput({
                    ...soloWorkerInput,
                    content: e.target.value,
                  })
                }
                placeholder="작업내용 입력"
              />

              <select
                value={soloWorkerInput.elderly}
                onChange={(e) =>
                  setSoloWorkerInput({
                    ...soloWorkerInput,
                    elderly: e.target.value,
                  })
                }
                className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
              >
                <option value="x">고령자 x</option>
                <option value="o">고령자 o</option>
              </select>

              <Button onClick={handleAddSoloWorker} disabled={!canEditDabs}>
                추가
              </Button>
            </div>

            <Input
              value={soloCompanyFilter}
              onChange={(e) => setSoloCompanyFilter(e.target.value)}
              placeholder="업체명 검색"
              className="max-w-sm"
            />

            <div ref={soloWorkerCaptureRef} className="bg-white">
              {renderSoloWorkerMobileCards()}
              {renderSoloWorkerDesktopTable()}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  </div>
);
  
  if (!mounted) return null;

return (
  <div className="min-h-screen bg-slate-50 p-2 pb-28 sm:p-4 md:p-8">
    {editOverlayPopup.open && (
      <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
          <div className="text-base font-semibold text-slate-900">
            {editOverlayPopup.targetKey === "equipmentFlow"
              ? "장비동선 수정"
              : "고위험작업 수정"}
          </div>

          {editOverlayPopup.targetKey === "highRisk" && (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-slate-600">동 선택</label>
              <select
                value={editOverlayPopup.building}
                onChange={(e) =>
                  setEditOverlayPopup((prev) => ({
                    ...prev,
                    building: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">동 선택</option>
                {HIGH_RISK_BUILDINGS.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editOverlayPopup.targetKey === "equipmentFlow" && (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-slate-600">장비 선택</label>
              <select
                value={editOverlayPopup.equipmentType}
                onChange={(e) =>
                  setEditOverlayPopup((prev) => ({
                    ...prev,
                    equipmentType: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {EQUIPMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">업체명</label>
            <Input
              value={editOverlayPopup.company}
              onChange={(e) =>
                setEditOverlayPopup((prev) => ({
                  ...prev,
                  company: e.target.value,
                }))
              }
              placeholder="업체명 입력"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-600">작업내용</label>
            <Input
              value={editOverlayPopup.note}
              onChange={(e) =>
                setEditOverlayPopup((prev) => ({
                  ...prev,
                  note: e.target.value,
                }))
              }
              placeholder="작업내용 입력"
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full lg:w-auto"
              onClick={() =>
                setEditOverlayPopup({
                  open: false,
                  itemId: "",
                  targetKey: "highRisk",
                  company: "",
                  note: "",
                  building: "",
                  equipmentType: "concrete_pump_truck",
                })
              }
            >
              취소
            </Button>

            <Button className="w-full lg:w-auto" onClick={handleUpdateOverlayInfo}>
              저장 후 위치 수정
            </Button>
          </div>
        </div>
      </div>
    )}

    {!currentUser ? (
  renderAuthScreen()
) : currentPage === "menu" ? (
  renderMenuScreen()
) : currentPage === "dabs" ? (
  renderDabsPage()
) : currentPage === "portfolio" ? (
  renderPortfolioPage()
) : currentPage === "soloWorker" ? (
  renderSoloWorkerPage()
) : currentPage === "heatwave" ? (
  renderHeatwavePage()
) : currentPage === "supplementWork" ? (
  renderSupplementWorkPage()
) : currentPage === "approval" ? (
  renderApprovalPage()
) : currentPage === "activityLog" ? (
  renderActivityLogPage()
) : (
  renderEducationPage()
)}
  </div>
);
}
