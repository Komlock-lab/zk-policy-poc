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
class: flex flex-col justify-center
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
class: flex flex-col justify-center
---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — 目的</div>

# ルールを明かさず、証明できた場合だけ実行できる

企業でAIエージェントの活用が進むと、購買や決済の「実行」まで任せるようになる。

<div class="choice-grid" role="img" aria-label="社内の機密ルールをそのまま渡すと漏えいと迂回のリスクが生まれる。毎回人が承認していては自動化が進まない。ZK Policyはルールを明かさず、条件を満たしたと証明できた場合だけ実行できる">
  <div class="choice-card">
    <div class="choice-icon accent-pink"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.8-1.2"/></svg></div>
    <div class="choice-title">ルールをそのまま渡す</div>
    <div class="choice-desc">社内の機密ルールがエージェントに渡る</div>
    <div class="choice-verdict accent-pink">✕ 漏えい・迂回のリスク</div>
  </div>
  <div class="choice-card">
    <div class="choice-icon opacity-60"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg></div>
    <div class="choice-title">毎回、人が承認する</div>
    <div class="choice-desc">実行のたびに人の判断へ戻す</div>
    <div class="choice-verdict opacity-60">✕ 自動化が進まない</div>
  </div>
  <div class="choice-card highlight">
    <div class="choice-icon accent-blue"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg></div>
    <div class="choice-title">ZK Policy</div>
    <div class="choice-desc">ルールは明かさず、条件を満たしたことだけを証明する</div>
    <div class="choice-verdict accent-blue">✓ 証明できた場合だけ実行</div>
  </div>
</div>

<div class="border rounded p-3 mt-5 text-sm">
<b>信頼の置き場所を変える。</b> ルールを「守らせる」のではなく、<b>「証明がなければ実行できない」</b>構造にする。
</div>

<!--
企業でAIエージェントの活用が進むと、購買や決済の実行まで任せるようになります。
しかし、社内の機密ルールをそのまま渡すのはリスクがあり、毎回人が承認していては自動化が進みません。
そこで私たちは、ルールを明かさず、条件を満たしたと証明できた場合だけ実行できる仕組みを作りました。
-->

---
class: flex flex-col justify-center
---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — アーキテクチャ</div>

# ZK Policyのシステム構成

<div class="system-map" role="img" aria-label="AIとMCPサーバーはMCPで接続。オフチェーンのMCPサーバーはOwner鍵とAPI Tokenを保持し、Policy APIの証明APIとBundlerを利用する。Policy APIは秘密Policyとsaltを保持し、ProverはNoir回路とBarretenbergのUltraHonkを使用する。オンチェーンのEntryPointはSmart Accountを呼び出す。Accountは資金、commitment、利用状態を保持し、独立したUltraHonk Verifierを呼び出す。ProverとVerifierは同じNoir回路に対応する。commitmentは秘密PolicyとsaltのPoseidon2ハッシュ。">
  <div class="system-zone system-users">利用者・AI</div>
  <div class="system-zone system-local">オフチェーン <span>送金処理・証明サーバー</span></div>
  <div class="system-zone system-chain">オンチェーン <span>コントラクト</span></div>
  <div class="system-agent"><b>AIエージェント</b><p>Claude Code / Codex</p><p>送金内容を指定<br>決済結果を参照</p></div>
  <div class="system-mcp-link system-link"><span>MCP</span><i></i><small>ツール</small></div>
  <div class="system-server system-box"><b>送金処理サーバー</b><p>MCPサーバー / 決済処理</p><p>証明APIの利用・署名・送信</p><div class="system-held accent-pink">秘密：Owner鍵・API Token</div></div>
  <div class="system-bundler system-link"><small>UserOperation</small><i></i><b>Bundler</b><small>ERC-4337中継</small></div>
  <div class="system-account system-box"><div class="system-entry">EntryPoint v0.8 <span>— Account呼び出し</span></div><b>Smart Account</b><p>Owner認証・公開入力の構成・送金</p><div class="system-held accent-blue">保持：資金・commitment・利用状態</div></div>
  <div class="system-owner"><b>Owner（管理者）</b><p>Policyとcommitmentの<br>設定権限を持つ</p></div>
  <div class="system-api-link system-vertical">│ 証明API</div>
  <div class="system-verifier-link system-vertical">│ 検証呼び出し：証明 + 公開入力</div>
  <div class="system-proof system-box"><b>Policy API / Prover</b><div class="system-held accent-pink">保持：秘密Policy + salt（暗号化保存）</div><div class="system-tech"><b>Noir回路</b><span>commitmentの一致・送金条件を定義</span></div><div class="system-tech"><b>UltraHonk / Barretenberg</b><span>証明方式 / 証明生成の実装</span></div></div>
  <div class="system-circuit-link system-link"><span>同じNoir回路</span><i></i><small>に対応</small></div>
  <div class="system-verifier system-box"><b>UltraHonk Verifier</b><p>証明検証専用のSolidityコントラクト</p><div class="system-held accent-blue">保持：回路に対応する検証鍵</div><p>Accountとは別のコントラクト<br>資金の保管・送金はAccountの責務</p></div>
