---
theme: default
title: ZK Policy Enforcement Layer
info: |
  ## ZK Policy Enforcement Layer
  AIエージェントの送金を、秘密の支出ポリシーに対するZK Proofで検証してから実行するSmart Account基盤のPoC。
class: text-left
transition: slide-left
lineNumbers: false
mdc: false
---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Komlock-lab / zk-policy-poc</div>

# ZK Policy Enforcement Layer

エージェントに秘密の支出ポリシーを渡さず、<br>
ZK Proofで送金の境界を強制するSmart Account基盤

<div class="flex gap-6 pt-8 text-sm font-mono opacity-70">
  <span>Noir + UltraHonk</span>
  <span class="opacity-40">/</span>
  <span>ERC-4337</span>
  <span class="opacity-40">/</span>
  <span>MCP</span>
</div>

<!--
【構成】5分尺。サービス（概要・目的・アーキテクチャ）2分20秒 → Programmable Cryptography 1分 → デモ（正常系・異常系・Agent経由）50秒 → 将来像（ETH Global）40秒。

このPoCは「AIエージェントに財布を持たせる」ことを、
人間の都度承認ではなく暗号的な境界で成立させられるかを検証したもの。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — 概要</div>

# エージェントの送金を、ZK Proofで検証してから実行する

Claude Code / Codexが自然言語の依頼から生成した送金を、秘密の支出ポリシーに対するProofで検証し、条件を満たすときだけERC-4337 Smart Accountが実行する。

<div class="flow-diagram" role="img" aria-label="人がAIエージェントに送金を依頼し、AIが秘密ポリシーへの適合を証明し、Smart Accountが証明を検証できたときだけ送金を実行する">
  <div class="flow-step">
    <div class="flow-icon opacity-70"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg></div>
    <div class="flow-title">人</div>
    <div class="flow-desc">自然言語で依頼</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-icon opacity-70"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="8" width="14" height="11" rx="3"/><circle cx="9.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none"/></svg></div>
    <div class="flow-title">AIエージェント</div>
    <div class="flow-desc">Claude Code / Codex</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-icon accent-pink"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
    <div class="flow-title">ZK Proof</div>
    <div class="flow-desc">秘密ポリシーへの適合を証明</div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step highlight">
    <div class="flow-icon accent-blue"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></div>
    <div class="flow-title">Smart Account</div>
    <div class="flow-desc">検証成功のときだけ送金</div>
  </div>
</div>

<!--
条件は1回あたり上限（asset別）、有効期限（issuedAt〜validUntil）、allowlist（送金先/Token/Contract）、日次累積上限（UTC 1日・asset別）の4種類。
対応する決済：native送金 / ERC-20転送 / Contractのinvoice決済（pay(bytes32)）の3種別。
エージェントへの入口：MCPの3 Tool — pay_native / pay_erc20 / pay_contract。
複数条件は「1つのPolicyに含まれる複数条件のAND」と定義した（ADR-0012）。ORや優先順位を入れると、どの条件で通ったかが観測から推測できてしまう。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — 目的</div>

# ガードレールが「読める場所」にある限り、越えられる

エージェントに財布を持たせられない理由は、資金の大きさではなくルールの置き場所にある。

<div class="guardrail-compare" role="img" aria-label="従来のガードレールはエージェントからルールが見え回避できる。ZK Policyのガードレールはルールを秘密のまま隠し証明だけを通す">
  <div class="guardrail-panel">
    <div class="guardrail-label accent-pink">従来のガードレール</div>
    <div class="guardrail-visual">
      <div class="guardrail-agent opacity-80"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg><span>エージェント</span></div>
      <div class="guardrail-gap open accent-pink"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.8-1.2"/></svg><span class="gap-caption">見える・回避できる</span></div>
      <div class="guardrail-rule accent-pink"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.8-1.2"/></svg><span>ルール</span></div>
    </div>
  </div>
  <div class="guardrail-panel">
    <div class="guardrail-label accent-blue">ZK Policyのガードレール</div>
    <div class="guardrail-visual">
      <div class="guardrail-agent opacity-80"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg><span>エージェント</span></div>
      <div class="guardrail-gap closed accent-blue"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span class="gap-caption">証明だけが通る</span></div>
      <div class="guardrail-rule accent-blue"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><span>秘密のルール</span></div>
    </div>
  </div>
</div>

