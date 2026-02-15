# solving Poisson's equation and a simplified transport equation
import numpy as np
import matplotlib.pyplot as plt
import itertools
import matplotlib.animation as animation
from PIL import Image

def sigmoid(x:np.array):
    return 1 / (1 + np.exp(-x))

class Grid:
    def __init__(self, grid:np.array, iterator=None):
        self.grid = grid
        self._iterator = iterator

    @classmethod
    def from_shape(cls, shape):
        grid = np.zeros(shape)
        return cls(grid)

    def place_charge(self):
        x_idx = np.random.randint(0, self.grid.shape[0])
        y_idx = np.random.randint(0, self.grid.shape[1])
        self.grid[x_idx, y_idx] -= 1

    def _iterate(self):
        """
        Iterate over the grid and return an iterator that has 4 atributes:
        i, j: the current index
        k, l: the nearest neighbor indices
        """
        for i, j in itertools.product(range(0, self.grid.shape[0]), range(0, self.grid.shape[1])):
            for k, l in [(i+1,j), (i-1,j), (i,j+1), (i,j-1), (i+1,j+1), (i-1,j-1), (i+1,j-1), (i-1,j+1)]:
                if k < 0 or k > self.grid.shape[0]-1 or l < 0 or l > self.grid.shape[1]-1:
                    continue
                yield i, j, k, l
    
    @property
    def iterator(self):
        if self._iterator is None:
            self._iterator = list(self._iterate())
        return self._iterator
    
    def copy(self):
        new_grid = Grid(self.grid.copy())
        new_grid._iterator = self._iterator
        return new_grid

    def __getitem__(self, key):
        return self.grid[key]
    
    def __setitem__(self, key, value):
        self.grid[key] = value

class Poisson:
    """
    Rough poisson solver using finite difference method

    Assuming an electric field permitivity of 2.0 such that the field does not completely
    fall off from one charge to the next
    """
    def __init__(self, grid:Grid, E):
        self.q = grid
        self.E = E
        self.epsilon = 2  # Permittivity

    @classmethod
    def from_charge_grid(cls, grid):
        obj = cls(grid, np.zeros_like(grid.grid))
        obj.calculate_E()
        return obj

    def calculate_E(self):
        # Simplified finite difference method for Poisson's equation
        for i, j, k, l in self.q.iterator:
            if sum([k,l]) < sum([i,j]) - 1 or sum([k,l]) > sum([i,j]) + 1:
                d = np.sqrt(2)
            else:
                d = 1
            self.E[i,j] += ((self.q[k,l] - self.q[i,j]) / (d * self.epsilon)) / 8
    
class Transport:
    """
    Rough transport solver using finite difference method
    """
    def __init__(self, grid:Grid, E:np.array, mu=0.5, friction=0.01):
        self.q = grid
        self.E = E
        self.mu = mu  # Mobility
        self.friction = friction  # Friction coefficient

    def calculate_charge(self):
        # Simplified finite difference method for transport equation
        _q = self.q.copy()
        for i, j, k, l in self.q.iterator:
            if sum([k,l]) < sum([i,j]) - 1 or sum([k,l]) > sum([i,j]) + 1:
                d = np.sqrt(2)
            else:
                d = 1
            Q = min([((self.E[i,j] * self.mu * self.q[i,j]) / 8), self.q[i,j]/8])
            loss = (d * self.friction * self.q[i, j])
            _q[k,l] += Q - loss
            _q[i,j] -= Q

        # Loop through and pull charge into boundaries out of system
        for i in range(self.q.grid.shape[0]):
            for j in range(self.q.grid.shape[1]):
                Q = ((self.E[i,j] * self.mu * self.q[i,j]) / 8)
                if (i == 0 or i == self.q.grid.shape[0] - 1) and (j == 0 or j == self.q.grid.shape[1] - 1):
                    # Corner cells
                    _q[i, j] -= 1 * Q
                elif i == 0 or i == self.q.grid.shape[0] - 1 or j == 0 or j == self.q.grid.shape[1] - 1:
                    # Edge cells
                    _q[i, j] -= 1 * Q
        self.q[:] = _q[:]

class Simulator:
    def __init__(self, grid:Grid):
        self.grid = grid
        self.pois = Poisson.from_charge_grid(grid)
        self.trans = Transport(grid, self.pois.E)
        self._step_hooks = []

    
    def attach_step_hook(self, hook:callable, target:str="charge"):
        self._step_hooks.append((hook, target))

    def _step(self):
        self.pois.calculate_E()
        self.trans.calculate_charge()       
    
    def run(self, steps=10, charge_threshold=0.1):
        for i in range(steps):
            self._step()
            p_charge = np.random.random()
            if p_charge < charge_threshold:
                self.grid.place_charge()
            for hook, target in self._step_hooks:
                if target == "field":
                    hook(self.pois.E, i)
                else:
                    hook(self.pois.q, i)

def plot_charge_frame(field, i):
    ax = plt.gca()
    ax.imshow(field.grid, cmap='bwr', interpolation='nearest', vmin=-0.5, vmax=0.5)
    filename = f'images/frame_{i:03d}.png'
    plt.colorbar(mappable=ax.images[0], ax=ax)
    plt.savefig(filename, dpi=50, bbox_inches='tight')
    plt.close()

def plot_field_frame(field, i):
    ax = plt.gca()
    ax.imshow(field, cmap='bwr', interpolation='nearest')
    filename = f'images/frame_{i:03d}.png'
    plt.colorbar(mappable=ax.images[0], ax=ax)
    plt.savefig(filename, dpi=50, bbox_inches='tight')
    plt.close()

grid = Grid.from_shape((10, 10))
grid.place_charge()
pois = Poisson.from_charge_grid(grid)
trans = Transport(grid, pois.E, mu=0.001, friction=100)

nsteps = 10000
sim = Simulator(grid)
sim.attach_step_hook(plot_charge_frame, "charge")
sim.run(nsteps, charge_threshold=0.5)

frames = [f'images/frame_{i:03d}.png' for i in range(nsteps)]
fig = plt.figure(dpi=50)
images = [Image.open(frame) for frame in frames]
images[0].save('animation.gif', save_all=True, append_images=images[1:], 
               duration=100, loop=0)
