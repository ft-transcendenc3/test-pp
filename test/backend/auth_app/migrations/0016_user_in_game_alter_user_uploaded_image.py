# Generated by Django 5.1.7 on 2025-03-13 05:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_app', '0015_user_secret_otp_user_tow_factor_auth_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='in_game',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='user',
            name='uploaded_image',
            field=models.ImageField(blank=True, null=True, upload_to='profile_pics/'),
        ),
    ]
