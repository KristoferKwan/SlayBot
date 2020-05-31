from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
import pyautogui
import time

class Bot():

    def __init__(self, name, x, y, score):
        self.name = name
        self.x = x
        self.y = y
        self.score = 0
        self.driver = None
    
    def connect(self):
        self.driver = webdriver.Chrome(executable_path="./venv/Scripts/chromedriver.exe")
        self.driver.get("http://slay.one/beta/")
        print(self.driver.title)
        assert "Slay" in self.driver.title
        try:
            WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "inputNickname")))
            self.driver.find_element_by_id("inputNickname").send_keys(self.name)
            self.driver.find_element_by_class_name("label").click()
            self.driver.find_element_by_css_selector(".item.ffa").click()
            print(self.driver.find_element_by_css_selector(".F-Button.light.ffa.withClickSound").click())
        except TimeoutException:
            print("Loading took too much time!")
    
    def start(self):
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".F-Button.gameCtrl.yellow.medium.start.normal.play.withClickSound")))
        self.driver.find_element_by_css_selector(".F-Button.gameCtrl.yellow.medium.start.normal.play.withClickSound").click()
    
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

def main():
    
    bots = []
    for i in range(1):
        newname = ""
        print(newname)
        test = Bot(newname, 0, 0, 0)
        test.connect()
        bots.append(test)
    for i in range(len(bots)):
        bots[i].start()
    
    bots[0].move_up()
    bots[0].move_left()
    bots[0].move_down()
    bots[0].move_right()
    bots[0].jump()
    bots[0].full_screen()
    bots[0].fire_weapon()
    input("Enter anything to quit")
    for i in range(len(bots)):
        bots[i].quit()
        
main()
    