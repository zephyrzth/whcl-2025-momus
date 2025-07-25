module {
    public type AgentMetadata = {
        name : Text;
        description : Text;
    };

    public type AgentInterface = actor {
        get_metadata : query () -> async AgentMetadata;
        execute_task : (Text) -> async Text;
    };
};
