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

<div class="grid grid-cols-4 gap-3 pt-3 text-sm">
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">1回あたり上限</div>
    <div class="font-semibold">asset別に設定</div>
    <div class="text-xs opacity-60">native / Tokenごとに別の上限</div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">有効期限</div>
    <div class="font-semibold">issuedAt 〜 validUntil</div>
    <div class="text-xs opacity-60">窓の長さ自体を秘密に持つ</div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">allowlist</div>
    <div class="font-semibold">送金先 / Token / Contract</div>
    <div class="text-xs opacity-60">最大 16 / 8 / 16 件</div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">日次累積上限</div>
    <div class="font-semibold">UTC 1日・asset別</div>
    <div class="text-xs opacity-60">実支出をAccountが計上</div>
  </div>
</div>

<div class="grid grid-cols-2 gap-4 pt-4 text-sm">
  <div>
    <div class="text-xs opacity-60 font-mono pb-1">対応する決済</div>
    native送金 / ERC-20転送 / Contractのinvoice決済（<code>pay(bytes32)</code>）の3種別
  </div>
  <div>
    <div class="text-xs opacity-60 font-mono pb-1">エージェントへの入口</div>
    MCPの3 Tool — <code>pay_native</code> / <code>pay_erc20</code> / <code>pay_contract</code>
  </div>
</div>

<div class="text-sm opacity-70 pt-4">
条件はORや優先順位を持たず、すべてANDで単一のCommitmentに合成する。どの条件で通ったかが観測から推測できないようにするため。
</div>

<!--
複数条件は「1つのPolicyに含まれる複数条件のAND」と定義した（ADR-0012）。
ORや優先順位を入れると、どの条件で通ったかが観測から推測できてしまう。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — 目的</div>

# ガードレールが「読める場所」にある限り、越えられる

エージェントに財布を持たせられない理由は、資金の大きさではなくルールの置き場所にある。

<div class="grid grid-cols-2 gap-6 pt-3">

<div class="border rounded p-4 opacity-80">
<div class="text-xs uppercase tracking-wider opacity-60 font-mono pb-2">従来のガードレール</div>

- ルールが**プロンプトやアプリコード**の中にある
- エージェント自身がルールの中身を読める
- Prompt Injectionや実装バグで迂回の余地が残る
- 都度の人間承認に戻すと、自律性そのものが失われる

</div>

<div class="border rounded p-4" style="border-color:#1288ab">
<div class="text-xs uppercase tracking-wider font-mono pb-2" style="color:#1288ab">ZK Policyのガードレール</div>

- ルールは**Off-chainの秘密**のまま保持する
- エージェントにもオンチェーンにも中身を見せない
- 「条件を満たした」ことだけをZK Proofで証明する
- 検証はEVM上で完結し、第三者の判定を挟まない

</div>

</div>

<div class="border rounded p-3 mt-5 text-sm">
<b>信頼の置き場所を変える。</b> エージェントを信頼して守らせるのではなく、エージェントが何を提案してもAccountが実行しない構造にする。境界は「守るべきルール」ではなく<b>「実行できない領域」</b>になる。
</div>

<!--
ここが目的の核心。
守らせるのではなく、実行できなくする。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">サービス — アーキテクチャ</div>

# 送金の依頼から、証明・検証・実行まで

秘密PolicyはProver側に留まり、AIモデルには決済結果だけを返す。

