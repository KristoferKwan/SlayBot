import numpy as np
from PIL import ImageGrab, Image
import cv2
import time
from time import sleep
import pyautogui
from getkeys import key_press
from grabscreen import grab_screen
import os
import selenium
import math
from selenium.common import exceptions  

"""

Problem: Mouse input is not possible with the suggested neural network --> its not binary
Solution: use object detection to determine where players are

Problem: Getting context behind key presses and weapon switches is extremely difficult on a DNN
Solution: may just stick to regular/default weapon and hard code for weapon switches-- requires deeper logic

I can use this neural net to move the player and teach it how to evade and generally when to fire
controls: W, A, S, D, right click (jump), left click (fire weapon)

need to do more research on the js functions--> alot of the data i need can be received here
this.game.playingPlayer (will get all relevant data of player --> also no longer need to do object detection.. can actually get the list of players and their positions)
this.game.playingPlayerAmmo

probably cant do red rocket launcher.. but it can probably do all the other weapons (we can give it a RNN but that significantly complicates this)
"""

def get_frame_output(keys, playerInfo):
    #[A, W, D, S]
    output = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    if 'A' in keys:
        output[0] = 1
    if 'D' in keys:
        output[2] = 1
    if 'S' in keys:
        output[1] = 1
    if 'W' in keys:
        output[3] = 1
    
    if 'leftClick' in keys:
        output[4] = 1
    elif 'rightClick' in keys:
        output[5] = 1

    output[playerInfo["direction2"] + 6] = 1
    return output

file_name = "training_data.npy"
if os.path.isfile(file_name):
    print('File exists, loading previous data')
    training_data = list(np.load(file_name))
else:
    print('File does not exist, starting fresh')
    training_data = []


def record_training_data(driver, last_time):
    try: 
        screen = grab_screen(region=(4,155,805,755))
        screen = cv2.cvtColor(screen, cv2.COLOR_BGR2GRAY)
        screen = cv2.resize(screen, (80,60))
        keys = key_press()
        player_info = driver.execute_script("return game.playingPlayer")
        if not player_info:
            print("player_info not provided.. skipping")
            return
        output = get_frame_output(keys, player_info)
        training_data.append([screen, output])
        print('loop took {} seconds: {}'.format(time.time()-last_time, output))
        last_time = time.time()
        if len(training_data) % 500 == 0:
            print(len(training_data))
            np.save(file_name, training_data)

    except exceptions.StaleElementReferenceException as e:
        pass
    except exceptions.JavascriptException as e:
        pass
    # cv2.imshow('window',screen)

def determine_velocity(driver):
    pro_start_time = None
    pro_end_time = None
    play_start_time = None
    play_end_time = None
    positions = list()
    player_positions = list()
    while(True):
        try:
            player_pos = driver.execute_script("return [game.playingPlayer.x, game.playingPlayer.y]")
            if player_pos:
                player_positions.append(player_pos) 
            if play_start_time:
                if len(player_positions) == 2:
                    play_end_time = time.time()
                    player_velocity = math.sqrt((player_positions[1][0] - player_positions[0][0])**2 + (player_positions[1][1] - player_positions[0][1])**2)/(play_end_time - play_start_time) 
                    print(f"Player traveled from {player_positions[0][0]},{player_positions[0][1]} to {player_positions[1][0]},{player_positions[1][1]} in {play_end_time - play_start_time} seconds")
                    print(f"Velocity: {player_velocity}")
                    print("-"*30)
                else:
                    pass
                player_positions = list()
                play_start_time = None
                play_end_time = None
            elif len(player_positions) == 1:
                play_start_time = time.time()
           
            projectile_pos = driver.execute_script("for(var j = 0; j < game.projectiles.length; j++){if(Number(game.projectiles[j].playerID) == game.playingPlayerID){return [game.projectiles[j].x, game.projectiles[j].y]}}")
            if projectile_pos:
                positions.append(projectile_pos)
            if pro_start_time:
                if len(positions) == 2:
                    pro_end_time = time.time()
                    projectile_velocity = math.sqrt((positions[1][0] - positions[0][0])**2 + (positions[1][1] - positions[0][1])**2)/(pro_end_time - pro_start_time) 
                    print(f"Shot projectile traveled from {positions[0][0]},{positions[0][1]} to {positions[1][0]},{positions[1][1]} in {pro_end_time - pro_start_time} seconds")
                    print(f"Projectile Velocity: {projectile_velocity}")
                    print("-"*30)
                else:
                    pass
                positions = list()
                pro_start_time = None
                pro_end_time = None
            elif len(positions) == 1:
                pro_start_time = time.time()
            sleep(1)
        except exceptions.StaleElementReferenceException as e:
            print("Error")

def screen_record(driver): 
    while(True):
        last_time = time.time()
        try:
            respawning = len(driver.find_elements_by_id("respawn")) == 0
            nextGame = len(driver.find_elements_by_class_name("victory")) == 0
            if respawning and nextGame:
                record_training_data(driver, last_time)
            else:
                print("you died.. im not recording rn")
        except exceptions.StaleElementReferenceException as e:
            record_training_data(driver, last_time)
        # if cv2.waitKey(25) & 0xFF == ord('q'):
        #     cv2.destroyAllWindows()