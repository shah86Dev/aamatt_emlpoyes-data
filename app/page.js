"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";

const COMPANY_NAME = "A.A MATT";
const COMPANY_TAGLINE = "Plastic Mat Manufacturing";
const ACCENT = "#c1541f";
const INK = "#1c2321";

function esc(s) {
  return s == null ? "" : String(s);
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let lines = [];
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines = lines.slice(0, 2);
  lines.forEach((l, idx) => ctx.fillText(l, x, y + idx * lineHeight));
}

function drawSilhouette(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "#cfc6b4";
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.95;
  const cx = x + w / 2,
    headR = w * 0.22,
    headCy = y + h * 0.32;
  ctx.beginPath();
  ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
  ctx.fill();
  const shW = w * 0.8,
    shH = h * 0.5,
    shX = cx - shW / 2,
    shY = y + h * 0.6;
  ctx.beginPath();
  ctx.moveTo(shX, shY + shH);
  ctx.lineTo(shX, shY + shH * 0.3);
  ctx.quadraticCurveTo(shX, shY, shX + shW * 0.2, shY);
  ctx.lineTo(shX + shW * 0.8, shY);
  ctx.quadraticCurveTo(shX + shW, shY, shX + shW, shY + shH * 0.3);
  ctx.lineTo(shX + shW, shY + shH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCardFront(canvas, rec, photoImg) {
  const W = canvas.width,
    H = canvas.height;
  const ctx = canvas.getContext("2d");
  const S = W / 243;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 44 * S);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${15 * S}px 'Barlow Semi Condensed', sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(COMPANY_NAME, 12 * S, 20 * S);
  ctx.font = `500 ${8 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.globalAlpha = 0.92;
  ctx.fillText(COMPANY_TAGLINE, 12 * S, 32 * S);
  ctx.globalAlpha = 1;
  ctx.font = `600 ${8.5 * S}px 'Barlow Semi Condensed', sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("EMPLOYEE ID CARD", W - 12 * S, 26 * S);
  ctx.textAlign = "left";

  const pw = 62 * S,
    ph = 78 * S,
    px = 12 * S,
    py = 54 * S;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px - 2 * S, py - 2 * S, pw + 4 * S, ph + 4 * S);
  ctx.strokeStyle = "#dcd5c6";
  ctx.lineWidth = 1 * S;
  ctx.strokeRect(px - 2 * S, py - 2 * S, pw + 4 * S, ph + 4 * S);
  if (photoImg) {
    const ir = Math.max(pw / photoImg.width, ph / photoImg.height);
    const iw = photoImg.width * ir,
      ih = photoImg.height * ir;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    ctx.drawImage(photoImg, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
    ctx.restore();
  } else {
    drawSilhouette(ctx, px, py, pw, ph);
  }

  const tx = px + pw + 14 * S,
    ty = 58 * S;
  ctx.fillStyle = INK;
  ctx.font = `700 ${12.5 * S}px 'Barlow Semi Condensed', sans-serif`;
  wrapText(ctx, rec.name || "—", tx, ty, W - tx - 12 * S, 12.5 * S);
  ctx.font = `600 ${8.6 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.fillStyle = ACCENT;
  ctx.fillText((rec.postAppliedFor || "Employee").toUpperCase(), tx, ty + 13.5 * S);

  const lines = [
    ["DEPT", rec.department || "—"],
    ["CNIC", rec.cnic || "—"],
    ["TEL", rec.contactTel || "—"],
  ];
  let ly = ty + 27 * S;
  const labelW = 26 * S;
  lines.forEach((pair) => {
    ctx.fillStyle = "#8a8177";
    ctx.font = `600 ${6.6 * S}px 'IBM Plex Sans', sans-serif`;
    ctx.fillText(pair[0], tx, ly);
    ctx.fillStyle = INK;
    ctx.font = `500 ${8.2 * S}px 'IBM Plex Sans', sans-serif`;
    ctx.fillText(String(pair[1]), tx + labelW, ly);
    ly += 12.5 * S;
  });

  const stripY = H - 30 * S;
  ctx.fillStyle = "#efe9db";
  ctx.fillRect(0, stripY, W, 30 * S);
  ctx.strokeStyle = "#dcd5c6";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(0, stripY);
  ctx.lineTo(W, stripY);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `500 ${11 * S}px 'IBM Plex Mono', monospace`;
  ctx.fillText(rec.employeeId || "", 12 * S, stripY + 20 * S);

  const seed = (rec.employeeId || "0")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const bx = W - 90 * S,
    bw = 78 * S,
    bh = 16 * S,
    by = stripY + 7 * S;
  const n = 28,
    gap = bw / n;
  for (let i = 0; i < n; i++) {
    const h2 = (((seed * (i + 7)) % 11) / 11) * bh * 0.85 + bh * 0.15;
    ctx.fillStyle = i % 3 === 0 ? INK : "#8a8177";
    ctx.fillRect(bx + i * gap, by + (bh - h2), gap * 0.55, h2);
  }
}

function drawCardBack(canvas, rec) {
  const W = canvas.width,
    H = canvas.height;
  const ctx = canvas.getContext("2d");
  const S = W / 243;
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, W, 22 * S);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${9.5 * S}px 'Barlow Semi Condensed', sans-serif`;
  ctx.fillText(COMPANY_NAME + " — EMPLOYEE ID CARD", 12 * S, 15 * S);

  let y = 34 * S;
  ctx.fillStyle = "#8a8177";
  ctx.font = `600 ${6.6 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.fillText("EMERGENCY CONTACT", 12 * S, y);
  y += 10 * S;
  ctx.fillStyle = INK;
  ctx.font = `500 ${8.4 * S}px 'IBM Plex Sans', sans-serif`;
  const ename = rec.emergencyName
    ? rec.emergencyName + (rec.emergencyRelation ? ` (${rec.emergencyRelation})` : "")
    : "—";
  ctx.fillText(ename, 12 * S, y);
  y += 11 * S;
  const etel = [rec.emergencyResTel, rec.emergencyBusTel].filter(Boolean).join("  /  ") || "—";
  ctx.fillText(etel, 12 * S, y);
  y += 16 * S;

  ctx.fillStyle = "#8a8177";
  ctx.font = `600 ${6.6 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.fillText("ADDRESS", 12 * S, y);
  y += 10 * S;
  ctx.fillStyle = INK;
  ctx.font = `500 ${8 * S}px 'IBM Plex Sans', sans-serif`;
  wrapText(ctx, rec.address || "—", 12 * S, y, W - 24 * S, 10 * S);
  y += 30 * S;

  ctx.strokeStyle = "#dcd5c6";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(12 * S, y);
  ctx.lineTo(100 * S, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(130 * S, y);
  ctx.lineTo(W - 12 * S, y);
  ctx.stroke();
  ctx.fillStyle = "#8a8177";
  ctx.font = `500 ${6.6 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.fillText("Employee signature", 12 * S, y + 9 * S);
  ctx.fillText("Authorized signature", 130 * S, y + 9 * S);

  ctx.font = `400 ${6.2 * S}px 'IBM Plex Sans', sans-serif`;
  ctx.fillStyle = "#8a8177";
  ctx.fillText(
    `Property of ${COMPANY_NAME}. If found, please return to the company office.`,
    12 * S,
    H - 8 * S
  );
}

async function buildIdCardCanvases(rec) {
  const photoImg = await loadImage(rec.photoUrl);
  const scale = 4;
  const front = document.createElement("canvas");
  front.width = 243 * scale;
  front.height = 153 * scale;
  drawCardFront(front, rec, photoImg);
  const back = document.createElement("canvas");
  back.width = 243 * scale;
  back.height = 153 * scale;
  drawCardBack(back, rec);
  return { front, back };
}

async function buildIdCardPdf(rec) {
  const canvases = await buildIdCardCanvases(rec);
  const doc = new jsPDF({ unit: "pt", format: [243, 153], orientation: "landscape" });
  doc.addImage(canvases.front.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 243, 153);
  doc.addPage([243, 153], "landscape");
  doc.addImage(canvases.back.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 243, 153);
  return doc.output("blob");
}

async function buildApplicationPdf(rec) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  function ensureSpace(h) {
    if (y + h > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }
  function heading(text) {
    ensureSpace(26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(193, 84, 31);
    doc.text(text, margin, y);
    doc.setDrawColor(220, 213, 198);
    doc.line(margin, y + 4, W - margin, y + 4);
    doc.setTextColor(28, 35, 33);
    y += 20;
  }
  function field(label, value) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 112, 100);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(28, 35, 33);
    doc.text(String(value || "—"), margin, y + 13);
    y += 30;
  }
  function fieldRow(pairs) {
    ensureSpace(30);
    const colW = (W - margin * 2) / pairs.length;
    pairs.forEach((p, i) => {
      const x = margin + i * colW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 112, 100);
      doc.text(p[0].toUpperCase(), x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(28, 35, 33);
      const val = doc.splitTextToSize(String(p[1] || "—"), colW - 10);
      doc.text(val, x, y + 13);
    });
    y += 30;
  }
  function table(headers, rows, colWidths) {
    ensureSpace(20);
    let x = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 112, 100);
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 10;
    doc.setDrawColor(220, 213, 198);
    doc.line(margin, y, W - margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(28, 35, 33);
    if (rows.length === 0) {
      doc.setTextColor(150, 143, 130);
      doc.text("—", margin, y);
      y += 16;
    }
    rows.forEach((row) => {
      ensureSpace(18);
      x = margin;
      const vals = Object.keys(row).map((k) => row[k]);
      let maxLines = 1;
      const cellLines = vals.map((v, i) => {
        const l = doc.splitTextToSize(String(v || "—"), colWidths[i] - 6);
        maxLines = Math.max(maxLines, l.length);
        return l;
      });
      cellLines.forEach((l, i) => {
        doc.text(l, x, y);
        x += colWidths[i];
      });
      y += 13 * maxLines + 5;
    });
    y += 6;
  }

  doc.setFillColor(193, 84, 31);
  doc.rect(0, 0, W, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY_NAME, margin, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(COMPANY_TAGLINE + "  —  Employment Application", margin, 46);
  doc.setFontSize(9);
  doc.text("Employee ID: " + (rec.employeeId || ""), W - margin, 30, { align: "right" });
  doc.text("Generated: " + new Date().toLocaleDateString("en-GB"), W - margin, 46, {
    align: "right",
  });
  y = 90;

  if (rec.photoUrl) {
    try {
      const img = await loadImage(rec.photoUrl);
      if (img) doc.addImage(img, "JPEG", W - margin - 70, 78, 70, 88);
    } catch (e) {}
  }

  heading("Personal Information");
  fieldRow([
    ["Full Name", rec.name],
    ["Father's/Husband's Name", rec.fatherHusbandName],
  ]);
  fieldRow([
    ["Date of Birth", fmtDate(rec.dob)],
    ["Sex", rec.sex],
    ["Place of Birth", rec.placeOfBirth],
  ]);
  fieldRow([
    ["Nationality", rec.nationality],
    ["Religion", rec.religion],
    ["Marital Status", rec.maritalStatus],
  ]);
  field("CNIC #", rec.cnic);

  heading("Job Details");
  fieldRow([
    ["Post Applied For", rec.postAppliedFor],
    ["Department", rec.department],
  ]);
  fieldRow([
    ["Salary Expected", rec.salaryExpected ? "PKR " + rec.salaryExpected : ""],
    ["Joining Date", fmtDate(rec.joiningDate)],
    ["Available From", fmtDate(rec.availability)],
  ]);
  fieldRow([
    ["Contact Tel #", rec.contactTel],
    ["Attendance Allowance", rec.attendanceAllowance],
  ]);

  heading("Address");
  field("Residential Address", rec.address);

  heading("Academic Record");
  table(
    ["Exam/Degree", "Institution", "Grade/Div", "Year", "Subjects"],
    rec.education || [],
    [90, 140, 70, 50, 125]
  );

  heading("Employment Record");
  table(
    ["From", "To", "Position", "Last Salary", "Reason for Leaving"],
    rec.employment || [],
    [55, 55, 110, 90, 165]
  );

  heading("Emergency Contact");
  fieldRow([
    ["Name", rec.emergencyName],
    ["Relation", rec.emergencyRelation],
  ]);
  fieldRow([
    ["Tel (Residence)", rec.emergencyResTel],
    ["Tel (Business)", rec.emergencyBusTel],
  ]);
  field("Address", rec.emergencyAddress);

  return doc.output("blob");
}

/* ---------------- React component ---------------- */

const FIELD_LABELS = {
  name: "Full Name",
  fatherHusbandName: "Father's/Husband's Name",
  dob: "Date of Birth",
  sex: "Sex",
  cnic: "CNIC #",
  postAppliedFor: "Post Applied For",
  department: "Department",
  contactTel: "Contact Tel #",
  address: "Address",
};

function emptyEduRow() {
  return { key: uid(), examDegree: "", institution: "", gradeDivision: "", yearPassing: "", principalSubjects: "" };
}
function emptyEmpRow() {
  return { key: uid(), from: "", to: "", position: "", lastSalary: "", reasonLeaving: "" };
}

export default function HomePage() {
  const formRef = useRef(null);
  const [tab, setTab] = useState("form");
  const [eduRows, setEduRows] = useState([emptyEduRow()]);
  const [empRows, setEmpRows] = useState([emptyEmpRow()]);
  const [photo, setPhoto] = useState({ file: null, dataUrl: null });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", kind: "" });
  const [saved, setSaved] = useState(null); // { item, appBlob, idBlob }

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsErr, setRecordsErr] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { type: 'view'|'delete', rec }

  async function loadRecords() {
    setRecordsLoading(true);
    setRecordsErr("");
    try {
      const res = await fetch("/api/employees");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load records");
      setRecords(d.items || []);
    } catch (e) {
      setRecordsErr(e.message);
    } finally {
      setRecordsLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  function onPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setPhoto({ file: null, dataUrl: null });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto({ file, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  async function offerDownload(filename, blob) {
    downloadBlob(filename, blob);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = formRef.current;
    const fd = new FormData(form);

    const data = {};
    ["name", "fatherHusbandName", "dob", "sex", "placeOfBirth", "nationality", "cnic", "religion",
      "maritalStatus", "postAppliedFor", "department", "salaryExpected", "joiningDate", "availability",
      "contactTel", "attendanceAllowance", "address", "emergencyName", "emergencyRelation",
      "emergencyResTel", "emergencyBusTel", "emergencyAddress"].forEach((k) => {
      data[k] = (fd.get(k) || "").toString().trim();
    });

    const missing = ["name", "fatherHusbandName", "dob", "sex", "cnic", "postAppliedFor", "department", "contactTel", "address"]
      .filter((k) => !data[k]);
    if (missing.length) {
      setStatus({ text: "Please fill in: " + missing.map((k) => FIELD_LABELS[k] || k).join(", "), kind: "err" });
      return;
    }

    setBusy(true);
    setStatus({ text: "Saving application…", kind: "" });

    try {
      const education = eduRows
        .map(({ key, ...rest }) => rest)
        .filter((r) => Object.values(r).some(Boolean));
      const employment = empRows
        .map(({ key, ...rest }) => rest)
        .filter((r) => Object.values(r).some(Boolean));

      fd.set("education", JSON.stringify(education));
      fd.set("employment", JSON.stringify(employment));
      if (photo.file) fd.set("photo", photo.file);

      const res = await fetch("/api/employees", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");

      const item = d.item;

      setStatus({ text: "Generating application PDF…", kind: "" });
      const appBlob = await buildApplicationPdf(item);
      setStatus({ text: "Generating ID card…", kind: "" });
      const idBlob = await buildIdCardPdf(item);

      await offerDownload(`Application_${item.employeeId}.pdf`, appBlob);
      await offerDownload(`ID_Card_${item.employeeId}.pdf`, idBlob);

      setSaved({ item, appBlob, idBlob });
      setStatus({ text: "Application saved to the database.", kind: "ok" });
      loadRecords();
    } catch (err) {
      setStatus({ text: "Something went wrong: " + err.message, kind: "err" });
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    formRef.current.reset();
    setEduRows([emptyEduRow()]);
    setEmpRows([emptyEmpRow()]);
    setPhoto({ file: null, dataUrl: null });
    setSaved(null);
    setStatus({ text: "", kind: "" });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.name, r.employeeId, r.department, r.cnic, r.postAppliedFor].some(
      (f) => f && String(f).toLowerCase().includes(q)
    );
  });

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AM</span>
          <div className="brand-text">
            <strong>A.A Matt</strong>
            <small>Employee Application &amp; ID System</small>
          </div>
        </div>
        <nav className="tabs">
          <button className={"tab-btn" + (tab === "form" ? " active" : "")} onClick={() => setTab("form")} type="button">
            New Application
          </button>
          <button className={"tab-btn" + (tab === "records" ? " active" : "")} onClick={() => setTab("records")} type="button">
            Records{" "}
            {records.length > 0 && <span className="count-badge">{records.length}</span>}
          </button>
        </nav>
        <button className="logout-btn" type="button" onClick={logout}>
          Log out
        </button>
      </header>

      <main>
        <section className={"view" + (tab === "form" ? " active" : "")}>
          <form ref={formRef} onSubmit={onSubmit}>
            <fieldset className="section">
              <legend>
                Personal Information <span className="urdu">ذاتی معلومات</span>
              </legend>
              <div className="grid">
                <div className="field wide">
                  <label htmlFor="f-name">
                    Full Name <span className="urdu">نام</span> <span className="required-mark">*</span>
                  </label>
                  <input id="f-name" name="name" type="text" autoComplete="off" required />
                </div>
                <div className="field wide">
                  <label htmlFor="f-relation">
                    Father's / Husband's Name <span className="urdu">ولدیت/زوجیت</span>{" "}
                    <span className="required-mark">*</span>
                  </label>
                  <input id="f-relation" name="fatherHusbandName" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="f-dob">
                    Date of Birth <span className="urdu">تاریخ پیدائش</span> <span className="required-mark">*</span>
                  </label>
                  <input id="f-dob" name="dob" type="date" required />
                </div>
                <div className="field">
                  <label htmlFor="f-sex">
                    Sex <span className="urdu">جنس</span> <span className="required-mark">*</span>
                  </label>
                  <select id="f-sex" name="sex" required defaultValue="">
                    <option value="">Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="f-pob">
                    Place of Birth <span className="urdu">جاۓ پیدائش</span>
                  </label>
                  <input id="f-pob" name="placeOfBirth" type="text" />
                </div>
                <div className="field">
                  <label htmlFor="f-nat">
                    Nationality <span className="urdu">قومیت</span>
                  </label>
                  <input id="f-nat" name="nationality" type="text" defaultValue="Pakistani" />
                </div>
                <div className="field">
                  <label htmlFor="f-cnic">
                    CNIC # <span className="urdu">شناختی کارڈ نمبر</span> <span className="required-mark">*</span>
                  </label>
                  <input id="f-cnic" name="cnic" type="text" placeholder="42101-1234567-1" required />
                </div>
                <div className="field">
                  <label htmlFor="f-religion">
                    Religion <span className="urdu">مذہب</span>
                  </label>
                  <input id="f-religion" name="religion" type="text" />
                </div>
                <div className="field">
                  <label htmlFor="f-marital">
                    Marital Status <span className="urdu">ازدواجی حیثیت</span>
                  </label>
                  <select id="f-marital" name="maritalStatus" defaultValue="">
                    <option value="">Select…</option>
                    <option>Single</option>
                    <option>Married</option>
                    <option>Widowed</option>
                    <option>Divorced</option>
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="section">
              <legend>
                Job Details <span className="urdu">ملازمت کی تفصیلات</span>
              </legend>
              <div className="grid">
                <div className="field">
                  <label htmlFor="f-post">
                    Post Applied For / Designation <span className="urdu">عہدہ</span>{" "}
                    <span className="required-mark">*</span>
                  </label>
                  <input id="f-post" name="postAppliedFor" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="f-dept">
                    Department <span className="urdu">ڈپارٹمنٹ</span> <span className="required-mark">*</span>
                  </label>
                  <input id="f-dept" name="department" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="f-salary">
                    Salary Expected (PKR) <span className="urdu">متوقع تنخواہ</span>
                  </label>
                  <input id="f-salary" name="salaryExpected" type="number" min="0" step="500" />
                </div>
                <div className="field">
                  <label htmlFor="f-join">
                    Joining Date <span className="urdu">تاریخ ملازمت</span>
                  </label>
                  <input id="f-join" name="joiningDate" type="date" />
                </div>
                <div className="field">
                  <label htmlFor="f-avail">
                    Available From (W.E.F) <span className="urdu">متوقع آغاز ملازمت</span>
                  </label>
                  <input id="f-avail" name="availability" type="date" />
                </div>
                <div className="field">
                  <label htmlFor="f-tel">
                    Contact Tel # <span className="urdu">ٹیلیفون رابطہ</span> <span className="required-mark">*</span>
                  </label>
                  <input id="f-tel" name="contactTel" type="tel" required />
                </div>
                <div className="field">
                  <label>
                    Attendance Allowance <span className="urdu">حاضری الاؤنس</span>
                  </label>
                  <div className="radio-row">
                    <label>
                      <input type="radio" name="attendanceAllowance" value="Yes" /> Yes
                    </label>
                    <label>
                      <input type="radio" name="attendanceAllowance" value="No" defaultChecked /> No
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="section">
              <legend>
                Address <span className="urdu">پتہ</span>
              </legend>
              <div className="grid">
                <div className="field wide">
                  <label htmlFor="f-address">
                    Residential Address <span className="required-mark">*</span>
                  </label>
                  <textarea id="f-address" name="address" required></textarea>
                </div>
              </div>
            </fieldset>

            <fieldset className="section">
              <legend>
                Academic Record <span className="urdu">تعلیمی ریکارڈ</span>
              </legend>
              <div className="table-wrap">
                <table className="repeat-table">
                  <thead>
                    <tr>
                      <th>Exam / Degree</th>
                      <th>Institution</th>
                      <th>Grade / Division</th>
                      <th>Year Passing</th>
                      <th>Principal Subjects</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {eduRows.map((row, idx) => (
                      <tr key={row.key}>
                        {["examDegree", "institution", "gradeDivision", "yearPassing", "principalSubjects"].map((f) => (
                          <td key={f}>
                            <input
                              value={row[f]}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEduRows((rows) =>
                                  rows.map((r, i) => (i === idx ? { ...r, [f]: v } : r))
                                );
                              }}
                            />
                          </td>
                        ))}
                        <td className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Remove row"
                            onClick={() => setEduRows((rows) => rows.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="add-row-btn" onClick={() => setEduRows((r) => [...r, emptyEduRow()])}>
                + Add education row
              </button>
            </fieldset>

            <fieldset className="section">
              <legend>
                Employment Record <span className="urdu">ملازمت کی تفصیلات</span>
              </legend>
              <div className="table-wrap">
                <table className="repeat-table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Position</th>
                      <th>Last Drawn / Gross Salary</th>
                      <th>Reason for Leaving</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {empRows.map((row, idx) => (
                      <tr key={row.key}>
                        {["from", "to", "position", "lastSalary", "reasonLeaving"].map((f) => (
                          <td key={f}>
                            <input
                              value={row[f]}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEmpRows((rows) =>
                                  rows.map((r, i) => (i === idx ? { ...r, [f]: v } : r))
                                );
                              }}
                            />
                          </td>
                        ))}
                        <td className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Remove row"
                            onClick={() => setEmpRows((rows) => rows.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="add-row-btn" onClick={() => setEmpRows((r) => [...r, emptyEmpRow()])}>
                + Add employment row
              </button>
            </fieldset>

            <fieldset className="section">
              <legend>
                Emergency Contact <span className="urdu">ہنگامی رابطہ</span>
              </legend>
              <div className="grid">
                <div className="field">
                  <label htmlFor="f-ename">
                    Name <span className="urdu">نام</span>
                  </label>
                  <input id="f-ename" name="emergencyName" type="text" />
                </div>
                <div className="field">
                  <label htmlFor="f-erel">
                    Relation <span className="urdu">رشتہ</span>
                  </label>
                  <input id="f-erel" name="emergencyRelation" type="text" />
                </div>
                <div className="field">
                  <label htmlFor="f-eres">
                    Tel (Residence) <span className="urdu">رہائشی</span>
                  </label>
                  <input id="f-eres" name="emergencyResTel" type="tel" />
                </div>
                <div className="field">
                  <label htmlFor="f-ebus">
                    Tel (Business) <span className="urdu">کاروباری</span>
                  </label>
                  <input id="f-ebus" name="emergencyBusTel" type="tel" />
                </div>
                <div className="field wide">
                  <label htmlFor="f-eaddr">
                    Address <span className="urdu">پتہ</span>
                  </label>
                  <textarea id="f-eaddr" name="emergencyAddress"></textarea>
                </div>
              </div>
            </fieldset>

            <fieldset className="section">
              <legend>
                Photograph <span className="urdu">تصویر</span>
              </legend>
              <div className="photo-field">
                <div className="photo-preview">
                  {photo.dataUrl ? <img src={photo.dataUrl} alt="Preview" /> : "No photo"}
                </div>
                <div className="field" style={{ flex: 1, minWidth: 220 }}>
                  <label htmlFor="f-photo">Upload a passport-style photo (used on the ID card)</label>
                  <input id="f-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} />
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Working…" : "Save Application, Generate PDF & ID Card"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>
                Clear Form
              </button>
            </div>
            <p className={"status-line" + (status.kind ? " " + status.kind : "")}>{status.text}</p>
          </form>

          {saved && (
            <div className="success-panel">
              <h3>Application saved</h3>
              <p>
                Employee ID <span className="eid">{saved.item.employeeId}</span> for{" "}
                <strong>{saved.item.name}</strong> has been recorded.
              </p>
              <div className="success-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => offerDownload(`Application_${saved.item.employeeId}.pdf`, saved.appBlob)}
                >
                  Download Application PDF
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => offerDownload(`ID_Card_${saved.item.employeeId}.pdf`, saved.idBlob)}
                >
                  Download ID Card PDF
                </button>
              </div>
            </div>
          )}
        </section>

        <section className={"view" + (tab === "records" ? " active" : "")}>
          <div className="records-toolbar">
            <input
              type="search"
              placeholder="Search by name, employee ID, department, CNIC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="db-status">
              {recordsLoading ? "Loading…" : recordsErr || `${records.length} record(s)`}
            </span>
          </div>
          <div className="records-list">
            {filteredRecords.map((r) => (
              <div className="rec-card" key={r.employeeId}>
                <div className="rec-photo">
                  {r.photoUrl ? <img src={r.photoUrl} alt="" /> : "No photo"}
                </div>
                <div className="rec-main">
                  <div className="rn">{r.name}</div>
                  <div className="rm">
                    <span className="rec-id">{r.employeeId}</span>
                    <span>{r.postAppliedFor || "—"}</span>
                    <span>{r.department || "—"}</span>
                    <span>{r.contactTel || "—"}</span>
                  </div>
                </div>
                <div className="rec-actions">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setModal({ type: "view", rec: r })}>
                    View
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={async () => {
                      const blob = await buildApplicationPdf(r);
                      offerDownload(`Application_${r.employeeId}.pdf`, blob);
                    }}
                  >
                    PDF
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={async () => {
                      const blob = await buildIdCardPdf(r);
                      offerDownload(`ID_Card_${r.employeeId}.pdf`, blob);
                    }}
                  >
                    ID Card
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setModal({ type: "delete", rec: r })}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!recordsLoading && records.length === 0 && (
            <p className="empty-note">No employee records yet — saved applications will appear here.</p>
          )}
        </section>
      </main>

      {modal && modal.type === "view" && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">
              ✕
            </button>
            <h3>
              {modal.rec.name} <span className="rec-id">{modal.rec.employeeId}</span>
            </h3>
            <div className="detail-grid">
              <div><b>Father/Husband</b>{modal.rec.fatherHusbandName || "—"}</div>
              <div><b>Date of Birth</b>{fmtDate(modal.rec.dob)}</div>
              <div><b>Sex</b>{modal.rec.sex || "—"}</div>
              <div><b>CNIC</b>{modal.rec.cnic || "—"}</div>
              <div><b>Post Applied For</b>{modal.rec.postAppliedFor || "—"}</div>
              <div><b>Department</b>{modal.rec.department || "—"}</div>
              <div><b>Contact</b>{modal.rec.contactTel || "—"}</div>
              <div><b>Joining Date</b>{fmtDate(modal.rec.joiningDate)}</div>
              <div><b>Address</b>{modal.rec.address || "—"}</div>
            </div>
            {modal.rec.education && modal.rec.education.length > 0 && (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Exam/Degree</th>
                    <th>Institution</th>
                    <th>Grade</th>
                    <th>Year</th>
                    <th>Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {modal.rec.education.map((e, i) => (
                    <tr key={i}>
                      <td>{e.examDegree}</td>
                      <td>{e.institution}</td>
                      <td>{e.gradeDivision}</td>
                      <td>{e.yearPassing}</td>
                      <td>{e.principalSubjects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {modal.rec.employment && modal.rec.employment.length > 0 && (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Position</th>
                    <th>Last Salary</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {modal.rec.employment.map((e, i) => (
                    <tr key={i}>
                      <td>{e.from}</td>
                      <td>{e.to}</td>
                      <td>{e.position}</td>
                      <td>{e.lastSalary}</td>
                      <td>{e.reasonLeaving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="detail-grid">
              <div>
                <b>Emergency Contact</b>
                {modal.rec.emergencyName || "—"}
                {modal.rec.emergencyRelation ? ` (${modal.rec.emergencyRelation})` : ""}
              </div>
              <div>
                <b>Emergency Tel</b>
                {[modal.rec.emergencyResTel, modal.rec.emergencyBusTel].filter(Boolean).join(" / ") || "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && modal.type === "delete" && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <h3>Delete record?</h3>
            <p>
              This removes <strong>{modal.rec.name}</strong> ({modal.rec.employeeId}) from the database. This can't be
              undone.
            </p>
            <div className="success-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: "var(--bad)" }}
                onClick={async () => {
                  await fetch(`/api/employees/${encodeURIComponent(modal.rec.employeeId)}`, { method: "DELETE" });
                  setModal(null);
                  loadRecords();
                }}
              >
                Delete
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
