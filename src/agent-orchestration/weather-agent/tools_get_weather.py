

from kybra import (
    ic, Async, CallResult, match
)

from kybra.canisters.management import (
    HttpResponse,
    management_canister
)

import json

from model import ReturnType

def tool__get_weather(city_name: str) -> Async[ReturnType]:

    # Build the API URL
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    
    # Parameters
    params = {
        "q": city_name,
        "appid": '91c66a8334950a944a44488c357c3dd7',
        "units": "metric"
    }
    
    # Construct full URL
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    full_url = f"{base_url}?{query_string}"
    
    request_args = {
        "url": full_url,
        "max_response_bytes": 2048,
        "headers": [],
        "body": None,
        "method": {"get": None},
        "transform": None
    }
    
    # Add cycles for the outcall

    http_result: CallResult[HttpResponse] = yield management_canister \
        .http_request(request_args) \
        .with_cycles(50_000_000)

    response = match(
        http_result,
        {
            # for testing using smaller data
            "Ok": lambda ok: { 
                "Ok":  json.dumps(
                    json.loads(ok["body"].decode("utf-8") )['weather'][0]
                )
            },
            # "Ok": lambda ok: { "Ok": ok["body"].decode("utf-8") },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    if response.get("Err") is not None:
        ic.print(f"[WeatherAgent] Error fetching weather data: {response.get('Err')}")

    return response