<div class="border rounded p-3 mt-5 text-sm">
<b>信頼の置き場所を変える。</b> 境界は「守るべきルール」ではなく<b>「実行できない領域」</b>になる。
</div>

<!--
ここが目的の核心。
守らせるのではなく、実行できなくする。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — アーキテクチャ</div>

# 秘密のルールで証明し、ウォレットが送金を許可する

「0.01 ETHを送って」という依頼が、実行されるまで。

<div class="payment-map" role="img" aria-label="AIが0.01 ETHの送金を依頼する。実行Clientが秘密Policyを持つProverへ証明を依頼し、Proofを受け取る。Clientが送金内容とProofをウォレットへ送り、ウォレットが検証に成功した場合だけ送金する。証明できなければClientは送信せず、検証に失敗すればウォレットは送金しない。">
  <div class="map-policy"><div class="map-kicker">人間が決めたルールを秘密に保持</div><b>② 条件を満たす証明を作る</b><span>上限・許可された送金先・日次予算</span><small>Policy API / Prover</small></div>
  <div class="map-exchange"><div><span>証明を依頼</span><b>↑</b></div><div><span>Proofを返す</span><b>↓</b></div></div>
  <div class="map-agent map-actor"><div class="map-kicker">① 送金を依頼</div><b>AI Agent</b><span>「0.01 ETHを<br>送って」</span><small>Claude Code / Codex</small></div>
  <div class="map-intent map-arrow"><span>送金内容</span><b>→</b></div>
  <div class="map-client map-actor"><div class="map-kicker">証明の取得と送信</div><b>実行Client</b><span>送金内容に<br>Proofを添える</span><small>MCP / Payment Client</small></div>
  <div class="map-proof map-arrow"><span>送金内容<br>＋ Proof</span><b>→</b></div>
  <div class="map-account map-actor"><div class="map-kicker">③ 証明を検証</div><b>ウォレット</b><span>この送金の証明か<br>実行内容で確認</span><small>Smart Account + Verifier</small></div>
  <div class="map-success map-arrow"><span>成功</span><b>→</b></div>
  <div class="map-recipient map-actor"><div class="map-kicker">④ 送金</div><b>送金先</b><span>0.01 ETH</span></div>
  <div class="map-no-proof map-stop"><b>↓</b><span>証明できない<br><strong>送信しない</strong></span></div>
  <div class="map-rejected map-stop"><b>↓</b><span>検証に失敗<br><strong>送金しない</strong></span></div>
</div>

<div class="map-caption">秘密のルールはProver側に留まり、AIには決済結果だけが返る。</div>

<!--
サービス全体で2分20秒。まず中央の送金経路を左から右へ追い、次にClientの上にある秘密Policyと証明の往復を説明する。
① AIが送金内容をMCPへ渡す。例の0.01 ETHは説明用の金額であり、送金可否は設定したPolicy全体に依存する。
② ClientがPolicy API / Proverへ証明を依頼する。Ownerが設定した秘密Policyを使い、全条件の充足を証明する。満たさなければ正常な証明を作れず、Clientは送信しない。
③ ClientがOwner署名付きUserOperationをBundler（Alto）とEntryPoint v0.8経由でAccountへ送信する。Accountは実行引数と実状態から15個の公開入力を再構築し、Verifierを呼び出す。ClientのpublicInputs配列をそのまま検証に使わない。
④ 検証成功後、Accountが累積支出を計上して送金する。検証に失敗した送金は実行しない。成功時は公開receiptをモデルへ返す。結果の戻り経路は図から省略。
実行ClientはProofと公開入力を取得・照合するが、モデルには秘密・Owner Key・Proof Token・proofを渡さない（ADR-0011）。
OwnerはPolicy CLIからEIP-712署名とnonceでPolicyを設定し、CommitmentをAccountへ登録する。設定経路は図から省略。
Policy APIはAES-256-GCMで保存したPolicyを復号してProverへ渡す。秘密Policyには有効期間・asset別上限・allowlist・dailyLimit・salt等を含む。
対応決済はnative / ERC-20 / Contract。図はnative送金を例にする。Noir + Barretenbergで生成したProofを検証する。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — ZKで実現すること</div>

# ポリシーを公開せず、送金が条件を満たすことを証明する

