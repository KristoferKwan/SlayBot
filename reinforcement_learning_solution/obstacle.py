import numpy as np
import random
SIZE = 10

class Obstacle:
    def __init__(self, size, x, y):
        self.size = size
        self.x = x
        self.y = y

    def __str__(self):
        return f"Blob ({self.x}, {self.y})"

    def __sub__(self, other):
        return (self.x-other.x, self.y-other.y)

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y
