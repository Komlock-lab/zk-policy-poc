---
id: adr-0015
type: adr
title: Owner管理のローカルRisk Scoreで条件適用を検証する
epic: epic-06
status: rejected
date: 2026-09-06
---

# Owner管理のローカルRisk Scoreで条件適用を検証する

## Context

ロードマップにはRisk Scoreの提供元・尺度が定義されていない。今回は外部サービスなしで条件を証明して決済する経路を完成させる提案とする。

## Decision

2026-09-06のユーザー指定「Risk Score不要」により不採用。Registry、score設定CLI、scoreの公開入力、秘密閾値を実装しない。

story-06-07、story-06-08、およびtask-06-07-01、task-06-07-02、task-06-08-01、task-06-08-02は計画から撤回した。これらのIDは再利用しない。

## Alternatives

Agentの自己申告scoreは評価元として不適切。外部サービスは有力な代替だが、提供元・料金・尺度・信頼モデルの選定が先に必要になる。Phase 6からRisk Scoreを外す案もあるが、ロードマップの5条件を検証できなくなる。

## Consequences

フェーズ6は期限・allowlist・日次累積支出の正常系に限定する。

## References

- [epic-06](../epics/epic-06-multi-policy.md)
- [既存Policy lifecycle](adr-0004-policy-lifecycle-and-commitment-update.md)
- [既存認可・秘密境界](adr-0011-autonomous-policy-authorization-and-secret-boundary.md)
- [公開・秘密入力](../../llm-wiki/wiki/concepts/noir-public-and-private-inputs.md)
- [ERC-4337決済境界](../../llm-wiki/wiki/concepts/erc-4337-zk-policy-payment.md)
