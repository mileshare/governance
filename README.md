# @mileshare/governance

Forked from 
[https://github.com/Uniswap/governance](https://github.com/Uniswap/governance)

## How to deploy 

デプロイはCLIを利用します。

環境変数の `INFURA_PROJECT_ID`, `PRIVATE_KEY` を設定の上、下記コマンドでデプロイ可能です（ネットワークに応じて `--network` optionの変更が必要となります） 

詳細は [hardhatのドキュメント](https://hardhat.org/guides/deploying.html) をご参照ください。

### MileShare ($MILE) 

```
$ npx hardhat run --network [network] script/deploy-mileshare
```

### TreasuryVester

```
$ npx hardhat run --network [network] script/deploy-treasury-vester
```

## Verify 

デプロイしたコントラクトをverifyすることでetherscan/polygonscan上でコントラクトコードが可視化され、直接トランザクションを送ることが可能になります。

下記コマンドにてverifyが可能です。

### MileShare ($MILE)

```
$ npx hardhat verify --network [network] [deployed_contract_address] --constructor-args mileshare-arguments.js
```

### TreasuryVester

```
$ npx hardhat verify --network [network] [deployed_contract_address] --constructor-args script/treasury-vester-arguments.js
```
