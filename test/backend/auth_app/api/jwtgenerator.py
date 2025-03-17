import jwt
import datetime
from decouple import config
from rest_framework import status
from typing import Tuple
from auth import settings
from . import responses

def generate_tokens(user_id: int)-> Tuple[str, str]:
    """
        Params:
            user_id (int) the user id in the Database
        Functionality:
            generate Jwt tokens (Refresh, access) and return a Tuple of them.
    """
    access_expiry = datetime.datetime.utcnow() + datetime.timedelta(days=2)
    refresh_expiry = datetime.datetime.utcnow() + datetime.timedelta(days=7)

    access_payload = {
        "user_id": user_id,
        "exp": access_expiry,
        "iat": datetime.datetime.utcnow(),
        "type": "access",
    }
    access_token = jwt.encode(access_payload, settings.ACCESS_SECRET_KEY, algorithm="HS256")

    refresh_payload = {
        "user_id": user_id,

        "exp": refresh_expiry,
        "iat": datetime.datetime.utcnow(),
        "type": "refresh",
    }
    refresh_token = jwt.encode(refresh_payload, settings.REFRESH_SECRET_KEY, algorithm="HS256")

    return access_token, refresh_token

def verify_token(token: str, secret_key: str, token_type: str) -> dict:
    """
    Verify the token is valid and not expired.

    Params:
        token (str): Token to be verified.
        secret_key (str): Secret key used to encode the token.
        token_type (str): Type of token (e.g., "access" or "refresh").

    Returns:
        dict: Decoded token payload if valid.
        JsonResponse: Error response if token is invalid or expired.
    """
    try:
        decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
        if decoded.get("type") != token_type:
            return responses.error_response(f"Invalid {token_type} token", None,  status.HTTP_401_UNAUTHORIZED)
        return decoded

    except jwt.ExpiredSignatureError:
        return responses.error_response("Expired Token: If this is a refresh token, log out. If it's an access token, call the token/refresh endpoint.", None,  status.HTTP_401_UNAUTHORIZED,)
    except jwt.InvalidTokenError:
        return responses.error_response("Invalid token", None,  status.HTTP_401_UNAUTHORIZED)
    except Exception as e:
        return responses.error_response(f"Token verification failed: {str(e)}", None,  status.HTTP_500_INTERNAL_SERVER_ERROR)

def refresh_access_token(refresh_token: str)-> str:
    """
        Params:
            refresh_token (str) 
        Functionality:
            refreshing access token based on the refresh token and return new access token.
    """

    decoded_refresh = verify_token(refresh_token, settings.REFRESH_SECRET_KEY, "refresh")
    user_id = decoded_refresh["user_id"]
    access_exp = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

    access_payload = {
        "user_id": user_id,
        "exp": access_exp,
        "iat": datetime.datetime.utcnow(),
        "type": "access",
    }

    new_access_token = jwt.encode(access_payload, settings.ACCESS_SECRET_KEY, algorithm="HS256")
    return new_access_token