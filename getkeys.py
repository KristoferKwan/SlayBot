# Citation: Box Of Hats (https://github.com/Box-Of-Hats )

import win32api as wapi
import time

special_keys = [0x01, 0x02]

special = {0x01: 'leftClick',
           0x02: 'rightClick'}


def key_press():
    keys = []
    for i in range(1, 256):
        if wapi.GetAsyncKeyState(i):
            if i in special_keys:
                keys.append(special[i])
            else:
                keys.append(chr(i))
    return keys