<div class="policy-diagram architecture" role="img" aria-label="AIモデルがMCPへ決済を依頼し、ClientがProverから証明を取得する。Clientは証明付きUserOperationを送信し、Accountが検証後に支出を計上して送金する。">
  <div class="model-flow"><b>Claude Code / Codex</b><span>① 決済を依頼 ↓</span><span>↑ ⑥ 公開receipt</span><small>モデルのcontextに秘密・鍵・proofを出さない</small></div>
  <div class="architecture-grid">
    <div class="diagram-node client-node"><div class="diagram-label">エージェント実行環境</div><b>MCP / Payment Client</b><small>pay_native / pay_erc20 / pay_contract</small><div class="node-detail">Proofを取得・照合<br>Owner KeyでUserOperationに署名</div></div>
    <div class="round-trip"><div class="diagram-arrow">② 決済内容で証明依頼<span>→</span></div><div class="diagram-arrow arrow-back">③ proof + 公開入力<span>←</span></div></div>
    <div class="diagram-node secret-node"><div class="diagram-label">秘密を扱うOff-chain環境</div><b>Policy API / Prover</b><small>Noir + Barretenberg</small><div class="node-detail">Ownerが設定した秘密Policy<br>上限・allowlist・dailyLimit・salt</div></div>
  </div>
  <div class="submission-flow"><span>④ 決済内容 + proofを送信</span><span class="flow-line">↓</span><small>Owner署名付きUserOperation / Bundler（Alto）/ EntryPoint v0.8</small></div>
  <div class="execution-flow public-node"><div><div class="diagram-label">On-chain</div><b>ZkPolicyAccount</b><small>実行引数と実状態から<br>15個の公開入力を再構築</small></div><span class="flow-symbol">→</span><div><b>Verifier</b><small>⑤ Proofを検証<br>失敗なら実行を拒否</small></div><span class="flow-symbol">成功 →</span><div><b>支出を計上して送金</b><small>native / ERC-20 / Contract</small></div></div>
</div>

<!--
サービス全体で2分20秒。①から⑥までを追い、ClientとProverの往復を説明する。
OwnerはPolicy CLIからEIP-712署名とnonceでPolicyを設定し、CommitmentをAccountへ登録する（設定経路は図から省略）。
Policy APIはAES-256-GCMで保存したPolicyを復号し、秘密入力としてProverに渡す。
Owner KeyとProof TokenはHostからClient内部に渡す。モデルには渡さない（ADR-0011）。
③の公開入力はClientが照合するが、Accountは実行引数・オンチェーン状態から自分で再構築する。
⑥は成功時の公開receipt。失敗時も秘密値・proofを含まない結果を返す。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — 証明と決済の結びつき</div>

# 秘密の条件を証明し、実際の決済で検証する

同じproofでも、送金額・送金先・累積支出が変われば検証は通らない。

<div class="policy-diagram proof-diagram" role="img" aria-label="秘密Policy65要素と公開入力15要素からProofを生成する。Accountは実際の決済とオンチェーン状態から公開入力を再構築し、同じProofをVerifierで検証する。">
  <div class="proof-row"><div class="proof-source secret-node"><div class="diagram-label">Off-chain / 秘密入力65要素</div><b>秘密Policy + salt</b><small>上限・allowlist・日次上限・有効期間</small></div><span class="flow-symbol">→</span><div class="proof-check"><b>Circuit / Prover</b><small>全条件のANDを証明<br>Commitmentの一致も確認</small></div><span class="flow-symbol">→</span><div class="proof-result"><b>Proof</b><small>条件を満たす証明</small></div></div>
  <div class="proof-bridge"><span>＋ 決済内容・公開状態（15要素）</span><span class="proof-transfer">同じproofをVerifierへ</span></div>
  <div class="proof-row"><div class="proof-source public-node"><div class="diagram-label">On-chain / 公開入力15要素</div><b>Accountが再構築</b><small>実際の決済内容 + 登録Commitment<br>chainId・account・当日の累積支出など</small></div><span class="flow-symbol">→</span><div class="proof-check"><b>Verifier</b><small>Proofと再構築した入力で検証<br>不一致なら実行を拒否</small></div><span class="flow-symbol">→</span><div class="proof-result"><b>計上・送金</b><small>検証成功時だけ実行</small></div></div>
</div>

