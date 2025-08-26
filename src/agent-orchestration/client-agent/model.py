
from kybra import (
    Service, service_update, service_query, Opt, Variant, Record, Principal, null, blob
)

from typing import List, Optional

class ReturnType(Variant, total=False):
    Ok: Opt[str]
    Err: Opt[str]

# Management Canister Service
class AgentInterface(Service):
    # Existing methods
    @service_query
    def get_metadata(self) -> ReturnType: ...

    @service_update
    def execute_task(self, args: str) -> ReturnType: ...

    # Pricing methods (extended)
    @service_query
    def get_price(self) -> int: ...

    @service_query
    def get_owner(self) -> Principal: ...

# ---------------- Ledger / Payment Models ----------------
class Account(Record):
    owner: Principal
    subaccount: Opt[blob]

class TransferArg(Record):
    from_subaccount: Opt[blob]
    to: Account
    amount: int
    fee: Opt[int]
    memo: Opt[blob]
    created_at_time: Opt[int]

class ExpectedFee(Record):
    expected_fee: int

class MinBurnAmount(Record):
    min_burn_amount: int

class Balance(Record):
    balance: int

class LedgerTime(Record):
    ledger_time: int

class DuplicateOf(Record):
    duplicate_of: int

class GenericErrorInfo(Record):
    error_code: int
    message: str

class Allowance(Record):
    allowance: int

class Icrc1TransferError(Variant, total=False):
    BadFee: Opt[ExpectedFee]
    BadBurn: Opt[MinBurnAmount]
    InsufficientFunds: Opt[Balance]
    TooOld: Opt[null]
    CreatedInFuture: Opt[LedgerTime]
    TemporarilyUnavailable: Opt[null]
    Duplicate: Opt[DuplicateOf]
    GenericError: Opt[GenericErrorInfo]

class Icrc1TransferResult(Variant, total=False):
    Ok: Opt[int]
    Err: Opt[Icrc1TransferError]

class TransferFromArgs(Record):
    spender_subaccount: Opt[blob]
    from_: Account
    to: Account
    amount: int
    fee: Opt[int]
    memo: Opt[blob]
    created_at_time: Opt[int]

class TransferFromError(Variant, total=False):
    BadFee: Opt[ExpectedFee]
    BadBurn: Opt[MinBurnAmount]
    InsufficientFunds: Opt[Balance]
    InsufficientAllowance: Opt[Allowance]
    TooOld: Opt[null]
    CreatedInFuture: Opt[LedgerTime]
    Duplicate: Opt[DuplicateOf]
    TemporarilyUnavailable: Opt[null]
    GenericError: Opt[GenericErrorInfo]

class TransferFromResult(Variant, total=False):
    Ok: Opt[int]
    Err: Opt[TransferFromError]

class Ledger(Service):
    @service_update
    def icrc1_transfer(self, arg: TransferArg) -> Icrc1TransferResult: ...

    @service_update
    def icrc2_transfer_from(self, arg: TransferFromArgs) -> TransferFromResult: ...

# Management Canister Service
class AgentRegistryInterface(Service):

    @service_query
    def get_agent_by_name(self, agent_name: str) -> ReturnType:
        ...
    
    @service_update
    def get_list_agents(self) -> ReturnType:
        ...