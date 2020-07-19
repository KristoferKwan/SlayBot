from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
import pyautogui
import time
from matplotlib import pyplot as plt
import cv2


class Bot():

    def __init__(self, name, x, y, score):
        self.name = name
        self.x = x
        self.y = y
        self.score = 0
        self.driver = None
    
    def login(self, username="RoboCop0101", password="SlayBot"):
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "label")))
        self.driver.find_element_by_xpath("//*[contains(text(), 'LOG IN')]").click()
        self.driver.find_element_by_id("inputUserName").send_keys(username)
        self.driver.find_element_by_id("inputUserPass").send_keys(password)
        self.driver.find_element_by_class_name("userLoginRegBtn").click()

    def connect(self, login=False, stage=None):
        self.driver = webdriver.Chrome(executable_path="C:\\Users\\krist\\Documents\\Slay\\chromedriver.exe")
        self.driver.get("http://slay.one/beta/")
        print(self.driver.title)
        assert "Slay" in self.driver.title
        try:
            if not login:
                WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "inputNickname")))
                self.driver.find_element_by_id("inputNickname").send_keys(self.name)
            else:
                self.login()
                if stage:
                    self.choose_stage(stage)
                    return
            WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'PLAY')]")))
            self.driver.find_element_by_xpath("//*[contains(text(), 'PLAY')]").click()
            self.driver.find_element_by_css_selector(".item.ffa").click()
            print(self.driver.find_element_by_css_selector(".F-Button.light.ffa.withClickSound").click())
        except TimeoutException:
            print("Loading took too much time!")
    
    def resize_window(self):
        self.driver.set_window_size(655, 612)
        self.driver.set_window_position(0,0)
    
    def choose_stage(self, stage_name, num_players=8, round_time=20):
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'LOBBY')]")))
        self.driver.find_element_by_xpath("//*[contains(text(), 'LOBBY')]").click()
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "roomListRow")))
        rooms = self.driver.find_elements_by_class_name("roomListRow")
        print(len(rooms))
        for room in rooms:
            print(room.find_element_by_class_name("roomFieldMapName").text.lower())
            if room.find_element_by_class_name("roomFieldMapName").text.lower() == stage_name.lower():
                room.find_element_by_xpath(".//*[contains(text(), 'JOIN')]").click()
                return
        self.driver.find_element_by_xpath("//*[contains(text(), 'CREATE')]").click()
        self.driver.find_element_by_class_name("gameModeSwitcherBtn").click()
        self.driver.find_element_by_xpath("//*[contains(text(), 'Deathmatch')]").click()
        maps = self.driver.find_elements_by_class_name("mapListCell")
        for m in maps:
            if m.find_element_by_class_name("mapNode").getAttribute("data-slay-one-map-id").lower() == stage_name:
                m.click() 
        self.driver.find_element_by_id("inputNumBots").send_keys(str(num_players))
        self.driver.find_element_by_id("inputRoundTime").send_keys(str(round_time))
        self.driver.find_elements_by_css_selector(".F-Button.gold").click()
        WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'OK')]")))
        self.driver.find_element_by_xpath("//*[contains(text(), 'OK')]").click()

    def hide_unwanted_elements(self):
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#miniMap")))
        self.driver.execute_script("document.getElementById('miniMap').style.display='none'")  
        self.driver.execute_script("document.getElementById('chatDisplayDiv').style.display='none'")
        self.driver.execute_script("document.getElementById('btnOptions').style.display='none'")
        self.driver.execute_script("document.getElementById('btnExitApp').style.display='none'")
        self.driver.execute_script("document.getElementById('btnExitGame').style.display='none'")
        self.driver.execute_script("document.getElementById('btnSeparate').style.display='none'") 
        self.driver.execute_script("document.getElementById('killsDisplayDiv').style.display='none'")                   

    def start(self):
        self.hide_unwanted_elements()
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".F-Button.gameCtrl.yellow.medium.start.normal.play.withClickSound")))
        self.driver.find_element_by_css_selector(".F-Button.gameCtrl.yellow.medium.start.normal.play.withClickSound").click()
        self.resize_window()
    
    def quit(self):
        self.driver.close()
        self.driver.quit()
    
    def holdMouseButton(self, mouse, x=200, y=200, seconds = .5):
        pyautogui.mouseDown(button=mouse,x=200,y=200)
        time.sleep(seconds)
        pyautogui.mouseUp(button=mouse)


    def holdKey(self, keys, seconds = 1.00):
        for key in keys:
            pyautogui.keyDown(key)
        time.sleep(seconds)
        for key in keys:
            pyautogui.keyUp(key)
        time.sleep(.1)

    def move_up(self):
        self.holdKey(["w"], .5)
    
    def move_down(self):
        self.holdKey(["s"], .5)

    def move_left(self):
        self.holdKey(["a"], .5)

    def move_right(self):
        self.holdKey(["d"], .5)

    def jump(self):
        self.holdMouseButton("right")

    def full_screen(self):
        self.holdMouseButton("left")

    def fire_weapon(self):
        self.holdMouseButton("left", 500, 500)

    