<div class="binding-example"><b>送金額を改ざんした例</b><span>Proof生成時 <strong>0.01 ETH</strong></span><span>≠</span><span>実行時 <strong>1 ETH</strong></span><span class="stop-text">× 検証失敗</span></div>
<div class="diagram-caption">Policyの固定：<code>policyCommitment = Poseidon2(policy_fields[65])</code>。秘密のsaltも含める。</div>

<!--
ここは1分。上段は秘密の条件を満たす証明を作る処理、下段はその証明を実際の決済に結びつける処理。
Clientから受け取る決済引数とproofを使い、Accountが公開入力を構築する。ClientのpublicInputs配列は受け取らない。
回路の全条件：allowlist照合、asset別amount <= maxAmount、spentBefore + amount <= dailyLimit、validUntil - issuedAt <= maxValiditySeconds、Commitment一致。
有効化されたallowlistの要素一致はOR集約するが、Policyの条件間はAND。昇順・重複なしをltで強制する。
Policy索引：s[1] maxValiditySeconds、s[4..19] recipients[16]、s[21..44] assets[8]×(asset,maxAmount,dailyLimit)、s[47..62] contracts[16]、s[64] salt。
公開入力索引：0 schemaVersion、1 chainId、2 account、3 policyCommitment、4 kind、5 recipient、6 asset、7 amount、8 target、9–10 invoiceId、11 issuedAt、12 validUntil、13 dayId、14 spentBefore。
Accountはblock.timestampで期限を確認し、検証後にdailySpendを更新してから外部送金する。現在の累積支出が変われば古い公開入力のproofは使えない。
上限額は候補が少ないため、Commitmentに秘密のsaltを含めて総当たりでの推測を困難にする。
正本：docs/adr/adr-0012-composite-policy-schema.md、docs/adr/adr-0014-onchain-daily-spend.md、contracts/src/ZkPolicyAccount.sol。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">デモ — 正常系・異常系</div>

# 送金が進む経路と、止まる場所

説明用の設定：1回上限 0.1 ETH。許可済み送金先を使い、ほかの条件は充足。

<div class="policy-diagram outcome-diagram" role="img" aria-label="正常な0.01 ETHは証明生成とAccount検証を経て送金する。1 ETHの上限超過は証明生成で停止する。証明後に金額を変更するとAccount検証で停止する。">
  <div class="outcome-heading"><span>決済の提案</span><span></span><span>Off-chain / Proof生成</span><span></span><span>On-chain / Account検証</span><span></span><span>送金結果</span></div>
  <div class="outcome-row"><div><b>正常</b><small>0.01 ETH</small></div><span class="flow-symbol">→</span><div class="pass-stage">✓ 生成成功</div><span class="flow-symbol">→</span><div class="pass-stage">✓ 検証成功</div><span class="flow-symbol">→</span><div><b class="pass-text">0.01 ETH送金</b><small>累積 0 → 0.01 ETH</small></div></div>
  <div class="outcome-row"><div><b>上限超過</b><small>1 ETH</small></div><span class="flow-symbol">→</span><div class="stop-stage">× 証明できない<small>上限条件を満たさない</small></div><span></span><div class="inactive-stage">未送信</div><span></span><div><b>送金なし</b><small>残高変化なし</small></div></div>
  <div class="outcome-row"><div><b>証明後の改ざん</b><small>0.01 ETHで依頼</small></div><span class="flow-symbol">→</span><div class="pass-stage">✓ 生成成功</div><div class="tamper-step">1 ETHへ変更<span>→</span></div><div class="stop-stage">× 検証失敗<small>証明と実行内容が不一致</small></div><span></span><div><b>送金なし</b><small>Accountが拒否</small></div></div>
</div>

<div class="diagram-caption">3行目はtransaction bindingの防御を示す模式図。包括的な攻撃検証は今後の対象。</div>
<div class="demo-summary"><b>Agent経由でも同じ経路</b><span>MCPが証明生成と送信を担い、モデルには秘密・proofを含まない結果を返す。</span></div>

