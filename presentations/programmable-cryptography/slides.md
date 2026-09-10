---
theme: default
title: ZK Policy — Cryptography & Demo
info: Composite policy implementation 5285f00
colorSchema: dark
canvasWidth: 980
aspectRatio: 16/9
fonts:
  sans: "Hiragino Sans"
  mono: "Menlo"
  provider: none
transition: fade
mdc: false
layout: none
defaults:
  layout: none
---

<section class="slide">
<div class="eyebrow">PROGRAMMABLE CRYPTOGRAPHY · 01</div>
<h1>ポリシーを公開せず、<br>送金が条件を満たすことを証明する</h1>
<div class="two privacy">
<article class="card"><header>PRIVATE POLICY <span class="purple">非公開</span></header><div class="body"><p>・秘密のポリシー<br>（企業の予算、送金先ホワイトリスト）</p></div></article>
<article class="card"><header>PUBLIC INPUTS + PROOF <span class="gold">公開</span></header><div class="body"><p>・送金額・送金先などの実行内容<br>・登録済みcommitment・利用状態<br>・UltraHonk proof</p></div></article>
</div>
<div class="takeaway">検証するのは <strong>「登録したポリシーに、この送金が適合する」</strong>こと。</div>
<div class="foot">非公開＝AI、ブロックチェーンを閲覧できる第三者<span>01 / 04</span></div>
</section>

<!--
目安：50秒。
AIに送金を任せても、1回の上限、1日の利用上限、送金先など、守らせたいルールがあります。
今回はルール自体をオンチェーンに公開せず、今回の送金がルールを満たすことをZKで証明します。
コントラクトはサーバーからの「チェック済み」を信用する必要がなく、proofを検証して送金を実行できます。
隠しているのはポリシーの中身です。送金額や送金先は公開されます。現在のバックエンドは秘密のポリシーを扱います。
実装根拠：5285f00 packages/policy/src/schema.ts、circuits/spend-limit/src/main.nr。複合ポリシー実装を対象にしており、mainの旧回路とは区別する。
-->

---

