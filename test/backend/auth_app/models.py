from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
# from .managers import UserManager  # Import the custom manager

class UserManager(BaseUserManager):
    """
    Custom manager for User model.
    """
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with the given email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True.')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

    def get_by_natural_key(self, email):
        """
        Retrieve a user by their natural key (email in this case).
        """
        return self.get(email=email)

class User(AbstractBaseUser, PermissionsMixin):
    full_name = models.CharField(max_length=50, null=False, blank=False)
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True, blank=False, null=False)
    password = models.CharField(max_length=128)

    uploaded_image = models.ImageField(upload_to="profile_pics/", blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    bio = models.CharField(max_length=3000, blank=True, null=True)

    total_game_played = models.IntegerField(default=0)
    score = models.IntegerField(default=0)
    
    friends = models.ManyToManyField("Friend",symmetrical=True)
    invitations = models.ManyToManyField("Invitation", related_name="Invitation")

    tow_factor_auth = models.BooleanField(default=False)
    secret_otp = models.CharField(max_length=5000, null=False, blank=False)

    in_game = models.BooleanField(default=False)
 
    creation_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    # Required fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Specify the unique identifier for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    # Attach the custom manager
    objects = UserManager()

    def __str__(self):
        return self.username
    
    @property
    def user_id(self):
        return self.id
    
    def get_img_path(self):
        """
        Returns the image path based on whether an uploaded image is available.

        uploaded_image: The uploaded image path (or None if not available).
        image_url: The default image URL to use if no uploaded image is available.

        Returns:
            The path to the image (either uploaded_image or image_url).
        """
        return self.image_url if not self.uploaded_image  else self.uploaded_image
    

class Friend(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friends_user1")
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name="friends_user2")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user1.username} and {self.user2.username} are friends"
    
    def save(self, *args, **kwargs):
        if self.user1.id > self.user2.id:
            self.user1, self.user2 = self.user2, self.user1
        
        existing_friendship = Friend.objects.filter(user1=self.user1, user2=self.user2).exists()
        
        if not existing_friendship:
            super().save(*args, **kwargs)
        else:
            raise (f"Friendship between {self.user1.username} and {self.user2.username} already exists.")
        

class Invitation(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_invitations")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_invitations")
    created_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)

    def __str__(self):
        return f"Invitation from {self.sender.username} to {self.receiver.username}"

    def save(self, *args, **kwargs):
        existing_invitation = Invitation.objects.filter(sender=self.sender, receiver=self.receiver).exists()
        
        if not existing_invitation:
            super().save(*args, **kwargs)
        else:
            raise(f"Invitation from {self.sender.username} to {self.receiver.username} already exists.")