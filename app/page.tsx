
"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileImage,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
  ScanSearch,
  ClipboardList,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

type Inspection = {
  id: number | string;
  file_name: string;
  file_size: number;
  analysis: string;
  status: string;
  review_comment: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "New Inspection", icon: ScanSearch },
  { label: "Inspection History", icon: ClipboardList },
  { label: "Human Review", icon: FileCheck2 },
  { label: "Reports", icon: FileText },
];

export default function Home() {
  // Authentication
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Navigation
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Inspection upload and Gemini analysis
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // Supabase records
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  // Human review
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);

    // Garment image of the selected inspection (private storage, signed URL).
  const [inspectionImageUrl, setInspectionImageUrl] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageRetry, setImageRetry] = useState(0);
  const reviewPanelRef = useRef<HTMLDivElement>(null);

  // Load the original garment image whenever an inspection is opened.
  useEffect(() => {
    const inspectionId = selectedInspection?.id;
    const token = session?.access_token;

    if (!inspectionId || !token) {
      setInspectionImageUrl("");
      setImageError("");
      return;
    }

    let cancelled = false;

    async function loadImage() {
      setImageLoading(true);
      setImageError("");
      setInspectionImageUrl("");

      try {
        const response = await fetch(
          `/api/inspections/${inspectionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
               const raw = await response.text();
        let result: { error?: string; imageUrl?: string } = {};

        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error(
            `Image API returned an unexpected response (status ${response.status}).`
          );
        }

        if (!response.ok || !result.imageUrl) {
          throw new Error(result.error || "Could not load garment image.");
        }

        if (!cancelled) setInspectionImageUrl(result.imageUrl);
      } catch (error) {
        if (!cancelled) {
          setImageError(
            error instanceof Error
              ? error.message
              : "Could not load garment image."
          );
        }
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [selectedInspection?.id, session?.access_token, imageRetry]);

  // Bring the review panel into view when an inspection is opened.
  useEffect(() => {
    if (activePage === "Human Review" && selectedInspection) {
      reviewPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedInspection?.id, activePage]);

  // Check Supabase session.
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
      }

      setSession(data.session);
      setAuthLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthError("");
      setAuthMessage("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load inspection records belonging to logged-in user.
  async function loadInspections() {
    if (!session?.user?.id) return;

    setDataLoading(true);
    setDataError("");

    try {
      const { data, error } = await supabase
        .from("inspections")
        .select(
          "id, file_name, file_size, analysis, status, review_comment, created_at, reviewed_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setInspections((data || []) as Inspection[]);
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : "Could not load inspection records."
      );
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      loadInspections();
    } else {
      setInspections([]);
    }
  }, [session?.user?.id]);

  // Create image preview.
  useEffect(() => {
    if (!selectedFile) {
      setPreview("");
      return;
    }

    const imageUrl = URL.createObjectURL(selectedFile);
    setPreview(imageUrl);

    return () => URL.revokeObjectURL(imageUrl);
  }, [selectedFile]);

  // Login and signup.
  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthError("");
    setAuthMessage("");

    if (!email.trim() || !password) {
      setAuthError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must contain at least 6 characters.");
      return;
    }

    setAuthSubmitting(true);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setAuthMessage("Account created successfully!");
        } else {
          setAuthMessage(
            "Account created! Please check your email to confirm your account before logging in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setAuthMessage("Login successful!");
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  // Logout.
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedFile(null);
    setSelectedInspection(null);
    setAnalysis("");
    setAnalysisError("");
    setReviewComment("");
    setReviewMessage("");
    setReviewError("");
    setActivePage("Dashboard");
    setInspections([]);
  }

  // Validate uploaded image.
  function handleFile(file?: File) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("Image size must be less than 5 MB.");
      return;
    }

    setSelectedFile(file);
    setAnalysis("");
    setAnalysisError("");
    setSelectedInspection(null);
    setReviewComment("");
    setReviewMessage("");
    setReviewError("");
  }

  // Gemini AI image analysis.
  async function handleAnalyze() {
    if (!selectedFile || !session?.access_token || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysis("");
    setAnalysisError("");
    setSelectedInspection(null);
    setReviewMessage("");
    setReviewError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.analysis) {
          setAnalysis(result.analysis);
        }

        throw new Error(result.error || "Inspection failed.");
      }

      if (!result.inspection?.analysis) {
        throw new Error("The server did not return an analysis result.");
      }

      setAnalysis(result.inspection.analysis);
      setSelectedInspection(result.inspection);
      setReviewComment("");

      await loadInspections();
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Clean Gemini Markdown formatting for display.
  function cleanAnalysis(text: string) {
    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-•]\s*/gm, "• ")
      .trim();
  }

  // Save human inspector decision to Supabase.
  async function handleHumanReview(status: string) {
    if (!selectedInspection || !session?.access_token || reviewSaving) {
      return;
    }

    if (!["Approved", "Rejected", "Needs Review"].includes(status)) {
      return;
    }

    setReviewSaving(true);
    setReviewError("");
    setReviewMessage("");

    try {
      const response = await fetch(
        `/api/inspections/${selectedInspection.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status,
            review_comment: reviewComment,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save human review.");
      }

      setSelectedInspection(result.inspection);
      setAnalysis(result.inspection.analysis);
      setReviewComment(result.inspection.review_comment || "");

      setReviewMessage(`Inspection successfully marked as ${status}.`);

      await loadInspections();
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "Human review could not be saved."
      );
    } finally {
      setReviewSaving(false);
    }
  }
  
  // Quick Approve / Reject directly from Dashboard.
  async function handleQuickDecision(
    item: Inspection,
    status: "Approved" | "Rejected"
  ) {
    if (!session?.access_token || reviewSaving) return;

    const confirmed = window.confirm(
      `Are you sure you want to ${status.toLowerCase()} this inspection?`
    );

    if (!confirmed) return;

    setReviewSaving(true);
    setReviewError("");
    setReviewMessage("");

    try {
      const response = await fetch(`/api/inspections/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status,
          review_comment: item.review_comment || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update inspection.");
      }

      // Update the dashboard immediately.
      setInspections((previous) =>
        previous.map((inspection) =>
          String(inspection.id) === String(item.id)
            ? result.inspection
            : inspection
        )
      );

      // Also update selected inspection if it is currently open.
      setSelectedInspection((previous) =>
        previous &&
        String(previous.id) === String(item.id)
          ? result.inspection
          : previous
      );

      setReviewMessage(
        `Inspection #${item.id} successfully ${status.toLowerCase()}.`
      );

      await loadInspections();
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "Could not update inspection status."
      );
    } finally {
      setReviewSaving(false);
    }
  }


  // Select an existing inspection for review.
  function openInspection(item: Inspection) {
    setSelectedInspection(item);
    setAnalysis(item.analysis);
    setReviewComment(item.review_comment || "");
    setAnalysisError("");
    setReviewError("");
    setReviewMessage("");
  }
  // Original garment image, so the inspector can verify the AI result.
  function renderGarmentImage() {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf2",
          borderRadius: "9px",
          padding: "14px",
        }}
      >
        <h3 style={{ margin: "0 0 10px", color: "#202943" }}>
          Original Garment Image
        </h3>

        {imageLoading ? (
          <p style={{ color: "#6258d9", fontSize: "13px" }}>
            Loading garment image...
          </p>
        ) : inspectionImageUrl ? (
          <img
            src={inspectionImageUrl}
            alt="Original garment"
            onError={() => {
              setInspectionImageUrl("");
              setImageError("The image link expired or could not be loaded.");
            }}
            style={{
              width: "100%",
              maxHeight: "460px",
              objectFit: "contain",
              borderRadius: "8px",
              background: "#f8f9fc",
            }}
          />
        ) : (
          <div style={{ fontSize: "13px", color: "#bd3545" }}>
            <p style={{ marginBottom: "10px" }}>
              {imageError || "No image is saved for this inspection."}
            </p>
            <button
              className="outline-button"
              onClick={() => setImageRetry((count) => count + 1)}
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // Inspector comment + Approve / Reject / Needs Review buttons.
  function renderReviewControls(showMessages = false) {
    if (!selectedInspection) return null;

    return (
      <div>
        {showMessages && reviewMessage && (
          <div
            style={{
              background: "#eaf8f0",
              color: "#237c53",
              padding: "12px 15px",
              borderRadius: "9px",
              margin: "16px 0",
              fontSize: "13px",
            }}
          >
            <CheckCircle2 size={16} style={{ verticalAlign: "middle" }} />{" "}
            {reviewMessage}
          </div>
        )}

        {showMessages && reviewError && (
          <div
            style={{
              background: "#fff0f1",
              color: "#bd3545",
              padding: "12px 15px",
              borderRadius: "9px",
              margin: "16px 0",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={16} style={{ verticalAlign: "middle" }} />{" "}
            {reviewError}
          </div>
        )}

        <label
          style={{
            display: "block",
            margin: "20px 0 8px",
            fontSize: "13px",
            fontWeight: 650,
            color: "#303951",
          }}
        >
                  Inspector Comment
        </label>

        <textarea
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
          placeholder="Write your inspection comments or reason for rejection..."
          rows={4}
          style={{
            width: "100%",
            padding: "13px",
            border: "1px solid #e0e4ed",
            borderRadius: "9px",
            boxSizing: "border-box",
            fontFamily: "inherit",
            resize: "vertical",
            fontSize: "14px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "16px",
          }}
        >
          <button
            className="primary-button"
            disabled={reviewSaving}
            onClick={() => handleHumanReview("Approved")}
          >
            <CheckCircle2 size={17} />
            Approve
          </button>

          <button
            className="outline-button"
            disabled={reviewSaving}
            onClick={() => handleHumanReview("Rejected")}
          >
            <XCircle size={17} />
            Reject
          </button>

          <button
            className="outline-button"
            disabled={reviewSaving}
            onClick={() => handleHumanReview("Needs Review")}
          >
            <Eye size={17} />
            Needs Review
          </button>
        </div>

        {reviewSaving && (
          <p style={{ marginTop: "14px", color: "#6258d9", fontSize: "13px" }}>
            Saving inspector decision...
          </p>
        )}
      </div>
    );
  }
  // Dashboard statistics.
  const totalInspections = inspections.length;

  const pendingReviews = inspections.filter(
    (item) =>
      item.status?.toLowerCase() === "pending" ||
      item.status?.toLowerCase() === "needs review"
  ).length;

  const approvedInspections = inspections.filter(
    (item) => item.status?.toLowerCase() === "approved"
  ).length;

  const defectsDetected = inspections.filter((item) => {
    const text = (item.analysis || "").toLowerCase();

    return (
      text.includes("defect detected") ||
      text.includes("stain") ||
      text.includes("tear") ||
      text.includes("hole") ||
      text.includes("damaged") ||
      text.includes("stitching issue")
    );
  }).length;

  const filteredInspections = inspections.filter((item) =>
    `${item.id} ${item.file_name} ${item.status} ${item.analysis}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const pendingInspectionRecords = inspections.filter(
    (item) =>
      item.status?.toLowerCase() === "pending" ||
      item.status?.toLowerCase() === "needs review"
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getFinding(text: string) {
    if (!text) return "No analysis available";

    const cleanText = cleanAnalysis(text);

    return cleanText.length > 90
      ? `${cleanText.substring(0, 90)}...`
      : cleanText;
  }

  function getStatusClass(status: string) {
    const normalized = (status || "pending")
      .toLowerCase()
      .replace(/\s+/g, "-");

    return normalized;
  }

  // Authentication loading screen.
  if (authLoading) {
    return (
      <main className="app-shell">
        <div
          style={{
            margin: "auto",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <ScanSearch size={38} />
          <h2>Loading GarmentAI...</h2>
          <p>Please wait while we verify your account.</p>
        </div>
      </main>
    );
  }

  // Login and signup screen.
  if (!session) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f5f7fc",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "#ffffff",
            borderRadius: "20px",
            padding: "38px",
            boxShadow: "0 15px 50px rgba(25, 40, 80, 0.09)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "16px",
                background: "#eef0ff",
                color: "#6258d9",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <ScanSearch size={29} />
            </div>

            <h1
              style={{
                fontSize: "27px",
                fontWeight: 750,
                color: "#18213b",
                margin: 0,
              }}
            >
              GarmentAI
            </h1>

            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "2px",
                color: "#8b91a5",
                marginTop: "5px",
              }}
            >
              QUALITY INSPECTOR
            </p>

            <p style={{ color: "#778097", marginTop: "20px" }}>
              {authMode === "login"
                ? "Welcome back! Sign in to your workspace."
                : "Create an account to start inspecting garments."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              background: "#f3f4f9",
              padding: "5px",
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                border: "none",
                padding: "11px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 650,
                background: authMode === "login" ? "#ffffff" : "transparent",
                color: authMode === "login" ? "#5146c8" : "#777e91",
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                border: "none",
                padding: "11px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 650,
                background: authMode === "signup" ? "#ffffff" : "transparent",
                color: authMode === "signup" ? "#5146c8" : "#777e91",
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 650,
                marginBottom: "8px",
                color: "#303951",
              }}
            >
              Email Address
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "13px 14px",
                border: "1px solid #e0e4ed",
                borderRadius: "9px",
                marginBottom: "19px",
                outlineColor: "#7165df",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />

            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 650,
                marginBottom: "8px",
                color: "#303951",
              }}
            >
              Password
            </label>

            <div style={{ position: "relative", marginBottom: "22px" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                style={{
                  width: "100%",
                  padding: "13px 44px 13px 14px",
                  border: "1px solid #e0e4ed",
                  borderRadius: "9px",
                  outlineColor: "#7165df",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                style={{
                  position: "absolute",
                  right: "13px",
                  top: "12px",
                  border: "none",
                  background: "transparent",
                  color: "#858ba0",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {authError && (
              <p
                style={{
                  color: "#d13c4b",
                  background: "#fff0f1",
                  padding: "11px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "15px",
                }}
              >
                {authError}
              </p>
            )}

            {authMessage && (
              <p
                style={{
                  color: "#237c53",
                  background: "#eaf8f0",
                  padding: "11px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "15px",
                }}
              >
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              style={{
                width: "100%",
                padding: "14px",
                background: authSubmitting ? "#9992dc" : "#6258d9",
                color: "#ffffff",
                border: "none",
                borderRadius: "9px",
                fontSize: "15px",
                fontWeight: 700,
                cursor: authSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {authSubmitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Login to Dashboard"
                  : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#9298a8",
              marginTop: "25px",
              lineHeight: 1.6,
            }}
          >
            AI-assisted quality control
            <br />
            Human decision required
          </p>
        </div>
      </main>
    );
  }

  // Main application.
  return (
    <main className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <ScanSearch size={23} />
          </div>

          <div>
            <h2>GarmentAI</h2>
            <span>QUALITY INSPECTOR</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${
                  activePage === item.label ? "nav-active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.label);
                  setMobileMenu(false);
                  setReviewMessage("");
                  setReviewError("");
                }}
              >
                <Icon size={19} />
                <span>{item.label}</span>

                {item.label === "Human Review" && pendingReviews > 0 && (
                  <span className="nav-count">{pendingReviews}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <ShieldCheck size={20} />
            </div>
            <h3>Quality first</h3>
            <p>
              AI assists your inspection process. Final decisions stay with
              human inspectors.
            </p>
          </div>

          <button
            className="nav-item"
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">
              {(session.user.email || "U").charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>
                {session.user.email?.split("@")[0] || "Inspector"}
              </strong>
              <span>Quality Inspector</span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              style={{
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span className="status-dot" />
              System operational
            </div>

            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>

            <div className="top-avatar">
              {(session.user.email || "U").charAt(0).toUpperCase()}
            </div>

            <ChevronDown size={16} className="chevron" />
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">QUALITY CONTROL / WORKSPACE</p>
              <h1>{activePage}</h1>
              <p className="page-description">
                Monitor garment quality, inspect defects, and manage reviews.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setActivePage("New Inspection");
                setSelectedInspection(null);
                setAnalysis("");
                setAnalysisError("");
              }}
            >
              <UploadCloud size={18} />
              New Inspection
            </button>
          </div>

          {dataError && (
            <div
              style={{
                background: "#fff0f1",
                color: "#bd3545",
                padding: "13px 16px",
                borderRadius: "9px",
                marginBottom: "18px",
                fontSize: "13px",
              }}
            >
              Could not load inspection data: {dataError}
            </div>
          )}

          {/* Dashboard page */}
          {activePage === "Dashboard" && (
            <>
              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Total Inspections</span>
                    <div className="stat-icon blue">
                      <FileImage size={20} />
                    </div>
                  </div>
                  <strong className="stat-number">
                    {dataLoading ? "..." : totalInspections}
                  </strong>
                  <p>Actual saved inspections</p>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Pending Reviews</span>
                    <div className="stat-icon orange">
                      <Clock3 size={20} />
                    </div>
                  </div>
                  <strong className="stat-number">
                    {dataLoading ? "..." : pendingReviews}
                  </strong>
                  <p>Waiting for human review</p>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Approved</span>
                    <div className="stat-icon green">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <strong className="stat-number">
                    {dataLoading ? "..." : approvedInspections}
                  </strong>
                  <p>Human-approved inspections</p>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Defects Detected</span>
                    <div className="stat-icon purple">
                      <Activity size={20} />
                    </div>
                  </div>
                  <strong className="stat-number">
                    {dataLoading ? "..." : defectsDetected}
                  </strong>
                  <p>Records containing defect keywords</p>
                </article>
              </section>

              <section className="work-grid">
                <article className="panel upload-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">AI QUALITY SCREENING</p>
                      <h2>New Inspection</h2>
                      <p className="panel-description">
                        Upload a garment image to begin quality inspection.
                      </p>
                    </div>

                    <div className="heading-icon">
                      <ScanSearch size={22} />
                    </div>
                  </div>

                  <div
                    className={`upload-zone ${preview ? "has-preview" : ""}`}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleFile(event.dataTransfer.files[0]);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        fileInput.current?.click();
                      }
                    }}
                  >
                    {preview ? (
                      <div className="preview-wrapper">
                        <img
                          src={preview}
                          alt="Selected garment preview"
                        />

                        <button
                          className="remove-image"
                          aria-label="Remove image"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedFile(null);
                            setAnalysis("");
                            setAnalysisError("");
                            setSelectedInspection(null);

                            if (fileInput.current) {
                              fileInput.current.value = "";
                            }
                          }}
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="upload-icon">
                          <UploadCloud size={29} />
                        </div>
                        <h3>Drop your garment image here</h3>
                        <p>
                          or <span>browse files</span> from your computer
                        </p>
                        <small>
                          JPG, PNG or WEBP · Maximum file size 5 MB
                        </small>
                      </>
                    )}

                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) =>
                        handleFile(event.target.files?.[0])
                      }
                    />
                  </div>

                  {selectedFile && (
                    <div className="selected-file">
                      <FileImage size={18} />
                      <div>
                        <strong>{selectedFile.name}</strong>
                        <span>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <CheckCircle2 size={18} className="file-check" />
                    </div>
                  )}

                  <button
                    className="primary-button analyze-button"
                    disabled={!selectedFile || isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    <ScanSearch size={18} />
                    {isAnalyzing
                      ? "Analyzing Garment..."
                      : "Analyze Garment"}
                  </button>

                  <div className="human-note">
                    <ShieldCheck size={17} />
                    <span>
                      AI suggestions require verification by a human inspector.
                    </span>
                  </div>
                </article>

                <article className="panel result-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">AI ANALYSIS</p>
                      <h2>Inspection Result</h2>
                      <p className="panel-description">
                        Your garment analysis will appear here.
                      </p>
                    </div>

                    <div className="heading-icon">
                      <Activity size={22} />
                    </div>
                  </div>

                  {isAnalyzing ? (
                    <div className="empty-result">
                      <div className="result-illustration">
                        <Activity size={38} />
                      </div>
                      <h3>Analyzing your garment...</h3>
                      <p>
                        Gemini AI is examining the image for visible defects,
                        fabric damage, stitching problems, and quality issues.
                        Please keep this page open.
                      </p>
                    </div>
                  ) : analysisError ? (
                    <div className="empty-result">
                      <div className="result-illustration">
                        <XCircle size={38} />
                      </div>
                      <h3>Analysis could not be completed</h3>
                      <p>{analysisError}</p>
                    </div>
                  ) : analysis ? (
                    <div style={{ padding: "18px" }}>
                      <div style={{ marginBottom: "15px" }}>
                        <span className="status-badge pending">
                          <span />
                          {selectedInspection?.status || "Pending"}
                        </span>
                      </div>

                      <div
                        style={{
                          maxHeight: "360px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.8,
                          color: "#344054",
                          fontSize: "14px",
                          background: "#f8f9fc",
                          padding: "18px",
                          borderRadius: "10px",
                        }}
                      >
                        {cleanAnalysis(analysis)}
                      </div>

                      <div className="human-note" style={{ marginTop: "15px" }}>
                        <ShieldCheck size={17} />
                        <span>
                          AI findings are suggestions. Human decision required.
                        </span>
                      </div>
                                            {selectedInspection && (
                        <div style={{ marginTop: "8px" }}>
                          {renderReviewControls(true)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-result">
                      <div className="result-illustration">
                        <ScanSearch size={38} />
                      </div>
                      <h3>Ready for inspection</h3>
                      <p>
                        Upload a garment image and start an inspection.
                        AI findings, defect details, and recommendations will
                        be displayed here.
                      </p>

                      <div className="result-features">
                        <span>
                          <CheckCircle2 size={15} /> Defect detection
                        </span>
                        <span>
                          <CheckCircle2 size={15} /> Quality assessment
                        </span>
                        <span>
                          <CheckCircle2 size={15} /> Human verification
                        </span>
                      </div>
                    </div>
                  )}
                </article>
              </section>

              <section className="panel history-panel">
                <div className="history-heading">
                  <div>
                    <p className="eyebrow">INSPECTION RECORDS</p>
                    <h2>Recent Inspections</h2>
                    <p className="panel-description">
                      Track your actual saved garment quality checks.
                    </p>
                  </div>

                  <div className="history-actions">
                    <div className="search-box">
                      <Search size={17} />
                      <input
                        type="text"
                        placeholder="Search inspections..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>

                    <button
                      className="outline-button"
                      onClick={() => setActivePage("Inspection History")}
                    >
                      View all
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="inspection-table">
                    <thead>
                      <tr>
                        <th>Inspection ID</th>
                        <th>Garment Image</th>
                        <th>Date</th>
                        <th>AI Finding</th>
                        <th>Status</th>
                        <th>Quick Review</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredInspections.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong className="inspection-id">
                              {item.id}
                            </strong>
                          </td>

                          <td>
                            <div className="file-cell">
                              <div className="file-icon">
                                <FileImage size={17} />
                              </div>
                              {item.file_name}
                            </div>
                          </td>

                          <td>{formatDate(item.created_at)}</td>

                          <td>{getFinding(item.analysis)}</td>

                          
<td>
  <span
    className={`status-badge ${getStatusClass(item.status)}`}
  >
    <span />
    {item.status || "Pending"}
  </span>
</td>

<td>
  {["pending", "needs review"].includes(
    (item.status || "").toLowerCase()
  ) ? (
    <div style={{
      display: "flex",
      gap: "7px",
      flexWrap: "wrap",
    }}>
      <button
        type="button"
        disabled={reviewSaving}
        onClick={() => handleQuickDecision(item, "Approved")}
        style={{
          border: "none",
          borderRadius: "7px",
          padding: "8px 10px",
          background: "#e8f7ee",
          color: "#237c53",
          fontWeight: 650,
          cursor: reviewSaving ? "not-allowed" : "pointer",
          fontSize: "12px",
        }}
      >
        <CheckCircle2 size={14} style={{ verticalAlign: "middle" }} /> Approve
      </button>

      <button
        type="button"
        disabled={reviewSaving}
        onClick={() => handleQuickDecision(item, "Rejected")}
        style={{
          border: "none",
          borderRadius: "7px",
          padding: "8px 10px",
          background: "#fff0f1",
          color: "#bd3545",
          fontWeight: 650,
          cursor: reviewSaving ? "not-allowed" : "pointer",
          fontSize: "12px",
        }}
      >
        <XCircle size={14} style={{ verticalAlign: "middle" }} /> Reject
      </button>
    </div>
  ) : (
    <span style={{ color: "#8b91a5", fontSize: "12px" }}>
      Reviewed
    </span>
  )}
</td>

                        </tr>
                      ))}

                      {!dataLoading && filteredInspections.length === 0 && (
                        <tr>
                          <td colSpan={6} className="no-results">
                            {search
                              ? "No matching inspections found."
                              : "No inspections found. Upload your first garment image to get started."}
                          </td>
                        </tr>
                      )}

                      {dataLoading && (
                        <tr>
                          <td colSpan={5} className="no-results">
                            Loading inspection records...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    paddingTop: "14px",
                  }}
                >
                  <button
                    className="outline-button"
                    onClick={loadInspections}
                    disabled={dataLoading}
                  >
                    <RefreshCw size={15} />
                    {dataLoading ? "Refreshing..." : "Refresh Records"}
                  </button>
                </div>
              </section>
            </>
          )}

          {/* New Inspection page */}
          {activePage === "New Inspection" && (
            <section className="work-grid">
              <article className="panel upload-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">AI QUALITY SCREENING</p>
                    <h2>Upload Garment</h2>
                    <p className="panel-description">
                      Select an image to start a new AI inspection.
                    </p>
                  </div>
                  <div className="heading-icon">
                    <ScanSearch size={22} />
                  </div>
                </div>

                <div
                  className={`upload-zone ${preview ? "has-preview" : ""}`}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files[0]);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInput.current?.click();
                    }
                  }}
                >
                  {preview ? (
                    <div className="preview-wrapper">
                      <img src={preview} alt="Selected garment preview" />
                      <button
                        className="remove-image"
                        aria-label="Remove image"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedFile(null);
                          setAnalysis("");
                          setSelectedInspection(null);
                          setAnalysisError("");
                          if (fileInput.current) {
                            fileInput.current.value = "";
                          }
                        }}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <UploadCloud size={29} />
                      </div>
                      <h3>Drop your garment image here</h3>
                      <p>
                        or <span>browse files</span> from your computer
                      </p>
                      <small>JPG, PNG or WEBP · Maximum file size 5 MB</small>
                    </>
                  )}

                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) =>
                      handleFile(event.target.files?.[0])
                    }
                  />
                </div>

                {selectedFile && (
                  <div className="selected-file">
                    <FileImage size={18} />
                    <div>
                      <strong>{selectedFile.name}</strong>
                      <span>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <CheckCircle2 size={18} className="file-check" />
                  </div>
                )}

                <button
                  className="primary-button analyze-button"
                  disabled={!selectedFile || isAnalyzing}
                  onClick={handleAnalyze}
                >
                  <ScanSearch size={18} />
                  {isAnalyzing ? "Analyzing Garment..." : "Analyze Garment"}
                </button>

                {analysisError && (
                  <p style={{ color: "#bd3545", fontSize: "13px" }}>
                    {analysisError}
                  </p>
                )}

                <div className="human-note">
                  <ShieldCheck size={17} />
                  <span>
                    AI suggestions require verification by a human inspector.
                  </span>
                </div>
              </article>

              <article className="panel result-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">AI ANALYSIS</p>
                    <h2>Inspection Result</h2>
                    <p className="panel-description">
                      Review the result after analysis.
                    </p>
                  </div>
                  <div className="heading-icon">
                    <Activity size={22} />
                  </div>
                </div>

                {isAnalyzing ? (
                  <div className="empty-result">
                    <Activity size={38} />
                    <h3>Analyzing your garment...</h3>
                    <p>Please wait while Gemini examines your image.</p>
                  </div>
                ) : analysisError ? (
                  <div className="empty-result">
                    <XCircle size={38} />
                    <h3>Analysis could not be completed</h3>
                    <p>{analysisError}</p>
                  </div>
                ) : analysis ? (
                  <div style={{ padding: "18px" }}>
                    <span className="status-badge pending">
                      <span />
                      {selectedInspection?.status || "Pending"}
                    </span>

                    <div
                      style={{
                        marginTop: "15px",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.8,
                        fontSize: "14px",
                        color: "#344054",
                      }}
                    >
                                            {cleanAnalysis(analysis)}
                    </div>

                    <div className="human-note" style={{ marginTop: "15px" }}>
                      <ShieldCheck size={17} />
                      <span>
                        AI findings are suggestions. Human decision required.
                      </span>
                    </div>

                    {selectedInspection && renderReviewControls(true)}
                  </div>
                ) : (
                  <div className="empty-result">
                    <ScanSearch size={38} />
                    <h3>Waiting for image</h3>
                    <p>Your AI inspection report will appear here.</p>
                  </div>
                )}
              </article>
            </section>
          )}

          {/* Inspection History page */}
          {activePage === "Inspection History" && (
            <section className="panel history-panel">
              <div className="history-heading">
                <div>
                  <p className="eyebrow">ALL RECORDS</p>
                  <h2>Inspection History</h2>
                  <p className="panel-description">
                    View and search all saved garment inspections.
                  </p>
                </div>

                <div className="history-actions">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      type="text"
                      placeholder="Search inspections..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>

                  <button
                    className="outline-button"
                    onClick={loadInspections}
                    disabled={dataLoading}
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>Inspection ID</th>
                      <th>Garment Image</th>
                      <th>Date</th>
                      <th>AI Finding</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredInspections.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong className="inspection-id">{item.id}</strong>
                        </td>
                        <td>{item.file_name}</td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{getFinding(item.analysis)}</td>
                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              item.status
                            )}`}
                          >
                            <span />
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="outline-button"
                            onClick={() => {
                              openInspection(item);
                              setActivePage("Human Review");
                            }}
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!dataLoading && filteredInspections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="no-results">
                          No inspection records found.
                        </td>
                      </tr>
                    )}

                    {dataLoading && (
                      <tr>
                        <td colSpan={6} className="no-results">
                          Loading records...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Human Review page */}
          {activePage === "Human Review" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">QUALITY CONTROL</p>
                  <h2>Human Review Center</h2>
                  <p className="panel-description">
                    Verify AI findings and record the final quality decision.
                  </p>
                </div>
                <div className="heading-icon">
                  <ShieldCheck size={22} />
                </div>
              </div>

              {reviewMessage && (
                <div
                  style={{
                    background: "#eaf8f0",
                    color: "#237c53",
                    padding: "12px 15px",
                    borderRadius: "9px",
                    marginBottom: "18px",
                    fontSize: "13px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ verticalAlign: "middle" }} />{" "}
                  {reviewMessage}
                </div>
              )}

              {reviewError && (
                <div
                  style={{
                    background: "#fff0f1",
                    color: "#bd3545",
                    padding: "12px 15px",
                    borderRadius: "9px",
                    marginBottom: "18px",
                    fontSize: "13px",
                  }}
                >
                  <AlertCircle
                    size={16}
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  {reviewError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "14px",
                  marginBottom: "22px",
                }}
              >
                <div className="stat-card">
                  <span>Awaiting Review</span>
                  <strong className="stat-number">{pendingReviews}</strong>
                </div>
                <div className="stat-card">
                  <span>Approved</span>
                  <strong className="stat-number">
                    {approvedInspections}
                  </strong>
                </div>
                <div className="stat-card">
                  <span>Rejected</span>
                  <strong className="stat-number">
                    {
                      inspections.filter(
                        (item) => item.status?.toLowerCase() === "rejected"
                      ).length
                    }
                  </strong>
                </div>
              </div>

              <h3 style={{ marginBottom: "14px", color: "#202943" }}>
                Inspections Waiting for Review
              </h3>

              {pendingInspectionRecords.length === 0 ? (
                <div className="empty-result">
                  <CheckCircle2 size={38} />
                  <h3>All caught up!</h3>
                  <p>
                    There are no pending inspections waiting for human review.
                  </p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="inspection-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Garment Image</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pendingInspectionRecords.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.file_name}</td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>
                            <span
                              className={`status-badge ${getStatusClass(
                                item.status
                              )}`}
                            >
                              <span />
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="outline-button"
                              onClick={() => openInspection(item)}
                            >
                              <Eye size={16} />
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedInspection && (
                <div
                ref={reviewPanelRef}
                  style={{
                    marginTop: "28px",
                    padding: "22px",
                    background: "#f8f9fc",
                    border: "1px solid #e8eaf2",
                    borderRadius: "12px",
                  }}
                >
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">SELECTED INSPECTION</p>
                      <h2>{selectedInspection.file_name}</h2>
                      <p className="panel-description">
                        Inspection ID: {selectedInspection.id} ·{" "}
                        {formatDate(selectedInspection.created_at)}
                      </p>
                    </div>

                    <span
                      className={`status-badge ${getStatusClass(
                        selectedInspection.status
                      )}`}
                    >
                      <span />
                      {selectedInspection.status}
                    </span>
                  </div>

                                    <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "18px",
                      marginTop: "18px",
                      alignItems: "start",
                    }}
                  >
                    {renderGarmentImage()}

                    <div>
                      <h3 style={{ margin: "0 0 10px", color: "#202943" }}>
                        Gemini AI Findings
                      </h3>

                      <div
                        style={{
                          background: "#ffffff",
                          padding: "18px",
                          borderRadius: "9px",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.8,
                          color: "#344054",
                          fontSize: "14px",
                          maxHeight: "460px",
                          overflowY: "auto",
                        }}
                      >
                        {cleanAnalysis(selectedInspection.analysis)}
                      </div>
                    </div>
                  </div>

                  {selectedInspection.review_comment && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "13px",
                        background: "#eef0ff",
                        borderRadius: "9px",
                        fontSize: "13px",
                        color: "#403b87",
                      }}
                    >
                      <strong>Previous inspector comment:</strong>
                      <p style={{ marginTop: "5px" }}>
                        {selectedInspection.review_comment}
                      </p>
                    </div>
                  )}

                  <label
                    style={{
                      display: "block",
                      margin: "20px 0 8px",
                      fontSize: "13px",
                      fontWeight: 650,
                      color: "#303951",
                    }}
                  >
                    Inspector Comment
                  </label>

                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Write your inspection comments or reason for rejection..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "13px",
                      border: "1px solid #e0e4ed",
                      borderRadius: "9px",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      resize: "vertical",
                      fontSize: "14px",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    <button
                      className="primary-button"
                      disabled={reviewSaving}
                      onClick={() => handleHumanReview("Approved")}
                    >
                      <CheckCircle2 size={17} />
                      Approve
                    </button>

                    <button
                      className="outline-button"
                      disabled={reviewSaving}
                      onClick={() => handleHumanReview("Rejected")}
                    >
                      <XCircle size={17} />
                      Reject
                    </button>

                    <button
                      className="outline-button"
                      disabled={reviewSaving}
                      onClick={() => handleHumanReview("Needs Review")}
                    >
                      <Eye size={17} />
                      Needs Review
                    </button>
                  </div>

                  {reviewSaving && (
                    <p
                      style={{
                        marginTop: "14px",
                        color: "#6258d9",
                        fontSize: "13px",
                      }}
                    >
                      Saving inspector decision...
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Reports page */}
          {activePage === "Reports" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">QUALITY INSIGHTS</p>
                  <h2>Inspection Reports</h2>
                  <p className="panel-description">
                    Summary of your saved inspection records.
                  </p>
                </div>
                <div className="heading-icon">
                  <FileText size={22} />
                </div>
              </div>

              <div className="stats-grid">
                <article className="stat-card">
                  <span>Total Inspections</span>
                  <strong className="stat-number">{totalInspections}</strong>
                </article>
                <article className="stat-card">
                  <span>Approved</span>
                  <strong className="stat-number">
                    {approvedInspections}
                  </strong>
                </article>
                <article className="stat-card">
                  <span>Pending / Needs Review</span>
                  <strong className="stat-number">{pendingReviews}</strong>
                </article>
                <article className="stat-card">
                  <span>Rejected</span>
                  <strong className="stat-number">
                    {
                      inspections.filter(
                        (item) => item.status?.toLowerCase() === "rejected"
                      ).length
                    }
                  </strong>
                </article>
              </div>

              <div className="table-wrapper" style={{ marginTop: "22px" }}>
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>File</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Inspector Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.file_name}</td>
                        <td>{formatDate(item.created_at)}</td>
                        <td>{item.status}</td>
                        <td>{item.review_comment || "—"}</td>
                      </tr>
                    ))}

                    {!dataLoading && inspections.length === 0 && (
                      <tr>
                        <td colSpan={5} className="no-results">
                          No report data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Settings page */}
          {activePage === "Settings" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">WORKSPACE</p>
                  <h2>Settings</h2>
                  <p className="panel-description">
                    Account information and application settings.
                  </p>
                </div>
                <div className="heading-icon">
                  <Settings size={22} />
                </div>
              </div>

              <div style={{ padding: "12px 0" }}>
                <p>
                  <strong>Signed in as:</strong> {session.user.email}
                </p>
                <p>
                  <strong>Account ID:</strong> {session.user.id}
                </p>
                <button
                  className="outline-button"
                  style={{ marginTop: "15px" }}
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </section>
          )}

          <footer className="footer">
            <span>© 2026 GarmentAI Inspector</span>
            <span>
              AI-assisted quality control · Human decision required
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}
