const formTypes = [
  { id: "purchase", label: "活動經費請購單" },
  { id: "teacherReward", label: "教師獎勵金申請" },
  { id: "venue", label: "場地借用申請" },
  { id: "receipt", label: "捐款收據開立" },
  { id: "settlement", label: "經費結算報告" },
  { id: "meeting", label: "委員會議紀錄通知" }
];

const rewardUnits = ["教務處", "學務處", "總務處", "輔導室", "幼兒園", "其他"];
const rewardRanks = ["排序一", "排序二", "排序三", "排序四", "排序五", "排序六", "排序七", "排序八"];
const rewardLevels = {
  "全國性活動": [2000, 1500, 1200, 1000, 1000, 1000, 1000, 1000],
  "全市性活動": [800, 700, 600, 500, 500, 500, 500, 500],
  "臺北市體育類分區活動": [500, 300, 200, 100, 100, 100, 100, 100],
  "其他類官方活動": [500, 300, 200, 100, 100, 100, 100, 100]
};

const state = {
  active: "forms",
  activeForm: "teacherReward",
  admin: false,
  draft: "按下 AI 草擬後，會在此產生離線草稿。GitHub Pages 版本不呼叫 Claude API。",
  message: "",
  newTemplateTitle: "",
  newTemplateBody: "",
  templates: [
    { title: "教師獎勵金申請", body: "依獎勵辦法附件一，彙整競賽層級、排序、指導老師與獎勵金額。" },
    { title: "活動經費請購單", body: "活動費用、請款明細、憑證與套印申請單。" },
    { title: "場地借用申請", body: "申請單位、場地、時段與用途說明。" }
  ],
  incoming: [
    { id: "APP-0620", title: "教師獎勵金申請 - 教務處", applicant: "教務處", status: "待簽核", cloud: "雲端硬碟/家長會文件/APP-0620.xls" }
  ],
  forms: {
    purchase: { description: "活動經費請購單申請內容範例。" },
    teacherReward: {
      unit: "教務處",
      date: "2026-07-08",
      description: "依金華國小學生家長會獎勵教師指導學生參與校外競賽實施辦法提出申請。",
      checklist: { application: true, registration: false, awardProof: false, other: false },
      needsResign: false,
      reviewMessage: "後台可更正金額、排序或刪除重複申請；已進入簽核後若內容異動，需重新送簽並重新上傳簽名檔。",
      awards: [
        { contestName: "臺北市語文學藝競賽", nature: "個人", groupSize: 1, level: "全市性活動", rank: "排序一", teacher: "王老師", amount: 800 }
      ]
    },
    venue: { description: "場地借用申請內容範例。" },
    receipt: { description: "捐款收據開立內容範例。" },
    settlement: { description: "經費結算報告內容範例。" },
    meeting: { description: "委員會議紀錄通知內容範例。" }
  }
};

const app = document.querySelector("#app");
const money = (value) => Number(value || 0).toLocaleString("zh-TW");

function rewardAmount(award) {
  const values = rewardLevels[award.level] || rewardLevels["其他類官方活動"];
  const rankIndex = Math.max(0, rewardRanks.indexOf(award.rank));
  const base = values[rankIndex] || values[3];
  return award.nature === "團體" && Number(award.groupSize || 0) >= 3 ? base * 2 : base;
}

function normalizeAward(award) {
  const next = { ...award };
  if (next.nature === "個人") next.groupSize = 1;
  if (next.nature === "團體" && Number(next.groupSize || 0) < 3) next.groupSize = 3;
  next.amount = rewardAmount(next);
  return next;
}

function rewardTotal() {
  return state.forms.teacherReward.awards.reduce((sum, award) => sum + Number(award.amount || 0), 0);
}

function setActive(active) {
  state.active = active;
  render();
}

function setForm(formId) {
  state.activeForm = formId;
  render();
}

function updateRewardField(key, value) {
  state.forms.teacherReward[key] = value;
  render();
}

function updateChecklist(key, checked) {
  state.forms.teacherReward.checklist[key] = checked;
  render();
}

function updateAward(index, key, value) {
  const form = state.forms.teacherReward;
  const award = { ...form.awards[index] };
  if (!award) return;
  if (key === "groupSize") award[key] = Math.max(award.nature === "團體" ? 3 : 1, Number(value || 0));
  else if (key === "amount") award[key] = Number(value || 0);
  else award[key] = value;
  form.awards[index] = key === "amount" ? award : normalizeAward(award);
  if (state.admin) {
    form.needsResign = true;
    form.reviewMessage = "後台已更正申請資料；若本案已進入簽核，需重新送簽並重新上傳簽名檔。";
  }
  render();
}

function addAward() {
  const form = state.forms.teacherReward;
  if (form.awards.length >= 8) return;
  form.awards.push(normalizeAward({ contestName: "", nature: "個人", groupSize: 1, level: "全市性活動", rank: "排序一", teacher: "", amount: 0 }));
  render();
}

function removeAward(index) {
  const form = state.forms.teacherReward;
  if (form.awards.length <= 1) {
    state.message = "教師獎勵金申請至少需保留一筆明細。";
    render();
    return;
  }
  form.awards.splice(index, 1);
  if (state.admin) {
    form.needsResign = true;
    form.reviewMessage = "後台已刪除重複申請項目；若本案已進入簽核，需重新送簽並重新上傳簽名檔。";
  }
  render();
}

function draftTeacherReward() {
  const form = state.forms.teacherReward;
  const rows = form.awards.map((award, index) => `${index + 1}. ${award.contestName || "未填競賽"}，${award.nature}${award.nature === "團體" ? ` ${award.groupSize} 人` : ""}，${award.level}，${award.rank}，指導老師：${award.teacher || "未填"}，獎勵金 NT$ ${money(award.amount)}`).join("\n");
  const checks = [
    ["申請表", form.checklist.application],
    ["代表本校參賽之公文或比賽報名文件", form.checklist.registration],
    ["得獎公文、獎狀或成績證明影本", form.checklist.awardProof],
    ["其他文件，如指導證明", form.checklist.other]
  ].map(([label, ok]) => `${ok ? "已備" : "待補"}：${label}`).join("\n");
  state.draft = `【教師獎勵金申請草稿】\n主旨：檢送${form.unit}教師指導學生參與校外競賽獎勵金申請，請審查。\n\n說明：\n一、申請日期：${form.date}。\n二、競賽活動說明：${form.description}\n三、依辦法，排序五至排序八等同排序四；團體三人以上以表列金額二倍核算。\n\n申請明細：\n${rows}\n\n申請總金額：新臺幣 ${money(rewardTotal())} 元整。\n\n應檢附資料檢核：\n${checks}\n\n後台控管：若更正金額、排序或刪除重複申請，已進入簽核流程者需重新送簽並重新上傳簽名檔。`;
  render();
}

function saveReward() {
  const form = state.forms.teacherReward;
  const id = `APP-${String(620 + state.incoming.length).padStart(4, "0")}`;
  state.incoming.unshift({ id, title: `教師獎勵金申請 - ${form.unit}`, applicant: form.unit, status: "待簽核", cloud: `雲端硬碟/家長會文件/${id}.xls` });
  state.message = `已儲存 ${id} 到收文管理。`;
  render();
}

