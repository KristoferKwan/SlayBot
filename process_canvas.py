import numpy as np
from PIL import ImageGrab, Image
import cv2
import time


def process_img(original_image):
    processed_img = cv2.cvtColor(original_image, cv2.COLOR_BGR2GRAY)
    processed_img = cv2.Canny(processed_img, threshold1=200, threshold2=210)

    return processed_img

def main():
    
    im = Image.open('./images/slaydown.PNG')
    new_screen = process_img(np.array(im))
    while True:
        cv2.imshow('window', new_screen)
        if cv2.waitKey(25) & 0xFF == ord('q'):
            cv2.destroyAllWindows()
            break

main()