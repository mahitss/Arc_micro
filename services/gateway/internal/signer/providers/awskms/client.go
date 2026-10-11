package awskms

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/service/kms"
)

// KMSClientAPI defines the AWS KMS API subset required by the AWS KMS provider.
// Both standard *kms.Client and offline mock/stub clients implement this interface.
type KMSClientAPI interface {
	GetPublicKey(ctx context.Context, params *kms.GetPublicKeyInput, optFns ...func(*kms.Options)) (*kms.GetPublicKeyOutput, error)
	Sign(ctx context.Context, params *kms.SignInput, optFns ...func(*kms.Options)) (*kms.SignOutput, error)
}
