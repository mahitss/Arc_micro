package blockchain

import (
	"context"
	"math/big"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Client defines the interface for interacting with an EVM-compatible blockchain node.
type Client interface {
	ChainID(ctx context.Context) (*big.Int, error)
	BalanceAt(ctx context.Context, account common.Address) (*big.Int, error)
	PendingNonceAt(ctx context.Context, account common.Address) (uint64, error)
	SuggestGasPrice(ctx context.Context) (*big.Int, error)
	SuggestGasTipCap(ctx context.Context) (*big.Int, error)
	EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error)
	SendTransaction(ctx context.Context, tx *types.Transaction) error
	TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error)
	Close()
}

// EthClient is a concrete Client implementation wrapping go-ethereum's ethclient.Client.
type EthClient struct {
	client *ethclient.Client
}

// NewEthClient establishes a connection to the specified RPC URL.
func NewEthClient(rawURL string) (*EthClient, error) {
	c, err := ethclient.Dial(rawURL)
	if err != nil {
		return nil, &RPCError{Operation: "dial", Err: err}
	}
	return &EthClient{client: c}, nil
}

// ChainID returns the network chain ID.
func (c *EthClient) ChainID(ctx context.Context) (*big.Int, error) {
	id, err := c.client.ChainID(ctx)
	if err != nil {
		return nil, &RPCError{Operation: "ChainID", Err: err}
	}
	return id, nil
}

// BalanceAt returns the balance of an account at the latest block.
func (c *EthClient) BalanceAt(ctx context.Context, account common.Address) (*big.Int, error) {
	bal, err := c.client.BalanceAt(ctx, account, nil)
	if err != nil {
		return nil, &RPCError{Operation: "BalanceAt", Err: err}
	}
	return bal, nil
}

// PendingNonceAt returns the pending nonce for account transaction ordering.
func (c *EthClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	nonce, err := c.client.PendingNonceAt(ctx, account)
	if err != nil {
		return 0, &RPCError{Operation: "PendingNonceAt", Err: err}
	}
	return nonce, nil
}

// SuggestGasPrice returns the currently suggested gas price.
func (c *EthClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	price, err := c.client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, &RPCError{Operation: "SuggestGasPrice", Err: err}
	}
	return price, nil
}

// SuggestGasTipCap returns the suggested tip cap for EIP-1559 transactions.
func (c *EthClient) SuggestGasTipCap(ctx context.Context) (*big.Int, error) {
	tip, err := c.client.SuggestGasTipCap(ctx)
	if err != nil {
		return nil, &RPCError{Operation: "SuggestGasTipCap", Err: err}
	}
	return tip, nil
}

// EstimateGas estimates the gas required for a transaction call.
func (c *EthClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	gas, err := c.client.EstimateGas(ctx, msg)
	if err != nil {
		return 0, &RPCError{Operation: "EstimateGas", Err: err}
	}
	return gas, nil
}

// SendTransaction submits a signed transaction to the blockchain.
func (c *EthClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	if err := c.client.SendTransaction(ctx, tx); err != nil {
		return &RPCError{Operation: "SendTransaction", Err: err}
	}
	return nil
}

// TransactionReceipt retrieves the receipt of a mined transaction.
func (c *EthClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	receipt, err := c.client.TransactionReceipt(ctx, txHash)
	if err != nil {
		return nil, err
	}
	return receipt, nil
}

// Close closes the underlying RPC connection.
func (c *EthClient) Close() {
	if c.client != nil {
		c.client.Close()
	}
}
