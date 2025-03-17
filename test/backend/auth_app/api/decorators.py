from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from decouple import config
from .jwtgenerator import verify_token
from auth import settings
User = get_user_model()


def is_authenticated(view):
    @wraps(view)
    def decorator(self, request, *args, **kwargs):
        """
            Decorator that checks if the Request is ALready Auth or not.
        """
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            raise AuthenticationFailed("Authorization header is missing")

        try:
            access_token = authorization_header.split(' ')[1]
            decoded_token = verify_token(access_token, settings.ACCESS_SECRET_KEY, "access")
            user = User.objects.get(id=decoded_token["user_id"])
        except (IndexError, KeyError, User.DoesNotExist):
            return Response({"message": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        return view(self, request, *args, **kwargs)

    return decorator