<div class="grid grid-cols-2 gap-5 pt-5">
<div class="border rounded p-5" style="border-color:#a8446b;background:rgba(168,68,107,.04)"><div class="text-xs font-mono pb-4" style="color:#a8446b">PRIVATE POLICY — 非公開</div><div class="text-xl font-semibold pb-3">秘密のポリシー</div><div class="text-sm leading-7">企業の予算・資産別の上限額<br>送金先やコントラクトの許可リスト<br>有効期間の上限・salt</div></div>
<div class="border rounded p-5" style="border-color:#1288ab;background:rgba(18,136,171,.04)"><div class="text-xs font-mono pb-4" style="color:#1288ab">PUBLIC INPUTS + PROOF — 公開</div><div class="text-xl font-semibold pb-3">今回の送金と、その証明</div><div class="text-sm leading-7">送金額・送金先などの実行内容<br>登録済みcommitment・利用状態<br>UltraHonk proof</div></div>
</div>
<div class="border rounded p-4 mt-6">検証するのは <b style="color:#1288ab">「登録したポリシーに、この送金が適合する」</b>こと。</div>
<div class="text-xs opacity-60 pt-4">AIへの非開示はMCPの設計、オンチェーンへの非開示はZKで実現。証明生成バックエンドはポリシーを扱う。</div>

<!--
目安：50秒。
AIに送金を任せても、1回の上限、1日の利用上限、送金先など、守らせたいルールがあります。
今回はルール自体をオンチェーンに公開せず、今回の送金がルールを満たすことをZKで証明します。
コントラクトはサーバーからの「チェック済み」を信用する必要がなく、proofを検証して送金を実行できます。
隠しているのはポリシーの中身です。送金額や送金先は公開されます。現在のバックエンドは秘密のポリシーを扱います。
実装根拠：5285f00 packages/policy/src/schema.ts、circuits/spend-limit/src/main.nr。複合ポリシー実装を対象にしており、mainの旧回路とは区別する。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — ZKアーキテクチャ</div>

# 回路を用意し、ルールを登録し、送金を検証する

