"""
AgentPay Webhook Signature Verification
"""
import hashlib
import hmac
import time
from typing import Union

def verify_signature(
    raw_body: Union[bytes, str],
    signature_header: str,
    secret: str,
    tolerance_seconds: int = 300
) -> bool:
    """
    Verify an incoming AgentPay webhook signature using HMAC-SHA256.

    :param raw_body: Raw request body as bytes or string.
    :param signature_header: Value of the AgentPay-Signature HTTP header (t=<unix>,v1=<sig>).
    :param secret: Endpoint signing secret (whsec_...).
    :param tolerance_seconds: Maximum age of signature in seconds (default 300s).
    :return: True if valid and within tolerance, False otherwise.
    """
    if not signature_header or not secret:
        return False

    parts = dict(part.split("=", 1) for part in signature_header.split(",") if "=" in part)
    timestamp_str = parts.get("t")
    signature = parts.get("v1")

    if not timestamp_str or not signature:
        return False

    try:
        timestamp = int(timestamp_str)
    except ValueError:
        return False

    now = int(time.time())
    if abs(now - timestamp) > tolerance_seconds:
        return False

    body_bytes = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body
    to_sign = f"{timestamp}.".encode("utf-8") + body_bytes

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        to_sign,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)
