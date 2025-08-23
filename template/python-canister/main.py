from kybra import nat8, query, update, StableBTreeMap, ic

# Persistent storage for last greeted name
last_name_storage = StableBTreeMap[str, str](memory_id=0, max_key_size=50, max_value_size=100)

@update
def greet(name: str) -> str:
    # Intentionally wrong implementation at first to make test fail (per red-green cycle)
    # We'll store the name but return a different string than expected test
    last_name_storage.insert("last_name", name)
    return f"hello world {name}"  # Missing name to force test failure initially

@query
def last_name() -> str:
    value = last_name_storage.get("last_name")
    if value is None:
        return ""
    return value