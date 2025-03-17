import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import game.routing  # Import your WebSocket URL patterns
# import django  # Missing this at the top



os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
# django.setup()
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            game.routing.websocket_urlpatterns  # Use the WebSocket URL patterns
        )
    ),
})