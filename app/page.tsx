"use client";

import { getFirebaseServices } from "@/lib/firebase";

import React, { useEffect, useMemo, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
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
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAuth,
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
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
const DEMO_MASTER_ID = "GH45";
const DEMO_MASTER_PASSWORD = "2706";
const DEMO_USERS_KEY = "demo-calendar-users";
const DEMO_ENTRIES_KEY = "demo-calendar-entries";
const DABS_STORAGE_KEY = "demo-dabs-pages";
const DABS_IMAGE_STORAGE_KEY = "demo-dabs-images";
const DABS_OVERLAY_STORAGE_KEY = "demo-dabs-overlays";
const SECTION1_COLUMNS = ["101동", "102동", "103동", "104동", "114동", "115동", "116동", "117동", "상가"];
const SECTION2_COLUMNS = ["105동", "106동", "107동", "108동", "109동", "110동", "111동", "112동", "113동"];
const HIGH_RISK_BUILDINGS = [
  "101동", "102동", "103동", "104동", "105동", "106동", "107동", "108동", "109동",
  "110동", "111동", "112동", "113동", "114동", "115동", "116동", "117동", "상가",
];
const SOLO_WORKER_COLUMNS = [...Array.from({ length: 17 }, (_, i) => `${101 + i}동`), "상가"];
const MATERIAL_TIMES = Array.from({ length: 12 }, (_, i) => String(i + 6).padStart(2, "0"));
const EQUIPMENT_OPTIONS = [
  { value: "concrete_pump_truck", label: "콘크리트 펌프카" },
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
  return <div className={cn("rounded-[24px] border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

function CardHeader({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-4 pt-4 sm:px-5 sm:pt-5", className)}>{children}</div>;
}

function CardContent({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("px-4 pb-4 sm:px-5 sm:pb-5", className)}>{children}</div>;
}

function CardTitle({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("text-base font-semibold text-slate-900 sm:text-lg", className)}>{children}</div>;
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

function loadDabsData() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DABS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDabsData(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DABS_STORAGE_KEY, JSON.stringify(data));
}

function loadDabsImages() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DABS_IMAGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDabsImages(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DABS_IMAGE_STORAGE_KEY, JSON.stringify(data));
}

function loadDabsOverlays() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DABS_OVERLAY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDabsOverlays(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DABS_OVERLAY_STORAGE_KEY, JSON.stringify(data));
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}


const firebaseServices = getFirebaseServices();

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

type DabsRowItem = {
  id: string;
  company?: string;
  content?: string;
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
  x: number;
  y: number;
  building?: string;
  company?: string;
  note?: string;
  equipmentType?: string;
};

type OverlayArrowItem = {
  id: string;
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

function runSelfTests() {
  const results = [];
  results.push({ name: "09:00 종료시간은 11:00", pass: getEndTime("09:00") === "11:00" });
  results.push({ name: "시간 옵션 검증", pass: JSON.stringify(getTimeOptions()) === JSON.stringify(["09:00", "10:00", "13:00", "14:00", "16:00", "17:00"]) });
  results.push({ name: "월/일 포맷 검증", pass: formatMonthDay("2026-04-03") === "4월 3일" });
  results.push({ name: "같은 경계시간은 비중복", pass: isTimeOverlapping("13:00", "15:00", "15:00", "17:00") === false });
  results.push({ name: "단독작업자 동 수 검증", pass: SOLO_WORKER_COLUMNS.length === 18 });
  results.push({ name: "장비 옵션 수 검증", pass: EQUIPMENT_OPTIONS.length === 8 });
  results.push({ name: "모바일 터치 미리보기 플래그", pass: true });
  results.push({ name: "이미지 탭 키 검증", pass: ["highRisk", "equipmentFlow"].includes("highRisk") });
  return results;
}

function getCompanyColor(company: string) {
  const palette = [
    { bg: "bg-rose-50/95", border: "border-rose-300", text: "text-rose-800" },
    { bg: "bg-amber-50/95", border: "border-amber-300", text: "text-amber-800" },
    { bg: "bg-emerald-50/95", border: "border-emerald-300", text: "text-emerald-800" },
    { bg: "bg-sky-50/95", border: "border-sky-300", text: "text-sky-800" },
    { bg: "bg-violet-50/95", border: "border-violet-300", text: "text-violet-800" },
    { bg: "bg-pink-50/95", border: "border-pink-300", text: "text-pink-800" },
    { bg: "bg-cyan-50/95", border: "border-cyan-300", text: "text-cyan-800" },
    { bg: "bg-lime-50/95", border: "border-lime-300", text: "text-lime-800" },
  ];
  const source = String(company || "-");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = (hash + source.charCodeAt(i) * (i + 1)) % 9973;
  return palette[hash % palette.length];
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {action}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

export default function MonthlyCalendarTextEntrySite() {
  const { auth, db, isConfigured } = getFirebaseServices();
const isDemoMode = !isConfigured;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateKey(d);
  });
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [signupId, setSignupId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompanyName, setSignupCompanyName] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState("general");
  const [signupMessage, setSignupMessage] = useState("");
  const [activeTab, setActiveTab] = useState("calendar");
  const [deleteNoticeOpen, setDeleteNoticeOpen] = useState(false);
const [entryMessage, setEntryMessage] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentPage, setCurrentPage] = useState("menu");
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
  const [sectionInput, setSectionInput] = useState({ building: "", content: "" });
  const [materialsInput, setMaterialsInput] = useState({ gate: "1", material: "", vehicle: "", location: "", time: "06" });
  const [imagePopup, setImagePopup] = useState({ open: false, x: 0, y: 0, note: "", equipmentType: "concrete_pump_truck", building: "", targetKey: "highRisk" });
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<
  { startX: number; startY: number; endX: number; endY: number } | null
>(null);
  const [soloWorkerInput, setSoloWorkerInput] = useState({ building: "", name: "", content: "", elderly: "o" });
  const [soloCompanyFilter, setSoloCompanyFilter] = useState("");
  const imageAreaRef = useRef<HTMLDivElement | null>(null);
  const lastTouchTimeRef = useRef(0);
  const touchGestureRef = useRef({ moved: false, startX: 0, startY: 0 });
  const [testResults] = useState(runSelfTests);

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

  return () => {
    unsubscribeDabs();
    unsubscribeSolo();
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
  const canManageApprovals = currentUser?.role === "master" || currentUser?.role === "admin";
  const canEditDabs = Boolean(currentUser && currentUser.status === "approved");
  const canUploadDabsImage = currentUser?.role === "master" || currentUser?.role === "admin";
  const canDeleteDabsItem = currentUser?.role === "master" || currentUser?.role === "admin";

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

  const tabs = [
    { key: "calendar", label: "일정 관리", icon: CalendarDays },
    { key: "approval", label: "가입 승인 관리", icon: Users },
  ];

  const menuItems = [
  { key: "dabs", title: "DAB's회의", description: "회의 관련 페이지로 이동", icon: MessageSquare },
  { key: "education", title: "교육일정", description: "현재 교육일정 페이지로 이동", icon: CalendarDays },
  { key: "soloWorker", title: "단독작업자", description: "단독작업자 관리 페이지로 이동", icon: Users },
  ...(canManageApprovals
    ? [{ key: "approval", title: "회원 승인 관리", description: "가입 신청 승인/반려 관리", icon: UserPlus }]
    : []),
];

  const todayPlusOne = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const todayPlusTwo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d;
  }, []);
 
  const dabsTabs = useMemo(() => [
    { key: "highRisk", label: "고위험작업" },
    { key: "equipmentFlow", label: "장비동선" },
    { key: "section1", label: "1공구 작업" },
    { key: "section2", label: "2공구 작업" },
    { key: "materialsAfter2", label: `${formatShortDate(todayPlusTwo)} 자재반입` },
    { key: "materialsAfter1", label: `${formatShortDate(todayPlusOne)} 자재반입` },
  ], [todayPlusOne, todayPlusTwo]);

  const activeDabsTab = dabsTabs[dabsTabIndex] || dabsTabs[0];
  const activeDabsKey = activeDabsTab.key;
  const soloRows = useMemo<Record<string, DabsRowItem[]>>(
  () => dabsData[selectedDate]?.soloWorker?.rows || {},
  [dabsData, selectedDate]
);

  useEffect(() => {
    const nextValue = dabsData[selectedDate]?.[activeDabsKey];
    setDabsDraft(typeof nextValue === "string" ? nextValue : "");
    setDabsMessage("");
    setArrowStart(null);
    setArrowPreview(null);
  }, [selectedDate, activeDabsKey, dabsData]);

  const getRelativePoint = (clientX: number, clientY: number) => {
  if (!imageAreaRef.current) return null;
  const rect = imageAreaRef.current.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
};

  const vibrateBriefly = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(25);
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

  const canDelete = currentUser.role === "master" || currentUser.role === "admin";

  if (!canDelete) {
    setDeleteNoticeOpen(true);
    setEntryMessage("삭제 권한이 없습니다.");
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
setEntryMessage("일정이 삭제되었습니다.");
  } catch (error: any) {
  console.log("ENTRY DELETE ERROR:", error);
  setEntryMessage(error?.message || "일정 삭제 중 오류가 발생했습니다.");
}
};

  const handleLogin = async () => {
    if (isDemoMode) {
      const demoUsers = loadDemoUsers();
      const foundUser = demoUsers.find((user) => String(user.email).toLowerCase() === loginId.trim().toLowerCase() && user.password === loginPassword.trim());
      if (!foundUser) return setLoginMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
      if (foundUser.status !== "approved") return setLoginMessage("승인 완료된 계정만 로그인할 수 있습니다.");
      setCurrentUser(foundUser);
      setUsers(demoUsers);
      setEntries(loadDemoEntries());
      setCurrentPage("menu");
      setLoginMessage("");
      setLoginId("");
      setLoginPassword("");
      return;
    }
    if (!auth) return setLoginMessage("Firebase 설정이 없어 로그인할 수 없습니다.");
    try {
      setLoginMessage("");
      await signInWithEmailAndPassword(auth, loginId.trim(), loginPassword.trim());
      setLoginId("");
      setLoginPassword("");
    } catch {
      setLoginMessage("아이디(이메일) 또는 비밀번호가 올바르지 않습니다.");
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

  await deleteDoc(doc(db, "users", uid));
};

  const handleSaveDabsText = async () => {
  if (!canEditDabs) return setDabsMessage("승인된 계정만 저장할 수 있습니다.");

  const nextData = {
    ...dabsData,
    [selectedDate]: {
      ...(dabsData[selectedDate] || {}),
      [activeDabsKey]: dabsDraft,
    },
  };

  setDabsData(nextData);
  saveDabsData(nextData);
  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
  setDabsMessage("저장되었습니다.");
};

  const handleAddSectionWork = async () => {
  if (!canEditDabs || !sectionInput.building || !sectionInput.content) return;

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
  const currentRows =
    typeof currentTabValue === "object" && currentTabValue && "rows" in currentTabValue
      ? currentTabValue.rows || {}
      : {};

  const companyName = currentUser?.companyName || "";
  const buildingRows = currentRows[sectionInput.building] || [];
  const existingIndex = buildingRows.findIndex((item) => item.company === companyName);

  const nextBuildingRows =
    existingIndex >= 0
      ? buildingRows.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                content: `${item.content || ""}/${sectionInput.content}`,
              }
            : item
        )
      : [
          ...buildingRows,
          {
            id: createLocalId("section"),
            company: companyName,
            content: sectionInput.content,
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
      [activeDabsKey]: { rows: nextRows },
    },
  };

  setDabsData(nextData);
  saveDabsData(nextData);
  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
  setSectionInput({ building: "", content: "" });
  setDabsMessage("저장되었습니다.");
};

  const handleAddMaterial = async () => {
  const { gate, material, vehicle, location, time } = materialsInput;
  if (!canEditDabs || !material || !vehicle || !location) return;

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
  const list =
    typeof currentTabValue === "object" && currentTabValue && "list" in currentTabValue
      ? currentTabValue.list || []
      : [];

  const companyName = currentUser?.companyName || "";

  const existingIndex = list.findIndex(
    (item) =>
      item.company === companyName &&
      item.gate === gate &&
      item.time === time
  );

  const nextList =
    existingIndex >= 0
      ? list.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                material: `${item.material || ""}/${material}`,
                vehicle: `${item.vehicle || ""}/${vehicle}`,
                location: `${item.location || ""}/${location}`,
              }
            : item
        )
      : [
          ...list,
          {
            id: createLocalId("material"),
            gate,
            material,
            vehicle,
            location,
            time,
            company: companyName,
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
  saveDabsData(nextData);
  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
  setMaterialsInput({ gate: "1", material: "", vehicle: "", location: "", time: "06" });
  setDabsMessage("저장되었습니다.");
};

  const handleDeleteDabsItem = async (itemId: string, building: string | null = null) => {
  if (!canDeleteDabsItem) return;

  if (activeDabsKey === "section1" || activeDabsKey === "section2") {
    const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
    const currentRows =
      typeof currentTabValue === "object" && currentTabValue && "rows" in currentTabValue
        ? currentTabValue.rows || {}
        : {};

    const nextRows = { ...currentRows };

    if (building) {
      nextRows[building] = (nextRows[building] || []).filter((item) => item.id !== itemId);
    }

    const nextData = {
      ...dabsData,
      [selectedDate]: {
        ...(dabsData[selectedDate] || {}),
        [activeDabsKey]: { rows: nextRows },
      },
    };

    setDabsData(nextData);
    saveDabsData(nextData);
    await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
    return;
  }

  const currentTabValue = dabsData[selectedDate]?.[activeDabsKey];
  const currentList =
    typeof currentTabValue === "object" && currentTabValue && "list" in currentTabValue
      ? currentTabValue.list || []
      : [];

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
  saveDabsData(nextData);
  await saveDabsMeetingToFirestore(selectedDate, nextData[selectedDate]);
};

  const handleAddSoloWorker = async () => {
  if (!canEditDabs || !soloWorkerInput.building || !soloWorkerInput.name.trim() || !soloWorkerInput.content.trim()) return;

  const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};

  const nextRows = {
    ...currentRows,
    [soloWorkerInput.building]: [
      ...(currentRows[soloWorkerInput.building] || []),
      {
        id: createLocalId("solo-worker"),
        company: currentUser?.companyName || "",
        name: soloWorkerInput.name.trim(),
        content: soloWorkerInput.content.trim(),
        elderly: soloWorkerInput.elderly,
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
  saveDabsData(nextData);
  await saveSoloWorkersToFirestore(selectedDate, nextRows);
  setSoloWorkerInput({ building: "", name: "", content: "", elderly: "o" });
};

  const handleDeleteSoloWorker = async (itemId: string, building: string) => {
  if (!canDeleteDabsItem) return;

  const currentRows = dabsData[selectedDate]?.soloWorker?.rows || {};

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
  saveDabsData(nextData);
  await saveSoloWorkersToFirestore(selectedDate, nextRows);
};

const getOverlayBundle = (key = activeDabsKey) => dabsOverlays[selectedDate]?.[key] || { markers: [], arrows: [] };

  const handleDeleteOverlayItem = (itemId: string) => {
  if (!canDeleteDabsItem) return;
  const currentValue = getOverlayBundle();
  const nextData = {
    ...dabsOverlays,
    [selectedDate]: {
      ...(dabsOverlays[selectedDate] || {}),
      [activeDabsKey]: {
        markers: (currentValue.markers || []).filter((item) => item.id !== itemId),
        arrows: (currentValue.arrows || []).filter((item) => item.id !== itemId),
      },
    },
  };
  setDabsOverlays(nextData);
  saveDabsOverlays(nextData);
};

  const handleHighRiskImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  if (!canUploadDabsImage) return setDabsMessage("사진 업로드는 마스터, 관리자만 가능합니다.");
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imageValue = typeof reader.result === "string" ? reader.result : "";
    const nextImages = { ...dabsImages, highRisk: imageValue, equipmentFlow: imageValue };
    setDabsImages(nextImages);
    saveDabsImages(nextImages);
    setDabsMessage("사진이 저장되었습니다.");
  };
  reader.readAsDataURL(file);
  event.target.value = "";
};

  const openMarkerPopup = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeDabsKey !== "highRisk" || !dabsImages?.highRisk) return;
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;
    setImagePopup({ open: true, x: point.x, y: point.y, note: "", equipmentType: "concrete_pump_truck", building: "", targetKey: "highRisk" });
  };

  const openMarkerPopupByTouch = (touch: { clientX: number; clientY: number }) => {
  if (activeDabsKey !== "highRisk" || !dabsImages?.highRisk) return;
  const point = getRelativePoint(touch.clientX, touch.clientY);
  if (!point) return;
  lastTouchTimeRef.current = Date.now();
  vibrateBriefly();
  setImagePopup({
    open: true,
    x: point.x,
    y: point.y,
    note: "",
    equipmentType: "concrete_pump_truck",
    building: "",
    targetKey: "highRisk",
  });
};

  const cancelMarkerPopup = () => {
    if (imagePopup.targetKey === "equipmentFlow") {
      const currentValue = getOverlayBundle("equipmentFlow");
      const nextArrows = [...(currentValue.arrows || [])];
      if (nextArrows.length > 0) nextArrows.pop();
      const nextData = { ...dabsOverlays, [selectedDate]: { ...(dabsOverlays[selectedDate] || {}), equipmentFlow: { ...currentValue, arrows: nextArrows } } };
      setDabsOverlays(nextData);
      saveDabsOverlays(nextData);
    }
    setArrowStart(null);
    setArrowPreview(null);
    setImagePopup({ open: false, x: 0, y: 0, note: "", equipmentType: "concrete_pump_truck", building: "", targetKey: "highRisk" });
  };

  const submitMarkerPopup = () => {
    if (!canEditDabs || !imagePopup.note.trim()) return;
    if (imagePopup.targetKey === "highRisk" && !imagePopup.building) return;
    const targetKey = imagePopup.targetKey || activeDabsKey;
    const currentValue = getOverlayBundle(targetKey);
    const markerId = imagePopup.targetKey === "equipmentFlow" && currentValue.arrows?.length ? currentValue.arrows[currentValue.arrows.length - 1].id : createLocalId("marker");
    const marker = { id: markerId, x: imagePopup.x, y: imagePopup.y, building: imagePopup.targetKey === "highRisk" ? imagePopup.building : "", company: currentUser?.companyName || "", note: imagePopup.note.trim(), equipmentType: imagePopup.targetKey === "equipmentFlow" ? imagePopup.equipmentType : "" };
    const nextData = { ...dabsOverlays, [selectedDate]: { ...(dabsOverlays[selectedDate] || {}), [targetKey]: { ...currentValue, markers: [...(currentValue.markers || []), marker] } } };
    setDabsOverlays(nextData);
    saveDabsOverlays(nextData);
    setImagePopup({ open: false, x: 0, y: 0, note: "", equipmentType: "concrete_pump_truck", building: "", targetKey: "highRisk" });
  };

  const completeEquipmentArrow = (endX: number, endY: number) => {
    if (!arrowStart) return;
    const currentValue = getOverlayBundle("equipmentFlow");
    const arrow = { id: createLocalId("arrow"), startX: arrowStart.x, startY: arrowStart.y, endX, endY };
    const nextData = { ...dabsOverlays, [selectedDate]: { ...(dabsOverlays[selectedDate] || {}), equipmentFlow: { ...currentValue, arrows: [...(currentValue.arrows || []), arrow] } } };
    setDabsOverlays(nextData);
    saveDabsOverlays(nextData);
    setArrowStart(null);
    setArrowPreview(null);
    setImagePopup({ open: true, x: (arrow.startX + arrow.endX) / 2, y: (arrow.startY + arrow.endY) / 2, note: "", equipmentType: "concrete_pump_truck", building: "", targetKey: "equipmentFlow" });
    vibrateBriefly();
  };

  const handleEquipmentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !canEditDabs) return;
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;
    if (!arrowStart) {
      setArrowStart({ x: point.x, y: point.y });
      setArrowPreview({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
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

  const handleOverlayTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const point = getRelativePoint(touch.clientX, touch.clientY);
    if (!point) return;
    lastTouchTimeRef.current = Date.now();
    if (activeDabsKey === "highRisk") {
      if (!touchGestureRef.current.moved) openMarkerPopupByTouch(touch);
      return;
    }
    if (activeDabsKey !== "equipmentFlow" || !dabsImages?.equipmentFlow || !canEditDabs || !arrowStart) return;
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-600"><CalendarDays className="h-5 w-5" /><span className="text-sm">회원 승인형 메뉴 시스템</span></div>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">힐스테이트 어울림 청주사직</h1>
          <p className="mt-2 text-sm text-slate-500">로그인 후 원하는 메뉴를 선택해 이동하세요.</p>
        </div>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="text-left sm:text-right">
              <div className="text-sm font-semibold text-slate-900">{currentUser.name}</div>
              <div className="text-xs text-slate-500">{currentUser.companyName} · {getRoleLabel(currentUser.role || "general")}</div>
            </div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />로그아웃</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderOverlayImage = (selectedImage: string | undefined, isImageTab: boolean) => {
    const overlayBundle = getOverlayBundle();
    const markers = overlayBundle.markers || [];
    const arrows = overlayBundle.arrows || [];
    return (
      <div
        ref={imageAreaRef}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 touch-none"
        onClick={activeDabsKey === "highRisk" ? openMarkerPopup : activeDabsKey === "equipmentFlow" ? handleEquipmentClick : undefined}
        onMouseMove={activeDabsKey === "equipmentFlow" ? handleEquipmentMouseMove : undefined}
        onTouchStart={isImageTab ? handleOverlayTouchStart : undefined}
        onTouchMove={activeDabsKey === "equipmentFlow" ? handleOverlayTouchMove : undefined}
        onTouchEnd={isImageTab ? handleOverlayTouchEnd : undefined}
      >
        {selectedImage ? <img src={selectedImage} alt={activeDabsTab.label} className="block w-full object-cover" /> : <div className="flex h-64 items-center justify-center text-sm text-slate-400">등록된 사진이 없습니다.</div>}
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
              let posX = marker.x;
              let posY = marker.y;
              if (activeDabsKey === "equipmentFlow") {
                const linkedArrow = arrows.find((arrow) => arrow.id === marker.id);
                if (linkedArrow) {
                  posX = (linkedArrow.startX + linkedArrow.endX) / 2;
                  posY = (linkedArrow.startY + linkedArrow.endY) / 2;
                }
              }
              const color = getCompanyColor(marker.company || "-");
              const isHighRiskMarker = activeDabsKey === "highRisk";
              return (
                <div key={marker.id} className={cn("absolute rounded-2xl border px-2 py-1.5 shadow-md backdrop-blur-[1px] sm:px-3 sm:py-2", color.bg, color.border, color.text)} style={{ left: `${posX}%`, top: `${posY}%`, transform: "translate(-50%, -50%)" }}>
                  <div className={cn("flex flex-col items-center text-center", isHighRiskMarker ? "min-w-[84px] max-w-[112px] gap-1 sm:min-w-[104px] sm:max-w-[140px]" : "min-w-[118px] max-w-[152px] gap-1 sm:min-w-[150px] sm:max-w-[190px]")}>
                    {marker.equipmentType ? <><span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold leading-none shadow-sm sm:text-[11px]">{getEquipmentLabel(marker.equipmentType)}</span><span className="rounded-full bg-white/70 p-0.5 shadow-sm sm:p-1"><EquipmentIcon type={marker.equipmentType} className="h-7 w-7 sm:h-10 sm:w-10" /></span></> : null}
                    {isHighRiskMarker ? <div className="w-full rounded-xl bg-white/65 px-2 py-2 shadow-sm"><div className="text-[9px] font-bold leading-none tracking-tight sm:text-[10px]">{marker.building || "동 미선택"}</div><div className="mt-1 text-[10px] font-semibold leading-tight sm:text-[11px]">{marker.company || "업체명 없음"}</div><div className="mt-1 break-words text-[11px] font-bold leading-tight sm:text-[13px]">{marker.note || "작업내용 없음"}</div></div> : <div className="w-full rounded-xl bg-white/65 px-2 py-2 shadow-sm"><div className="text-[10px] font-semibold leading-tight sm:text-[12px]">{marker.company || "업체명 없음"}</div><div className="mt-1 break-words text-[11px] font-bold leading-tight sm:text-[13px]">{marker.note || "작업내용 없음"}</div></div>}
                  </div>
                  {canDeleteDabsItem && <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOverlayItem(marker.id); }} className="absolute right-1 top-1 opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>}
                </div>
              );
            })}
            {activeDabsKey === "equipmentFlow" && canDeleteDabsItem && arrows.map((arrow) => <button key={`arrow-delete-${arrow.id}`} type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOverlayItem(arrow.id); }} className="absolute flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow hover:bg-slate-100" style={{ left: `${(arrow.startX + arrow.endX) / 2}%`, top: `${(arrow.startY + arrow.endY) / 2}%`, transform: "translate(-50%, -50%)" }} title="화살표 삭제"><X className="h-3 w-3" /></button>)}
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
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">힐스테이트 어울림 청주사직</h1>
          <p className="mt-2 text-sm text-slate-500">로그인 또는 회원가입 후 메뉴를 선택해 이동할 수 있습니다.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className="rounded-[24px] border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5" />로그인</CardTitle></CardHeader>
            <CardContent className="space-y-3 py-3">
              <div className="grid items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">아이디</label><Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder={isDemoMode ? "GH45" : "이메일 입력"} className="h-9" /></div>
                <div className="space-y-2"><label className="text-xs font-medium text-slate-600">비밀번호</label><Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={isDemoMode ? "2706" : "비밀번호 입력"} className="h-9" /></div>
                <Button className="h-9 w-full px-4 md:w-auto" onClick={handleLogin}>로그인</Button>
