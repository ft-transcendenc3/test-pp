from channels.generic.websocket import AsyncWebsocketConsumer
import json
import math
import uuid
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
import random
import asyncio
from django.contrib.auth import get_user_model

# # from auth import settings
# # from auth_app.models import User

# @database_sync_to_async
# def get_user_by_id(user_id):
#     return User.objects.get(id=user_id)


class  Game:
    def __init__(self, game_id):
        self.game_id = game_id
        self.players = {}
        self.ball = {'x' : 0, 'y' : 0.125, 'z' : 0, 'posChangeX' : 0.07, 'posChangeZ' : 0.07, 'speed' : 0.07 , 'radius' : 0.125}
        self.running = False
    def check_collision(self, player):
        return (
            player['top'] >= self.ball['bottom'] and 
            player['bottom'] <= self.ball['top'] and 
            player['right'] >= self.ball['left'] and 
            player['left'] <= self.ball['right']
        )
    def restart_ball(self):
        self.ball.update({
            "x" : 0, "z" : 0,
            "posChangeX" : (self.ball['posChangeX']/ self.ball['speed'] * 0.07),
            "posChangeZ" : (-(self.ball['posChangeZ']/ self.ball['speed']) * 0.07),
            "speed" : 0.07
        })
    async def broadcast_state(self):
        await get_channel_layer().group_send(
            f"game_group_{self.game_id}",
            {"type" : "game_update", "data" : {"type": "update", "players" : self.players, "ball" : self.ball}},
        )
