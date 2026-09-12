const $ = (selector) => document.querySelector(selector);
let state = {};
let busy = false;
function error(message) { $("#error").textContent = message; $("#error").hidden = !message; }
function show(name) {
  for (const screen of document.querySelectorAll(".screen")) screen.hidden = screen.id !== name;
  for (const step of document.querySelectorAll("[data-step]")) {
    if (step.dataset.step === name) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current");
  }
  $("#logout").hidden = name === "login";
  window.scrollTo({ top: 0 });
}
async function api(path, body) {
  const response = await fetch("/owner/api/" + path, { method: body === undefined ? "GET" : "POST",
    credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) { if (response.status === 401) show("login"); throw new Error(data.error || "操作を完了できませんでした。"); }
  return data;
}
async function action(fn) {
  if (busy) return;
  busy = true; error("");
  const buttons = [...document.querySelectorAll("button")]; buttons.forEach((button) => button.disabled = true);
  try { await fn(); } catch (e) { error(e.message || "接続できませんでした。ページを開き直してください。"); }
  finally { busy = false; buttons.forEach((button) => button.disabled = false); }
}
function renderConfirm() {
  show("confirm");
  $("#commitment").textContent = state.commitment || state.result?.commitment || "";
  $("#summary-amount").textContent = (state.amountEth || "") + " ETH";
  const complete = state.status === "complete";
  const failed = state.status === "failed";
  $("#confirm-title").textContent = complete ? "コミットメントを登録しました。" : "このコミットメントを登録しますか？";
  $("#confirm-intro").textContent = complete ? "Smart Accountへの保存とポリシーの有効化が完了しました。" : "作成したコミットメントをSmart Accountに登録します。";
  $("#commit-status").textContent = complete ? "登録済み" : failed ? "要確認" : "未登録";
  $("#confirm-actions").hidden = complete || failed || state.status === "sending";
  $("#result").hidden = !complete;
  $("#progress").textContent = failed ? "再送せず、demo:stopから環境を準備し直してください。" : complete ? "設定が完了しました。ターミナルから送金デモへ進めます。" : state.status === "sending" ? "登録処理中です。しばらくしてからページを再読み込みしてください。" : "「登録する」を押すと、オンチェーンのトランザクションが送信されます。";
  if (complete) {
    $("#result-fields").replaceChildren();
    for (const key of ["policyId", "policyVersion", "commitment", "txHash"]) {
      const row = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd");
      dt.textContent = key; dd.textContent = String(state.result[key]); row.append(dt, dd); $("#result-fields").append(row);
    }
  }
}
async function refresh() {
  state = await api("state");
  for (const el of document.querySelectorAll(".account-address")) el.textContent = state.accountAddress;
  if (state.status !== "editing") renderConfirm();
  else if (state.configured) { show("policy"); $("#policy-form").hidden = true; error("この環境のポリシーは登録済みです。ターミナルで pnpm demo:claude を実行してください。"); }
  else { $("#policy-form").hidden = false; show("policy"); }
}
$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  action(async () => {
    if (!window.ethereum?.request) {
      await api("login", { demo: true });
      await refresh();
      return;
    }
    let accounts;
    try { accounts = await window.ethereum.request({ method: "eth_requestAccounts" }); }
    catch (e) {
      if (e.code === 4001) throw new Error("ウォレット接続がキャンセルされました。");
      if (e.code === -32002) throw new Error("ウォレットで接続リクエストを確認してください。");
      throw new Error("ウォレットに接続できませんでした。");
    }
    const walletAddress = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof walletAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) throw new Error("接続するアカウントを選択してください。");
    await api("login", { walletAddress });
    await refresh();
  });
});
$("#policy-form").addEventListener("submit", (event) => {
  event.preventDefault();
  action(async () => {
    const amount = $("#max-amount").value.trim();
    if (!/^[0-9]+(?:\.[0-9]{1,18})?$/.test(amount)) throw new Error("金額を小数点以下18桁以内で入力してください。");
    await api("draft", { maxAmountEth: amount }); await refresh();
  });
});
$("#back").addEventListener("click", () => action(async () => { await api("back", {}); await refresh(); }));
$("#logout").addEventListener("click", () => action(async () => { await api("logout", {}); state = {}; show("login"); }));
$("#confirm-button").addEventListener("click", () => action(async () => {
  $("#progress").textContent = "登録中です。トランザクションの確定を待っています…";
  try { await api("confirm", { commitment: state.commitment }); await refresh(); }
  catch (e) { await refresh(); throw e; }
}));
refresh().catch((e) => { show("login"); if (!e.message.includes("ログイン")) error(e.message); });
