import numpy as np
import random
from time import sleep
from projectile import Projectile
SIZE = 10
PLAYER_N = 1  # player key in dict
FOOD_N = 2  # food key in dict
ENEMY_N = 3  # enemy key in dict
OBSTACLE_N = 4 # obstacle key in dict
HEALINGITEM_N = 5
WEAPON_N = 6
# the dict! (colors)
d = {1: [255, 175, 0],
        2: [0, 255, 0],
        3: [0, 0, 255],
        4: [255, 255, 255],
        5: [0, 255, 255],
        6: [0, 255, 128]}

class Player:
    def __init__(self, size, spawning_point, health, ID=None):
        if not ID:
            self.id = id(self)
        else:
            self.id = ID
        self.size = size
        self.health = health
        self.x = spawning_point["x"]
        self.y = spawning_point["y"]
        self.kill = False
        self.reload_time = 0
        self.hit_wall = 0

    def __str__(self):
        return f"Player ({self.x}, {self.y})"

    def __sub__(self, other):
        return (self.x-other.x, self.y-other.y)

    def __eq__(self, other):
        return self.id == other.id

    def __lt__(self, other):
        return self.health < other.health

    def same_location(self, other):
        return self.y == other.y and self.x == other.x

    def within_viewbox(self, other):
        return abs(other.x - self.x) <= 15 and abs(other.y - self.y) <= 15

    def action(self, choice, jump, projectiles, env, fireweapon=None):
        self.hit_wall = 0
        '''
        Gives us 9 total movement options. (0,1,2,3,4,5,6,7,8)
        '''
        if choice == 0:
            self.move(env, x=1, y=1)
        elif choice == 1:
            self.move(env, x=-1, y=-1)
        elif choice == 2:
            self.move(env, x=-1, y=1)
        elif choice == 3:
            self.move(env, x=1, y=-1)

        elif choice == 4:
            self.move(env, x=1, y=0)
        elif choice == 5:
            self.move(env, x=-1, y=0)

        elif choice == 6:
            self.move(env, x=0, y=1)
        elif choice == 7:
            self.move(env, x=0, y=-1)

        elif choice == 8:
            self.move(env, x=0, y=0)

        # if fireweapon and self.reload_time <= 0:
        #     projectile = Projectile(self.x, self.y, fireweapon[0], fireweapon[1], 25, self.id)
        #     projectiles[projectile.id] = projectile
        #     self.reload_time = 3
        # else:
        #     self.reload_time -= 1
        
    def took_damage(self, damage):
        self.health -= damage
        if self.health <= 0:
            self.kill = True

    def valid_tile(self, env):
        curr_position = env[self.y][self.x].tolist()
        return curr_position != d[OBSTACLE_N] and curr_position != d[ENEMY_N] and curr_position != d[PLAYER_N]

    def move(self, env, x=False, y=False):

        # If no value for x, move randomly
        old_x = self.x
        old_y = self.y
        
        if not x:
            self.x += np.random.randint(-1, 2)
        else:
            self.x += x

        # If no value for y, move randomly
        if not y:
            self.y += np.random.randint(-1, 2)
        else:
            self.y += y

        # print(str(env[self.x][self.y]).replace(" ", ""))
        # print(str(d[4]).replace(" ", ""))

        # If we are out of bounds, fix!
        if self.x < 0:
            self.x = 0
            self.hit_wall = 1
        elif not self.valid_tile(env):
            self.x = old_x
            self.hit_wall = 1
        elif self.x > self.size-1:
            self.x = self.size-1
            self.hit_wall = 1

        if self.y < 0:
            self.y = 0
            self.hit_wall = 1
        elif not self.valid_tile(env):
            self.y = old_y
            self.hit_wall = 1
        elif self.y > self.size-1:
            self.y = self.size-1
            self.hit_wall = 1