class onlineGameConsumer(AsyncWebsocketConsumer):
    games = {}
    waiting_player = None
    active_connections = {}
    async def connect(self):
        User = get_user_model()
        await self.accept()
        self.id = self.scope['url_route']['kwargs'].get('id')
        print(f"Received ID: {self.id}")
        try:
            self.player = await database_sync_to_async(User.objects.get)(id=self.id)
        except User.DoesNotExist:
            await self.send(text_data=json.dumps({"type": "error", "message": "Player not found."}))
            return
        if self.player.in_game :
            await self.send(text_data=json.dumps({"type": "error", "message": "You are already in a game!"}))
            return
        if  self.id in onlineGameConsumer.active_connections:
            await self.send(text_data=json.dumps({"type": "error", "message": "You are already in a game!"}))
            return
        onlineGameConsumer.active_connections[self.id] = self
        if onlineGameConsumer.waiting_player is None:

            onlineGameConsumer.waiting_player = self
            await self.send(text_data=json.dumps({"type" : "waiting", "message" : "waiting for an opponent ..."}))
        else:
            # print("here")
            opponent = onlineGameConsumer.waiting_player
            onlineGameConsumer.waiting_player = None
            self.player.in_game = True
            await database_sync_to_async(self.player.save)()
            opponent_player = await database_sync_to_async(get_user_model().objects.get)(id=opponent.id)
            opponent_player.in_game = True
            await database_sync_to_async(opponent_player.save)()
            await self.start_game(opponent)
    async def start_game(self, opponent):
        game_id = str(uuid.uuid4())
        game = Game(game_id)
        onlineGameConsumer.games[game_id] = game

        self.player_id = "player1"
        opponent.player_id = "player2"
        game.players[self.player_id] = {
            "name": self.player.username , "x" : 0, "y" : 0.125, "z" : 4.875, "paddleSizeX" : 0.7, "paddleSizeZ":  0.125, "speed": 0.07,  "padSize" : 0, "top" : 0,
            "bottom" : 0, "right": 0, "left" : 0, 'score' : 0
        }
        game.players[opponent.player_id] = {
            "name": opponent.player.username ,"x" : 0, "y" : 0.125, "z" : -4.875, "paddleSizeX" : 0.7, "paddleSizeZ":  0.125, "speed": 0.07,  "padSize" : 0, "top" : 0,
            "bottom" : 0, "right": 0, "left" : 0, 'score' : 0
        }
        self.game_id = game_id
        opponent.game_id = game_id

        await self.channel_layer.group_add(f"game_group_{game_id}", self.channel_name)
        await self.channel_layer.group_add(f"game_group_{game_id}", opponent.channel_name)
        await self.send(text_data=json.dumps({"type" : "match_found", "game_id" : game_id, "player" : self.player_id}))
        await opponent.send(text_data=json.dumps({"type" : "match_found", "game_id" : game_id, "player" : opponent.player_id}))
        game.running = True
    async def receive(self, text_data):
        game = onlineGameConsumer.games.get(getattr(self, "game_id", None))
        if not game or not hasattr(self, "player_id") or self.player_id not in game.players:
            return
        try:
            data = json.loads(text_data)
            player1 = game.players["player1"]
            player2 = game.players["player2"]
            
            self.move_ball(game, player1, player2)
            self.move_player(game, data)
            await game.broadcast_state()
            await self.endGame(game, player1, player2)
        except json.JSONDecodeError:
            return
    def move_ball(self, game, player1, player2):
        game.ball["top"] = game.ball["x"] + game.ball["radius"]
        game.ball['bottom'] = game.ball['x'] - game.ball['radius']
        game.ball['right'] = game.ball['z'] + game.ball['radius']
        game.ball['left'] = game.ball['z'] - game.ball['radius']
        player = game.players[self.player_id]
        for player in game.players.values():
            if game.check_collision(player):
                hit_point = (game.ball['x'] - player['x'] )/ (player["paddleSizeX"]/2 + player["paddleSizeZ"]/2)
                angleMove = hit_point * (math.pi / 5)
                if game.ball['z'] < 0:
                    game.ball['posChangeZ'] = game.ball['speed'] * math.cos(angleMove)
                elif game.ball['z'] > 0:
                    game.ball['posChangeZ'] = -game.ball['speed'] * math.cos(angleMove)
                game.ball['posChangeX'] = game.ball["speed"] * math.sin(angleMove)
        if game.ball['z'] <= -5:
            player1['score'] += 1
            game.restart_ball()
        if game.ball['z'] >= 5:
            player2['score'] += 1
            game.restart_ball()
        # print(player['score'])
        if game.ball['z'] <= -5 or game.ball['z'] >= 5:
            game.restart_ball()
        if game.ball['x'] - game.ball['radius'] <= -2.5 or game.ball['x'] + game.ball['radius'] >= 2.5 :
            game.ball['posChangeX'] *= -1
        game.ball["x"] += game.ball["posChangeX"]
        game.ball["z"] += game.ball["posChangeZ"]
    def move_player(self, game, data) :
        player = game.players[self.player_id]
        player['padSize'] = player['paddleSizeX'] / 2 + player['paddleSizeZ'] / 2
        if data.get('upKey') and player['x'] + player['padSize'] + player['speed'] < 2.5:
            player['x'] += player['speed']
        if data.get('downKey') and player['x'] - player['padSize'] - player['speed'] > -2.5:
            player['x'] -= player['speed']
        player['top'] = player['x'] + player['padSize']
        player['bottom'] = player['x'] - player['padSize']
        player['right'] = player['z'] + player['paddleSizeZ']
        player['left'] = player['z'] - player['paddleSizeZ']
    async def game_update(self, event):
        # else :
        await self.send(text_data=json.dumps(event['data']))
        if event['data']['type'] == "endGame":
            await self.close()
            await self.channel_layer.group_discard(f"game_group_{self.game_id}", self.channel_name)
    async def endGame(self, game ,player1, player2):
        # print(player1['score'])
        if player1['score'] == 5 or player2['score'] == 5:
            # await game.broadcast_state()
            if player1['score'] == 5:
                await get_channel_layer().group_send(
                    f"game_group_{self.game_id}",
                    {"type" : "game_update", "data" :{"type" : "endGame", "winner" : player1, "loser" : player2}},
                )
            elif player2['score'] == 5:
                await get_channel_layer().group_send(
                    f"game_group_{self.game_id}",
                    {"type" : "game_update", "data" :{"type" : "endGame", "winner" : player2, "loser" : player1}},
                )
    async def disconnect(self, close_code):
    # First check if this is a player in the waiting state
        if hasattr(self, 'id') and onlineGameConsumer.waiting_player and onlineGameConsumer.waiting_player.id == self.id:
            onlineGameConsumer.waiting_player = None
        
        # Remove from active connections if present
        if hasattr(self, 'id') and self.id in onlineGameConsumer.active_connections:
            del onlineGameConsumer.active_connections[self.id]
        
        # Update player's in_game status in database
        if hasattr(self, 'player'):
            self.player.in_game = False
            await database_sync_to_async(self.player.save)()
        
        # Handle game cleanup if player was in a game
        game = onlineGameConsumer.games.get(getattr(self, "game_id", None))
        if game and hasattr(self, "player_id") and self.player_id in game.players:
            # Notify opponent
            opponent_id = "player1" if self.player_id == "player2" else "player2"
            opponent = game.players.get(opponent_id)
            if opponent:
                await self.channel_layer.group_send( 
                    f"gamegroup{self.game_id}",
                    {"type": "game_update", "data": {"type" : "endGame", "winner" : game.players[opponent_id], "loser" :  game.players[self.player_id]}},
                )
            else:
                await self.channel_layer.group_send( 
                    f"gamegroup{self.game_id}",
                    {"type": "game_update", "data": {"type" : "endGame", "loser" :  game.players[self.player_id]}},
                )
                
            # Clean up game
            if self.game_id in onlineGameConsumer.games:
                del onlineGameConsumer.games[self.game_id]
            
            # Remove from game group
            await self.channel_layer.group_discard(f"game_group_{self.game_id}", self.channel_name)
        
        # await self.close()

