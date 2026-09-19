# AgentPay Contracts

Foundry project for the AgentPay smart contract suite on the Arc blockchain.

## Directory Layout

- `src/`: Solidity smart contracts (future `AgentVault` and spend controls).
- `test/`: Contract test suites.
- `script/`: Deployment and maintenance scripts.
- `foundry.toml`: Foundry configuration file.

## Prerequisites

- [Foundry](https://getfoundry.sh):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

## Usage

### Compile
```bash
forge build
```

### Test
```bash
forge test -vvv
```

## Security & Deployment Note

- No live private keys or mnemonic phrases must ever be stored in this directory.
- Arc Mainnet deployment and full `AgentVault` implementation will be conducted in a dedicated future task.