<svg viewBox="0 0 892 400" style="width:100%;height:auto;max-height:390px" role="img" aria-label="開発時、ポリシー設定時、送金時の3段階を左から右へ読むZKアーキテクチャ"><defs><marker id="zk-three-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#1288ab"/></marker></defs><g style="font-family:Hiragino Sans,sans-serif" stroke-width="1.4"><text x="117" y="15" text-anchor="middle" style="font-size:13px" fill="#1288ab">① 開発時：証明・検証の仕組みを用意</text><g fill="#ffffff" stroke="#1288ab"><circle cx="12" cy="44" r="7"/><path d="M12 51 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="64" y="55" text-anchor="middle" style="font-size:14px" fill="#242424">開発者</text><text x="64" y="75" text-anchor="middle" style="font-size:10px" fill="#555555">条件を記述</text><g fill="#ffffff" stroke="#1288ab"><rect x="165" y="32" width="165" height="57" rx="10"/></g><text x="247.5" y="55" text-anchor="middle" style="font-size:14px" fill="#242424">Noir回路</text><text x="247.5" y="75" text-anchor="middle" style="font-size:10px" fill="#555555">コンパイル → ACIR</text><g fill="#ffffff" stroke="#1288ab"><rect x="393" y="32" width="190" height="57" rx="10"/></g><text x="488" y="55" text-anchor="middle" style="font-size:14px" fill="#242424">Barretenberg</text><text x="488" y="75" text-anchor="middle" style="font-size:10px" fill="#555555">UltraHonkのVK・Solidity生成</text><g fill="#ffffff" stroke="#1288ab"><rect x="712" y="32" width="178" height="57" rx="0"/><rect x="716" y="36" width="170" height="49"/></g><text x="801" y="55" text-anchor="middle" style="font-size:14px" fill="#242424">Verifier</text><text x="801" y="75" text-anchor="middle" style="font-size:10px" fill="#555555">オンチェーンに配置</text><path d="M110 62 H165" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="137.5" y="54" text-anchor="middle" style="font-size:9px" fill="#1288ab">回路</text><path d="M330 62 H393" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="361.5" y="54" text-anchor="middle" style="font-size:9px" fill="#1288ab">ACIR</text><path d="M583 62 H712" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="647.5" y="54" text-anchor="middle" style="font-size:9px" fill="#1288ab">開発者がデプロイ</text><text x="370" y="108" text-anchor="middle" style="font-size:11px" fill="#555555">ACIRを証明バックエンドにも配置</text><path d="M0 119 H892" stroke="#dddddd"/><g v-click="1"><text x="122" y="139" text-anchor="middle" style="font-size:13px" fill="#1288ab">② ポリシー設定時：ルールを固定</text><g fill="#ffffff" stroke="#1288ab"><circle cx="12" cy="165" r="7"/><path d="M12 172 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="64" y="176" text-anchor="middle" style="font-size:14px" fill="#242424">人（Owner）</text><text x="64" y="196" text-anchor="middle" style="font-size:10px" fill="#555555">ルールを設定</text><g fill="#ffffff" stroke="#1288ab"><rect x="192" y="153" width="205" height="57" rx="10"/></g><text x="294.5" y="176" text-anchor="middle" style="font-size:14px" fill="#242424">ポリシーレイヤー</text><text x="294.5" y="196" text-anchor="middle" style="font-size:10px" fill="#555555">Poseidon2でcommitment生成</text><g fill="#ffffff" stroke="#1288ab"><circle cx="501" cy="165" r="7"/><path d="M501 172 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="556.5" y="176" text-anchor="middle" style="font-size:14px" fill="#242424">人（Owner）</text><text x="556.5" y="196" text-anchor="middle" style="font-size:10px" fill="#555555">登録Txに署名</text><g fill="#ffffff" stroke="#1288ab"><rect x="712" y="153" width="178" height="57" rx="0"/><rect x="716" y="157" width="170" height="49"/></g><text x="801" y="176" text-anchor="middle" style="font-size:14px" fill="#242424">Smart Account</text><text x="801" y="196" text-anchor="middle" style="font-size:10px" fill="#555555">commitmentを保存</text><path d="M110 183 H192" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="151" y="175" text-anchor="middle" style="font-size:9px" fill="#1288ab">ポリシー</text><path d="M397 183 H489" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="443" y="175" text-anchor="middle" style="font-size:9px" fill="#1288ab">commitment</text><path d="M606 183 H712" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="659" y="175" text-anchor="middle" style="font-size:9px" fill="#1288ab">登録Tx</text><text x="295" y="229" text-anchor="middle" style="font-size:11px" fill="#555555">秘密のポリシー + salt をバックエンドに保存</text></g><path d="M0 241 H892" stroke="#dddddd"/><g v-click="2"><text x="111" y="262" text-anchor="middle" style="font-size:13px" fill="#1288ab">③ 送金時：適合を証明して実行</text><g fill="#ffffff" stroke="#1288ab"><circle cx="12" cy="294" r="7"/><path d="M12 301 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="47" y="305" text-anchor="middle" style="font-size:14px" fill="#242424">人</text><text x="47" y="325" text-anchor="middle" style="font-size:10px" fill="#555555">送金指示</text><g fill="#ffffff" stroke="#1288ab"><rect x="123" y="282" width="87" height="57" rx="10"/></g><text x="166.5" y="305" text-anchor="middle" style="font-size:14px" fill="#242424">AI</text><text x="166.5" y="325" text-anchor="middle" style="font-size:10px" fill="#555555">ツール呼出し</text><g fill="#ffffff" stroke="#1288ab"><rect x="277" y="282" width="213" height="57" rx="10"/></g><text x="383.5" y="305" text-anchor="middle" style="font-size:14px" fill="#242424">ポリシーレイヤー MCP</text><text x="383.5" y="325" text-anchor="middle" style="font-size:10px" fill="#555555">Barretenbergでproofを生成</text><g fill="#ffffff" stroke="#1288ab"><rect x="562" y="282" width="152" height="57" rx="0"/><rect x="566" y="286" width="144" height="49"/></g><text x="638" y="305" text-anchor="middle" style="font-size:14px" fill="#242424">Smart Account</text><text x="638" y="325" text-anchor="middle" style="font-size:10px" fill="#555555">実行内容から公開入力を構成</text><g fill="#ffffff" stroke="#1288ab"><rect x="795" y="282" width="95" height="57" rx="0"/><rect x="799" y="286" width="87" height="49"/></g><text x="842.5" y="305" text-anchor="middle" style="font-size:14px" fill="#242424">Verifier</text><text x="842.5" y="325" text-anchor="middle" style="font-size:10px" fill="#555555">proofを検証</text><path d="M76 312 H123" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="99.5" y="304" text-anchor="middle" style="font-size:9px" fill="#1288ab">指示</text><path d="M210 312 H277" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="243.5" y="304" text-anchor="middle" style="font-size:9px" fill="#1288ab">金額・宛先</text><path d="M490 312 H562" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="526" y="304" text-anchor="middle" style="font-size:9px" fill="#1288ab">proof・送金</text><path d="M714 302 H795" stroke="#1288ab" fill="none" marker-end="url(#zk-three-arrow)"/><text x="754.5" y="294" text-anchor="middle" style="font-size:9px" fill="#1288ab">proof・公開入力</text><path d="M795 328 H714" stroke="#1288ab" marker-end="url(#zk-three-arrow)"/><text x="754" y="345" text-anchor="middle" style="font-size:10px" fill="#1288ab">検証結果</text><text x="383" y="357" text-anchor="middle" style="font-size:10px" fill="#555555">入力：配置済み回路・秘密のポリシー・現在の状態</text><text x="638" y="369" text-anchor="middle" style="font-size:12px" fill="#1288ab">成功 → 送金</text></g><text x="446" y="396" text-anchor="middle" style="font-size:10px" fill="#666666"></text></g></svg>

