from blobenv import BlobEnv
import random 
import time

env = BlobEnv()
env.reset()
i = 0

while i < 20000:
    if i % 100 == 0:
        env.reset()
    action = random.randint(0, 8)
    env.step(action)
    env.render()
    i += 1
    #input("press enter to continue")