function exportExcel() {
  const form = state.forms.teacherReward;
  const headers = ["序號", "申請單位", "申請日期", "競賽項目／名稱", "競賽性質", "團體人數", "競賽層級", "獲獎排序", "指導老師", "獎勵金額"];
  const rows = form.awards.map((award, index) => [index + 1, form.unit, form.date, award.contestName, award.nature, award.nature === "團體" ? award.groupSize : "", award.level, award.rank, award.teacher, award.amount]);
  const summary = rows.reduce((acc, row) => {
    const key = `${row[8] || "未填"} / ${row[6]}`;
    acc[key] = (acc[key] || 0) + Number(row[9] || 0);
    return acc;
  }, {});
  const html = `<html><head><meta charset="UTF-8"></head><body>
    <table border="1"><caption>教師獎勵金申請明細</caption><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <br><table border="1"><caption>統計分析摘要</caption><thead><tr><th>指導老師／層級</th><th>獎勵金額合計</th></tr></thead><tbody>${Object.entries(summary).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>
  </body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "教師獎勵金申請統計.xls";
  link.click();
  URL.revokeObjectURL(url);
}

function renderDashboard() {
  return `<div class="grid dashboard">
    <div class="metric"><label>待辦數量</label><strong>6</strong></div>
    <div class="metric"><label>本月發文</label><strong>18</strong></div>
    <div class="metric"><label>AI 節省時間</label><strong>42</strong></div>
    <div class="metric"><label>待簽核</label><strong>7</strong></div>
  </div>`;
}

function renderForms() {
  return `<div class="tabs">
    ${formTypes.map((form) => `<button class="tab ${state.activeForm === form.id ? "active" : ""}" data-form="${form.id}">${form.label}</button>`).join("")}
    ${state.admin ? `<button class="tab" id="addFormFormat">新增表單格式</button>` : ""}
  </div>
  ${state.admin ? `<div class="admin-box"><strong>管理員表單設定</strong><span>「新增表單格式」僅管理者模式可用；一般使用者只能使用已建立好的表單。</span></div>` : ""}
  ${state.activeForm === "teacherReward" ? renderTeacherReward() : renderSimpleForm()}`;
}

function renderSimpleForm() {
  const label = formTypes.find((form) => form.id === state.activeForm)?.label || "表單";
  return `<div class="panel"><div class="panel-header"><h2 class="panel-title">${label}</h2><span class="badge green">已建立表單</span></div>
    <div class="form-grid"><div class="field full"><label>申請內容</label><textarea>${label}申請內容範例。</textarea></div></div>
    <div class="actions"><button class="primary">AI 草擬</button><button class="ghost">儲存到收文管理</button></div>
  </div>`;
}

function renderTeacherReward() {
  const form = state.forms.teacherReward;
  return `<div class="panel">
    <div class="panel-header"><h2 class="panel-title">教師獎勵金申請</h2><span class="badge green">依獎勵辦法附件一</span></div>
    <div class="form-grid">
      <div class="field"><label>申請單位</label><select id="rewardUnit">${rewardUnits.map((unit) => `<option ${unit === form.unit ? "selected" : ""}>${unit}</option>`).join("")}</select></div>
      <div class="field"><label>申請日期</label><input id="rewardDate" type="date" value="${form.date}"></div>
      <div class="field full"><label>競賽活動說明</label><textarea id="rewardDescription">${form.description}</textarea></div>
    </div>
    <div class="notice"><strong>應檢附資料</strong><div class="checks">
      ${[
        ["application", "申請表（附件一）"],
        ["registration", "代表本校參賽之公文或比賽報名文件"],
        ["awardProof", "得獎公文、獎狀或成績證明影本"],
        ["other", "其他文件，如指導證明"]
      ].map(([key, label]) => `<label class="check"><input type="checkbox" data-check="${key}" ${form.checklist[key] ? "checked" : ""}><span>${label}</span></label>`).join("")}
    </div></div>
    <div class="panel-header" style="margin-top:16px"><h2 class="panel-title">申請明細</h2><button class="ghost" id="addAward" ${form.awards.length >= 8 ? "disabled" : ""}>新增一筆</button></div>
    <div class="reward-table">
      <div class="reward-row reward-head"><span>競賽項目／名稱</span><span>性質</span><span>人數</span><span>競賽層級</span><span>獲獎排序</span><span>指導老師</span><span>獎勵金額</span><span></span></div>
      ${form.awards.map((award, index) => `<div class="reward-row">
        <input data-award="${index}" data-key="contestName" value="${award.contestName}" placeholder="競賽名稱">
        <select data-award="${index}" data-key="nature">${["個人", "團體"].map((v) => `<option ${v === award.nature ? "selected" : ""}>${v}</option>`).join("")}</select>
        <input type="number" min="${award.nature === "團體" ? 3 : 1}" data-award="${index}" data-key="groupSize" value="${award.groupSize}" ${award.nature === "個人" ? "disabled" : ""}>
        <select data-award="${index}" data-key="level">${Object.keys(rewardLevels).map((v) => `<option ${v === award.level ? "selected" : ""}>${v}</option>`).join("")}</select>
        <select data-award="${index}" data-key="rank">${rewardRanks.map((v) => `<option ${v === award.rank ? "selected" : ""}>${v}</option>`).join("")}</select>
        <input data-award="${index}" data-key="teacher" value="${award.teacher}" placeholder="指導老師">
        <input type="number" min="0" step="100" data-award="${index}" data-key="amount" value="${award.amount}" ${state.admin ? "" : "readonly"}>
        <button class="icon-btn" data-remove="${index}" ${form.awards.length <= 1 ? "disabled" : ""}>刪</button>
      </div>`).join("")}
    </div>
    <div class="amount-line"><span>申請總金額</span><span class="amount">NT$ ${money(rewardTotal())}</span></div>
    <div class="notice"><strong>辦法提醒</strong><span>排序五至排序八之獎勵額度等同排序四；團體組三人（含）以上以表列金額 2 倍核算。</span></div>
    <div class="admin-box"><strong>${state.admin ? "後台審核工具" : "簽核提醒"}</strong><span>${form.reviewMessage}</span>${form.needsResign ? `<span class="badge amber">需重新送簽與重新上傳簽名檔</span>` : ""}</div>
    <div class="actions"><button class="primary" id="draftReward">AI 草擬</button><button class="ghost" id="saveReward">儲存到收文管理</button><button class="ghost" id="exportExcel">匯出 Excel 統計</button></div>
  </div>
  <div class="panel"><div class="panel-header"><h2 class="panel-title">AI 草擬內容</h2><span class="badge green">離線草稿</span></div><div class="draft">${state.draft}</div></div>`;
}

function renderIncoming() {
  return `<div class="panel"><div class="panel-header"><h2 class="panel-title">收文管理</h2><span>${state.message}</span></div><div class="table-wrap"><table><thead><tr><th>收文號</th><th>主旨</th><th>申請單填寫人</th><th>狀態</th><th>文件管理</th></tr></thead><tbody>${state.incoming.map((doc) => `<tr><td>${doc.id}</td><td>${doc.title}</td><td>${doc.applicant}</td><td>${doc.status}</td><td>${doc.cloud}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function renderTracking() {
  return `<div class="panel"><h2 class="panel-title">簽核追蹤</h2><p>1 申請人 → 2 財務副會長 → 3 會長 → 4 出納 → 5 會計 → 6 領款人</p><p>內容異動後需重新送簽並重新上傳簽名檔。</p></div>`;
}

function renderTemplates() {
  return `<div class="panel">
    <div class="panel-header"><h2 class="panel-title">公文範本庫</h2><span class="badge green">${state.admin ? "管理者模式" : "一般使用者"}</span></div>
    <div class="grid">
      ${state.templates.map((template, index) => `<div class="notice"><strong>${template.title}</strong><span>${template.body}</span><div class="actions"><button class="ghost" data-use-template="${index}">套用範本</button>${state.admin ? `<button class="ghost danger" data-delete-template="${index}">刪除範本</button>` : ""}</div></div>`).join("")}
    </div>
    ${state.admin ? `<div class="admin-box"><strong>新增範本</strong><div class="form-grid"><div class="field"><label>範本名稱</label><input id="templateTitle" value="${state.newTemplateTitle}" placeholder="例如 教師獎勵金補件通知"></div><div class="field"><label>範本摘要</label><input id="templateBody" value="${state.newTemplateBody}" placeholder="輸入此範本用途"></div></div><div class="actions"><button class="primary" id="addTemplate">新增範本</button></div></div>` : `<div class="notice"><strong>使用權限</strong><span>一般使用者可套用已建立好的範本；新增、刪除與管理範本僅限管理者模式。</span></div>`}
  </div>`;
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach((button) => button.addEventListener("click", () => { state.active = button.dataset.nav; render(); }));
  document.querySelectorAll("[data-form]").forEach((button) => button.addEventListener("click", () => setForm(button.dataset.form)));
  document.querySelector("#adminToggle")?.addEventListener("click", () => { state.admin = !state.admin; render(); });
  document.querySelector("#addFormFormat")?.addEventListener("click", () => { state.message = "管理者可在正式版後台新增表單格式；此靜態版先保留按鍵入口。"; render(); });
  document.querySelector("#templateTitle")?.addEventListener("input", (event) => { state.newTemplateTitle = event.target.value; });
  document.querySelector("#templateBody")?.addEventListener("input", (event) => { state.newTemplateBody = event.target.value; });
  document.querySelector("#addTemplate")?.addEventListener("click", () => {
    const title = state.newTemplateTitle.trim();
    const body = state.newTemplateBody.trim();
    if (!title || !body) { state.message = "請填寫範本名稱與摘要。"; render(); return; }
    state.templates.unshift({ title, body });
    state.newTemplateTitle = "";
    state.newTemplateBody = "";
    state.message = `已新增範本：${title}`;
    render();
  });
  document.querySelectorAll("[data-delete-template]").forEach((button) => button.addEventListener("click", () => { state.templates.splice(Number(button.dataset.deleteTemplate), 1); state.message = "已刪除範本。"; render(); }));
  document.querySelectorAll("[data-use-template]").forEach((button) => button.addEventListener("click", () => {
    const template = state.templates[Number(button.dataset.useTemplate)];
    state.active = "forms";
    if (template?.title.includes("教師")) state.activeForm = "teacherReward";
    else if (template?.title.includes("場地")) state.activeForm = "venue";
    else state.activeForm = "purchase";
    state.message = `已套用範本：${template?.title || ""}`;
    render();
  }));
  document.querySelector("#rewardUnit")?.addEventListener("change", (event) => updateRewardField("unit", event.target.value));
  document.querySelector("#rewardDate")?.addEventListener("input", (event) => updateRewardField("date", event.target.value));
  document.querySelector("#rewardDescription")?.addEventListener("input", (event) => updateRewardField("description", event.target.value));
  document.querySelectorAll("[data-check]").forEach((input) => input.addEventListener("change", () => updateChecklist(input.dataset.check, input.checked)));
  document.querySelectorAll("[data-award]").forEach((input) => {
    const update = () => updateAward(Number(input.dataset.award), input.dataset.key, input.value);
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });
  document.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => removeAward(Number(button.dataset.remove))));
  document.querySelector("#addAward")?.addEventListener("click", addAward);
  document.querySelector("#draftReward")?.addEventListener("click", draftTeacherReward);
  document.querySelector("#saveReward")?.addEventListener("click", saveReward);
  document.querySelector("#exportExcel")?.addEventListener("click", exportExcel);
}

function renderMain() {
  if (state.active === "dashboard") return renderDashboard();
  if (state.active === "forms") return renderForms();
  if (state.active === "incoming") return renderIncoming();
  if (state.active === "tracking") return renderTracking();
  return renderTemplates();
}

function render() {
  const navs = [["dashboard", "總覽儀表板"], ["forms", "各項表單申請"], ["incoming", "收文管理"], ["tracking", "簽核追蹤"], ["templates", "公文範本庫"]];
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><span class="mark">金</span><span>金華國小<br>家長會公文</span></div><nav class="nav">${navs.map(([id, label]) => `<button class="${state.active === id ? "active" : ""}" data-nav="${id}"><span>▣</span><span>${label}</span></button>`).join("")}</nav></aside><main><header class="topbar"><strong>${navs.find(([id]) => id === state.active)?.[1]}</strong><button class="ghost" id="adminToggle">${state.admin ? "管理者模式" : "一般使用者"}</button></header><section class="content">${state.message ? `<div class="notice">${state.message}</div>` : ""}${renderMain()}</section></main></div>`;
  bind();
}

render();
