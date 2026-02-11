const STORAGE_KEY = "goerlife-newyear-checkin";

const state = {
  profile: null,
  cycleDays: 7,
  checkedDays: 0,
  reviveUsed: false,
  records: [],
};

const cardsToLock = ["challengeCard", "statusCard", "checkinCard", "recordsCard"].map((id) => document.getElementById(id));
const loginForm = document.getElementById("loginForm");
const profileBox = document.getElementById("profile");
const profileName = document.getElementById("profileName");
const profileContact = document.getElementById("profileContact");
const logoutBtn = document.getElementById("logoutBtn");
const messageEl = document.getElementById("message");

const cycleButtons = document.querySelectorAll(".cycle-btn");
const totalDaysEl = document.getElementById("totalDays");
const checkedDaysEl = document.getElementById("checkedDays");
const remainingDaysEl = document.getElementById("remainingDays");
const reviveStateEl = document.getElementById("reviveState");
const progressBarEl = document.getElementById("progressBar");
const recordsListEl = document.getElementById("recordsList");

const checkinForm = document.getElementById("checkinForm");
const reviveBtn = document.getElementById("reviveBtn");
const shareBtn = document.getElementById("shareBtn");

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, {
      profile: parsed.profile || null,
      cycleDays: Number(parsed.cycleDays) || 7,
      checkedDays: Number(parsed.checkedDays) || 0,
      reviveUsed: Boolean(parsed.reviveUsed),
      records: Array.isArray(parsed.records) ? parsed.records : [],
    });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setLocked(locked) {
  cardsToLock.forEach((card) => card.classList.toggle("disabled", locked));
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#c63c2f" : "#178b4d";
}

function renderProfile() {
  const loggedIn = Boolean(state.profile);
  loginForm.classList.toggle("hidden", loggedIn);
  profileBox.classList.toggle("hidden", !loggedIn);
  setLocked(!loggedIn);

  if (loggedIn) {
    profileName.textContent = state.profile.name;
    profileContact.textContent = state.profile.contact;
  }
}

function renderStats() {
  totalDaysEl.textContent = `${state.cycleDays} 天`;
  checkedDaysEl.textContent = `${state.checkedDays} 天`;
  remainingDaysEl.textContent = `${Math.max(state.cycleDays - state.checkedDays, 0)} 天`;
  reviveStateEl.textContent = state.reviveUsed ? "已使用（0/1）" : "可用（1/1）";
  progressBarEl.style.width = `${Math.min((state.checkedDays / state.cycleDays) * 100, 100)}%`;
}

function renderCycleButtons() {
  cycleButtons.forEach((btn) => btn.classList.toggle("active", Number(btn.dataset.days) === state.cycleDays));
}

function renderRecords() {
  recordsListEl.innerHTML = "";
  if (!state.records.length) {
    const li = document.createElement("li");
    li.textContent = "暂无记录，先完成今天打卡吧。";
    recordsListEl.appendChild(li);
    return;
  }

  state.records.slice().reverse().forEach((record) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${record.type}</strong> · 第 ${record.day} 天<br>${record.date}<br>${record.note || "无备注"}`;
    recordsListEl.appendChild(li);
  });
}

function render() {
  renderProfile();
  renderCycleButtons();
  renderStats();
  renderRecords();
}

function addRecord(type, note = "") {
  const day = Math.min(state.checkedDays + 1, state.cycleDays);
  state.checkedDays = day;
  state.records.push({
    type,
    day,
    note: note.trim(),
    date: new Date().toLocaleString("zh-CN", { hour12: false }),
  });
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();

  if (!name) {
    alert("请输入姓名");
    return;
  }
  if (!/^1\d{10}$/.test(contact)) {
    alert("请输入正确的11位手机号");
    return;
  }

  state.profile = { name, contact };
  saveState();
  render();
  showMessage(`欢迎 ${name}，可以开始打卡啦！`);
});

logoutBtn.addEventListener("click", () => {
  const sure = confirm("退出会清空当前打卡数据，确认继续？");
  if (!sure) return;

  state.profile = null;
  state.cycleDays = 7;
  state.checkedDays = 0;
  state.reviveUsed = false;
  state.records = [];
  saveState();
  render();
  showMessage("");
});

cycleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.cycleDays = Number(btn.dataset.days);
    state.checkedDays = 0;
    state.reviveUsed = false;
    state.records = [];
    saveState();
    render();
    showMessage(`已切换到 ${state.cycleDays} 天挑战，进度已重置。`);
  });
});

checkinForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!state.profile) {
    showMessage("请先登录再打卡。", true);
    return;
  }

  if (state.checkedDays >= state.cycleDays) {
    showMessage("当前周期已完成，切换周期继续挑战吧！", true);
    return;
  }

  const proof = document.getElementById("proofPhoto").files[0];
  if (!proof) {
    showMessage("请上传1张凭证图片后再提交。", true);
    return;
  }

  const note = document.getElementById("note").value;

  const formData = new FormData();
  formData.append("proofPhoto", proof);
  formData.append("name", state.profile.name);
  formData.append("contact", state.profile.contact);
  formData.append("cycleDays", String(state.cycleDays));
  formData.append("note", note || "");
  formData.append("checkinType", "normal");

  try {
    const response = await fetch('/api/checkins', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      showMessage(data.message || '提交失败，请重试。', true);
      return;
    }

    addRecord("正常打卡", note);
    saveState();
    render();
    checkinForm.reset();
    showMessage("打卡成功，图片已上传到服务器。✅");
  } catch {
    showMessage("网络异常，上传失败，请稍后重试。", true);
  }
});

reviveBtn.addEventListener("click", async () => {
  if (!state.profile) {
    showMessage("请先登录再使用补卡。", true);
    return;
  }
  if (state.reviveUsed) {
    showMessage("补卡复活机会已使用。", true);
    return;
  }
  if (state.checkedDays >= state.cycleDays) {
    showMessage("当前周期已完成，无需补卡。", true);
    return;
  }

  const fakeBlob = new Blob(["revive"], { type: "image/png" });
  const reviveFile = new File([fakeBlob], "revive-proof.png", { type: "image/png" });
  const formData = new FormData();
  formData.append("proofPhoto", reviveFile);
  formData.append("name", state.profile.name);
  formData.append("contact", state.profile.contact);
  formData.append("cycleDays", String(state.cycleDays));
  formData.append("note", "使用补卡机会补记1天");
  formData.append("checkinType", "revive");

  try {
    const response = await fetch('/api/checkins', { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok) {
      showMessage(data.message || '补卡失败，请重试。', true);
      return;
    }

    addRecord("补卡复活", "使用补卡机会补记1天");
    state.reviveUsed = true;
    saveState();
    render();
    showMessage("补卡成功，继续加油！");
  } catch {
    showMessage("网络异常，补卡失败。", true);
  }
});

shareBtn.addEventListener("click", async () => {
  const nickname = state.profile?.name || "我";
  const text = [
    "歌尔生活 · 新年不躺平计划",
    `参与人：${nickname}`,
    `挑战周期：${state.cycleDays}天`,
    `当前进度：${state.checkedDays}/${state.cycleDays}`,
    `补卡状态：${state.reviveUsed ? "已使用" : "未使用"}`,
    "我今天已完成运动打卡，欢迎大家一起坚持！💪",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    showMessage("分享文案已复制，请到微信群粘贴发送。");
  } catch {
    showMessage("复制失败，请手动复制文案。", true);
  }
});

loadState();
render();
