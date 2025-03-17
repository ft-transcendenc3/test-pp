from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import uuid
import json






@api_view(['GET', 'POST'])
def startGame(request):
    if request.method == 'GET':
        game = {
            'game_id' : str(uuid.uuid4()),
            'players' : {'player1': {'name' : 'player1', 'x' : '0', 'y' : '0.125', 'z' : '4.875', 'paddleSizeX' : '0.7', 'paddleSizeY' : '0.125', 'keys' : {'left' : {'A', 'a'}, 'right' : {'D', 'd'} } }, 'player2' :{'name' : 'player2', 'x' : '0', 'y' : '0.125', 'z' : '-4.875', 'paddleSizeX' : '0.7', 'paddleSizeY' : '0.125', 'keys' : {'left' : {'ArrowLeft'}, 'right' : {'ArrowRight'} } }},
            'ball' : {'x' : '0', 'y' : '0.125', 'z' : '0', 'posChange' : '0.07', 'redius' : '0.125'}
        }
        return Response(game , status=status.HTTP_201_CREATED)
    # if request.method == 'PUT':
    #     data = json.loads(request.body)
    #     player = Player.objects.get(name=data.get('name'))
    #     player.x=data.get('x')
    #     player.y=data.get('y')
    #     player.z=data.get('z')
    #     player.speed=data.get('speed',False)
    #     player.upKey=data.get('upKey',False)
    #     player.downKey=data.get('downKey')
    #     player.winning=data.get('winning', 0)
    #     player.save()
    #     return Response(request.body, status=status.HTTP_201_CREATED)
    # if request.method == 'POST':
    #     data = json.loads(request.body)
    #     if  Player.objects.filter(name=data.get('name')).exists():
    #         player = Player.objects.get(name=data.get('name'))
    #         player.x=data.get('x')
    #         player.y=data.get('y')
    #         player.z=data.get('z')
    #         player.speed=data.get('speed')
    #         player.upKey=data.get('upKey',False)
    #         player.downKey=data.get('downKey',False)
    #         player.winning=data.get('winning', 0)
    #         if player.upKey:
    #             player.x += player.speed  # Move up along x
    #         if player.downKey:
    #             player.x -= player.speed 
    #         player.save()
    #     else :
    #         player = Player(
    #             name=data.get('name'),
    #             x=data.get('x'),
    #             y=data.get('y'),
    #             z=data.get('z'),
    #             speed=data.get('speed'),
    #             upKey=data.get('upKey', False),
    #             downKey=data.get('downKey', False),
    #             winning=data.get('winning', 0)
    #         )
    #         if player.upKey:
    #             player.x += player.speed  # Move up along x
    #         if player.downKey:
    #             player.x -= player.speed  
    #         player.save()

    #         # serializer.save()
    #     return Response({'name' : player.name,
    #                      'x' : player.x,
    #                      'y' : player.y,
    #                      'z' : player.z,
    #                      'speed' : player.speed,
    #                      'upKey' : player.upKey,
    #                      'upDown' : player.downKey,
    #                      'winning' : player.winning}, status=status.HTTP_201_CREATED)
    # else:
    #     return Response(request.errors, status=status.HTTP_400_BAD_REQUEST)