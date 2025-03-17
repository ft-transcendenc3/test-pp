from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from auth_app.models import Invitation, Friend

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    # image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'full_name',
            'image_url',
            'uploaded_image',
            'bio',
            'total_game_played',
            'score'
        ]
    
    # def get_image_url(self, obj):
    #     return obj.get_img_path()

class UpdatePasswordSerializer(serializers.ModelSerializer):
    old_password = serializers.CharField(write_only=True, required=True)
    pass1 = serializers.CharField(write_only=True, required=True)
    pass2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['old_password', 'pass1', 'pass2']

    def validate_old_password(self, value):
        user = self.instance
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect")
        return value

    def validate(self, data):
        if data['pass1'] != data['pass2']:
            raise serializers.ValidationError({
                "pass2": "The two password fields didn't match."
            })
        try:
            validate_password(data['pass1'])
        except ValidationError as e:
            raise serializers.ValidationError({
                "pass1": list(e.messages)
            })

        return data

    def update(self, instance, validated_data):
        instance.set_password(validated_data['pass1'])
        instance.save()
        return instance

class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'username', 'full_name', 'bio', 'image_url', 'uploaded_image']
        extra_kwargs = {
            'email': {'required': False},
            'username': {'required': False},
        }
        def validate_username(self, value):
            if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Username already taken.")
            return value
        def validate_email(self, value):
            if User.objects.filter(email=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Email already taken.")
            return value

class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["full_name", "username", "email", "password"]

    def validate(self, validated_data):
        if User.objects.filter(username=validated_data['username']).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})

        if User.objects.filter(email=validated_data['email']).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})

        return validated_data

    def create(self, validated_data):
        return User.objects.create_user(
            full_name=validated_data['full_name'],
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")
        User = authenticate(email=email, password=password)
        if not User:
            raise serializers.ValidationError("Invalid email or password")
        return {"user": User}

class ListAllUsersSer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 
            'full_name', 
            'username', 
            'email', 
            'score'
        ]

class ListPendingInvitationsSer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ['id', 'sender', 'receiver']

class FriendListSer(serializers.ModelSerializer):
    class Meta:
        model = Friend
        fields = ['id', 'user1', 'user2']