</div>

<div class="system-binding"><b>commitment = Poseidon2(Policy, salt)</b><span>秘密のルールとAccountの公開ハッシュを結び付ける。実線：接続 ／ 破線：回路の対応（通信なし）</span></div>

<!--
この図は部品の配置・責務・保持データ・接続を示す構成図。実行順は次のZKシーケンスで説明する。実線は接続、破線はProverとVerifierの回路の対応関係であり、直接通信ではない。
左は利用者、中央はオフチェーンの送金処理サーバーと証明サーバー、右はオンチェーンのコントラクト。
MCPサーバーはAIへの窓口であり、内部の決済処理が証明APIの呼び出し、Owner署名、BundlerへのUserOperation送信を担当する。Owner鍵とAPI Tokenはモデルに渡さない。BundlerはオフチェーンのERC-4337中継サービスで、EntryPointへ接続する。
Policy APIは秘密PolicyとsaltをAES-256-GCMで保存し、証明生成時には復号して扱う。Noirはcommitmentの一致と支出条件を記述する言語。コンパイル済み回路の実行でwitnessを生成し、BarretenbergのUltraHonkBackendがEVM向けの証明を生成する。witnessは公開しない。
UltraHonkは証明方式、Barretenbergは実装。オンチェーンのVerifierは同じNoir回路に対応する検証鍵を持つ。検証鍵とSolidity Verifierはscripts/generate-verifier.shで生成する。
Accountは資金・commitment・利用状態を保持する。Owner署名の確認、実際の送金引数と状態からの公開入力構成、独立したVerifierの呼び出し、条件を満たす送金の実行を担当する。Verifierは資金を持たず、証明検証を担当する。
commitmentはsaltを含む秘密PolicyのPoseidon2ハッシュ。OwnerがPolicy CLIでPolicyを設定し、別の署名付きTxでAccountのcommitmentを管理する。図では管理API・管理Tx・状態取得RPC・送金先への接続を省略する。
実装根拠：packages/prover/src/spend-limit.ts、scripts/generate-verifier.sh、docs/adr/adr-0003-commitment-and-proving-system.md、docs/adr/adr-0009-owner-userop-and-zk-proof-separation.md、docs/adr/adr-0011-autonomous-policy-authorization-and-secret-boundary.md。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — ZKシーケンス</div>

# 回路を用意し、ルールを登録し、送金を検証する