class localGameConsumer(AsyncWebsocketConsumer):
    games = {}
    waiting_player = None

    async def connect(self):
        await self.accept()
        await self.start_game()
    async def start_game(self):
        game_id = str(uuid.uuid4())
        game = Game(game_id)
        localGameConsumer.games[game_id] = game

        self.player1_id = "player1"
        self.player2_id = "player2"
        game.players[self.player1_id] = {
            "x" : 0, "y" : 0.125, "z" : 4.875, "paddleSizeX" : 0.7, "paddleSizeZ":  0.125, "speed": 0.07,  "padSize" : 0, "top" : 0,
            "bottom" : 0, "right": 0, "left" : 0, 'score' : 0
        }
        game.players[self.player2_id] = {
            "x" : 0, "y" : 0.125, "z" : -4.875, "paddleSizeX" : 0.7, "paddleSizeZ":  0.125, "speed": 0.07,  "padSize" : 0, "top" : 0,
            "bottom" : 0, "right": 0, "left" : 0, 'score' : 0
        }
        self.game_id = game_id

        await self.send(text_data=json.dumps({"type" : "match_found", "game_id" : game_id, "player1" : self.player1_id, "player2" : self.player2_id}))
        # await opponent.send(text_data=json.dumps({"type" : "match_found", "game_id" : game_id, "player" : opponent.player_id}))
        game.running = True
    async def receive(self, text_data):
        game = localGameConsumer.games.get(getattr(self, "game_id", None))
        if not game:
            return
        try:
            data = json.loads(text_data)
            mode = data.get('mode')
            player1 = game.players[self.player1_id]
            player2 = game.players[self.player2_id]

            
            self.move_player(data, player1, 1)
            if mode == 'Ai' :
                self.move_AiPlayer(game, player2)
            else:
                self.move_player(data, player2, 2)
            self.move_ball(game, player1, player2)
            await self.send(text_data=json.dumps({"type" : "game_update",  "players" :  game.players, "ball" : game.ball},))
            await self.endGame(player1, player2)
        except json.JSONDecodeError:
            return
    def move_ball(self, game, player1, player2):
        game.ball["top"] = game.ball["x"] + game.ball["radius"]
        game.ball['bottom'] = game.ball['x'] - game.ball['radius']
        game.ball['right'] = game.ball['z'] + game.ball['radius']
        game.ball['left'] = game.ball['z'] - game.ball['radius']
        for player in game.players.values():
            if game.check_collision(player):
                hit_point = (game.ball['x'] - player['x']) / (player["paddleSizeX"]/2 + player["paddleSizeZ"]/2)
                angleMove = hit_point * (math.pi / 5)
                if game.ball['z'] < 0:
                    game.ball['posChangeZ'] = game.ball['speed'] * math.cos(angleMove)
                elif game.ball['z'] > 0:
                    game.ball['posChangeZ'] = -game.ball['speed'] * math.cos(angleMove)
                game.ball['posChangeX'] = game.ball["speed"] * math.sin(angleMove)
                if game.ball['speed'] < 1 :
                    game.ball['speed'] += 0.005
        if game.ball['z'] <= -5:
            player1['score'] += 1
            game.restart_ball()
        if game.ball['z'] >= 5:
            player2['score'] += 1
            game.restart_ball()
        if game.ball['x'] - game.ball['radius'] <= -2.5 or game.ball['x'] + game.ball['radius'] >= 2.5 :
            game.ball['posChangeX'] *= -1
        game.ball["x"] += game.ball["posChangeX"]
        game.ball["z"] += game.ball["posChangeZ"]
    def move_player(self, data, player, pnum) :
        player['padSize'] = player['paddleSizeX'] / 2 + player['paddleSizeZ'] / 2
        if (data.get(f'upKey{pnum}') or data.get('upKey') ) and player['x'] + player['padSize'] + player['speed'] < 2.5:
            player['x'] += player['speed']
        if (data.get(f'downKey{pnum}')  or data.get('downKey') ) and player['x'] - player['padSize'] - player['speed'] > -2.5:
            player['x'] -= player['speed']
        player['top'] = player['x'] + player['padSize']
        player['bottom'] = player['x'] - player['padSize']
        player['right'] = player['z'] + player['paddleSizeZ']
        player['left'] = player['z'] - player['paddleSizeZ']
    def move_AiPlayer(self, game, player) :
        player['padSize'] = player['paddleSizeX'] / 2 + player['paddleSizeZ'] / 2
        player['speed'] = abs(game.ball['x'] - player['x']) / (abs(game.ball['z'] - player['z']) * 10)
        player['speed'] = min(player['speed'], 0.1)
        if game.ball['x'] < player['x'] - player['padSize'] or game.ball['x'] > player['x'] + player['padSize']:
            if player['x'] - player['padSize'] > game.ball['x'] and player['x'] - player['padSize'] > game.ball['x'] and player['x'] - player['padSize']  - player['speed'] > -2.5 :
                player['x'] -= player['speed']
            elif player['x'] + player['padSize'] < game.ball['x'] and player['x'] + player['padSize'] < game.ball['x'] and player['x']+ player['padSize'] + player['speed'] < 2.5 :
                player['x'] += player['speed']
        player['top'] = player['x'] + player['padSize']
        player['bottom'] = player['x'] - player['padSize']
        player['right'] = player['z'] + player['paddleSizeZ']
        player['left'] = player['z'] - player['paddleSizeZ']
    async def endGame(self, player1, player2):
        # print(player1['score'])
        if player1['score'] == 5 or player2['score'] == 5:
            if player1['score'] == 5:
                await self.send(text_data=json.dumps({"type" : "endGame", "winner" : player1, "loser" : player2}))
            elif player2['score'] == 5:
                await self.send(text_data=json.dumps({"type" : "endGame", "winner" : player2, "loser" : player1}))
            await self.close()
