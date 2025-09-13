# -====================================== IMPORT =======================================
from kybra import Principal, Async, update, query, match, ic

from llm import *
from typing import List
import json

from model import *
from metadata import *
from constants import *

# Payment / ledger related imports moved from function scope
from model import Ledger, TransferFromArgs, Account, TransferArg

# -====================================== IMPORT =======================================

# ===================================== ROUTER MAIN ====================================


@query
def get_owner() -> Principal:
    return ic.id()


@query
def get_price() -> int:
    # Price (in e8s) charged by this client agent per downstream agent call invocation.
    # Adjust as needed.
    return 1_000_000


@query
def get_metadata() -> ReturnType:
    """
    Get metadata for the Agent.
    """
    return {"Ok": json.dumps(METADATA)}


@update
def execute_task(args: str) -> Async[ReturnType]:
    """
    Execute a agentic task.
    Example args : `[{"name":"prompt","value":"How was the weather and air quality today in Jakarta ?"},{"name":"connected_agent_list","value":["weather-agent","airquality-agent"]}]`
    """

    try:
        params: List[dict] = json.loads(args)
        params = json.loads( """[{"name": "prompt", "value": "How was the weather and air quality today in Jakarta ?"}, {"name": "connected_agent_list", "value": ["weather-agent"]}, {"name": "user", "value": "wxxjc-dwc4f-6dfub-3cwql-bujz2-sa53s-xyqa6-wr6uu-xfg7v-akwid-jqe"}]""" )

        if not is_all_required_params_present(params):
            return {"Err": "Missing required parameters"}

        ic.print(f"[ClientAgent] Received params: {params}")

        parameters = __transform_params(params)

        ic.print(f"[ClientAgent] Transformed parameters: {parameters}")

        agent_call_list_stream = yield __parse_parameter(parameters)
        agent_call_list_raw = match(
            agent_call_list_stream,
            {"Ok": lambda ok: {"Ok": ok}, "Err": lambda err: {"Err": err}},
        )

        if agent_call_list_raw.get("Err") is not None:
            ic.print(
                f"[ClientAgent] Error parsing agent call list: {agent_call_list_raw.get('Err')}"
            )
            return {"Err": "Failed to parse agent call list"}

        agent_call_list = json.loads(agent_call_list_raw.get("Ok"))
        agent_call_list = [{'id': 'call_UZnH1FyuiOUxvUewV8rxXlwU', 'function': {'name': 'weather-agent', 'arguments': [{'value': 'Provide weather and air quality conditions in Jakarta today', 'name': 'prompt'}]}}]

        ic.print(f"[ClientAgent] Agent call list: {agent_call_list}")

        resp = ""

        caller = parameters["user"]

        for agent in agent_call_list:
            agent_name = agent["function"]["name"]
            agent_args = agent["function"]["arguments"]

            ic.print(f"[ClientAgent] Invoking agent: {agent_name} with args: {agent_args}")

            # # Ensure payment (pricing lookup + charging) before invocation
            # payment_variant = yield __ensure_payment(agent_name, caller)

            # ic.print(f"[ClientAgent] Payment variant: {payment_variant}")

            # if payment_variant.get("Err") is not None:
            #     return payment_variant

            # Now invoke downstream agent
            curr_stream_resp = yield __agent_call(agent_name, agent_args)
            curr_stream_raw = match(
                curr_stream_resp,
                {"Ok": lambda ok: {"Ok": ok}, "Err": lambda err: {"Err": err}},
            )

            if curr_stream_raw.get("Err") is not None:
                ic.print(
                    f"[ClientAgent] Error calling agent '{agent_name}': {curr_stream_raw.get('Err')}"
                )
                return {"Err": f"Failed to call agent '{agent_name}'"}

            curr_stream = curr_stream_raw.get("Ok")
            curr_stream = curr_stream.split(".")[0]
            resp += f"`{agent_name}`: {curr_stream}\n"

        resp = yield __result_refinement(resp)

        if resp.get("Err") is not None:
            return resp

        final_result = resp.get("Ok").get("message", {}).get("content", "")

        return {"Ok": final_result}

    except Exception as e:
        return {"Err": json.dumps({"error": str(e)})}


# ===================================== ROUTER MAIN ====================================


# ===================================== HELPER FUNC ====================================
def __transform_params(params: List[dict]) -> dict:
    return {p["name"]: p["value"] for p in params if p.get("value") is not None}


