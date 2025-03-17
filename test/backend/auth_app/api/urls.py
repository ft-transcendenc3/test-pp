from django.urls import path
from .views import (

    SignupApi, LoginApi, LogoutApi, RefreshTokenApi, Oauth2AuthorizeApi, Oauth2CallbackApi, ListAllUsers,
    ListUser, GetUserById, DeleteUserProfile, UpdateFields, GetUserByUserName, UpdatePassword, UserSearch
)
from .views1 import SendInvitation, AcceptInvitation, RejectInvitation, ListPendingInvitations, ListFriends, RemoveFriend
from ._2FactorAuth import Enable2FA, Disable2FA, Verify2FA

urlpatterns = [


    path('signup/', SignupApi.as_view()), #POST signup Form
    path('login/', LoginApi.as_view()), #POST Login Form
    path('logout/', LogoutApi.as_view()), #GET

    path('oauth2/authorize', Oauth2AuthorizeApi.as_view(), name='authorize'),
    path('oauth2/callback', Oauth2CallbackApi.as_view(), name='callback'),
    
    path('token/refresh', RefreshTokenApi.as_view(), name='token_refresh'), #GET

    path('users/', ListAllUsers.as_view()), #GET 
    path('user/', ListUser.as_view()), #GET
    path('user/<int:id>', GetUserById.as_view()), #GET user infos by id.
    path('user/<str:username>', GetUserByUserName.as_view()), #GET user infos by username.
    path('user/search/', UserSearch.as_view()),

    path('user/update/', UpdateFields.as_view()), #PUT
    path('user/update/password', UpdatePassword.as_view()), #PUT
    path('delete-profile/', DeleteUserProfile.as_view()), #DELETE


    path('invitation/send/<int:id>', SendInvitation.as_view()), #POST 
    path('invitation/accept/<int:id>', AcceptInvitation.as_view()), #PUT
    path('invitation/reject/<int:id>', RejectInvitation.as_view()), #DELETE
    path('invitation/list', ListPendingInvitations.as_view()), #GET
    path('friend/list', ListFriends.as_view()), #GET
    path('friend/remove/<int:id>', RemoveFriend.as_view()), #DELETE

    path('2fa/enable', Enable2FA.as_view()),
    path('2fa/disable', Disable2FA.as_view()),
    path('2fa/verify', Verify2FA.as_view()),

]

