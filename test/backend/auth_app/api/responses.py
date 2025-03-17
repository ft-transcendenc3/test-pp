from django.http import JsonResponse
from rest_framework import status

def error_response(msg: str, serializer_errors: dict, status_code: int) ->JsonResponse:
    """
        Params
            msg : (str) message that descries the error type.
            status_code : (int) returned status code in JsonResponse
            serializer_errors: (dict) returned in Serializer
        Functionality
            Retuning a JsonResponse that specify the error message, status code and state.
    """
    if msg is None:
        msg = "Something went wrong!"
    if status_code is None:
        status_code = status.HTTP_400_BAD_REQUEST

    if serializer_errors is None:
        return JsonResponse(
            {
            "state" : False,
            "message" : msg,
            }, 
            status=status_code
            )
    new_serializer_errors = {}
    for key, value in serializer_errors.items():
        new_serializer_errors[key] = value[0]
    return JsonResponse(
        {
            "state": False,
            "message": msg,
            "errors": new_serializer_errors,
        },
        status=status_code,
    )


def success_response(msg: str, status_code: int)-> JsonResponse:
    """
        Params
            msg : str message that descries the  type.
            status_code : int returned status code in JsonResponse
        Functionality
            Retuning a JsonResponse that specify the error message, status code and state. 
    """
    if msg is None:
        msg = "Success"
    if status_code is None:
        status_code = status.HTTP_200OK
    return JsonResponse({
        "state" : True,
        "message" : msg,
    }, status=status_code)
