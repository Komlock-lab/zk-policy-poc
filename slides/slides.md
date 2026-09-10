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

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">Programmable Cryptography — 何を証明し、どう強制するか</div>

# 65個の秘密に対する充足を、15個の公開だけで示す

単に秘密を隠すのではなく、秘密のデータに対する計算そのものを検証可能にする。

<div class="grid grid-cols-2 gap-5 text-sm pt-1">

<div>
<div class="text-xs uppercase tracking-wider font-mono pb-1" style="color:#a8446b">policy_fields[65] — Circuitだけが見る</div>

| 位置 | 内容 |
| --- | --- |
| `s[1]` | maxValiditySeconds |
| `s[4..19]` | recipients[16]（昇順） |
| `s[21..44]` | assets[8] × (asset, maxAmount, dailyLimit) |
| `s[47..62]` | contracts[16]（昇順） |
| `s[64]` | **salt**（秘密乱数） |

<div class="text-xs pt-2">
<code>policyCommitment = Poseidon2(65個すべて)</code><br>
<span class="opacity-60">上限額は候補が少なく総当たりで復元できるため、saltをCommitmentに含めている。</span>
</div>
</div>

<div>
<div class="text-xs uppercase tracking-wider font-mono pb-1" style="color:#1288ab">public_inputs[15] — Verifierに渡る</div>

| Index | 内容 |
| --- | --- |
| `1-3` | chainId / account / **policyCommitment** |
| `4-6` | kind（native/ERC-20/contract）/ recipient / asset |
| `7-8` | amount / target |
| `9-10` | invoiceId（上位・下位128bit） |
| `11-14` | issuedAt / validUntil / dayId / spentBefore |

<div class="text-xs pt-2">
<b>決済の全構成要素が公開入力に入る。</b><br>
<span class="opacity-60">1つでも変えるとProofは通らない（transaction binding）。</span>
</div>
</div>

</div>

<div class="grid grid-cols-2 gap-5 text-sm pt-3">

<div>
<div class="text-xs uppercase tracking-wider opacity-60 font-mono pb-1">回路が証明すること — すべてAND</div>

- **allowlist照合** — 有効長だけをOR集約。昇順・重複なしを`lt`で強制
- **asset別1回上限** — 公開`asset`と一致する行でのみ`amount <= maxAmount`
- **日次累積** — `spentBefore + amount <= dailyLimit`
- **有効期限** — `validUntil - issuedAt <= maxValiditySeconds`
- **Commitment照合** — `Poseidon2::hash(s, 65) == p[3]`

</div>

<div>
<div class="text-xs uppercase tracking-wider opacity-60 font-mono pb-1">Accountが強制すること</div>

```solidity
publicInputs[1]  = block.chainid;
publicInputs[3]  = policyCommitment;
publicInputs[14] = spentBefore;
if (!verifier.verify(proof, publicInputs))
    revert InvalidProof();
dailySpend[asset] = ... // 送金より前
```

<div class="text-xs opacity-70 pt-1">
Clientが渡すのは<b>proofだけ</b>。実行のたびに<code>spentBefore</code>が進むため、<b>同じproofは二度通らない</b>。
</div>
</div>

</div>

<div class="grid grid-cols-3 gap-3 pt-3 text-sm">
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">非開示</div>
    ポリシーの内容はエージェントにも第三者にも露出しない
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">検証者不要</div>
    オンチェーンで第三者の判定を挟まずに検証が完結する
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono pb-1">リプレイ耐性</div>
    <code>spentBefore</code>の更新により同じProofは二度と通らない
  </div>
</div>

<!--
ここが1分。
「Proofが正しい」ことと「そのProofがこの決済のものである」ことは別の問題で、
後者はAccountが公開入力を自分で組み立てることでしか保証できない。
-->

---

<div class="text-xs tracking-widest uppercase opacity-50 font-mono">デモ — 正常系・異常系</div>

# 境界は「Proofが作れない」段階で閉じる

<div class="grid grid-cols-2 gap-4 pt-2">

```bash
# 正常系
$ pnpm local:payment
policy  : maxAmount = 0.1 ETH (secret)
payment : 0.01 ETH -> allowed recipient
✔ proof generated  (15 public inputs)
✔ verifier: valid
✔ dailySpend: 0 -> 0.01 ETH
✔ balance +0.01 ETH
```

```bash
# 異常系
$ pnpm local:payment --value 1
policy  : maxAmount = 0.1 ETH (secret)
payment : 1 ETH -> allowed recipient
✘ circuit constraint violated
  "value exceeds max amount"
✘ proof not generated
→ transaction未送信・残高変化なし
```

</div>

<div class="grid grid-cols-3 gap-3 pt-4 text-sm">
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono">native + Contract決済</div>
    <div>同じ日次枠を共有。.03 + .02 + .01 ETH で累積 .06 ETH</div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono">ERC-20</div>
    <div>Token address別に計上。10 + 20 = 30、nativeの累積は不変</div>
  </div>
  <div class="border rounded p-3">
    <div class="text-xs opacity-60 font-mono">Policy更新</div>
    <div>allowlistから外して戻しても当日の実績を引き継ぐ</div>
  </div>
</div>

<div class="border rounded p-3 mt-4 text-sm">
<b>失敗の理由は返らない。</b> Proof生成の失敗は「拒否された」ではなく「証明できない」。攻撃者から見て、なぜ通らなかったかが観測できない。
</div>

<div class="border rounded p-3 mt-3 text-sm">
エージェント経由でも同じ動きになる。自然言語の依頼から<code>pay_native</code> / <code>pay_erc20</code> / <code>pay_contract</code>が呼ばれ、返るのは<b>receiptだけ</b>。証明生成は<span class="font-mono">936ms</span>、テストは<span class="font-mono">187本</span>すべてpass。
</div>

<!--
デモ全体でここまで5分。上限超過はUserOperationを送る前に止まるので、
オンチェーンには何も残らないことを見せる。
エージェント経由でも人間が直接叩いた場合と同じ境界が働く。
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
<b>Vision —</b> エージェントに鍵を渡さず、証明だけを渡す。人間が境界を決め、エージェントがその内側で自律する。そんなウォレットレイヤーを目指す。
</div>

<!--
時間が押していたらこのスライドは飛ばしてクロージングへ。
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
