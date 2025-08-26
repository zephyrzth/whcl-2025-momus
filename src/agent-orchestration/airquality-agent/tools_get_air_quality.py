
from kybra import (
    ic, Async, CallResult, match
)

from kybra.canisters.management import (
    HttpResponse,
    management_canister
)

import json

from model import ReturnType

def __get_lat_long_from_city_name(city_name: str) -> Async[ReturnType]:

    # Build the API URL
    base_url = "https://api.openweathermap.org/geo/1.0/direct"
    
    # Parameters
    params = {
        "q": city_name,
        "appid": '91c66a8334950a944a44488c357c3dd7',
        "limit": "1"
    }
    
    # Construct full URL
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    full_url = f"{base_url}?{query_string}"

    request_args = {
        "url": full_url,
        "max_response_bytes": 4096,
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
            "Ok": lambda ok: { 
                "Ok":  json.dumps(
                    {
                        "lat": json.loads( ok["body"].decode("utf-8") )[0]['lat'],
                        "lon": json.loads( ok["body"].decode("utf-8") )[0]['lon'],
                        "country": json.loads( ok["body"].decode("utf-8") )[0]['country']
                    }
                )
            },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    if response.get("Err") is not None:
        ic.print( f"[AirQualityAgent] Error fetching city coordinates - {response.get('Err')}")

    return response

def tool__get_air_quality(city_name: str) -> Async[ReturnType]:

    city_coordinates_stream = yield __get_lat_long_from_city_name(city_name)

    if city_coordinates_stream.get("Err") is not None:
        return city_coordinates_stream

    city_coordinates = json.loads(city_coordinates_stream.get("Ok"))

    # Build the API URL
    base_url = "https://api.openweathermap.org/data/2.5/air_pollution"
    
    # Parameters
    params = {
        "lat": city_coordinates['lat'],
        "lon": city_coordinates['lon'],
        "appid": '91c66a8334950a944a44488c357c3dd7'
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
            # For testing
            "Ok": lambda ok: { 
                "Ok":  json.dumps(
                    json.loads(ok["body"].decode("utf-8") )['list'][0]['main']
                )
            },
            # For Prod
            # "Ok": lambda ok: { 
            #     "Ok":  json.dumps(
            #         json.loads(ok["body"].decode("utf-8") )['list'][0]
            #     )
            # },
            "Err": lambda err: { "Err": str(err) }
        },
    )

    if response.get("Err") is not None:
        ic.print( f"[AirQualityAgent] Error fetching air quality data - {response.get('Err')}")

    return response
