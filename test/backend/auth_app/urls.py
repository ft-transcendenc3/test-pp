from django.contrib.auth import views as django_views
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [

    path('api/', include("auth_app.api.urls")),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)