<div class="zk-architecture">
<svg viewBox="-20 -10 932 432" style="width:100%;height:auto;max-height:390px" role="img" aria-label="開発時、ポリシー設定時、送金時の3段階を左から右へ読むZKシーケンス"><defs><marker id="zk-three-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#7dd3fc"/></marker></defs><g style="font-family:Hiragino Sans,sans-serif" stroke-width="1.4"><text x="0" y="15" text-anchor="start" style="font-size:13px" fill="#ffffff">① 開発時：回路とVerifierを用意</text><g transform="translate(0 37) scale(1.0833333333333333)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g><text x="64" y="55" text-anchor="middle" style="font-size:13px" fill="#ffffff">開発者</text><text x="64" y="75" text-anchor="middle" style="font-size:10px" fill="#ffffff">条件を記述</text><g fill="#192734" stroke="#7dd3fc"><rect x="165" y="32" width="165" height="57" rx="10"/></g><g transform="translate(201 40) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="m9 9-3 3 3 3m6-6 3 3-3 3"/></g><text x="258" y="55" text-anchor="middle" style="font-size:13px" fill="#ffffff">Noir回路</text><text x="247.5" y="75" text-anchor="middle" style="font-size:10px" fill="#ffffff">コンパイル → ACIR</text><g fill="#192734" stroke="#7dd3fc"><rect x="393" y="32" width="190" height="57" rx="10"/></g><g transform="translate(425 40) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M9 7h6m-6 4h6m-6 5 2 2 4-4"/></g><text x="500" y="55" text-anchor="middle" style="font-size:13px" fill="#ffffff">Barretenberg</text><text x="488" y="75" text-anchor="middle" style="font-size:10px" fill="#ffffff">VK・Verifierを生成</text><g fill="#192734" stroke="#7dd3fc"><rect x="712" y="32" width="178" height="57" rx="0"/><rect x="716" y="36" width="170" height="49"/></g><g transform="translate(753 40) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></g><text x="811" y="55" text-anchor="middle" style="font-size:13px" fill="#ffffff">Verifier</text><text x="801" y="75" text-anchor="middle" style="font-size:10px" fill="#ffffff">オンチェーンに配置</text><path d="M110 62 H165" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="137.5" y="54" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">回路</text><path d="M330 62 H393" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="361.5" y="54" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">ACIR</text><path d="M583 62 H712" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="647.5" y="54" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">開発者がデプロイ</text><text x="370" y="108" text-anchor="middle" style="font-size:11px" fill="#ffffff">ACIRを証明バックエンドにも配置</text><path d="M0 119 H892" stroke="#405366"/><g transform="translate(0 8)"><text x="0" y="139" text-anchor="start" style="font-size:13px" fill="#ffffff">② 設定時：ポリシーを登録</text><g transform="translate(0 158) scale(1.0833333333333333)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g><text x="64" y="176" text-anchor="middle" style="font-size:13px" fill="#ffffff">Owner</text><text x="64" y="196" text-anchor="middle" style="font-size:10px" fill="#ffffff">ルールを設定</text><g fill="#192734" stroke="#7dd3fc"><rect x="192" y="153" width="205" height="57" rx="10"/></g><g transform="translate(222 161) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g><text x="306" y="176" text-anchor="middle" style="font-size:13px" fill="#ffffff">ポリシーレイヤー</text><text x="294.5" y="196" text-anchor="middle" style="font-size:10px" fill="#ffffff">Poseidon2でハッシュ化</text><g transform="translate(489 158) scale(1.0833333333333333)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g><text x="556.5" y="176" text-anchor="middle" style="font-size:13px" fill="#ffffff">Owner</text><text x="556.5" y="196" text-anchor="middle" style="font-size:10px" fill="#ffffff">登録Txに署名</text><g fill="#192734" stroke="#7dd3fc"><rect x="712" y="153" width="178" height="57" rx="0"/><rect x="716" y="157" width="170" height="49"/></g><g transform="translate(735 161) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 12h5v5h-5a2.5 2.5 0 0 1 0-5z"/></g><text x="812" y="176" text-anchor="middle" style="font-size:13px" fill="#ffffff">Smart Account</text><text x="801" y="196" text-anchor="middle" style="font-size:10px" fill="#ffffff">commitmentを保存</text><path d="M110 183 H192" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="151" y="175" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">ポリシー</text><path d="M397 183 H489" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="443" y="175" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">commitment</text><path d="M606 183 H712" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="659" y="175" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">登録Tx</text><text x="295" y="229" text-anchor="middle" style="font-size:11px" fill="#ffffff">ポリシー + salt を秘密に保持</text></g><path d="M0 251 H892" stroke="#405366"/><g transform="translate(0 20)"><text x="0" y="262" text-anchor="start" style="font-size:13px" fill="#ffffff">③ 送金時：証明して実行</text><g transform="translate(0 287) scale(1.0833333333333333)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></g><text x="47" y="305" text-anchor="middle" style="font-size:13px" fill="#ffffff">人</text><text x="47" y="325" text-anchor="middle" style="font-size:10px" fill="#ffffff">送金指示</text><g fill="#192734" stroke="#7dd3fc"><rect x="123" y="282" width="87" height="57" rx="10"/></g><g transform="translate(143 290) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="11" rx="3"/><circle cx="9.5" cy="13.5" r="1.2" fill="#7dd3fc" stroke="none"/><circle cx="14.5" cy="13.5" r="1.2" fill="#7dd3fc" stroke="none"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1.2"/></g><text x="180" y="305" text-anchor="middle" style="font-size:13px" fill="#ffffff">AI</text><text x="166.5" y="325" text-anchor="middle" style="font-size:10px" fill="#ffffff">ツール呼出し</text><g fill="#192734" stroke="#7dd3fc"><rect x="277" y="282" width="213" height="57" rx="10"/></g><g transform="translate(300 290) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g><text x="395" y="305" text-anchor="middle" style="font-size:13px" fill="#ffffff">MCP / Prover</text><text x="383.5" y="325" text-anchor="middle" style="font-size:10px" fill="#ffffff">Barretenbergでproofを生成</text><g fill="#192734" stroke="#7dd3fc"><rect x="562" y="282" width="152" height="57" rx="0"/><rect x="566" y="286" width="144" height="49"/></g><g transform="translate(574 290) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 12h5v5h-5a2.5 2.5 0 0 1 0-5z"/></g><text x="649" y="305" text-anchor="middle" style="font-size:13px" fill="#ffffff">Smart Account</text><text x="638" y="325" text-anchor="middle" style="font-size:10px" fill="#ffffff">送金から公開入力を構成</text><g fill="#192734" stroke="#7dd3fc"><rect x="795" y="282" width="95" height="57" rx="0"/><rect x="799" y="286" width="87" height="49"/></g><g transform="translate(801 290) scale(0.75)" fill="none" stroke="#7dd3fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></g><text x="852" y="305" text-anchor="middle" style="font-size:13px" fill="#ffffff">Verifier</text><text x="842.5" y="325" text-anchor="middle" style="font-size:10px" fill="#ffffff">proofを検証</text><path d="M76 312 H123" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="99.5" y="304" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">指示</text><path d="M210 312 H277" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="243.5" y="304" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">金額・宛先</text><path d="M490 312 H562" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="526" y="304" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">proof・送金</text><path d="M714 302 H795" stroke="#7dd3fc" fill="none" marker-end="url(#zk-three-arrow)"/><text x="754.5" y="294" text-anchor="middle" style="font-size:10px;font-weight:500" fill="#ffffff">proof・公開入力</text><path d="M795 328 H714" stroke="#7dd3fc" marker-end="url(#zk-three-arrow)"/><text x="754" y="345" text-anchor="middle" style="font-size:10px" fill="#ffffff">検証結果</text><text x="383" y="357" text-anchor="middle" style="font-size:10px" fill="#ffffff">回路・ポリシー・利用状態から証明</text><text x="638" y="369" text-anchor="middle" style="font-size:12px" fill="#ffffff">成功 → 送金</text></g><text x="446" y="396" text-anchor="middle" style="font-size:10px" fill="#ffffff"></text></g></svg>
</div>

