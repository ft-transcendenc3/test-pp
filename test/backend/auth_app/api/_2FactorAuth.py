from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .decorators import is_authenticated
from auth import settings
from . import jwtgenerator
from . import responses
import pyotp
import time
import qrcode
from io import BytesIO
import base64

User = get_user_model()


def GenerateQCode(user_instance) -> str:
    Secret = pyotp.random_base32()
    user_instance.secret_otp = Secret
    user_instance.save()

    totp = pyotp.TOTP(Secret)

    otp_uri = totp.provisioning_uri(
        name=user_instance.email,
        issuer_name="PixelPong"
    )

    qr = qrcode.make(otp_uri)
    buffered = BytesIO()
    qr.save(buffered, format="PNG")

    qr_base64 = base64.b64encode(buffered.getvalue()).decode()

    return qr_base64

class Enable2FA(APIView):
    @is_authenticated
    def post(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
    
        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']

        try:
            user_instance = User.objects.get(id=user_id)
            qrcode = GenerateQCode(user_instance)

            return Response({
                "state": True,
                "qrcode": qrcode, 
            }, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response(f"User with id {user_id} not available", None, status.HTTP_404_NOT_FOUND)
        
        return responses.error_response(None, None, status.HTTP_400_BAD_REQUEST)

class Verify2FA(APIView):
    @is_authenticated
    def post(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']

        try:
            user_instance = User.objects.get(id=user_id)
            otp_code = request.data.get("otp_code")

            if not otp_code:
                return responses.error_response("OTP code is required", None, status.HTTP_400_BAD_REQUEST)

            totp = pyotp.TOTP(user_instance.secret_otp)
            if totp.verify(otp_code):

                user_instance.two_factor_auth = True
                user_instance.save()

                return Response({
                    "state": True,
                    "message": "2FA enabled successfully"
                }, status=status.HTTP_200_OK)
            else:
                return responses.error_response("Invalid OTP code", None, status.HTTP_400_BAD_REQUEST)

        except User.DoesNotExist:
            return responses.error_response(f"User with id {user_id} not available", None, status.HTTP_404_NOT_FOUND)

class Disable2FA(APIView):
    @is_authenticated
    def delete(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']

        try:
            user_instance = User.objects.get(id=user_id)
            if not user_instance.tow_factor_auth:
                return responses.error_response("Already Disabled", None, status.HTTP_400_BAD_REQUEST)
            user_instance.two_factor_auth = False
            user_instance.secret_otp = None
            user_instance.save()

            return responses.success_response("2FA disabled successfully", status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response(f"User with id {user_id} not available", None, status.HTTP_404_NOT_FOUND)

        return responses.error_response("Something went wrong, 2FA disable failed", None, status.HTTP_BAD_REQUEST)
        
        