def __get_agent_metadata(agent_name: str) -> Async[dict]:

    agent_registry = AgentRegistryInterface(
        Principal.from_str(AGENT_REGISTRY_CANISTER_ID)
    )
    resp_stream = yield agent_registry.get_agent_by_name(agent_name)
    resp = match(resp_stream, {"Ok": lambda ok: ok, "Err": lambda err: {"Err": err}})

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None

    agent_mapper = json.loads(resp.get("Ok"))

    agent = AgentInterface(Principal.from_str(agent_mapper.get("canister_id")))
    resp_stream = yield agent.get_metadata()

    resp = match(resp_stream, {"Ok": lambda ok: ok, "Err": lambda err: {"Err": err}})

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None

    agent_metadata = json.loads(resp.get("Ok"))

    for i in range(len(agent_metadata["function"]["parameters"]["properties"])):
        if (
            agent_metadata["function"]["parameters"]["properties"][i]["name"]
            == "connected_agent_list"
        ):
            agent_metadata["function"]["parameters"]["properties"].pop(i)

    return agent_metadata


# -------------------------------------------------------------------------------------
# Pricing & Payment Logic (replicating Motoko planner_agent payment flow)
# -------------------------------------------------------------------------------------


# Derived helpers
def _compute_fee(amount: int) -> int:
    return (amount * FEE_NUM) // FEE_DEN


def __get_agent_pricing(agent_name: str) -> Async[dict]:

    agent_registry = AgentRegistryInterface(
        Principal.from_str(AGENT_REGISTRY_CANISTER_ID)
    )

    resp_stream = yield agent_registry.get_agent_by_name(agent_name)
    resp = match(resp_stream, {"Ok": lambda ok: ok, "Err": lambda err: {"Err": err}})

    if resp.get("Err") is not None:
        return {"Err": resp.get("Err")}

    agent_mapper = json.loads(resp)
    canister_id = agent_mapper.get("canister_id")

    if canister_id is None:
        return {"Err": "Missing canister id"}

    pricing_iface = AgentInterface(Principal.from_str(canister_id))
    price_stream = yield pricing_iface.get_price()
    owner_stream = yield pricing_iface.get_owner()
    price = price_stream  # price is raw int query response
    owner = owner_stream

    return {"Ok": {"price": price, "owner": owner}}


def __process_payment(
    from_user: Principal, agent_price: int, agent_owner: Principal
) -> Async[ReturnType]:

    if LEDGER_CANISTER_ID == "":
        return {"Err": "ICP ledger not configured"}

    ledger = Ledger(Principal.from_str(LEDGER_CANISTER_ID))
    APP_WALLET = Principal.from_str(APP_WALLET_TEXT)

    to_client_agent = ic.id()
    admin_fee = _compute_fee(agent_price)
    to_owner_amt = agent_price - admin_fee

    tf_args = TransferFromArgs(
        spender_subaccount=None,
        from_=Account(owner=from_user, subaccount=None),
        to=Account(owner=to_client_agent, subaccount=None),
        amount=agent_price,
        fee=None,
        memo=None,
        created_at_time=None,
    )

    charge_stream = yield ledger.icrc2_transfer_from(tf_args)
    # We don't pattern match fully on variants (kybra returns dict-like) so inspect keys
    if getattr(charge_stream, "Err", None) is not None:
        # Derive user friendly error
        err_variant = charge_stream.Err
        # Simplified checks
        if getattr(err_variant, "InsufficientAllowance", None) is not None:
            return {"Err": "ICP allowance insufficient"}
        if getattr(err_variant, "InsufficientFunds", None) is not None:
            return {"Err": "ICP balance insufficient"}
        return {"Err": "error: payment failed"}

    # Payout owner (best effort)
    pay_owner = TransferArg(
        from_subaccount=None,
        to=Account(owner=agent_owner, subaccount=None),
        amount=to_owner_amt,
        fee=None,
        memo=None,
        created_at_time=None,
    )
    owner_payout_res = yield ledger.icrc1_transfer(pay_owner)

    if getattr(owner_payout_res, "Err", None) is not None:
        ic.print(f"[ClientAgent] Owner payout failed: {owner_payout_res.Err}")
        return {"Err": "Owner payout failed"}

    ic.print(f"[ClientAgent] Owner payout success: {to_owner_amt}")

    # Payout app wallet (best effort)
    pay_fee = TransferArg(
        from_subaccount=None,
        to=Account(owner=APP_WALLET, subaccount=None),
        amount=admin_fee,
        fee=None,
        memo=None,
        created_at_time=None,
    )

    fee_payout_res = yield ledger.icrc1_transfer(pay_fee)

    if getattr(fee_payout_res, "Err", None) is not None:
        ic.print(f"[ClientAgent] App fee payout failed: {fee_payout_res.Err}")
        return {"Err": "App fee payout failed"}

    ic.print(f"[ClientAgent] App fee payout success: {admin_fee}")

    return {"Ok": None}