<!--
目安：90秒。
最初は開発時の段を説明します。Noir回路からACIRを作り、Barretenbergで検証鍵とVerifierのSolidityコードを生成してデプロイします。同じACIRを証明バックエンドにも配置します。Verifierの参照先をSmart Accountに設定する初期準備は図では省略しています。
ポリシー設定時の段を表示します。人が設定し、オフチェーンで生成したcommitmentの登録Txに署名します。秘密のポリシーとsaltはバックエンドに保存します。
送金時の段を表示します。AIは人の送金指示を解釈してMCPを呼び、送金結果を受け取ります。ポリシーやproof、秘密鍵はAIに返しません。バックエンドは現在のオンチェーン状態を取得して証明します。
事前にポリシーとsaltからcommitmentを作り、コントラクトに登録します。
送金時は、秘密のポリシーと今回の送金内容・利用状態を使って、BarretenbergがUltraHonkのproofを生成します。条件はNoirで定義しています。
証明するのは、ポリシーが登録済みcommitmentと一致することと、今回の送金がそのポリシーを満たすことの両方です。
コントラクト側で実行する金額、送金先、日次利用額などから公開入力を構築して検証します。証明後に金額を変えると検証に失敗します。
開発時はNoirをACIRへコンパイルし、Barretenbergで検証用コントラクトを生成します。図は実行時の経路です。
現在時刻に対する有効性はAccount側でも検査します。ZKはOwner署名を置き換えません。
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
# 人間が境界を決め、
# エージェントがその内側で自律する。

<div>
秘密のポリシーは誰にも渡らない。<br>エージェントに渡るのは、条件を満たしたという証明だけ。
</div>