<section class="slide">
<div class="eyebrow">PROGRAMMABLE CRYPTOGRAPHY · 02</div>
<h1>ZKシーケンス</h1>
<svg viewBox="0 0 892 400" width="892" height="400" role="img" aria-label="開発時、ポリシー設定時、送金時の3段階を左から右へ読むZKアーキテクチャ"><defs><marker id="zk-three-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill="#dfbd72"/></marker></defs><g style="font-family:Hiragino Sans,sans-serif" stroke-width="1.4"><text x="117" y="15" text-anchor="middle" style="font-size:13px" fill="#bca3f4">① 開発時：証明・検証の仕組みを用意</text><g fill="#251f30" stroke="#bca3f4"><circle cx="12" cy="44" r="7"/><path d="M12 51 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="64" y="55" text-anchor="middle" style="font-size:14px" fill="#efedf4">開発者</text><text x="64" y="75" text-anchor="middle" style="font-size:10px" fill="#c8b9da">条件を記述</text><g fill="#251f30" stroke="#bca3f4"><rect x="165" y="32" width="165" height="57" rx="10"/></g><text x="247.5" y="55" text-anchor="middle" style="font-size:14px" fill="#efedf4">Noir回路</text><text x="247.5" y="75" text-anchor="middle" style="font-size:10px" fill="#c8b9da">コンパイル → ACIR</text><g fill="#251f30" stroke="#bca3f4"><rect x="393" y="32" width="190" height="57" rx="10"/></g><text x="488" y="55" text-anchor="middle" style="font-size:14px" fill="#efedf4">Barretenberg</text><text x="488" y="75" text-anchor="middle" style="font-size:10px" fill="#c8b9da">UltraHonkのVK・Solidity生成</text><g fill="#251f30" stroke="#dfbd72"><rect x="712" y="32" width="178" height="57" rx="0"/><rect x="716" y="36" width="170" height="49"/></g><text x="801" y="55" text-anchor="middle" style="font-size:14px" fill="#efedf4">Verifier</text><text x="801" y="75" text-anchor="middle" style="font-size:10px" fill="#c8b9da">オンチェーンに配置</text><path d="M110 62 H165" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="137.5" y="54" text-anchor="middle" style="font-size:9px" fill="#dfbd72">回路</text><path d="M330 62 H393" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="361.5" y="54" text-anchor="middle" style="font-size:9px" fill="#dfbd72">ACIR</text><path d="M583 62 H712" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="647.5" y="54" text-anchor="middle" style="font-size:9px" fill="#dfbd72">開発者がデプロイ</text><text x="370" y="108" text-anchor="middle" style="font-size:11px" fill="#c8b9da">ACIRを証明バックエンドにも配置</text><path d="M0 119 H892" stroke="#403749"/><g v-click="1"><text x="122" y="139" text-anchor="middle" style="font-size:13px" fill="#bca3f4">② ポリシー設定時：ルールを固定</text><g fill="#251f30" stroke="#bca3f4"><circle cx="12" cy="165" r="7"/><path d="M12 172 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="64" y="176" text-anchor="middle" style="font-size:14px" fill="#efedf4">人（Owner）</text><text x="64" y="196" text-anchor="middle" style="font-size:10px" fill="#c8b9da">ルールを設定</text><g fill="#251f30" stroke="#bca3f4"><rect x="192" y="153" width="205" height="57" rx="10"/></g><text x="294.5" y="176" text-anchor="middle" style="font-size:14px" fill="#efedf4">ポリシーレイヤー</text><text x="294.5" y="196" text-anchor="middle" style="font-size:10px" fill="#c8b9da">Poseidon2でcommitment生成</text><g fill="#251f30" stroke="#bca3f4"><circle cx="501" cy="165" r="7"/><path d="M501 172 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="556.5" y="176" text-anchor="middle" style="font-size:14px" fill="#efedf4">人（Owner）</text><text x="556.5" y="196" text-anchor="middle" style="font-size:10px" fill="#c8b9da">登録Txに署名</text><g fill="#251f30" stroke="#dfbd72"><rect x="712" y="153" width="178" height="57" rx="0"/><rect x="716" y="157" width="170" height="49"/></g><text x="801" y="176" text-anchor="middle" style="font-size:14px" fill="#efedf4">Smart Account</text><text x="801" y="196" text-anchor="middle" style="font-size:10px" fill="#c8b9da">commitmentを保存</text><path d="M110 183 H192" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="151" y="175" text-anchor="middle" style="font-size:9px" fill="#dfbd72">ポリシー</text><path d="M397 183 H489" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="443" y="175" text-anchor="middle" style="font-size:9px" fill="#dfbd72">commitment</text><path d="M606 183 H712" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="659" y="175" text-anchor="middle" style="font-size:9px" fill="#dfbd72">登録Tx</text><text x="295" y="229" text-anchor="middle" style="font-size:11px" fill="#c8b9da">秘密のポリシー + salt をバックエンドに保存</text></g><path d="M0 241 H892" stroke="#403749"/><g v-click="2"><text x="111" y="262" text-anchor="middle" style="font-size:13px" fill="#bca3f4">③ 送金時：適合を証明して実行</text><g fill="#251f30" stroke="#bca3f4"><circle cx="12" cy="294" r="7"/><path d="M12 301 v20 m-10 -12 h20 m-10 12 l-8 12 m8 -12 l8 12" fill="none"/></g><text x="47" y="305" text-anchor="middle" style="font-size:14px" fill="#efedf4">人</text><text x="47" y="325" text-anchor="middle" style="font-size:10px" fill="#c8b9da">送金指示</text><g fill="#251f30" stroke="#bca3f4"><rect x="123" y="282" width="87" height="57" rx="10"/></g><text x="166.5" y="305" text-anchor="middle" style="font-size:14px" fill="#efedf4">AI</text><text x="166.5" y="325" text-anchor="middle" style="font-size:10px" fill="#c8b9da">ツール呼出し</text><g fill="#251f30" stroke="#bca3f4"><rect x="277" y="282" width="213" height="57" rx="10"/></g><text x="383.5" y="305" text-anchor="middle" style="font-size:14px" fill="#efedf4">ポリシーレイヤー MCP</text><text x="383.5" y="325" text-anchor="middle" style="font-size:10px" fill="#c8b9da">Barretenbergでproofを生成</text><g fill="#251f30" stroke="#dfbd72"><rect x="562" y="282" width="152" height="57" rx="0"/><rect x="566" y="286" width="144" height="49"/></g><text x="638" y="305" text-anchor="middle" style="font-size:14px" fill="#efedf4">Smart Account</text><text x="638" y="325" text-anchor="middle" style="font-size:10px" fill="#c8b9da">実行内容から公開入力を構成</text><g fill="#251f30" stroke="#dfbd72"><rect x="795" y="282" width="95" height="57" rx="0"/><rect x="799" y="286" width="87" height="49"/></g><text x="842.5" y="305" text-anchor="middle" style="font-size:14px" fill="#efedf4">Verifier</text><text x="842.5" y="325" text-anchor="middle" style="font-size:10px" fill="#c8b9da">proofを検証</text><path d="M76 312 H123" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="99.5" y="304" text-anchor="middle" style="font-size:9px" fill="#dfbd72">指示</text><path d="M210 312 H277" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="243.5" y="304" text-anchor="middle" style="font-size:9px" fill="#dfbd72">金額・宛先</text><path d="M490 312 H562" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="526" y="304" text-anchor="middle" style="font-size:9px" fill="#dfbd72">proof・送金</text><path d="M714 302 H795" stroke="#dfbd72" fill="none" marker-end="url(#zk-three-arrow)"/><text x="754.5" y="294" text-anchor="middle" style="font-size:9px" fill="#dfbd72">proof・公開入力</text><path d="M795 328 H714" stroke="#dfbd72" marker-end="url(#zk-three-arrow)"/><text x="754" y="345" text-anchor="middle" style="font-size:10px" fill="#dfbd72">検証結果</text><text x="383" y="357" text-anchor="middle" style="font-size:10px" fill="#c8b9da">入力：配置済み回路・秘密のポリシー・現在の状態</text><text x="638" y="369" text-anchor="middle" style="font-size:12px" fill="#dfbd72">成功 → 送金</text></g><text x="446" y="396" text-anchor="middle" style="font-size:10px" fill="#aaa2b6"></text></g></svg>
</section>

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

