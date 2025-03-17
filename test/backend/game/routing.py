from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/pongOnline/<int:id>', consumers.onlineGameConsumer.as_asgi()),
    path('ws/pongLocal/', consumers.localGameConsumer.as_asgi()),
    path('ws/pongTournement/', consumers.TournamentGameConsumer.as_asgi()),

    # re_path(r'ws/ball/(?P<game_id>[a-f0-9-]+)/$', consumers.ballConsumer.as_asgi()),
]