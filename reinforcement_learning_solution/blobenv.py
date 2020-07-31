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
    SIZE = 20
    OBSTACLE_COLLISION = False
    PLAYER_WINDOW_SIZE = 20
    SQUARE_SIZE = 20
    RETURN_IMAGES = False
    HAVE_ENEMY = True
    USE_SPAWNPOINTS = False
    USE_DISTANCE_FOR_ITEM_REWARD = False
    NUM_ENEMIES = 2
    NUM_ITEMS = 5
    MOVE_PENALTY = 1
    DEATH_PENALTY = 500
    MAX_OBSTACLE_PENALTY = 300
    OBSTACLE_PENALTY = 300
    HIT_PENALTY = 100
    KILL_REWARD = 500
    ITEM_REWARD = 25
    OBSERVATION_SPACE_VALUES = (88, 1)  # 4
    ACTION_SPACE_SIZE = 8
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
        self.env = self.create_default_env(map_=None) # starts an rbg of our size
        self.default_env = self.create_default_env(map_=None)
        self.player_env = np.zeros((self.SIZE, self.SIZE), dtype=np.uint8)
        self.collision_env = self.create_default_env(map_=None)
        self.player = None
        self.queued_items_dict = dict()
        self.queued_items_list = list()
        self.player_steps = list()

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

    def create_default_env(self, map_, size=None, generate_items=False, num_items=None):
        self.generate_obstacles(map_, size=size, generate_items=generate_items, num_items=num_items)
        default_env = np.zeros((self.SIZE, self.SIZE, 3), dtype=np.uint8)
        for obstacle in self.obstacles:
            default_env[obstacle.y][obstacle.x] = self.d[self.OBSTACLE_N]
        for item in self.items:
            default_env[item.y][item.x] = self.d[self.WEAPON_N]
        return default_env

    def generate_square_map(self, size=None, generate_items=False, num_items=None):
        if not size:
            size = self.SIZE
        if not num_items:
            num_items = self.NUM_ITEMS
        midpoint = size // 2
        upperBound = midpoint + self.SQUARE_SIZE // 2
        lowerBound = midpoint - self.SQUARE_SIZE // 2
        for y in range(size):
            for x in range(size):
                if x <= upperBound and x >= lowerBound and y <= upperBound and y >= lowerBound:
                    self.obstacles.append(Obstacle(self.SIZE, x=x, y=y))
        if generate_items:
            for item in range(num_items):
                while True:
                    x = random.randint(0, size - 1)
                    y = random.randint(0, size - 1)
                    if x > upperBound or x < lowerBound or y > upperBound or y < lowerBound:
                        self.items.append(Item(item, self.SIZE, x=x, y=y, weapon=1))
                        break

    def generate_obstacles_preset_map(self, map_):
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

        for i in range(len(items)):
            self.items.append(Item(i, self.SIZE, x=items[i]["x"], y=items[i]["y"], weapon=items[i]["weapon"]))


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

    def generate_empty_map(self, size=None, generate_items=False, num_items=None):
        items = set()
        if not size:
            size = self.SIZE
        if not num_items:
            num_items = self.NUM_ITEMS
        if generate_items:
            for item in range(num_items):
                while True:
                    x = random.randint(0, size - 1)
                    y = random.randint(0, size - 1)
                    if (x, y) not in items:
                        self.items.append(Item(item, self.SIZE, x=x, y=y, weapon=1))
                        items.add((x, y))
                        break


    def generate_obstacles(self, map_=None, size=None, generate_items=False, num_items=None):
        if map_ == "square":
            self.generate_square_map(size=size, generate_items=generate_items)
        elif map_:
            self.generate_obstacles_preset_map(map_)
        else:
            self.generate_empty_map(size=size, generate_items=generate_items)

    def add_player(self, player):
        self.player_dict[player.id] = player
        self.players.append(player)
        self.env[player.y][player.x] = self.d[self.ENEMY_N]

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

    def valid_tile(self, env, x, y): # checks to see on the collision env if you are on a valid tile of the game, ie not an enemy nor an obstacle
        curr_position = env[y][x].tolist()
        return curr_position != self.d[self.OBSTACLE_N] and \
               curr_position != self.d[self.ENEMY_N] and \
               curr_position != self.d[self.PLAYER_N] and \
               curr_position != self.d[self.HEALINGITEM_N] and \
               curr_position != self.d[self.WEAPON_N]

    def get_random_spawnpoint(self, upperBound=None):
        if not upperBound:
            upperBound = self.SIZE
        x = random.randint(0, upperBound-1)
        y = random.randint(0, upperBound-1)
        while not self.valid_tile(self.env, x, y):
            x = random.randint(0, upperBound-1)
            y = random.randint(0, upperBound-1)
        return {"x": x, "y": y}

    def reset(self):
        self.OBSTACLE_PENALTY = self.MAX_OBSTACLE_PENALTY
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
        self.env = self.create_default_env(map_=None, generate_items=True)
        self.queued_items_dict = dict()
        self.queued_items_list = list()
        self.player_steps = list()
        if self.USE_SPAWNPOINTS:
            spawning_point = random.choice(self.spawn_points)
        else:
            spawning_point = self.get_random_spawnpoint()
            # self.collision_env[0][0] = self.d[self.PLAYER_N]
            self.collision_env[spawning_point["y"]][spawning_point["x"]] = self.d[self.PLAYER_N]
        self.player = Player(self.SIZE, spawning_point, 107, ID=1)
        self.player_steps.append((spawning_point["x"], spawning_point["y"]))
        # self.player = Player(self.SIZE, {"x": 0, "y": 0}, 107, ID=1)
        self.add_player(self.player)

        locations = set()
        locations.add((self.player.x, self.player.y))
        #print(self.player)

        if self.HAVE_ENEMY:
            for i in range(self.NUM_ENEMIES):
                if self.USE_SPAWNPOINTS:
                    enemy = Player(self.SIZE, random.choice(self.spawn_points), 25, ID=i+2)
                    location = (enemy.x, enemy.y)
                    while location in locations:
                        enemy = Player(self.SIZE, random.choice(self.spawn_points), 25, ID=i+2)
                        location = (enemy.x, enemy.y)
                else:
                    spawning_point = self.get_random_spawnpoint()
                    self.collision_env[spawning_point["y"]][spawning_point["x"]] = self.d[self.ENEMY_N]
                    enemy = Player(self.SIZE, spawning_point, 25, ID=i + 2)
                    location = (enemy.x, enemy.y)
                locations.add(location)
                self.add_player(enemy)
                #self.playerid_observation_slot[enemy.id] = i

        self.episode_step = 0

        if self.RETURN_IMAGES:
            observation = np.array(self.get_image())
        else:
            observation = self.getObstacleObservations()
            normalized_observation = self.getNormalizedObservation()
        #print(observation.shape)
        self.update_player_env()

        return normalized_observation.flatten()

    def angle(self, angle):
        y = math.sin(math.radians(angle)) * 5
        x = math.cos(math.radians(angle)) * 5
        return [x, y]

    def determine_angle(self, changex, changey):
        if changex != 0:
            angle = abs(math.degrees(math.atan(changey/changex)))
        else:
            if changey > 0:
                angle = 90
            elif changey < 0:
                angle = 270
            else:
                angle = 0
        if changex > 0 and changey > 0:
            angle = angle
        elif changex < 0 and changey <= 0:
            angle = 180 + angle
        elif changex < 0 and changey > 0:
            angle = 180 - angle
        elif changex > 0 and changey <= 0:
            angle = 360 - angle
        return angle

    def getDistanceFromPlayer(self, x, y):
        return math.sqrt((self.player.x - x)**2 + (self.player.y - y)**2)

    def getEnemyObservations(self, max_enemies=10, angle=True):
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
                        enemy_distance = self.getDistanceFromPlayer(enemy.x, enemy.y)
                        enemies[self.playerid_observation_slot[playerid]] = [self.determine_angle(changex, changey), enemy_distance, enemy.health, 1]
                    else:
                        enemies[self.playerid_observation_slot[playerid]] = [changex, changey, enemy.health, 1]
        return enemies

    def getItemsObservations(self, max_items=20):
        items = [[0, 0, 0, 0]] * max_items
        item_index = len(self.queued_items_list)
        temp_item_list = list() # will be a list of lists -- goal is to sort the items by index and also to omit items that are already on the queue

        for i in range(len(self.items)):
            if self.items[i].id not in self.queued_items_dict:
                distance = self.getDistanceFromPlayer(self.items[i].x, self.items[i].y)
                temp_item_list.append((distance, self.items[i]))
        temp_item_list.sort()

        for itemkey in self.queued_items_dict:
            item = self.queued_items_dict[itemkey]
            distance = self.getDistanceFromPlayer(item.x, item.y)
            if distance > 30:
                index = self.queued_items_list.index(item)
                self.queued_items_list.remove(index)
                del self.queued_items_dict[item.id]
                item_index -= 1

        for i in range(len(self.queued_items_list)):
            angle = self.determine_angle(self.queued_items_list[i].x - self.player.x, self.queued_items_list[i].y - self.player.y)
            distance = self.getDistanceFromPlayer(self.queued_items_list[i].x, self.queued_items_list[i].y)
            items[i] = [angle, distance, self.queued_items_list[i].available, 2]

        for distance, item in temp_item_list:
            if item_index < max_items:
                angle = self.determine_angle(item.x - self.player.x, item.y - self.player.y)
                distance = self.getDistanceFromPlayer(item.x, item.y)
                if distance <= 30:
                    items[item_index] = [angle, distance, item.available, 2]
                    item_index += 1
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
                angle = self.determine_angle(projectile.x - self.player.x, projectile.y - self.player.y)
                distance = self.getDistanceFromPlayer(projectile.x, projectile.y)
                projectiles[self.projectileid_observation_slot[projectileid]] = [angle, distance, 0, 3]
        return projectiles

    def getObstacleObservations(self):
        obstacles = [0] * 8
        possible_ranges = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]]
        for i in range(1):
            for j in range(len(possible_ranges)):
                x_mult = possible_ranges[j][0]
                y_mult = possible_ranges[j][1]
                check_x = self.player.x + (i+1)*x_mult
                check_y = self.player.y + (i+1)*y_mult
                if check_x >= self.SIZE or check_y >= self.SIZE or check_x < 0 or check_y < 0 or self.collision_env[check_y][check_x].tolist() == self.d[self.OBSTACLE_N] or self.collision_env[check_y][check_x].tolist() == self.d[self.ENEMY_N]:
                    obstacles[j] = max(obstacles[j],i+1)

        return obstacles

    def normalizeObservationState(self, observationCategory, observation):
        normalized_observation = []
        if observationCategory == "enemy":
            for enemy in observation:
                normalized_observation.append([enemy[0]/360, enemy[1]/self.PLAYER_WINDOW_SIZE, enemy[2]/110, 0])
        elif observationCategory == "item":
            for item in observation:
                normalized_observation.append([item[0]/360, item[1]/self.PLAYER_WINDOW_SIZE, item[2], 0])
        elif observationCategory == "projectile":
            for projectile in observation:
                normalized_observation.append([projectile[0]/360, projectile[1]/self.PLAYER_WINDOW_SIZE, 0, 0])
        elif observationCategory == "obstacle":
            return observation #obstacle is binary.. its already normalized
        return normalized_observation

    def getNormalizedObservation(self):
        enemies = self.normalizeObservationState("enemy", self.getEnemyObservations(5))
        items = self.normalizeObservationState("item", self.getItemsObservations(5))
        projectiles = self.normalizeObservationState("projectile", self.getProjectileObservations(10))
        obstacles = self.normalizeObservationState("obstacle", self.getObstacleObservations())
        return np.array(enemies + items + projectiles + [obstacles[:4]] + [obstacles[4:]])

    def getObservation(self):
        enemies = self.getEnemyObservations(5)
        items = self.getItemsObservations(5)
        projectiles = self.getProjectileObservations(10)
        obstacles = self.getObstacleObservations()
        return np.array(enemies + items + projectiles + [obstacles[:4]] + [obstacles[4:]])

    def calculateRewardItem(self, item):
        distance = round(math.sqrt((self.player.x - item.x)**2 + (self.player.y - item.y)**2))
        if self.USE_DISTANCE_FOR_ITEM_REWARD:
            if distance <= 5:
                if distance == 0:
                    reward = self.ITEM_REWARD
                elif distance == 1:
                    reward = 10
                elif distance == 2:
                    reward = 6
                elif distance == 3:
                    reward = 3
                elif distance == 4:
                    reward = 2
                elif distance == 5:
                    reward = 1
        elif distance == 0:
            reward = self.ITEM_REWARD
        else:
            reward = 0
        return reward

    def step(self, action):
        self.episode_step += 1
        self.OBSTACLE_PENALTY = max(self.OBSTACLE_PENALTY - self.MAX_OBSTACLE_PENALTY/200, 0)
        reward = 0
        done = False
        # x = random.randint(0, self.SIZE - 1)
        # y = random.randint(0, self.SIZE - 1)
        # while y == self.player.y:
        #     y = random.randint(0,self.SIZE - 1)
        # aim = self.angle(5)
        self.update_projectiles()
        #self.player.action(action, False, self.projectiles, self.collision_env, [self.player.x + aim[0], self.player.y + aim[1]])
        self.player.action(action, False, self.projectiles, self.collision_env, None)
        self.player_steps.append((self.player.x, self.player.y))
        if len(self.player_steps) >= 3 and self.player_steps[-1] == self.player_steps[-3]:
            pass

        if self.OBSTACLE_COLLISION and self.player.hit_wall == 1:
            reward -= self.OBSTACLE_PENALTY
            done = True
            # print(f"hit an obstacle on step {self.episode_step}. x:{self.player.x} y:{self.player.y}. Minus {self.OBSTACLE_PENALTY}")
        # if self.HAVE_ENEMY: ## for player movement in the future
        #     self.enemy.move(self.env)

        #### MAYBE ###
        # enemy.move()
        # food.move()
        ##############
        updated_items_list = list()
        items_left = 0
        for item in self.items:
            if item.available:
                itemreward = self.calculateRewardItem(item)
                reward += itemreward
                if self.player.x == item.x and self.player.y == item.y:
                    item.available = 0
                    items_left += 1
                else:
                    updated_items_list.append(item)
        if items_left == len(self.items):
            done = True

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
            enemyTargetObservations = None
            new_observation = np.array(self.get_image())
        else:
            enemyTargetObservations = None
            normalized_observation = self.getNormalizedObservation()
            new_observation = self.getObservation()
        # print(new_observation)
        # print(normalized_observation.flatten())
        # self.render()
        self.items = updated_items_list # do this after the observation is received, so that the machine still sees that getting an item returns a zeroed out entry
        if reward == 0:
            reward -= self.MOVE_PENALTY

        if self.episode_step >= 200:
            done = True

        return normalized_observation.flatten(), enemyTargetObservations, reward, done



    def render(self):
        img = self.get_image()
        SIZE = 600
        img = np.array(img.resize((SIZE, SIZE), resample=Image.BOX))  # resizing so we can see our agent in all its glory.
        for x in range(0, SIZE - 1, SIZE//self.SIZE):
            cv2.line(img, (x, 0), (x, SIZE), (255, 255, 255), 1, 1)
        for y in range(0, SIZE -1, SIZE//self.SIZE):
            cv2.line(img, (0, y), (SIZE, y), (255, 255, 255), 1, 1)
        cv2.imshow("image", img)  # show it!
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