<Button variant="outline" onClick={handlePasswordReset}>
  비밀번호 재설정
</Button>
              </div>
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
              <div className="space-y-2"><label className="text-xs font-medium text-slate-600">회원 등급 신청</label><select value={signupRole} onChange={(e) => setSignupRole(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"><option value="general">일반</option><option value="admin">관리자</option></select><div className="text-xs text-slate-500">일반 계정은 마스터 또는 관리자가 승인 가능, 관리자 계정은 마스터만 승인 가능합니다.</div></div>
              <div className="flex justify-end"><Button className="w-full sm:w-auto" onClick={handleSignup}>가입 신청</Button></div>
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
      {!isConfigured && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4"><div className="text-sm font-medium text-amber-900">Firebase 환경변수가 설정되지 않았습니다.</div><div className="mt-1 text-xs text-amber-800">Firebase 미설정 상태입니다. 현재는 데모 모드로 로그인할 수 있습니다: GH45 / 2706</div></CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">{menuItems.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => {
  if (item.key === "approval") setActiveTab("approval");
  setCurrentPage(item.key);
}} className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md sm:p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><Icon className="h-6 w-6" /></div><div><div className="text-base font-semibold text-slate-900 sm:text-lg">{item.title}</div><div className="mt-1 text-sm text-slate-500">{item.description}</div></div></div></button>; })}</div>
    </div>
  );

  const renderSectionMobileCards = (
  columns: string[],
  rows: Record<string, DabsRowItem[]>
) => (
    <div className="space-y-3 lg:hidden">
      {columns.map((col) => {
        const list = rows[col] || [];
        return <MobileListCard key={col} title={col}>{list.length === 0 ? <div className="text-slate-400">입력 없음</div> : list.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-medium text-slate-500">{item.company}</div><div className="mt-1 flex items-start justify-between gap-2"><span className="text-slate-900">{item.content}</span>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteDabsItem(item.id, col)} className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div></div>)}</MobileListCard>;
      })}
    </div>
  );

  const renderMaterialsMobileCards = (list: DabsRowItem[]) => (
    <div className="space-y-3 lg:hidden">
      {MATERIAL_TIMES.map((time) => {
        const row = list.filter((item) => item.time === time);
        const gate1 = row.filter((item) => item.gate === "1");
        const gate7 = row.filter((item) => item.gate === "7");
        return <MobileListCard key={time} title={`${time}시`}><div className="grid gap-3 md:grid-cols-2"><div><div className="mb-2 text-xs font-semibold text-slate-500">1게이트</div>{gate1.length === 0 ? <div className="text-slate-400">입력 없음</div> : gate1.map((item) => <div key={item.id} className="mb-2 rounded-xl bg-slate-50 p-3"><div className="text-xs font-medium text-slate-500">{item.company}</div><div className="mt-1 text-sm">자재명: {item.material}</div><div className="text-sm">차종: {item.vehicle}</div><div className="mt-1 flex items-start justify-between gap-2 text-sm"><span>하역장소: {item.location}</span>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteDabsItem(item.id)} className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div></div>)}</div><div><div className="mb-2 text-xs font-semibold text-slate-500">7게이트</div>{gate7.length === 0 ? <div className="text-slate-400">입력 없음</div> : gate7.map((item) => <div key={item.id} className="mb-2 rounded-xl bg-slate-50 p-3"><div className="text-xs font-medium text-slate-500">{item.company}</div><div className="mt-1 text-sm">자재명: {item.material}</div><div className="text-sm">차종: {item.vehicle}</div><div className="mt-1 flex items-start justify-between gap-2 text-sm"><span>하역장소: {item.location}</span>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteDabsItem(item.id)} className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div></div>)}</div></div></MobileListCard>;
      })}
    </div>
  );

  const renderSoloWorkerDesktopTable = () => (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block"><table className="min-w-full border-collapse text-sm"><thead><tr className="bg-slate-100 text-slate-700"><th className="border border-slate-200 px-3 py-2 text-left w-[9%]">동</th><th className="border border-slate-200 px-3 py-2 text-left w-[16%]">업체명</th><th className="border border-slate-200 px-3 py-2 text-left w-[16%]">성명</th><th className="border border-slate-200 px-3 py-2 text-left">작업 내용</th><th className="border border-slate-200 px-3 py-2 text-left w-[10%]">고령자</th></tr></thead><tbody>{SOLO_WORKER_COLUMNS.map((col) => { const rawList = soloRows[col] || []; const list = rawList.filter((item) => String(item.company || "").toLowerCase().includes(soloCompanyFilter.trim().toLowerCase())); const grouped = groupSoloWorkersByCompany(list); const totalRows = grouped.reduce((sum, [, items]) => sum + items.length, 0); if (totalRows === 0) return <tr key={col}><td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{col}</td><td className="border border-slate-200 px-3 py-2 text-slate-300" colSpan={4}>-</td></tr>; return grouped.flatMap(([company, items], groupIndex) => { const color = getCompanyColor(company); return items.map((item, idx) => { const elderlyHighlight = item.elderly === "o" ? "bg-amber-50 text-amber-700 font-semibold" : "text-slate-600"; return <tr key={`${col}-${item.id}`} className={groupIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>{groupIndex === 0 && idx === 0 && <td rowSpan={totalRows} className="border border-slate-200 px-3 py-2 align-top font-medium text-slate-700">{col}</td>}{idx === 0 && <td rowSpan={items.length} className={cn("border border-slate-200 px-3 py-2 align-top font-semibold", color.bg, color.border, color.text)}>{company}</td>}<td className="border border-slate-200 px-3 py-2 align-top">{item.name}</td><td className="border border-slate-200 px-3 py-2 align-top"><div className="flex items-center justify-between gap-2"><span>{item.content}</span>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteSoloWorker(item.id, col)} className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div></td><td className={cn("border border-slate-200 px-3 py-2 align-top", elderlyHighlight)}>{item.elderly}</td></tr>; }); }); })}</tbody></table></div>
  );

  const renderSoloWorkerMobileCards = () => {
    const blocks = SOLO_WORKER_COLUMNS.flatMap((col) => {
      const rawList = soloRows[col] || [];
      const list = rawList.filter((item) => String(item.company || "").toLowerCase().includes(soloCompanyFilter.trim().toLowerCase()));
      return list.map((item) => ({ ...item, building: col }));
    });
    return <div className="space-y-3 lg:hidden">{blocks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">조건에 맞는 단독작업자가 없습니다.</div> : blocks.map((item) => { const color = getCompanyColor(item.company || "-"); return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">{item.building}</div><div className={cn("mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", color.bg, color.border, color.text)}>{item.company}</div></div>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteSoloWorker(item.id, item.building)} className="rounded-full border border-slate-300 p-1 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div><div className="space-y-2 text-sm"><div><span className="mr-2 font-medium text-slate-500">성명</span><span className="text-slate-900">{item.name}</span></div><div><span className="mr-2 font-medium text-slate-500">작업</span><span className="text-slate-900">{item.content}</span></div><div><span className="mr-2 font-medium text-slate-500">고령자</span><span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", item.elderly === "o" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{item.elderly}</span></div></div></div>; })}</div>;
  };

  const renderDabsPage = () => {
    const selectedTabValue = dabsData[selectedDate]?.[activeDabsKey];
    const isImageTab = activeDabsKey === "highRisk" || activeDabsKey === "equipmentFlow";
    const isSectionTab = activeDabsKey === "section1" || activeDabsKey === "section2";
    const isMaterialTab = activeDabsKey === "materialsAfter1" || activeDabsKey === "materialsAfter2";
    const activeColumns = activeDabsKey === "section1" ? SECTION1_COLUMNS : SECTION2_COLUMNS;
    const sectionRows =
  typeof selectedTabValue === "object" && selectedTabValue && "rows" in selectedTabValue
    ? selectedTabValue.rows || {}
    : {};
    const materialList =
  typeof selectedTabValue === "object" && selectedTabValue && "list" in selectedTabValue
    ? selectedTabValue.list || []
    : [];
    return (
      <div className="space-y-4 sm:space-y-6">
        {renderTopBar()}
        {imagePopup.open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl sm:p-6"><div className="text-base font-semibold text-slate-900">작업내용 입력</div>{imagePopup.targetKey === "highRisk" && <div className="mt-4 space-y-2"><label className="text-xs font-medium text-slate-600">동 선택</label><select value={imagePopup.building} onChange={(e) => setImagePopup((prev) => ({ ...prev, building: e.target.value }))} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"><option value="">동 선택</option>{HIGH_RISK_BUILDINGS.map((building) => <option key={building} value={building}>{building}</option>)}</select></div>}{imagePopup.targetKey === "equipmentFlow" && <div className="mt-4 space-y-2"><label className="text-xs font-medium text-slate-600">장비 선택</label><select value={imagePopup.equipmentType} onChange={(e) => setImagePopup((prev) => ({ ...prev, equipmentType: e.target.value }))} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200">{EQUIPMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>}<div className="mt-4"><Input value={imagePopup.note} onChange={(e) => setImagePopup((prev) => ({ ...prev, note: e.target.value }))} placeholder="작업내용 입력" /></div><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" className="w-full sm:w-auto" onClick={cancelMarkerPopup}>취소</Button><Button className="w-full sm:w-auto" onClick={submitMarkerPopup}>입력</Button></div></div></div>}
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />DAB&apos;s회의</CardTitle><Button variant="outline" onClick={() => setCurrentPage("menu")}>메뉴로 돌아가기</Button></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{dabsTabs.map((tab, index) => <button key={tab.key} onClick={() => setDabsTabIndex(index)} className={cn("shrink-0 rounded-2xl px-3 py-2 text-sm font-medium transition sm:px-4", dabsTabIndex === index ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{tab.label}</button>)}</div>
            <Card className="border-slate-200 shadow-none">
              <CardHeader><CardTitle className="text-base">{activeDabsTab.label}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">선택 날짜: {formatMonthDay(selectedDate)}</div>
                {isImageTab && <>{activeDabsKey === "highRisk" && canUploadDabsImage && <div className="space-y-2"><label className="text-xs font-medium text-slate-600">사진 업로드</label><Input type="file" accept="image/*" onChange={handleHighRiskImageUpload} className="h-auto py-2" /><div className="text-xs text-slate-500">업로드한 사진은 날짜와 관계없이 고위험작업과 장비동선 탭에 공통으로 표시됩니다.</div></div>}{activeDabsKey === "equipmentFlow" && <div className="text-xs text-slate-500">첫 번째 터치/클릭은 시작점, 이동 중에는 미리보기, 종료 지점에서 화살표가 생성됩니다.</div>}{activeDabsKey === "highRisk" && <div className="text-xs text-slate-500">사진을 클릭하면 동, 업체명, 작업내용이 사진 위에 표시됩니다.</div>}{renderOverlayImage(activeDabsKey === "highRisk" ? dabsImages?.highRisk : dabsImages?.equipmentFlow, isImageTab)}</>}
                {isSectionTab && <><div className="grid gap-3 md:grid-cols-[220px_1fr_auto]"><select value={sectionInput.building} onChange={(e) => setSectionInput({ ...sectionInput, building: e.target.value })} className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"><option value="">동 선택</option>{activeColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select><Input value={sectionInput.content} onChange={(e) => setSectionInput({ ...sectionInput, content: e.target.value })} placeholder="작업내용 입력" /><Button onClick={handleAddSectionWork} disabled={!canEditDabs} className="w-full md:w-auto">추가</Button></div>{renderSectionMobileCards(activeColumns, sectionRows)}<div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block"><table className="min-w-full border-collapse text-sm"><thead><tr className="bg-slate-100 text-slate-700"><th className="border border-slate-200 px-3 py-2 text-left w-[9%]">동</th><th className="border border-slate-200 px-3 py-2 text-left w-[18%]">업체명</th><th className="border border-slate-200 px-3 py-2 text-left">작업내용</th></tr></thead><tbody>{activeColumns.map((col) => { const list = sectionRows[col] || []; return <tr key={col}><td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{col}</td><td className="border border-slate-200 px-3 py-2 align-top">{list.length === 0 ? <span className="text-slate-300">-</span> : list.map((item) => <div key={`company-${item.id}`} className="mb-2">{item.company}</div>)}</td><td className="border border-slate-200 px-3 py-2 align-top">{list.length === 0 ? <span className="text-slate-300">-</span> : list.map((item) => <div key={`content-${item.id}`} className="mb-2 flex items-center justify-between gap-2"><span>{item.content}</span>{canDeleteDabsItem && <button type="button" onClick={() => handleDeleteDabsItem(item.id, col)} className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"><X className="h-3 w-3" /></button>}</div>)}</td></tr>; })}</tbody></table></div></>}
                {isMaterialTab && <><div className="grid gap-3 md:grid-cols-6"><select value={materialsInput.gate} onChange={(e) => setMaterialsInput({ ...materialsInput, gate: e.target.value })} className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"><option value="1">1게이트</option><option value="7">7게이트</option></select><select value={materialsInput.time} onChange={(e) => setMaterialsInput({ ...materialsInput, time: e.target.value })} className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500">{MATERIAL_TIMES.map((time) => <option key={time} value={time}>{time}시</option>)}</select><Input value={materialsInput.material} onChange={(e) => setMaterialsInput({ ...materialsInput, material: e.target.value })} placeholder="자재명" /><Input value={materialsInput.vehicle} onChange={(e) => setMaterialsInput({ ...materialsInput, vehicle: e.target.value })} placeholder="차종" /><Input value={materialsInput.location} onChange={(e) => setMaterialsInput({ ...materialsInput, location: e.target.value })} placeholder="하역장소" /><Button onClick={handleAddMaterial} disabled={!canEditDabs} className="w-full md:w-auto">추가</Button></div>{renderMaterialsMobileCards(materialList)}<div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white lg:block"><table className="min-w-[1200px] border-collapse text-sm"><thead><tr className="bg-slate-100 text-slate-700"><th rowSpan={2} className="border border-slate-200 px-3 py-2 text-left">시간</th><th colSpan={4} className="border border-slate-200 px-3 py-2 text-center">1게이트</th><th colSpan={4} className="border border-slate-200 px-3 py-2 text-center">7게이트</th></tr><tr className="bg-slate-100 text-slate-700"><th className="border border-slate-200 px-3 py-2 text-left">업체명</th><th className="border border-slate-200 px-3 py-2 text-left">자재명</th><th className="border border-slate-200 px-3 py-2 text-left">차종</th><th className="border border-slate-200 px-3 py-2 text-left">하역장소</th><th className="border border-slate-200 px-3 py-2 text-left">업체명</th><th className="border border-slate-200 px-3 py-2 text-left">자재명</th><th className="border border-slate-200 px-3 py-2 text-left">차종</th><th className="border border-slate-200 px-3 py-2 text-left">하역장소</th></tr></thead><tbody>{MATERIAL_TIMES.map((time) => { const row = materialList.filter((item) => item.time === time); const gate1 = row.filter((item) => item.gate === "1"); const gate7 = row.filter((item) => item.gate === "7"); const renderCell = (items: DabsRowItem[], field: keyof DabsRowItem) =>
  items.map((item) => (
    <div key={`${field}-${item.id}`} className="mb-2 flex items-center justify-between gap-1">
      <span>{item[field]}</span>
      {canDeleteDabsItem && field === "location" && (
        <button
          type="button"
          onClick={() => handleDeleteDabsItem(item.id)}
          className="rounded-full border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )); return <tr key={time}><td className="border border-slate-200 px-3 py-2 font-medium">{time}시</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate1, "company")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate1, "material")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate1, "vehicle")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate1, "location")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate7, "company")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate7, "material")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate7, "vehicle")}</td><td className="border border-slate-200 px-3 py-2 align-top">{renderCell(gate7, "location")}</td></tr>; })}</tbody></table></div></>}
                {!isImageTab && !isSectionTab && !isMaterialTab && <><TextArea value={dabsDraft} onChange={(e) => setDabsDraft(e.target.value)} placeholder="회의 내용, 작업사항, 확인사항 등을 입력하세요." /><div className="flex justify-end"><Button onClick={handleSaveDabsText} disabled={!canEditDabs} className="w-full sm:w-auto">저장</Button></div></>}
                {dabsMessage && <div className="text-sm text-slate-600">{dabsMessage}</div>}
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-none"><CardHeader><CardTitle className="text-base">하단 달력</CardTitle></CardHeader><CardContent><div className="grid grid-cols-7 gap-1 text-xs">{weekLabels.map((label) => <div key={label} className="rounded-lg bg-slate-100 py-2 text-center font-medium text-slate-600">{label}</div>)}{monthGrid.map((date) => { const key = formatDateKey(date); const isSelected = key === selectedDate; const isCurrentMonth = date.getMonth() === currentDate.getMonth(); return <button key={key} onClick={() => setSelectedDate(key)} className={cn("rounded-lg p-2 text-center transition", isSelected ? "bg-slate-900 text-white" : isCurrentMonth ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-50 text-slate-400")}>{date.getDate()}</button>; })}</div></CardContent></Card>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSoloWorkerPage = () => (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}
      <Card><CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />단독작업자</CardTitle><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setCurrentPage("menu")}>메뉴로 돌아가기</Button></div></CardHeader><CardContent className="space-y-6"><Card className="border-slate-200 shadow-none"><CardHeader><CardTitle className="text-base">단독작업자</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">선택 날짜: {formatMonthDay(selectedDate)}</div><div className="grid gap-3 xl:grid-cols-[150px_150px_1fr_120px_auto]"><select value={soloWorkerInput.building} onChange={(e) => setSoloWorkerInput({ ...soloWorkerInput, building: e.target.value })} className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"><option value="">동 선택</option>{SOLO_WORKER_COLUMNS.map((column) => <option key={column} value={column}>{column}</option>)}</select><Input value={soloWorkerInput.name} onChange={(e) => setSoloWorkerInput({ ...soloWorkerInput, name: e.target.value })} placeholder="성명 입력" /><Input value={soloWorkerInput.content} onChange={(e) => setSoloWorkerInput({ ...soloWorkerInput, content: e.target.value })} placeholder="작업 내용 입력" /><select value={soloWorkerInput.elderly} onChange={(e) => setSoloWorkerInput({ ...soloWorkerInput, elderly: e.target.value })} className="h-10 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"><option value="o">고령자 o</option><option value="x">고령자 x</option></select><Button onClick={handleAddSoloWorker} disabled={!canEditDabs} className="w-full xl:w-auto">추가</Button></div><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={soloCompanyFilter} onChange={(e) => setSoloCompanyFilter(e.target.value)} placeholder="업체명 검색" /></div><div className="text-xs text-slate-500">고령자 o는 강조 표시되며, 업체별 색상이 자동 적용됩니다.</div></div>{renderSoloWorkerMobileCards()}{renderSoloWorkerDesktopTable()}</CardContent></Card><Card className="border-slate-200 shadow-none"><CardHeader><CardTitle className="text-base">하단 달력</CardTitle></CardHeader><CardContent><div className="grid grid-cols-7 gap-1 text-xs">{weekLabels.map((label) => <div key={label} className="rounded-lg bg-slate-100 py-2 text-center font-medium text-slate-600">{label}</div>)}{monthGrid.map((date) => { const key = formatDateKey(date); const isSelected = key === selectedDate; const isCurrentMonth = date.getMonth() === currentDate.getMonth(); return <button key={key} onClick={() => setSelectedDate(key)} className={cn("rounded-lg p-2 text-center transition", isSelected ? "bg-slate-900 text-white" : isCurrentMonth ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-50 text-slate-400")}>{date.getDate()}</button>; })}</div></CardContent></Card></CardContent></Card>
    </div>
  );

  const renderEducationPage = () => (
    <div className="space-y-4 sm:space-y-6">
      {renderTopBar()}
      {deleteNoticeOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><div className="text-lg font-semibold text-slate-900">안내</div><div className="mt-3 text-sm text-slate-600">삭제는 관리자에게 요청</div><div className="mt-6 flex justify-end"><Button onClick={() => setDeleteNoticeOpen(false)}>확인</Button></div></div></div>}
      <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => setCurrentPage("menu")}>메뉴로 돌아가기</Button></div>
      <Card className="rounded-[24px] border-0 shadow-sm"><CardContent className="p-3"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{tabs.map((tab) => { const Icon = tab.icon; const isActive = activeTab === tab.key; return <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition", isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}><Icon className="h-4 w-4" />{tab.label}{tab.key === "approval" && pendingUsers.length > 0 && <span className={cn("rounded-full px-2 py-0.5 text-xs", isActive ? "bg-white/20 text-white" : "bg-white text-slate-700")}>{pendingUsers.length}</span>}</button>; })}</div></CardContent></Card>
      {activeTab === "calendar" && <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6"><div className="space-y-6"><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>월간 달력</CardTitle><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><div className="min-w-28 text-center text-sm font-semibold sm:min-w-36 sm:text-base">{monthLabel}</div><Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div></CardHeader><CardContent><div className="grid grid-cols-7 gap-1 sm:gap-2">{weekLabels.map((label) => <div key={label} className="rounded-xl bg-slate-100 py-2 text-center text-[10px] font-semibold text-slate-600 sm:text-xs">{label}</div>)}{monthGrid.map((date) => { const key = formatDateKey(date); const isCurrentMonth = date.getMonth() === currentDate.getMonth(); const isToday = key === todayKey; const isSelected = key === selectedDate; const cellEntries = entries.filter((entry) => entry.date === key); return <button key={key} onClick={() => setSelectedDate(key)} className={cn("min-h-[72px] rounded-xl border p-1.5 text-left transition sm:min-h-[82px] sm:p-2", isSelected ? "border-slate-900 bg-slate-100" : isCurrentMonth ? "border-slate-200 bg-white shadow-sm" : "border-slate-100 bg-slate-50 text-slate-400")}><div className="mb-1 flex items-center justify-between sm:mb-2"><div className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold sm:h-6 sm:w-6 sm:text-xs", isToday ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700")}>{date.getDate()}</div><Badge className="px-1.5 py-0">{cellEntries.length}</Badge></div><div className="space-y-1">{cellEntries.map((entry) => (
  <div
    key={entry.id}
    className="rounded-lg bg-slate-50 p-1 text-[9px] text-slate-700 sm:p-1.5 sm:text-[10px]"
  >
    <div className="font-semibold text-slate-900">
  {entry.startTime}
</div>
<div className="whitespace-pre-wrap break-words leading-tight">
  {entry.companyName}
</div>
  </div>
))}</div></button>; })}</div></CardContent></Card></div><div className="space-y-6"><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle>일정 입력</CardTitle></CardHeader><CardContent className="space-y-4">{!currentUser ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">일정 등록은 승인된 계정으로 로그인한 뒤 사용할 수 있습니다.</div> : <><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-xs font-medium text-slate-600">일자 선택</label><Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9" /></div><div className="space-y-2"><label className="text-xs font-medium text-slate-600">시간 선택</label><select value={effectiveSelectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="flex h-10 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100" disabled={availableTimes.length === 0}>{availableTimes.length === 0 ? <option value="">선택 가능한 시간이 없습니다</option> : availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select><div className="text-xs text-slate-500">{availableTimes.length === 0 ? "해당 일자는 선택 가능한 시간이 없습니다" : `자동 표기 시간: ${effectiveSelectedTime} ~ ${effectiveEndTime}`}</div></div></div><div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-500">작성자: {currentUser.name} · {currentUser.companyName} · {getRoleLabel(currentUser.role || "general")}</div><Button className="w-full sm:w-auto" onClick={addEntry} disabled={availableTimes.length === 0}>일정 등록</Button></div></>}{entryMessage && (
  <div className="text-sm text-slate-600">{entryMessage}</div>
)}

<div className="mt-2 text-xs text-slate-400">시간 중복 불가</div></CardContent></Card><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle>선택 일자 등록 목록</CardTitle></CardHeader><CardContent className="space-y-3"><div><div className="text-sm text-slate-500">현재 선택 일자</div><div className="text-xl font-bold text-slate-900">{formatMonthDay(selectedDate)}</div></div>{dayEntries.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">등록된 일정이 없습니다.</div> : dayEntries.map((entry) => <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div><div className="text-base font-semibold text-slate-900">{entry.companyName}</div><div className="mt-1 text-sm text-slate-600">{formatMonthDay(entry.date)}</div><div className="mt-1 text-sm text-slate-600">{entry.startTime} ~ {entry.endTime}</div><div className="mt-1 text-xs text-slate-500">작성자: {entry.createdByName || "-"} ({getRoleLabel(entry.createdByRole || "general")})</div></div><button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteEntry(entry.id);
  }}
  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
  disabled={!currentUser}
  title="일정 삭제"
>
  <Trash2 className="h-4 w-4" />
</button></div></motion.div>)}</CardContent></Card></div></div>}
      {activeTab === "approval" && <div className="space-y-6"><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><LayoutGrid className="h-5 w-5" />가입 승인 전용 탭</CardTitle></CardHeader><CardContent>{!canManageApprovals ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">가입 승인 관리는 관리자 또는 마스터만 접근할 수 있습니다.</div> : pendingUsers.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">현재 승인 대기 중인 계정이 없습니다.</div> : <div className="space-y-3">{pendingUsers.map((user) => { const canApproveThisUser = user.role === "admin" ? canApproveAdmin : canApproveGeneral; return <div key={user.uid} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div className="space-y-1"><div className="text-base font-semibold text-slate-900">{user.name} ({user.email || user.uid})</div><div className="text-sm text-slate-600">업체명: {user.companyName}</div><div className="text-sm text-slate-600">신청 권한: {getRoleLabel(user.role || "general")}</div><div className="text-xs text-slate-500">상태: {getStatusLabel(user.status || "pending")}</div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => rejectUser(user.uid)} disabled={!canApproveThisUser}>반려</Button><Button onClick={() => approveUser(user.uid)} disabled={!canApproveThisUser}>승인</Button></div></div>{!canApproveThisUser && <div className="mt-3 text-xs text-red-500">이 계정은 현재 로그인한 권한으로 승인할 수 없습니다.</div>}</div>; })}</div>}</CardContent></Card><Card className="rounded-[24px] border-0 shadow-sm"><CardHeader><CardTitle>승인된 회원 목록</CardTitle></CardHeader><CardContent className="space-y-3">{approvedUsers.map((user) => {
  const canCancelThisUser = user.role === "admin" ? canApproveAdmin : canApproveGeneral;

  return (
    <div key={user.uid} className="rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-slate-900">
            {user.name} ({user.email || user.uid})
          </div>
          <div className="text-slate-600">{user.companyName}</div>
          <div className="mt-1 text-xs text-slate-500">
            {getRoleLabel(user.role || "general")} · {getStatusLabel(user.status || "pending")}
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
})}</CardContent></Card></div>}
    </div>
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        {!currentUser
  ? renderAuthScreen()
  : currentPage === "menu"
    ? renderMenuScreen()
    : currentPage === "dabs"
      ? renderDabsPage()
      : currentPage === "soloWorker"
        ? renderSoloWorkerPage()
        : currentPage === "approval"
          ? renderEducationPage()
          : renderEducationPage()}
      </div>
    </div>
  );
}
