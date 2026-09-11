# Security policy

`zk-policy-poc` は実験的な PoC であり、監査済みではありません。将来の release が明記しない限り、production funds の保護には使用しないでください。

## 脆弱性の報告

疑いのある脆弱性を public issue や pull request に書かないでください。GitHub の repository Security tab から private vulnerability reporting を使ってください。利用できない場合は、既存の信頼できる private channel で maintainer に連絡し、安全な報告経路だけを確立してください。

影響する revision、impact、再現手順、想定する mitigation を記載してください。実際の秘密鍵、secret、機微な policy data は絶対に含めないでください。

authorization bypass、proof/context binding error、replay、unsafe policy update、secret leakage、permissive failure は security-sensitive として扱います。
