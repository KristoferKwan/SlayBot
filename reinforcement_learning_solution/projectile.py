import numpy as np
import random
from time import sleep
import math
SIZE = 60
PLAYER_N = 1  # player key in dict
FOOD_N = 2  # food key in dict
ENEMY_N = 3  # enemy key in dict
OBSTACLE_N = 4 # obstacle key in dict
HEALINGITEM_N = 5
WEAPON_N = 6
HIT = 7
PATH_N = 8
# the dict! (colors)
d = {1: [255, 175, 0],
        2: [0, 255, 0],
        3: [0, 0, 255],
        4: [255, 255, 255],
        5: [0, 255, 255],
        6: [0, 255, 128],
        7: [51, 153, 255],
        8: [255, 102, 255]}

def convert_projectile_speed(projectileSpeed):
    projectileSpeedPerFrame = projectileSpeed * 5.32
    return projectileSpeedPerFrame

class Projectile:
    def __init__(self, x, y, aimx, aimy, damage, player_id, projectileSpeed=.75):
        self.id = id(self)
        self.player_id = player_id
        self.aimx = aimx
        self.aimy = aimy
        self.damage = damage
        self.framealive = 0
        self.oldx = x
        self.oldy = y
        self.originx = x
        self.originy = y
        self.path = set()
        self.x = x
        self.y = y
        self.kill = False
        self.projectileSpeed = projectileSpeed
        self.changeTotal = convert_projectile_speed(projectileSpeed)
        if x == aimx:
            self.angle = math.pi/2
            self.slope = None
            if y >= aimy:
                self.changey = self.changeTotal * -1
            else:
                self.changey = self.changeTotal
            self.changex = 0
            self.yIntercept = None
        else:
            self.angle = math.atan((y-aimy)/(x-aimx))
            self.determine_angle()
            self.slope = (self.aimy - self.originy)/(self.aimx - self.originx)
            self.yIntercept = self.originy - self.slope*self.originx
            self.changex = self.changeTotal*math.cos(self.angle)
            self.changey = self.changeTotal*math.sin(self.angle)
        self.changex_sign = self.determine_sign(self.changex)
        self.changey_sign = self.determine_sign(self.changey)

    def determine_angle(self):
        changex = self.aimx-self.x
        changey = self.aimy-self.y
        angle = abs(math.degrees(self.angle))
        if changex > 0 and changey > 0:
            self.angle = math.radians(angle)
        elif changex < 0 and changey <= 0:
            self.angle = math.radians(180 + angle)
        elif changex < 0 and changey > 0:
            self.angle = math.radians(180 - angle)
        elif changex > 0 and changey <= 0:
            self.angle = math.radians(360 - angle)

    def determine_sign(self, value):
        if value > 0:
            return 1
        elif value < 0:
            return -1
        else:
            return 0

    def __str__(self):
        return f"Projectile {self.id}: ({self.x}, {self.y}) fired from ({self.originx}, {self.originy}): \n aim:\
            ({self.aimx}, {self.aimy})\n changex: {self.changex}\n changey: {self.changey}\n kill projectile: {self.kill}\n formula: y = {self.slope}x + {self.yIntercept}\n" + "-"*30

    def __sub__(self, other):
        return (self.x-other.x, self.y-other.y)

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def calculate_y(self, x):
        if self.slope != None:
            return self.slope * x + self.yIntercept
        else:
            return None

    def calculate_x(self, y):
        if self.slope:
            return (y - self.yIntercept)/self.slope
        else:
            return self.x

    def getDistance(self, x, y):
        return math.sqrt((x-self.x)**2 + (y-self.y)**2)

    def cleanupPath(self, kill_coord):
        final_path = set()
        for path in self.path:
            if self.getDistance(path[0], path[1]) <= self.getDistance(kill_coord[0], kill_coord[1]):
                final_path.add(path)
        self.path = final_path

    def is_within_bounds(self, x, y):
        return x >= 0 and x < SIZE and y >= 0 and y < SIZE

    def collision_x(self, x, expectedy, env):
        start_x = math.floor(self.x)
        end_x = math.floor(x)
        kill_coord = None
        for i in range(min(start_x, end_x), max(start_x, end_x)+1):
            y = self.calculate_y(i)
            out_of_bounds = False
            if y:
                y = math.floor(y)
                if not self.is_within_bounds(i, y):
                    #print(f"Projectile {self.id} out of bounds!")
                    out_of_bounds = True
                    if (not kill_coord or self.getDistance(i, y) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(i, y) < self.getDistance(x, expectedy):
                        kill_coord = max(min(0, i), SIZE - 1), max(min(0, y), SIZE - 1)
                else:
                    position = env[y][i].tolist()
                    if position == d[OBSTACLE_N] or position == d[ENEMY_N] and (i != self.x and y != self.y):
                        #print(f"Projectile {self.id} collided!")
                        if (not kill_coord or self.getDistance(i, y) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(i, y) < self.getDistance(x, expectedy):
                            kill_coord = i, y
                if (not kill_coord or self.getDistance(i, y) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(i, y) < self.getDistance(x, expectedy):
                    if not out_of_bounds and abs(self.determine_sign(i - self.originx) - self.changex_sign) <= 1 and abs(self.determine_sign(y - self.originy) - self.changey_sign) <= 1:
                        self.path.add((i, y))
        return kill_coord

    def collision_y(self, expectedx, y, env):
        start_y = math.floor(self.y)
        end_y = math.floor(y)
        kill_coord = None
        for i in range(min(start_y, end_y), max(start_y, end_y)+1):
            out_of_bounds = False
            x = math.floor(self.calculate_x(i))
            if not self.is_within_bounds(x, i):
                #print(f"Projectile {self.id} out of bounds!")
                out_of_bounds = True
                if (not kill_coord or self.getDistance(x, i) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(x, i) < self.getDistance(expectedx, y):
                    kill_coord = max(min(0, i), SIZE - 1), max(min(0, x), SIZE - 1)
            else:
                position = env[i][x].tolist()
                if position == d[OBSTACLE_N] or position == d[ENEMY_N] and (i != self.y and x != self.x):
                    #print(f"Projectile {self.id} collided!")
                    if (not kill_coord or self.getDistance(x, i) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(x, i) < self.getDistance(expectedx, y):
                        kill_coord = x, i
            if (not kill_coord or self.getDistance(x, i) < self.getDistance(kill_coord[0], kill_coord[1])) and self.getDistance(x, i) < self.getDistance(expectedx, y):
                if not out_of_bounds and abs(self.determine_sign(x - self.originx) - self.changex_sign) <= 1 and abs(self.determine_sign(i - self.originy) - self.changey_sign) <= 1:
                    self.path.add((x, i))
        return kill_coord

    def collision(self, x, y, env):
        collided_x = self.collision_x(x, y, env)
        if collided_x:
            self.cleanupPath(collided_x)
        else:
            self.cleanupPath((x, y))
        collided_y = self.collision_y(x, y, env)
        if collided_y:
            self.cleanupPath(collided_y)
        else:
            self.cleanupPath((x,y))
        if collided_x and collided_y:
            if self.getDistance(collided_x[0], collided_x[1]) < self.getDistance(collided_y[0], collided_y[1]):
                return collided_x
            else:
                return collided_y
        elif collided_x:
            return collided_x
        elif collided_y:
            return collided_y
        return None

    def action(self, env):
        '''
        Gives us 9 total movement options. (0,1,2,3,4,5,6,7,8)
        '''
        self.path = set()
        self.framealive += 1
        self.oldx = self.x
        self.oldy = self.y
        new_x = self.x + self.changex
        new_y = self.y + self.changey
        collided = self.collision(new_x, new_y, env)
        if collided:
            self.x = collided[0]
            self.y = collided[1]
            self.kill = True
        else:
            self.x = new_x
            self.y = new_y