<!--
デモは50秒。正常系の送金と上限超過で止まる場所を見せ、改ざんは模式図として説明する。
正常系の実行コマンド：pnpm local:payment。上限超過：pnpm local:payment --value 1。
上限や理由を説明するラベルは発表用。秘密Policyや制約の詳細をAgentのresponseに返すことを意味しない。
3行目は期待するtransaction bindingの動作を図示したもの。今回新たに攻撃シナリオを実行したという意味ではない。
補足の正常系：nativeとContractは同じ日次枠で.03 + .02 + .01 = .06 ETH。ERC-20はToken address別に10 + 20 = 30。Policy更新でallowlistから外して戻しても当日の実績を引き継ぐ。
既存のaudit-06記録：Proof生成936ms（単発実測）、Circuit 11、Contract 39、unit 103、local E2E 27、実Claude 2・実Codex 5。合計187件。今回のスライド変更で再計測した数値ではない。
正本：docs/audits/epic-06-multi-policy.md、docs/security/threat-model.md。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">将来像</div>

# PoCから、エージェントウォレット基盤へ

<div style="display:flex;flex-direction:column;margin-top:0.6rem;">
  <div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid rgba(127,127,127,.25);">
    <div style="flex:0 0 66px;font-family:monospace;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#2c8a5c;padding-top:3px;">現在</div>
    <div><b>ETH Globalで複数ポリシー対応まで完了</b><br><span class="opacity-60 text-sm">有効期限・送金先allowlist・Token/Contract allowlist・日次累積上限を、native / ERC-20 / Contract決済で実Agentまで通した</span></div>
  </div>
  <div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid rgba(127,127,127,.25);">
    <div style="flex:0 0 66px;font-family:monospace;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;opacity:.55;padding-top:3px;">Next</div>
    <div><b>攻撃・異常系の包括検証</b><br><span class="opacity-60 text-sm">Prompt Injection由来の不正な送金提案が、オンチェーンで確実に拒否されることを攻撃側の試行として測る</span></div>
  </div>
  <div style="display:flex;gap:16px;padding:10px 0;">
    <div style="flex:0 0 66px;font-family:monospace;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;opacity:.55;padding-top:3px;">Later</div>
    <div><b>複数チェーン・複数Agent対応</b><br><span class="opacity-60 text-sm">同じ秘密ポリシーの境界を、複数チェーン・複数エージェントで共有できる基盤にする</span></div>
  </div>
</div>

<div class="grid grid-cols-2 gap-4 pt-3 text-sm">
  <div class="border rounded p-3">
    <b>明示している限界</b><br>
    <span class="opacity-70">amount・recipient・dayId・spentBeforeは公開される。観測されたamountから上限の<b>下限</b>は推測できる。</span>
  </div>
  <div class="border rounded p-3">
    <b>既知の制約</b><br>
    <span class="opacity-70">固定長allowlist（16 / 8 / 16）、資産間の換算をしないこと、逐次実行前提で同時送信を扱わないこと。</span>
  </div>
</div>

<div class="border rounded p-4 mt-4">
<b>Vision —</b> モデルに鍵を見せず、実行Clientが証明を取得する。人間が境界を決め、エージェントがその内側で自律する。そんなウォレットレイヤーを目指す。
</div>

<!--
時間が押していたらこのスライドは飛ばしてクロージングへ。
-->

---
layout: center
class: text-left
---

# 人間が境界を決め、エージェントがその内側で自律する。

秘密のポリシーはOwner／Prover側に留まり、Smart Accountが証明を検証して決済する。

<div class="pt-8 text-sm font-mono opacity-60">
GitHub: Komlock-lab / zk-policy-poc<br>
設計判断は docs/adr/ ・ 脅威モデルは docs/security/threat-model.md
</div>
