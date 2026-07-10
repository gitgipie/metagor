// public/js/report-issue.js
// Self-contained issue reporter. Opens a modal with name/type/description/screenshot
// fields, POSTs to a Discord webhook on submit. No backend, no GitHub account needed.

const WEBHOOK_URL = "https://discord.com/api/webhooks/1525096480132563087/d3axgML-ffvz7E1rPggUGwpW25Kg2vDVc4ZE7jlpoPEEdd9DjpFsxTlV9yEOG30lLPfm";

const NAMES = ["TENKISHIRA", "LoganGlaives", "SoulReaper888", "Messorem", "Schizie"];
const TYPES = ["Issue", "Recommendation"];

let wired = false;
let screenshotFile = null;

export function initReportIssue() {
  if (wired) return;
  wired = true;

  const btn = document.getElementById("report-issue-btn");
  const backdrop = document.getElementById("report-modal-backdrop");
  const closeBtn = document.getElementById("report-modal-close");
  if (!btn || !backdrop) return;

  btn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("open")) closeModal();
  });

  const fileInput = document.getElementById("report-screenshot-file");
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) {
      setScreenshot(fileInput.files[0]);
    }
  });

  const textarea = document.getElementById("report-description");
  textarea.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setScreenshot(file);
          break;
        }
      }
    }
  });

  const form = document.getElementById("report-form");
  form.addEventListener("submit", handleSubmit);

  const removeBtn = document.getElementById("report-screenshot-remove");
  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearScreenshot();
  });
}

function openModal() {
  const backdrop = document.getElementById("report-modal-backdrop");
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  resetForm();
}

function closeModal() {
  const backdrop = document.getElementById("report-modal-backdrop");
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function resetForm() {
  document.getElementById("report-name").value = "";
  document.getElementById("report-type").value = "Issue";
  const ta = document.getElementById("report-description");
  ta.value = "";
  const fileInput = document.getElementById("report-screenshot-file");
  fileInput.value = "";
  clearScreenshot();
  clearFeedback();
  clearFieldErrors();
}

function setScreenshot(file) {
  screenshotFile = file;
  const preview = document.getElementById("report-screenshot-preview");
  const info = document.getElementById("report-screenshot-info");
  const placeholder = document.getElementById("report-screenshot-placeholder");
  if (placeholder) placeholder.style.display = "none";
  preview.innerHTML = "";
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = "Screenshot preview";
  img.style.maxWidth = "100%";
  img.style.maxHeight = "180px";
  img.style.borderRadius = "4px";
  img.style.border = "1px solid var(--panel-border)";
  preview.appendChild(img);
  info.textContent = `${file.name} (${formatSize(file.size)})`;
  info.style.display = "block";
  document.getElementById("report-screenshot-remove").style.display = "inline-block";
}

function clearScreenshot() {
  screenshotFile = null;
  const preview = document.getElementById("report-screenshot-preview");
  const info = document.getElementById("report-screenshot-info");
  const placeholder = document.getElementById("report-screenshot-placeholder");
  const removeBtn = document.getElementById("report-screenshot-remove");
  const fileInput = document.getElementById("report-screenshot-file");
  preview.innerHTML = "";
  info.textContent = "";
  info.style.display = "none";
  removeBtn.style.display = "none";
  fileInput.value = "";
  if (placeholder) placeholder.style.display = "block";
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function clearFeedback() {
  const fb = document.getElementById("report-feedback");
  fb.textContent = "";
  fb.className = "report-feedback";
}

function clearFieldErrors() {
  document.querySelectorAll(".report-field-error").forEach(el => {
    el.textContent = "";
    el.style.display = "none";
  });
}

function showFieldError(field, msg) {
  const el = document.getElementById("report-error-" + field);
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}

function showFeedback(msg, type) {
  const fb = document.getElementById("report-feedback");
  fb.textContent = msg;
  fb.className = "report-feedback " + type;
}

function getCurrentSpecContext() {
  const hash = window.location.hash.slice(1);
  if (!hash) return "N/A";
  const parts = hash.split("-");
  if (parts.length < 2) return hash;
  const specName = parts[parts.length - 1];
  const className = parts.slice(0, -1).join(" ");
  return `${className} - ${specName}`;
}

async function handleSubmit(e) {
  e.preventDefault();
  clearFeedback();
  clearFieldErrors();

  const name = document.getElementById("report-name").value;
  const type = document.getElementById("report-type").value;
  const description = document.getElementById("report-description").value.trim();

  let valid = true;
  if (!name) { showFieldError("name", "Please select your name."); valid = false; }
  if (!type) { showFieldError("type", "Please select a type."); valid = false; }
  if (description.length < 10) { showFieldError("description", "Description must be at least 10 characters."); valid = false; }
  if (!valid) return;

  const submitBtn = document.getElementById("report-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const emoji = type === "Issue" ? "\u{1F41B}" : "\u{1F4A1}";
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const specCtx = getCurrentSpecContext();
  const pageUrl = window.location.href;

  const content =
    `${emoji} **[${type}]** ${name} — ${timestamp}\n` +
    `Spec: ${specCtx}\n` +
    `URL: ${pageUrl}\n\n` +
    `**Description:**\n${description}`;

  try {
    let resp;
    if (screenshotFile) {
      const formData = new FormData();
      formData.append("payload_json", JSON.stringify({ content }));
      formData.append("files[0]", screenshotFile, screenshotFile.name || "screenshot.png");
      resp = await fetch(WEBHOOK_URL, { method: "POST", body: formData });
    } else {
      resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
    }

    if (!resp.ok && resp.status !== 204) {
      const body = await resp.text();
      throw new Error(`Discord returned ${resp.status}: ${body.slice(0, 200)}`);
    }

    showFeedback("Submitted! Thanks for the report.", "success");
    setTimeout(() => {
      closeModal();
      resetForm();
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
    }, 2000);
  } catch (err) {
    showFeedback("Failed to submit. Please try again or contact Logan.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
}