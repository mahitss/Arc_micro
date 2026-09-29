import json
import urllib.request

RPC_URL = "https://rpc.mainnet.arc.io"

def rpc_call(method, params=[]):
    payload = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode()
    req = urllib.request.Request(RPC_URL, data=payload, headers={"Content-Type": "application/json", "User-Agent": "AgentPay-Audit/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}

chain_id_res = rpc_call("eth_chainId")
block_num_res = rpc_call("eth_blockNumber")
usdc_res = rpc_call("eth_getCode", ["0x3600000000000000000000000000000000000000", "latest"])
vault_res = rpc_call("eth_getCode", ["0x10A8fA3D110a12e8c5Ff68202d0b5A1a65B49852", "latest"])

print("--- ARC LIVE RPC AUDIT EVIDENCE ---")
print(f"RPC URL: {RPC_URL}")
print(f"Chain ID Raw: {chain_id_res.get('result')}")
if chain_id_res.get("result"):
    print(f"Chain ID Decoded: {int(chain_id_res['result'], 16)}")
print(f"Block Number Raw: {block_num_res.get('result')}")
if block_num_res.get("result"):
    print(f"Block Number Decoded: {int(block_num_res['result'], 16)}")

usdc_code = usdc_res.get("result", "")
print(f"Native USDC (0x3600...0000) Code Bytes: {len(usdc_code) if usdc_code else 0} (Hex: {usdc_code[:30]}...)")

vault_code = vault_res.get("result", "")
print(f"AgentVault (0x10A8...9852) Code Bytes: {len(vault_code) if vault_code else 0} (Hex: '{vault_code}')")
if vault_code in ("", "0x", "0x0"):
    print("AgentVault Status: NOT DEPLOYED (0x bytecode)")
else:
    print("AgentVault Status: DEPLOYED")
