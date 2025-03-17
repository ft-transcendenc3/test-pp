from rest_framework.views import APIView # type: ignore
from rest_framework.response import Response # type: ignore
from django.shortcuts import redirect
from rest_framework import status
import requests
from decouple import config # type: ignore
from urllib.parse import urlencode
from django.contrib.auth import get_user_model
import jwt
from .serializers import LoginSerializer, UserSignupSerializer, ListAllUsersSer, UpdateUserSerializer, UpdatePasswordSerializer, UserSerializer
from .decorators import is_authenticated
from auth import settings
from . import jwtgenerator
from . import responses

User = get_user_model()

class UserSearch(APIView):
    @is_authenticated
    def get(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
        
        query = request.query_params.get("q", "")
        if not query:
            return responses.error_response("No param passed", None, status.HTTP_404_NOT_FOUND)

        try:
            token = authorization_header.split(' ')[1]
            decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
            user_id = decoded_payload['user_id']
            
            user_instance = User.objects.get(id=user_id)
            query_set = User.objects.filter(username__icontains=query).exclude(id=user_instance.id)
            Ser = ListAllUsersSer(query_set, many=True).data
            return Response(
                {
                    "State": True,
                    "Users" : Ser,
                }, status=status.HTTP_200_OK
            )

        except User.DoesNotExist:
            return responses.error_response("User not found", None, status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_400_BAD_REQUEST)

class GetUserByUserName(APIView):
    @is_authenticated
    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
            serializer = UserSerializer(user)
            return Response({
                'status': True,
                'user': serializer.data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return responses.error_response("f'User with username {username} not found'", None, status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_400_BAD_REQUEST)

class GetUserById(APIView):
    @is_authenticated
    def get(self, request, id):
        try:
            user = User.objects.get(id=id)
            serializer = UserSerializer(user)
            return Response({
                'status': True,
                'user': serializer.data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return responses.error_response("f'User with id {id} not found'", None, status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_400_BAD_REQUEST)

class UpdatePassword(APIView):
    @is_authenticated
    def put(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
        
        try:
            token = authorization_header.split(' ')[1]
            decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
            user_id = decoded_payload['user_id']
            
            user_instance = User.objects.get(id=user_id)
            serializer = UpdatePasswordSerializer(user_instance, data=request.data)
            
            if serializer.is_valid():
                serializer.save() 
                return responses.success_response("Password changed successfully", status.HTTP_200_OK)
            else:
                return responses.error_response("Validation error", serializer.errors, status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return responses.error_response("User not found", None, status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_400_BAD_REQUEST)

        
class UpdateFields(APIView):
    @is_authenticated
    def put(self, request):

        """
            Update Endpoint
            Params:
                A put Request, Calling is_authenticated Decorator.
            Functionality:
                Check for unique fields if it is already avl, return a error_response, if not, update all fields passed and return a success response.

        """
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
    
        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']
        
        updated_fields = request.data
        user_instance = User.objects.get(id=user_id) 
    
        serializer = UpdateUserSerializer(user_instance, data=updated_fields, partial=True)
        if serializer.is_valid():
            serializer.save()
            return responses.success_response("Data modified successfully", status.HTTP_200_OK)
        return responses.error_response(None, serializer.errors, status.HTTP_400_BAD_REQUEST)

#if have an image uploaded should be deleted too.
class DeleteUserProfile(APIView):
    @is_authenticated
    def delete(self, request):
        """
            Delete User Profile Endpoint
            Params:
                An http request
            Functionality:
                Calling is_authenticated decorator.
                Delete User Row in the db and return a Json Response.
        """
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
        
        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']
        try:
            try:
                user = User.objects.get(id=user_id)

            except User.DoesNotExist:
                return responses.error_response("User not found", None, status.HTTP_404_NOT_FOUND)
            
            user.delete()
            response =  responses.success_response("User profile deleted successfully", status.HTTP_204_NO_CONTENT)
            response.delete_cookie('access_token')
            return response
        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_404_NOT_FOUND)

class ListAllUsers(APIView):
    @is_authenticated
    def get(self, request):
        authorization_header = request.headers.get('Authorization')
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)
        
        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload['user_id']

        try:
            queryset = User.objects.all().exclude(id=user_id)
            users = ListAllUsersSer(queryset, many=True).data
            return Response({"state": True, "Users": users}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return responses.error_response(f"Error: {str(e)}", None, status.HTTP_500_INTERNAL_SERVER_ERROR)

class LogoutApi(APIView):
    @is_authenticated
    def get(self, request):
        """
            Logout Endpoint
            Params:
                An http request.
            Functionality:
                calling a is_authenticated decorator.
                Delete the refresh Cookie and return a a success response.
        """
        response =  responses.success_response("Log out successfully", status.HTTP_200_OK)
        response.delete_cookie('access_token')
        return response

class ListUser(APIView):
    @is_authenticated
    def get(self, request):
        """
            Get User Infos Endpoint
            Params:
                An http request.
            Functionality:
                Check the header if valid return a Json Responses of all user infos. If not return an error response.
        """
        authorization_header = request.headers.get('Authorization')

        if not authorization_header:
            return responses.error_response("Unauthorized Request", None,  status.HTTP_401_UNAUTHORIZED)

        #"Bearer <token>"
        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user)
            return Response({
                'status': True,
                'user': serializer.data
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return responses.error_response("f'User with username not found'", None, status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return responses.error_response(str(e), None, status.HTTP_400_BAD_REQUEST)

class SignupApi(APIView):
    """
        Signup endpoint:
        POST Request
        Forum :{full_name, username, email, password}
    """
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            User = serializer.save()
            access_token, refresh = jwtgenerator.generate_tokens(User.id)
            response = Response(
            {   "state" : True,
                "message": "User created successfully",
            }, status=status.HTTP_201_CREATED)
            response.set_cookie(
                key = 'access_token',
                value = str(access_token),
            )
            return response
        return responses.error_response(None, serializer.errors, status.HTTP_400_BAD_REQUEST)

class LoginApi(APIView):
    """
        Login Endpoint 
        POST Request
        Forum {email, password}
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            User = serializer.validated_data["user"] 
            access_token, refresh_token = jwtgenerator.generate_tokens(User.id)
            response = Response({
                "state" : True,
                "message": "Login successful",
            }, status=status.HTTP_200_OK)
            
            response.set_cookie(
            key = 'access_token',
            value = str(access_token),
            )
            return response
        return responses.error_response("Invalid Email or Password", serializer.errors, status.HTTP_400_BAD_REQUEST)

class Oauth2AuthorizeApi(APIView):
    def get(self, request):
        uid = config('INTRA_UID')
        redirect_uri = "http://127.0.0.1:8000/api/oauth2/callback"
        authorization_url = "https://api.intra.42.fr/oauth/authorize"
        params = {
            "client_id": uid,
            "redirect_uri": redirect_uri,
            "response_type": "code",
        }
        url = f"{authorization_url}?{urlencode(params)}"
        return Response({"url" : url})

class Oauth2CallbackApi(APIView):
        """ OAuth2 Callback Uses GET Instead of POST
            Your OAuth2 provider is redirecting to your callback URL using a GET request, while your Django API expects a POST request with a JSON body. 
        """

        def get(self, request):
            code = request.GET.get("code")
            if not code:
                return Response({"error": "Missing code parameter"}, status=400)

            token_url = "https://api.intra.42.fr/oauth/token"
            client_id = config('INTRA_UID')
            client_secret = config('INTRA_SECRET')
            redirect_uri = "http://127.0.0.1:8000/api/oauth2/callback"
            data = {
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            }

            response = requests.post(token_url, data=data)
            if response.status_code != 200:
                return Response({"error": "Failed to retrieve token", "details": response.json(), "code": code}, status=response.status_code)

            token_data = response.json()
            access_token = token_data.get("access_token")

            user_info_url = "https://api.intra.42.fr/v2/me"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_info_response = requests.get(user_info_url, headers=headers)

            user_info = user_info_response.json()

            user_id = user_info.get("id")
            user_name= user_info.get("login")
            user_email = user_info.get("email")
            user_fullName = user_info.get("usual_full_name")
            image_url = user_info.get("image")['link']

            if user_id and User.objects.filter(id=user_id):
                user = User.objects.get(id=user_id)
                access_token, refresh_token = jwtgenerator.generate_tokens(user.id)
                response = Response({
                    "state" : True,
                    "message": "Logged in  successful",
                }, status=status.HTTP_200_OK)
                
                response.set_cookie(
                key='access_token',
                value=str(access_token),
                )
                frontend_url = config('FRONT_URL')
                return redirect(frontend_url)

            user = User.objects.create_user(id=user_id,
            username=user_name,
            email=user_email,
            full_name=user_fullName,
            image_url=image_url)

            user.save()
            
            access_token, refresh_token = jwtgenerator.generate_tokens(user_id)
            response = Response({
                "state" : True,
                "message": "Intra42 Signup was successful",
            }, status=status.HTTP_200_OK)
            
            response.set_cookie(
                key='access_token',
                value=str(access_token),
            )
            frontend_url = config('FRONT_URL')
            return redirect(frontend_url)

class RefreshTokenApi(APIView):
    def get(self, request):
        """
            RefreshToken Endpoint
            Params: 
                An http request : GET
            Functionality:
                Return an new access token based on the refresh token calling refresh_access_token as a Response.
                
        """
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return responses.error_response("Refresh token not found", None, status.HTTP_401_UNAUTHORIZED)
        new_access_token = jwtgenerator.refresh_access_token(refresh_token)
        response = Response({
            "state" : True,
            "message": "Updating Access Token",
            "access_token": new_access_token,
        }, status=status.HTTP_200_OK)
        return response