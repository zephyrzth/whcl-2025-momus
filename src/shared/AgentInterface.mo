import Principal "mo:base/Principal";

module {
  public type AgentMetadata = {
    name : Text;
    description : Text;
  };

  public type AgentInterface = actor {
    get_metadata : query () -> async AgentMetadata;
    execute_task : (Text) -> async Text;
    get_owner : query () -> async Principal;
    // Price in base units (e8 for MOMUS)
    get_price : query () -> async Nat;
  };
};