class TournamentGameConsumer(AsyncWebsocketConsumer):
    games = {}
    nicknames = {}
    waiting_player = None
    tournament_players = []
    match_winners = []
    current_match = 0
    player1_id = 0
    player2_id = 0

    async def connect(self):
        await self.accept()

    async def start_tournament(self, players):
        if len(players) != 4:
            await self.send(text_data=json.dumps({"type": "error", "message": "You need exactly four players to start the tournament"}))
            return

        self.tournament_players = players
        self.current_match = 0
        self.match_winners = []
        await self.start_game()

    async def start_game(self):
        if self.current_match < 2:
            self.player1_id = self.tournament_players[self.current_match * 2]
            self.player2_id = self.tournament_players[self.current_match * 2 + 1]
        else:
            self.player1_id = self.match_winners[0]
            self.player2_id = self.match_winners[1]

        game_id = str(uuid.uuid4())
        game = Game(game_id)
        TournamentGameConsumer.games[game_id] = game

        game.players[self.player1_id] = {
            "nickname": self.nicknames[self.player1_id],
            "x": 0, "y": 0.125, "z": 4.875, "paddleSizeX": 0.7, "paddleSizeZ": 0.125, "speed": 0.07, "padSize": 0, "top": 0,
            "bottom": 0, "right": 0, "left": 0, 'score': 0
        }
        game.players[self.player2_id] = {
            "nickname": self.nicknames[self.player2_id],
            "x": 0, "y": 0.125, "z": -4.875, "paddleSizeX": 0.7, "paddleSizeZ": 0.125, "speed": 0.07, "padSize": 0, "top": 0,
            "bottom": 0, "right": 0, "left": 0, 'score': 0
        }
        self.game_id = game_id

        # Reset paddle positions and attributes
        # self.reset_paddles(game)

        await self.send(text_data=json.dumps({"type": "match_found", "game_id": game_id, "player1": self.player1_id, "player2": self.player2_id}))
        game.running = True

    # def reset_paddles(self, game):
    #     for player in game.players.values():
    #         player['x'] = 0
    #         player['y'] = 0.125
    #         player['paddleSizeX'] = 0.7
    #         player['paddleSizeZ'] = 0.125
    #         player['speed'] = 0.07
    #         player['padSize'] = 0
    #         player['top'] = 0
    #         player['bottom'] = 0
    #         player['right'] = 0
    #         player['left'] = 0
    #         player['score'] = 0

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            # print(data)
            if data.get("type") == "set_nickname":
                self.nicknames['player1'] = data.get('nickname1')
                self.nicknames['player2'] = data.get('nickname2')
                self.nicknames['player3'] = data.get('nickname3')
                self.nicknames['player4'] = data.get('nickname4')
                await self.start_tournament(['player1', 'player2', 'player3', 'player4'])
                return

            game = TournamentGameConsumer.games.get(getattr(self, "game_id", None))
            if not game:
                return
            player1 = game.players[self.player1_id]
            player2 = game.players[self.player2_id]

            self.move_player(data, player1, 1)
            self.move_player(data, player2, 2)
            self.move_ball(game, player1, player2)
            await self.send(text_data=json.dumps({"type": "game_update", "players": game.players, "ball": game.ball}))
            await self.end_game(player1, player2)
        except json.JSONDecodeError:
            return

    async def end_game(self, player1, player2):
        if player1['score'] == 5 or player2['score'] == 5:
            if player1['score'] == 5:
                winner = self.player1_id
                loser = self.player2_id
            else:
                winner = self.player2_id
                loser = self.player1_id

            self.match_winners.append(winner)
            await self.send(text_data=json.dumps({"type": "end_game", "winner": winner, "loser": loser}))
            self.current_match += 1

            if self.current_match == 3:
                await self.send(text_data=json.dumps({"type": "tournament_end", "champion": winner}))
                await self.close()
            else:
                await self.start_game()

    def move_ball(self, game, player1, player2):
        game.ball["top"] = game.ball["x"] + game.ball["radius"]
        game.ball['bottom'] = game.ball['x'] - game.ball['radius']
        game.ball['right'] = game.ball['z'] + game.ball['radius']
        game.ball['left'] = game.ball['z'] - game.ball['radius']
        for player in game.players.values():
            if game.check_collision(player):
                hit_point = (game.ball['x'] - player['x']) / (player["paddleSizeX"]/2 + player["paddleSizeZ"]/2)
                angleMove = hit_point * (math.pi / 5)
                if game.ball['z'] < 0:
                    game.ball['posChangeZ'] = game.ball['speed'] * math.cos(angleMove)
                elif game.ball['z'] > 0:
                    game.ball['posChangeZ'] = -game.ball['speed'] * math.cos(angleMove)
                game.ball['posChangeX'] = game.ball["speed"] * math.sin(angleMove)
                if game.ball['speed'] < 1 :
                    game.ball['speed'] += 0.005
        if game.ball['z'] <= -5:
            player1['score'] += 1
            game.restart_ball()
        if game.ball['z'] >= 5:
            player2['score'] += 1
            game.restart_ball()
        if game.ball['x'] - game.ball['radius'] <= -2.5 or game.ball['x'] + game.ball['radius'] >= 2.5 :
            game.ball['posChangeX'] *= -1
        game.ball["x"] += game.ball["posChangeX"]
        game.ball["z"] += game.ball["posChangeZ"]

    def move_player(self, data, player, pnum):
        player['padSize'] = player['paddleSizeX'] / 2 + player['paddleSizeZ'] / 2
        if (data.get(f'upKey{pnum}') or data.get('upKey') ) and player['x'] + player['padSize'] + player['speed'] < 2.5:
            player['x'] += player['speed']
        if (data.get(f'downKey{pnum}')  or data.get('downKey') ) and player['x'] - player['padSize'] - player['speed'] > -2.5:
            player['x'] -= player['speed']
        player['top'] = player['x'] + player['padSize']
        player['bottom'] = player['x'] - player['padSize']
        player['right'] = player['z'] + player['paddleSizeZ']
        player['left'] = player['z'] - player['paddleSizeZ']