<section class="slide">
<div class="eyebrow">PROGRAMMABLE CRYPTOGRAPHY · 03</div>
<h1>commitmentは、ポリシー全体に結び付く</h1>
<div class="commit-layout"><div class="card fields">
<div><b>基本設定</b><span>schemaVersion・有効期間の上限</span></div>
<div><b>送金先制限</b><span>件数・許可アドレス</span></div>
<div><b>資産別ルール</b><span>件数・資産・1回の上限・1日の上限</span></div>
<div><b>呼出先制限</b><span>件数・許可コントラクト</span></div>
<div><b>日次制限 / salt</b><span>有効フラグ / 秘密のランダム値</span></div>
</div><div class="commit-result"><div class="purple">正規化・固定長化</div><div class="big">65 <small>Fields</small></div><div class="hash-arrow">↓ Poseidon2 ↓</div><div class="big gold">1 <small>commitment</small></div><p>オンチェーンに登録</p></div></div>
<div class="formula">policyCommitment = Poseidon2::hash(policyFields, 65)</div>
</section>

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

<section class="slide demo">
<div class="eyebrow">デモ（正常系・異常系） </div>
<h1>proofを作れても、<br>送金額を書き換えると通らない</h1>
<div class="policy-bar">共通ポリシー <strong>1回の送金上限 0.1 ETH</strong></div>
<div class="two demo-cards">
<article class="card"><header>正常系 <span class="green">0.1 ETH → 0.1 ETH</span></header><div class="body"><div class="prompt">「正常系デモを実行して。<br>デモ送金先に0.1 ETHを送って」</div><div class="tool-label">Claude Code → 正常系MCPツール</div><div class="steps"><div><span>PROVE</span>0.1 ETHでproof生成</div><div><span>SEND</span>0.1 ETHで送金を実行</div><div class="green"><span>VERIFY</span>検証成功 → 送金先 +0.1 ETH</div></div></div></article>
<article class="card"><header>異常系 <span class="red">0.1 ETH → 0.2 ETH</span></header><div class="body"><div class="prompt">「異常系デモを実行して。0.1 ETHの<br>proofで0.2 ETHを送り、拒否を確認して」</div><div class="tool-label">Claude Code → 異常系MCPツール</div><div class="steps"><div><span>PROVE</span>0.1 ETHでproof生成は成功</div><div><span>TAMPER</span>MCP内部で送金額を0.2 ETHに変更</div><div class="red"><span>VERIFY</span>検証失敗 → 送金先の残高変化なし</div></div></div></article>
</div>

</section>

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
