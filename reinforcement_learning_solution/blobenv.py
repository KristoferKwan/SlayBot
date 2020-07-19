from player import Player
import numpy as np
import cv2
import random
import os
from PIL import Image
import pickle
from obstacle import Obstacle
from projectile import Projectile
from items import Item
import math
import copy
import time


def render_env_image(env):
    img = Image.fromarray(env, 'RGB')
    img = img.resize((300, 300), resample=Image.BOX)  # resizing so we can see our agent in all its glory.
    cv2.imshow("image", np.array(img))  # show it!
    cv2.waitKey(1)

class BlobEnv:
    SIZE = 60
    RETURN_IMAGES = False
    HAVE_ENEMY = True
    NUM_ENEMIES = 5
    MOVE_PENALTY = 1
    DEATH_PENALTY = 500
    OBSTACLE_PENALTY = 5
    HIT_PENALTY = 100
    KILL_REWARD = 500
    ITEM_REWARD = 150
    OBSERVATION_SPACE_VALUES = (52, 4)  # 4
    ACTION_SPACE_SIZE = 9
    PLAYER_N = 1  # player key in dict
    FOOD_N = 2  # food key in dict
    ENEMY_N = 3  # enemy key in dict
    OBSTACLE_N = 4 # obstacle key in dict
    HEALINGITEM_N = 5
    WEAPON_N = 6
    HIT = 7
    PROJECTILE_N = 8
    PATH_N = 9
    NUM_PLAYER_SLOTS = 20
    NUM_ITEM_SLOTS = 20
    NUM_PROJECTILE_SLOTS = 20
    # the dict! (colors)
    d = {
            1: [255, 175, 0],
            2: [0, 255, 0],
            3: [0, 0, 255],
            4: [255, 255, 255],
            5: [0, 255, 255],
            6: [0, 255, 128],
            7: [51, 153, 255],
            8: [255, 128, 0],
            9: [255, 102, 255]
        }
    
    item_id = {
        1000: "medkit",
        1001: "armor",
        1: "grenade",
        2: "flamethrower",
        3: "machinegun",
        4: "rocket",
        5: "greenLazer",
        6: "homingrocket",
        7: "redrocket",
        8: "sniper",
        9: "shotgun",
        11: "rapidgrenade"
    } 

    obstacles = list()
    items = list()
    spawn_points = list()
    projectiles = dict()
    players = list()
    player_dict = dict()
    available_player_slots = [0] * 20
    available_projectile_slots = [0] * 20
    playerid_observation_slot = dict() # playerID: index in env
    projectileid_observation_slot = dict() # index in env: projectileID

    def __init__(self):
        self.env = np.zeros((self.SIZE, self.SIZE, 3), dtype=np.uint8)  # starts an rbg of our size
        self.default_env = self.create_default_env("the_bay")
        self.player_env = np.zeros((self.SIZE, self.SIZE), dtype=np.uint8)
        self.collision_env = self.create_default_env("the_bay")
        self.player = None

    def remove_player(self, player):
        player_index = self.playerid_observation_slot[player.id]
        self.available_player_slots[player_index] = 0
        del self.playerid_observation_slot[player.id]

    def update_player_env(self):
        new_player_env = np.zeros((self.SIZE, self.SIZE), dtype=np.uint8)
        new_players_list = list()
        new_players_dict = dict()
        for player in self.players:
            if not player.kill:
                new_player_env[math.floor(player.y)][math.floor(player.x)] = player.id
                new_players_list.append(player)
                new_players_dict[player.id] = player
            else:
                self.remove_player(player)
        self.player_env = new_player_env
        self.players = new_players_list
        self.player_dict = new_players_dict

    def create_default_env(self, map_):
        self.generate_obstacles(map_)
        default_env = np.zeros((self.SIZE, self.SIZE, 3), dtype=np.uint8)
        for obstacle in self.obstacles:
            default_env[obstacle.y][obstacle.x] = self.d[self.OBSTACLE_N]
        return default_env


    def generate_obstacles(self, map_):
        map_file = open(f"./maps/{map_.lower().replace(' ', '_')}.pickle", "rb")
        map_info = pickle.load(map_file)
        tiles_file = open("./maps/texture_id_map.pickle", "rb") 
        tiles_info = pickle.load(tiles_file)
        
        nontiles_file = open("./maps/nontile_id_map.pickle", "rb") 
        nontiles_info = pickle.load(nontiles_file)   

        #print(tiles_info)
        items = map_info["ammo"]
        tiles = map_info["groundTiles"]
        nontiles = map_info["tiles"]
        self.spawn_points = map_info["spawningPoints"]
        self.items = list()
        self.obstacles = list()

        for item in items:
            self.items.append(Item(self.SIZE, x=item["x"], y=item["y"], weapon=item["weapon"]))
            

        for tile in tiles:
            if tiles_info[tile["id"]].lower().find("water") != -1:

                if tile["x"] >= 0 and tile["x"] < self.SIZE and tile["y"] >= 0 and tile["y"] < self.SIZE:
                    self.obstacles.append(Obstacle(self.SIZE, x=tile["x"], y=tile["y"]))

        for tile in nontiles:
            if nontiles_info[tile["id"]].lower().find("torch") == -1:
                if nontiles_info[tile["id"]].lower().find("2x2") != -1:
                    for i in range(2):
                        for j in range(2):
                            temp_x = tile["x"] + i
                            temp_y = tile["y"] + j
                            if temp_x >= 0 and temp_x < self.SIZE and temp_y >= 0 and temp_y < self.SIZE:
                                self.obstacles.append(Obstacle(self.SIZE, x=temp_x, y=temp_y))
                else:     
                    if tile["x"] >= 0 and tile["x"] < self.SIZE and tile["y"] >= 0 and tile["y"] < self.SIZE:
                        self.obstacles.append(Obstacle(self.SIZE, x=tile["x"], y=tile["y"]))


    def add_player(self, player):
        self.player_dict[player.id] = player
        self.players.append(player)

    def get_available_slot(self, category):
        if category == "player":
            for i in range(len(self.available_player_slots)):
                if self.available_player_slots[i] == 0:
                    return i
        elif category == "projectile":
            for i in range(len(self.available_projectile_slots)):
                if self.available_projectile_slots[i] == 0:
                    return i
        return -1

    def reset(self):
        self.obstacles = list()
        self.items = list()
        self.spawn_points = list()
        self.projectiles = dict()
        self.players = list()
        self.player_dict = dict()
        self.available_player_slots = [0] * 20
        self.available_projectile_slots = [0] * 20
        self.playerid_observation_slot = dict()  # playerID: index in env
        self.projectileid_observation_slot = dict()  # index in env: projectileID
        self.generate_obstacles("the_bay")
        spawning_point = random.choice(self.spawn_points)
        # spawning_point = self.spawn_points[0]
        self.player = Player(self.SIZE, spawning_point, 107, ID=1)
        self.add_player(self.player)

        locations = set()
        locations.add((self.player.x, self.player.y))
        #print(self.player)

        if self.HAVE_ENEMY:
            for i in range(self.NUM_ENEMIES):
                enemy = Player(self.SIZE, random.choice(self.spawn_points), 25, ID=i+2)
                location = (enemy.x, enemy.y)
                while location in locations:
                    enemy = Player(self.SIZE, random.choice(self.spawn_points), 25, ID=i+2)
                    location = (enemy.x, enemy.y)
                locations.add(location)
                self.add_player(enemy)
                #self.playerid_observation_slot[enemy.id] = i

        self.episode_step = 0

        if self.RETURN_IMAGES:
            observation = np.array(self.get_image())
        else:
            enemyObservations = self.getEnemyObservations()
            itemObservations = self.getItemsObservations()
            projectileObservations = self.getProjectileObservations()
            obstacleObservations = self.getObstacleObservations()
            observation = np.array(
                enemyObservations + itemObservations + projectileObservations + [obstacleObservations[:4]] + [
                    obstacleObservations[4:]])
        #print(observation.shape)
        self.update_player_env()

        return observation

    def angle(self, angle):
        y = math.sin(math.radians(angle)) * 5
        x = math.cos(math.radians(angle)) * 5
        return [x, y]

    def determine_angle(self, changex, changey):
        if changex != 0:
            angle = abs(math.degrees(math.atan(changey/changex)))
        else:
            angle = 90
        if changex > 0 and changey > 0:
            angle = angle
        elif changex < 0 and changey <= 0:
            angle = 180 + angle
        elif changex < 0 and changey > 0:
            angle = 180 - angle
        elif changex > 0 and changey <= 0:
            angle = 360 - angle
        return angle



    def getEnemyObservations(self, max_enemies=10, angle=False):
        if angle:
            enemies = [[0, 0, 0, 0, 0]] * max_enemies
        else:
            enemies = [[0, 0, 0, 0]] * max_enemies
        for playerid in self.player_dict:
            if playerid != self.player.id:
                enemy = self.player_dict[playerid]
                if enemy.within_viewbox(self.player):
                    if not playerid in self.playerid_observation_slot:
                        player_index = self.get_available_slot("player")
                        if player_index != -1:
                            self.available_player_slots[player_index] = playerid
                            self.playerid_observation_slot[playerid] = player_index
                    changey = enemy.y - self.player.y
                    changex = enemy.x - self.player.x
                    tempProjectile = Projectile(self.player.x, self.player.y, enemy.x, enemy.y, 0, 0)
                    collision = tempProjectile.collision(enemy.x, enemy.y, self.collision_env)
                    if not collision or collision[0] == enemy.x and collision[1] == enemy.y:
                        will_collide = 1
                    else:
                        will_collide = 0
                    if angle:
                        enemies[self.playerid_observation_slot[playerid]] = [changex, changey, enemy.health, self.determine_angle(changex, changey), will_collide]
                    if not angle:
                        enemies[self.playerid_observation_slot[playerid]] = [changex, changey, enemy.health, 1]
        return enemies

    def getItemsObservations(self, max_items=20):
        items = [[0, 0, 0, 0]] * max_items
        for i in range(len(self.items)):
            items[i] = [self.items[i].x - self.player.x, self.items[i].y - self.player.y, self.items[i].available, 2]
        return items

    def getProjectileObservations(self, max_projectiles=20):
        projectiles = [[0, 0, 0, 0]] * max_projectiles
        for projectileid in self.projectiles:
            projectile = self.projectiles[projectileid]
            if self.player.within_viewbox(projectile):
                if not projectileid in self.projectileid_observation_slot:
                    projectile_index = self.get_available_slot("projectile")
                    if projectile_index != -1:
                        self.available_projectile_slots[projectile_index] = projectileid
                        self.projectileid_observation_slot[projectileid] = projectile_index
                projectiles[self.projectileid_observation_slot[projectileid]] = [projectile.x - self.player.x, projectile.y - self.player.y, 0, 3]
        return projectiles

    def getObstacleObservations(self):
        obstacles = [11] * 8
        possible_ranges = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]]
        for i in range(1, 11):
            for j in range(len(possible_ranges)):
                x_mult = possible_ranges[j][0]
                y_mult = possible_ranges[j][1]
                check_x = self.player.x + i*x_mult
                check_y = self.player.y + i*y_mult
                if check_x >= self.SIZE or check_y >= self.SIZE or check_x < 0 or check_y < 0 or self.default_env[check_y][check_x].tolist() == self.d[self.OBSTACLE_N]:
                    obstacles[j] = min(obstacles[j],i)

        return obstacles

    def step(self, action):
        self.episode_step += 1
        reward = 0
        # x = random.randint(0, self.SIZE - 1)
        # y = random.randint(0, self.SIZE - 1)
        # while y == self.player.y:
        #     y = random.randint(0,self.SIZE - 1)
        # aim = self.angle(5)
        self.update_projectiles()
        #self.player.action(action, False, self.projectiles, self.collision_env, [self.player.x + aim[0], self.player.y + aim[1]])
        self.player.action(action, False, self.projectiles, self.collision_env, None)
        if self.player.hit_wall == 1:
            reward -= self.OBSTACLE_PENALTY
            # print(f"hit an obstacle. Minus {self.OBSTACLE_PENALTY}")
        # if self.HAVE_ENEMY: ## for player movement in the future
        #     self.enemy.move(self.env)

        #### MAYBE ###
        # enemy.move()
        # food.move()
        ##############

        for item in self.items:
            if item.available and self.player.x == item.x and self.player.y == item.y:
                reward += self.ITEM_REWARD
                item.available = 0
                # print(f"got an item. Plus {self.ITEM_REWARD} points")

        collision_env = copy.copy(self.default_env)
        for player in self.players:
            if player != self.player:
                collision_env[player.y][player.x] = self.d[self.ENEMY_N]
            else:
                collision_env[player.y][player.x] = self.d[self.PLAYER_N]

        self.collision_env = collision_env

        self.update_player_env()

        for projectile in self.projectiles:
            projectile_object = self.projectiles[projectile]
            self.projectiles[projectile].action(self.collision_env)
            if projectile_object.kill and self.player_env[projectile_object.y][projectile_object.x] != 0:
                player_id = self.player_env[projectile_object.y][projectile_object.x]
                player = self.player_dict[player_id]
                player.took_damage(projectile_object.damage)
                if player == self.player:
                    reward -= self.HIT_PENALTY
                    # print("you got hit?")
                else:
                    reward += self.KILL_REWARD
                    # print("you killed a player somehow..")

        if self.RETURN_IMAGES:
            new_observation = np.array(self.get_image())
            enemyTargetObservations = None
        else:
            enemyObservations = self.getEnemyObservations()
            itemObservations = self.getItemsObservations()
            projectileObservations = self.getProjectileObservations()
            obstacleObservations = self.getObstacleObservations()
            enemyTargetObservations = self.getEnemyObservations(angle=True)
            new_observation = np.array(enemyObservations + itemObservations + projectileObservations + [obstacleObservations[:4]] + [obstacleObservations[4:]])
        #print(new_observation)
        reward -= self.MOVE_PENALTY

        done = False
        if self.episode_step >= 200:
            done = True

        return new_observation, enemyTargetObservations, reward, done


    def render(self):        
        img = self.get_image()
        img = img.resize((300, 300), resample=Image.BOX)  # resizing so we can see our agent in all its glory.
        cv2.imshow("image", np.array(img))  # show it!
        cv2.waitKey(1)

    def update_projectiles(self):
        new_projectiles = dict()
        for projectile in self.projectiles:
            if not self.projectiles[projectile].kill:
                new_projectiles[projectile] = self.projectiles[projectile]
        self.projectiles = new_projectiles


    # FOR CNN #
    def get_image(self):
        env = np.zeros((self.SIZE, self.SIZE, 3), dtype=np.uint8)  # starts an rbg of our size
        for obstacle in self.obstacles:
            env[obstacle.y][obstacle.x] = self.d[self.OBSTACLE_N]
        for projectile in self.projectiles:
            #print(self.projectiles[projectile])
            for point in self.projectiles[projectile].path:
                env[point[1]][point[0]] = self.d[self.PATH_N]
            if not self.projectiles[projectile].kill:
                env[math.floor(self.projectiles[projectile].y)][math.floor(self.projectiles[projectile].x)] = self.d[self.PROJECTILE_N]
            else:
                env[math.floor(self.projectiles[projectile].y)][math.floor(self.projectiles[projectile].x)] = self.d[self.HIT]

        for player in self.players:
            if player != self.player:
                env[player.y][player.x] = self.d[self.ENEMY_N]
            else:
                env[player.y][player.x] = self.d[self.PLAYER_N]

        for item in self.items:
            if item.available:
                if item.weapon == 1001 or item.weapon == 1000:
                    env[item.y][item.x] = self.d[self.HEALINGITEM_N]
                else:
                    env[item.y][item.x] = self.d[self.WEAPON_N]
        self.env = env
        img = Image.fromarray(self.env, 'RGB')  # reading to rgb. Apparently. Even tho color definitions are bgr. ???
        return img


#None of the code above for this class should have you lost or confused, as long as you've been following along. We can then initialize our environment with:

