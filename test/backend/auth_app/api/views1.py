from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
import jwt
from urllib.parse import urlencode
from django.contrib.auth import get_user_model
from auth import settings
from .serializers import ListPendingInvitationsSer, FriendListSer
from .decorators import is_authenticated
from . import jwtgenerator
from . import responses
from auth_app.models import Friend, Invitation

User = get_user_model()


class SendInvitation(APIView):
    @is_authenticated
    def post(self, request, id):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        if id == user_id:
            return responses.error_response("Cant invite your self", None, status.HTTP_400_BAD_REQUEST)
        
        try:
            sender_user = User.objects.get(id=user_id)
            receiver_user = User.objects.get(id=id)

            if Invitation.objects.filter(sender=sender_user, receiver=receiver_user).exists() or Invitation.objects.filter(sender=receiver_user, receiver=sender_user).exists():
                return responses.error_response("Invitation already sent", None, status.HTTP_400_BAD_REQUEST)
    
            #check if already friend.
            if Friend.objects.filter(user1=sender_user, user2=receiver_user).exists() or Friend.objects.filter(user1=receiver_user, user2=sender_user).exists():
                return responses.error_response("They are already friend", None, status.HTTP_400_BAD_REQUEST)
            
            invitation = Invitation.objects.create(sender=sender_user, receiver=receiver_user)
            return responses.success_response("Invitation sent successfully", status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response("User Does not exist", None, status.HTTP_400_BAD_REQUEST)
        return responses.error_response(None, None, status.HTTP_400_BADREQUEST)

class AcceptInvitation(APIView):
    @is_authenticated
    def put(self, request, id):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        if id == user_id:
            return responses.error_response("Cant ACCEPT your self", None, status.HTTP_400_BAD_REQUEST)

        try:
            sender_user = User.objects.get(id=id)
            receiver_user = User.objects.get(id=user_id)

            if not Invitation.objects.filter(sender=sender_user, receiver=receiver_user).exists():
                return responses.error_response("No invitation to accept", None, status.HTTP_400_BAD_REQUEST)
            
            # if Friend.objects.filter(user1=sender_user,user2=receiver_user).exists() or Friend.objects.filter(user1=receiver_user, user2=sender_user).exists():
            #     return responses.error_response("Friendship already set", None, status.HTTP_400_BAD_REQUEST)
            
            invitation = Invitation.objects.filter(sender=sender_user, receiver=receiver_user)
            invitation.delete()

            friend = Friend.objects.create(user1=sender_user, user2=receiver_user)

            return responses.success_response("Invitation accepted successfully", status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response("User Does not exist", None, status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return responses.error_response(f"An error occurred {e}", None, status.HTTP_400_BAD_REQUEST)

class RejectInvitation(APIView):
    @is_authenticated
    def delete(self, request, id):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        if id == user_id:
            return responses.error_response("Cant REJECT your self", None, status.HTTP_400_BAD_REQUEST)
        try:
            sender_user = User.objects.get(id=id)
            receiver_user = User.objects.get(id=user_id)

            if not Invitation.objects.filter(sender=sender_user, receiver=receiver_user).exists():
                return responses.error_response("No Invitation to deleted", None, status.HTTP_400_BAD_REQUEST)
            
            invitation = Invitation.objects.filter(sender=sender_user, receiver=receiver_user)
            invitation.delete()

            return responses.success_response("Invitation deleted successfully", status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response("User Does not exist", None, status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return responses.error_response(f"An error occurred {e}", None, status.HTTP_400_BAD_REQUEST)

class ListPendingInvitations(APIView):
    @is_authenticated
    def get(self, request):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        try:
            receiver_user = User.objects.get(id=user_id)
            if not Invitation.objects.filter(receiver=receiver_user).exists():
                return responses.success_response("No Invite for you", status.HTTP_200_OK)
            invitations = Invitation.objects.filter(receiver=receiver_user)
            serializer = ListPendingInvitationsSer(invitations, many=True).data

            return Response({
                "state": True,
                "Invitations": serializer,   
            }, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response("User not found", None, status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return responses.error_response(f"An error occurred {e}", None, status.HTTP_400_BAD_REQUEST)
    

class ListFriends(APIView):
    @is_authenticated
    def get(self, request):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        try:
            user_instance = User.objects.get(id=user_id)
            if not Friend.objects.filter(user1=user_instance).exists() and not Friend.objects.filter(user2=user_instance).exists():
                return responses.success_response("No Friendship for you", status.HTTP_200_OK)
            friends = Friend.objects.filter(user1=user_instance) | Friend.objects.filter(user2=user_instance)
            serializer = FriendListSer(friends, many=True).data

            return Response({
                "state": True,
                "Friends": serializer,   
            }, status=status.HTTP_200_OK)
        
        except User.DoesNotExist:
            return responses.error_response("User not found", None, status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return responses.error_response(f"An error occurred {e}", None, status.HTTP_400_BAD_REQUEST)

class RemoveFriend(APIView):
    def delete(self, request, id):
        authorization_header = request.headers.get("Authorization")
        if not authorization_header:
            return responses.error_response("Unauthorized Request", None, status.HTTP_401_UNAUTHORIZED)

        token = authorization_header.split(' ')[1]
        decoded_payload = jwtgenerator.verify_token(token, settings.ACCESS_SECRET_KEY, "access")
        user_id = decoded_payload["user_id"]

        if id == user_id:
            return responses.error_response("Cant REMOVE your self From friend list", None, status.HTTP_400_BAD_REQUEST)
        try:
            user_instance1 = User.objects.get(id=id)
            user_instance2 = User.objects.get(id=user_id)

            if Friend.objects.filter(user1=user_instance1,user2=user_instance2).exists() or Friend.objects.filter(user1=user_instance2, user2=user_instance1).exists():
                friendship = Friend.objects.filter(user1=user_instance1,user2=user_instance2) | Friend.objects.filter(user1=user_instance2,user2=user_instance1)
                friendship.delete()
                return responses.success_response("Friendship deleted successfully", status.HTTP_200_OK)
        except Exception as e:
            return responses.error_response(f"An error occurred {e}", None, status.HTTP_400_BAD_REQUEST)
        return responses.error_response("Bad Request there is no friendship", None, status.HTTP_400_BAD_REQUEST)