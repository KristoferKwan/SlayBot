import numpy as np
import random
SIZE = 10

class Item:
    def __init__(self, id, size, x, y, weapon):
        self.id = id
        self.size = size
        self.x = x
        self.y = y
        self.available = 1
        self.weapon = weapon

    def __str__(self):
        return f"Blob ({self.x}, {self.y})"

    def __sub__(self, other):
        return (self.x-other.x, self.y-other.y)

    def __eq__(self, other):
        return self.id == other.id

    def __lt__(self, other):
        return self.id < other.id