<!--
目安：90秒。
最初は開発時の段を説明します。Noir回路からACIRを作り、Barretenbergで検証鍵とVerifierのSolidityコードを生成してデプロイします。同じACIRを証明バックエンドにも配置します。Verifierの参照先をSmart Accountに設定する初期準備は図では省略しています。
[click]
ポリシー設定時の段を表示します。人が設定し、オフチェーンで生成したcommitmentの登録Txに署名します。秘密のポリシーとsaltはバックエンドに保存します。
[click]
送金時の段を表示します。AIは人の送金指示を解釈してMCPを呼び、送金結果を受け取ります。ポリシーやproof、秘密鍵はAIに返しません。バックエンドは現在のオンチェーン状態を取得して証明します。
事前にポリシーとsaltからcommitmentを作り、コントラクトに登録します。
送金時は、秘密のポリシーと今回の送金内容・利用状態を使って、BarretenbergがUltraHonkのproofを生成します。条件はNoirで定義しています。
証明するのは、ポリシーが登録済みcommitmentと一致することと、今回の送金がそのポリシーを満たすことの両方です。
コントラクト側で実行する金額、送金先、日次利用額などから公開入力を構築して検証します。証明後に金額を変えると検証に失敗します。
開発時はNoirをACIRへコンパイルし、Barretenbergで検証用コントラクトを生成します。図は実行時の経路です。
現在時刻に対する有効性はAccount側でも検査します。ZKはOwner署名を置き換えません。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — commitmentの中身</div>

# commitmentは、ポリシー全体に結び付く

<div style="display:grid;grid-template-columns:1.8fr 1fr;gap:28px;align-items:center;margin-top:24px">
<div class="border rounded p-4 text-sm">
<div class="py-3 border-b"><b style="display:inline-block;width:120px">基本設定</b>schemaVersion・有効期間の上限</div>
<div class="py-3 border-b"><b style="display:inline-block;width:120px">送金先制限</b>有効フラグ・件数・許可アドレス</div>
<div class="py-3 border-b"><b style="display:inline-block;width:120px">資産別ルール</b>件数・資産・1回の上限・1日の上限</div>
<div class="py-3 border-b"><b style="display:inline-block;width:120px">呼出先制限</b>有効フラグ・件数・許可コントラクト</div>
<div class="py-3"><b style="display:inline-block;width:120px">日次制限 / salt</b>有効フラグ / 秘密のランダム値</div>
</div>
<div class="text-center"><div class="text-xs opacity-60">正規化・固定長化</div><div style="font-size:42px;color:#1288ab">65 <span class="text-lg">Fields</span></div><div class="py-3 text-sm opacity-60">↓ Poseidon2 ↓</div><div style="font-size:32px;color:#1288ab">1 <span class="text-lg">commitment</span></div><div class="text-xs pt-2 opacity-60">オンチェーンに登録</div></div>
</div>
<div class="border rounded p-4 mt-5 text-center font-mono text-sm" style="border-color:#1288ab">policyCommitment = Poseidon2::hash(policyFields, 65)</div>
<div class="text-xs opacity-60 pt-3">65個にはsaltを含む。アドレスは整列、未使用枠はゼロ埋め。今回の送金額や累積利用額は別の公開入力。</div>

