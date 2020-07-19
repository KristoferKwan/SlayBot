from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from bot import Bot
import pickle
from time import sleep

class Map:

    def __init__(self, stage="The Bay"):
        testBot = Bot("getMaps", x=0, y=0, score=0)       
        testBot.connect(login=True, stage=stage)
        self.driver = testBot.driver
        sleep(5)
        self.getMaps()
        self.getAllTextures()
        self.getNonTileObstacles()

    def getMaps(self, stage="The Bay"):
        try:
            gameinfo = self.driver.execute_script("return this.game.map")
            print(gameinfo)
            map_file = open(f"./maps/{stage.lower().replace(' ', '_')}.pickle", "wb")
            pickle.dump(gameinfo, map_file)
            map_file.close()
        except Exception as e:
            print(e)

    # getMaps()

    def getAllTextures(self, stage="The Bay"):
        try:
            groundTiles = self.driver.execute_script("return this.game.groundTiles")
            tiles = dict()
            print(len(groundTiles))
            for tile in groundTiles:
                tiles[tile["type"]["id"]] = tile["type"]["name"]
            print(tiles)
            texture_file = open(f"./maps/texture_id_map.pickle", "wb")
            pickle.dump(tiles, texture_file)
            texture_file.close()
        except Exception as e:
            print(e)

    def getNonTileObstacles(self, stage="The Bay"):
        try:
            groundTiles = self.driver.execute_script("return this.game.tiles")
            tiles = dict()
            print(len(groundTiles))
            for tile in groundTiles:
                tiles[tile["type"]["id"]] = tile["type"]["name"]
            print(tiles)
            texture_file = open(f"./maps/nontile_id_map.pickle", "wb")
            pickle.dump(tiles, texture_file)
            texture_file.close()
        except Exception as e:
            print(e)


Map()