# Screenshots

Place the four required submission screenshots in this folder:

| Filename | What to capture |
|---|---|
| `01-wallet-connected-balance.png` | Nav bar with wallet connected, XLM balance showing, green ping dot |
| `02-xlm-balance.png` | The `/xlm` page with live XLM balance and Send form |
| `03-referral-submitted.png` | Referrals page after submitting — Pending status + "View proof" tx link |
| `04-commission-claimed.png` | Commissions page after claiming — Settled status + tx hash |

### On-Chain Transaction Proof

Every action below is a real, signed Soroban contract invocation submitted to Stellar Testnet — verifiable on Stellar Expert.

| Action | Contract call | Stellar Expert |
|---|---|---|
| Referral submitted | `create_referral` | [2a0b36e0...dceee433](https://stellar.expert/explorer/testnet/tx/2a0b36e01ee3df64cdf6c6edd7a2dc0ba3639d1b3046607d68160ea7dceee433) |
| Referral approved (commission escrowed) | `approve_referral` | [5922d6b3...3675a0e52](https://stellar.expert/explorer/testnet/tx/5922d6b326cae83c2a46478c256974845345004401e4d65ceba598f3675a0e52) |
| Commission claimed | `claim_commission` | [015dcc6d...564ccaa141](https://stellar.expert/explorer/testnet/tx/015dcc6d7993b7e396145c6455486b84624f75f85c9207bb4c09cd564ccaa141) |

![create_referral on Stellar Expert](docs/screenshots/05-proof-create-referral.png)
![approve_referral on Stellar Expert](docs/screenshots/06-proof-approve-referral.png)
![claim_commission on Stellar Expert](docs/screenshots/07-proof-claim-commission.png)

A second, independent referral going through the same flow:

| Action | Contract call | Stellar Expert |
|---|---|---|
| Referral submitted | `create_referral` | [63b72989...bfb127eb](https://stellar.expert/explorer/testnet/tx/63b7298942d678142e4fdbafee49d7193895a01f02b139ca2bb84bc7bfb127eb) |
| Commission claimed | `claim_commission` | [bedc0678...d9d248f9](https://stellar.expert/explorer/testnet/tx/bedc067849446739665216afbd9f6599c38f5cf5ca3bc8336dbb2a33d9d248f9) |

![create_referral on Stellar Expert — second referral](docs/screenshots/08-proof-create-referral-2.png)
![claim_commission on Stellar Expert — second referral](docs/screenshots/09-proof-claim-commission-2.png)