<!--
目安：60秒。
commitmentには、上限額だけでなくポリシー全体が結び付いています。
許可する送金先、資産ごとの上限、日次上限、許可コントラクト、有効期間の上限などを、決まった順番の65個のFieldに変換します。
アドレスを並べ替え、使わない枠はゼロで埋めます。saltもこの65個に含みます。
Poseidon2でハッシュ化した結果の1個の値を登録します。saltは上限などの候補からの推測を困難にします。
回路内でも同じ計算をします。勝手に上限を緩めたポリシーでは、登録済みcommitmentと一致しません。
詳細：基本2、送金先18、資産25、呼出先18、日次フラグ1、salt1で合計65。送金先16枠、資産8枠、呼出先16枠。
実装根拠：5285f00 packages/policy/src/schema.ts のpolicyFields、circuits/spend-limit/src/main.nr のPoseidon2::hash(s, 65)。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">デモ — 正常系・異常系</div>

# proofを作れても、送金額を書き換えると通らない

<div class="text-sm pt-2 pb-4">共通ポリシー：<b>1回の送金上限 0.1 ETH</b></div>
<div class="grid grid-cols-2 gap-5 text-sm">
<div class="border rounded p-4"><div class="font-mono pb-3" style="color:#2c8a5c">正常系 — 0.1 ETH → 0.1 ETH</div><div class="border-l-2 pl-3 leading-6">「正常系デモを実行して。<br>デモ送金先に0.1 ETHを送って」</div><div class="text-xs opacity-60 py-4">Claude Code → 正常系MCPツール</div><div class="leading-8">① 0.1 ETHでproof生成<br>② 0.1 ETHで送金を実行<br><b style="color:#2c8a5c">③ 検証成功 → 送金先 +0.1 ETH</b></div></div>
<div class="border rounded p-4"><div class="font-mono pb-3" style="color:#a8446b">異常系 — 0.1 ETH → 0.2 ETH</div><div class="border-l-2 pl-3 leading-6">「異常系デモを実行して。0.1 ETHの<br>proofで0.2 ETHを送り、拒否を確認して」</div><div class="text-xs opacity-60 py-4">Claude Code → 異常系MCPツール</div><div class="leading-8">① 0.1 ETHでproof生成は成功<br>② MCP内部で送金額を0.2 ETHに変更<br><b style="color:#a8446b">③ 検証失敗 → 送金先の残高変化なし</b></div></div>
</div>
<div class="text-xs opacity-60 pt-4">MCP内部で証明後の金額改変を注入するデモ。AI自身が異常動作したことを示すものではない。</div>

<!--
目安：デモ前30秒、実演後20秒。
どちらもClaude Codeに自然言語で指示し、それぞれのMCPツールを呼び出します。
共通の送金上限は0.1 ETHです。正常系は上限と同額の0.1 ETHでproofを作り、そのまま0.1 ETHを送金します。上限を含む境界値が通ることを確認します。
異常系は、0.1 ETHのproofを正常に生成した後、MCP内部で送金時の金額だけを0.2 ETHに変更します。proofは作れていますが、実行内容と一致しないため検証で拒否されます。
これはClaudeの暴走を実証するものではなく、異常系ツールで証明後の改変を注入するデモです。
ここに示すMCPツールの呼び分けは今回のデモ仕様です。このスライド作成ではMCP実装や実送金は行っていません。
実演準備：正常系の実行後も日次残額・Account残高に余裕を持たせる。許可送金先、期限、署名、十分なgasを揃え、金額以外を一致させる。
結果確認：正常系はreceiptと送金先残高+0.1 ETH。異常系はproof生成成功の記録、検証拒否の原因、送金先残高および日次支出の不変を確認する。
Bundlerのシミュレーション拒否と、実トランザクションのrevertは区別して説明する。失敗時も送信者がgasを支払う場合があるため「全残高が不変」とは言わない。
-->

---
layout: center
class: text-left
---

# 人間が境界を決め、エージェントがその内側で自律する。

秘密のポリシーは誰にも渡らない。エージェントに渡るのは、条件を満たしたという証明だけ。

<div class="pt-8 text-sm font-mono opacity-60">
GitHub: Komlock-lab / zk-policy-poc<br>
設計判断は docs/adr/ ・ 脅威モデルは docs/security/threat-model.md
</div>
