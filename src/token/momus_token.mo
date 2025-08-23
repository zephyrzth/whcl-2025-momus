import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";

// Minimal MOMUS token ledger (simplified ICRC-1/2)
// - Decimals: 8
// - Pre-mints initial supply to the application wallet
// - Supports balance_of, transfer, approve, transfer_from
// NOTE: This is intentionally minimal to support local development and demos.

persistent actor MomusToken {
  // Token metadata
  let NAME : Text = "Momus";
  let SYMBOL : Text = "MOMUS";
  let DECIMALS : Nat8 = 8;

  // Application wallet (receives app fee)
  let APP_WALLET : Principal = Principal.fromText("bacwk-6nib6-4xdaa-s6fj7-s3h6j-zdzd3-jxvfw-yf3ss-dt4if-h6p6w-lae");

  // Initial supply (1,000,000 MOMUS) in base units (1e8)
  let E8 : Nat = 100_000_000;
  let INITIAL_SUPPLY : Nat = 1_000_000 * E8;

  // Balances and allowances
  private var balancesEntries : [(Principal, Nat)] = [];
  private transient var balances = HashMap.HashMap<Principal, Nat>(64, Principal.equal, Principal.hash);

  // (owner, spender) -> allowance amount
  private var allowancesEntries : [((Principal, Principal), Nat)] = [];
  private transient var allowances : HashMap.HashMap<(Principal, Principal), Nat> = HashMap.HashMap<(Principal, Principal), Nat>(
    64,
    func(a : (Principal, Principal), b : (Principal, Principal)) : Bool {
      a == b;
    },
    func(p : (Principal, Principal)) : Nat32 {
      // crude hash combine
      Nat32.bitxor(Principal.hash(p.0), Principal.hash(p.1));
    },
  );

  private var totalSupply : Nat = 0;

  // One-time init: on first install, pre-mint initial supply to APP_WALLET
  private var initialized : Bool = false;
  if (not initialized) {
    balances.put(APP_WALLET, INITIAL_SUPPLY);
    totalSupply := INITIAL_SUPPLY;
    initialized := true;
  };

  system func postupgrade() {
    balances := HashMap.fromIter(balancesEntries.vals(), balancesEntries.size(), Principal.equal, Principal.hash);
    allowances := HashMap.fromIter<(Principal, Principal), Nat>(
      allowancesEntries.vals(),
      allowancesEntries.size(),
      func(a : (Principal, Principal), b : (Principal, Principal)) : Bool {
        a == b;
      },
      func(p : (Principal, Principal)) : Nat32 {
        Nat32.bitxor(Principal.hash(p.0), Principal.hash(p.1));
      },
    );
    balancesEntries := [];
    allowancesEntries := [];
  };

  system func preupgrade() {
    balancesEntries := Iter.toArray(balances.entries());
    allowancesEntries := Iter.toArray(allowances.entries());
  };

  // --- Metadata (simplified ICRC-1) ---
  public query func icrc1_name() : async Text { NAME };
  public query func icrc1_symbol() : async Text { SYMBOL };
  public query func icrc1_decimals() : async Nat8 { DECIMALS };
  public query func icrc1_total_supply() : async Nat { totalSupply };

  // Balance helper
  public query func icrc1_balance_of(owner : Principal) : async Nat {
    switch (balances.get(owner)) { case (?b) b; case null 0 };
  };

  // Simple transfer: from caller to `to`
  public shared (msg) func icrc1_transfer(to : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    let from = msg.caller;
    if (amount == 0) { return #ok(0) };
    let fromBal = switch (balances.get(from)) { case (?b) b; case null 0 };
    if (fromBal < amount) { return #err("InsufficientBalance") };
    balances.put(from, fromBal - amount);
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);
    #ok(amount);
  };

  // ICRC-2 like approve: owner approves spender amount
  public shared (msg) func icrc2_approve(spender : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    let owner = msg.caller;
    allowances.put((owner, spender), amount);
    #ok(amount);
  };

  // ICRC-2 like transfer_from: spender moves funds from `from` to `to`
  public shared (msg) func icrc2_transfer_from(from : Principal, to : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    let spender = msg.caller;
    if (amount == 0) { return #ok(0) };
    let allowance = switch (allowances.get((from, spender))) {
      case (?a) a;
      case null 0;
    };
    if (allowance < amount) { return #err("InsufficientAllowance") };
    let fromBal = switch (balances.get(from)) { case (?b) b; case null 0 };
    if (fromBal < amount) { return #err("InsufficientBalance") };
    // debit
    balances.put(from, fromBal - amount);
    allowances.put((from, spender), allowance - amount);
    // credit
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);
    #ok(amount);
  };

  // Admin mint/burn (optional basic controls)
  // For simplicity, allow APP_WALLET to act as admin.
  public shared (msg) func mint(to : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    if (msg.caller != APP_WALLET) return #err("NotAuthorized");
    if (amount == 0) return #ok(0);
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);
    totalSupply += amount;
    #ok(amount);
  };

  public shared (msg) func burn(from : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    if (msg.caller != APP_WALLET) return #err("NotAuthorized");
    let fromBal = switch (balances.get(from)) { case (?b) b; case null 0 };
    if (fromBal < amount) return #err("InsufficientBalance");
    balances.put(from, fromBal - amount);
    totalSupply -= amount;
    #ok(amount);
  };
};
