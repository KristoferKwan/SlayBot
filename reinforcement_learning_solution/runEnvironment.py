from blobenv import BlobEnv
import random 
import time

env = BlobEnv()
env.reset()

while True:
    action = random.randint(0, 8)
    env.step(action)
    env.render()
    time.sleep(.3)
    #input("press enter to continue")