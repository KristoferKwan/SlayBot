import sys, getopt
import os
cwd = os.getcwd()

paths = ["C:\\Users\\krist\\Documents\\Slay\\object_detection\\Sprites\\train", "C:\\Users\\krist\\Documents\\Slay\\object_detection\\Sprites\\test"]
#paths = ["C:\\Users\\krist\\Documents\\Slay\\object_detection\\Sprites\\testing"]

for path in paths:
    for file_property in os.listdir(path):
        print(file_property)
        os.rename(path + "\\"+file_property, path + "\\"+ file_property.replace(" ", "_"))