def __ensure_payment(agent_name: str, caller: Principal) -> Async[ReturnType]:
    """Lookup price/owner and charge caller. Does NOT invoke the agent."""

    pricing_resp = yield __get_agent_pricing(agent_name)

    if pricing_resp.get("Err") is not None:
        ic.print(
            f"[ClientAgent] Pricing fetch failed for '{agent_name}': {pricing_resp.get('Err')}"
        )
        return {"Err": f"Failed to retrieve pricing for '{agent_name}'"}

    agent_price = pricing_resp.get("Ok").get("price")
    agent_owner = pricing_resp.get("Ok").get("owner")

    payment_res = yield __process_payment(caller, agent_price, agent_owner)

    if payment_res.get("Err") is not None:
        return payment_res

    return {"Ok": "paid"}


def __parse_parameter(parameters: dict) -> Async[dict]:

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    tools = []

    for agent_name in parameters.get("connected_agent_list", []):
        agent_metadata = yield __get_agent_metadata(agent_name)
        if agent_metadata is None:
            return {"Err": f"Agent '{agent_name}' not found"}
        tools.append(agent_metadata)

    tools = tools if len(tools) > 0 else None

    # Create messages
    messages = [
        create_system_message("You are a helpful assistant."),
        create_user_message(parameters.get("prompt")),
    ]

    # Create request using ChatRequestV1 type
    request = {"model": "llama3.1:8b", "tools": tools, "messages": messages}

    ic.print(f"[ClientAgent] Parsing parameters with request: {request}")

    # Call service
    response_steam = yield llm_service.v1_chat(request)

    response_raw = match(
        response_steam, {"Ok": lambda ok: {"Ok": ok}, "Err": lambda err: {"Err": err}}
    )

    if response_raw.get("Err") is not None:
        return response_raw

    response = response_raw.get("Ok")
    list_agent_call = response.get("message", {}).get("tool_calls", [])

    return {"Ok": json.dumps(list_agent_call)}


def __agent_call(agent_name: str, parameters: List[dict]) -> Async[dict]:

    agent_registry = AgentRegistryInterface(
        Principal.from_str(AGENT_REGISTRY_CANISTER_ID)
    )
    resp_stream = yield agent_registry.get_agent_by_name(agent_name)
    resp = match(resp_stream, {"Ok": lambda ok: ok, "Err": lambda err: {"Err": err}})

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None

    agent_mapper = json.loads(resp.get("Ok"))

    agent = AgentInterface(Principal.from_str(agent_mapper.get("canister_id")))
    resp_stream = yield agent.execute_task(json.dumps(parameters))

    resp = match(resp_stream, {"Ok": lambda ok: ok, "Err": lambda err: {"Err": err}})

    if resp.get("Err") is not None:
        ic.print(f"[ClientAgent] Error getting agent metadata: {resp.get('Err')}")
        return None

    agent_response = resp.get("Ok")

    ic.print(f"[ClientAgent] Agent '{agent_name}' response: {agent_response}")

    return {"Ok": agent_response}


def __result_refinement(results: str) -> Async[ReturnType]:

    ic.print(f"[ClientAgent] Result Refinement - {results}")

    llm_service = LLMServiceV1(Principal.from_str(LLM_CANISTER_ID))

    # Create messages
    messages = [
        create_system_message(
            "You are a helpful agent. Combine the response into one paragraph."
        ),
        create_user_message(results),
    ]

    request = {"model": "llama3.1:8b", "tools": None, "messages": messages}

    # Call service
    response_stream = yield llm_service.v1_chat(request)

    response = match(
        response_stream, {"Ok": lambda ok: {"Ok": ok}, "Err": lambda err: {"Err": err}}
    )

    return response


# ===================================== HELPER FUNC ====================================
