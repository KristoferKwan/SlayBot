from keras.models import Sequential, load_model
from keras.layers import Dense, Dropout, Conv2D, MaxPooling2D, Activation, Flatten
from tensorflow.keras.layers import Input
from keras.callbacks import TensorBoard
from tensorflow.keras.optimizers import Adam as AdamKeras
from keras.optimizers import Adam
from collections import deque
from modifiedTensorBoard import ModifiedTensorBoard
import numpy as np
import random
import time

from tensorflow_core.python.keras import Model
from tqdm import tqdm
from blobenv import BlobEnv
import tensorflow as tf
import os

LOAD_MODEL=""

DISCOUNT = 0.99
REPLAY_MEMORY_SIZE = 50_000  # How many last steps to keep for model training
MIN_REPLAY_MEMORY_SIZE = 1_000  # Minimum number of steps in a memory to start training
MINIBATCH_SIZE = 64  # How many steps (samples) to use for training
UPDATE_TARGET_EVERY = 5  # Terminal states (end of episodes)
MODEL_NAME = '2x256'
MIN_REWARD = -200  # For model save
MEMORY_FRACTION = 0.20
USE_CONV_NET = True
HYPERPARAM_DEBUGGING=False
dense_layers = [0, 1, 2]
layer_sizes = [32, 64, 128]

# Environment settings
EPISODES = 20000

# Exploration settings
epsilon = 1  # not a constant, going to be decayed
EPSILON_DECAY = 0.99975
MIN_EPSILON = 0.001

#  Stats settings
AGGREGATE_STATS_EVERY = 50  # episodes
SHOW_PREVIEW = False

class DQNAgent:
    def __init__(self, layer_size=2, dense_layer=64):
        self.layer_size = layer_size
        self.dense_layer = dense_layer
        self.model = {"movement": self.create_movement_model(), "firing": self.create_firing_model()}
        # main model # gets trained every step
        self.movement_model = self.create_movement_model()
        self.firing_model = self.create_firing_model()

        # Target model this is what we .predict against every step
        target_movement_model = self.create_movement_model()
        target_movement_model.set_weights(self.movement_model.get_weights())
        target_firing_model = self.create_firing_model()
        target_firing_model.set_weights(self.firing_model.get_weights())

        self.target_model = {"movement": target_movement_model, "firing": target_firing_model}
        # Target model this is what we .predict against every step
        self.replay_memory = {"movement": deque(maxlen=REPLAY_MEMORY_SIZE), "firing":  deque(maxlen=REPLAY_MEMORY_SIZE), "target": deque(maxlen=REPLAY_MEMORY_SIZE)}
        self.tensorboard = ModifiedTensorBoard(log_dir=f"logs/{MODEL_NAME}-{layer_size}_layers-{dense_layer}_neurons-{int(time.time())}")

        self.target_update_counter = {"movement": 0, "firing": 0}

    def build_branch(self, inputs, numCategories, num_layers, finalAct="linear"):
        model = tf.keras.layers.Dense(self.layer_size, input_dim=envs[0].OBSERVATION_SPACE_VALUES)(inputs)
        for l in range(num_layers):
            model = tf.keras.layers.Dense(self.layer_size, activation="relu")(model)

        model = tf.keras.layers.Flatten()(model)
        model = tf.keras.layers.Dense(self.layer_size, activation="relu")(model)
        model = tf.keras.layers.Dense(numCategories, activation=finalAct)(model)
        return model

    def build_conv_branch(self, num_layers=1, finalAct="linear"):
        model = Sequential()

        model.add(Conv2D(256, (1, 1), input_shape=envs[0].OBSERVATION_SPACE_VALUES))
        model.add(Activation("relu"))
        model.add(MaxPooling2D(2, 2))
        model.add(Dropout(0.2))

        for i in range(num_layers):
            model.add(Conv2D(256, (1, 1), input_shape=envs[0].OBSERVATION_SPACE_VALUES))
            model.add(Activation("relu"))
            model.add(MaxPooling2D(2, 2))
            model.add(Dropout(0.2))
            model.add(Flatten())
            model.add(Dense(64, activation="relu"))

        model.add(Dense((envs[0].ACTION_SPACE_SIZE), activation=finalAct))
        model.compile(loss="mse", optimizer=Adam(lr=0.001), metrics=['accuracy'])
        return model


    def build_movement_branch(self, inputs):
        return self.build_branch(inputs, 9, self.dense_layer, "linear")

    def build_fire_weapon_branch(self, inputs):
        return self.build_branch(inputs, 2, self.dense_layer, "linear")

    def build_target_branch(self, inputs):
        return self.build_branch(inputs, 120, self.dense_layer, "linear")

    def create_firing_model(self):
        if LOAD_MODEL != "":
            print(f"loading {LOAD_MODEL}")
            model = load_model(LOAD_MODEL)
            print(f"Model {LOAD_MODEL} is now loaded!")
        else:
            inputs = Input(shape=envs[0].OBSERVATION_SPACE_VALUES, batch_size=MINIBATCH_SIZE)
            fire_weapon_branch = self.build_fire_weapon_branch(inputs)
            target_branch = self.build_target_branch(inputs)

            model = Model(inputs=inputs,outputs=[fire_weapon_branch, target_branch], name="projectilenet")
            model.compile(loss="mse", optimizer=AdamKeras(lr=0.001), metrics=['accuracy'])
        return model

    def create_movement_model(self):
        if LOAD_MODEL != "":
            print(f"loading {LOAD_MODEL}")
            model = load_model(LOAD_MODEL)
            print(f"Model {LOAD_MODEL} is now loaded!")
        else:
            if not USE_CONV_NET:
                inputs = Input(shape=envs[0].OBSERVATION_SPACE_VALUES)
                movement_branch = self.build_movement_branch(inputs)
                model = Model(inputs=inputs,outputs=[movement_branch], name="movementnet")
                model.compile(loss="mse", optimizer=AdamKeras(lr=0.001), metrics=['accuracy'])
            else:
                print("using a convolutional neural network to see if loss improves")
                model = self.build_conv_branch()
        return model

    def update_replay_memory(self, transition, model):
        self.replay_memory[model].append(transition)

    def get_qs(self, state, model):
        # input_m = np.array(state.reshape(-1, *state.shape)/100)[0]
        # print(f"input into the model: {input_m}")
        # input("waiting for user input to continue")
        return self.model[model].predict(np.array(state.reshape(-1, *state.shape, 1)/100)[0])

    def train(self, terminal_state, step, model, replay_memory):
        if len(self.replay_memory[replay_memory]) < MIN_REPLAY_MEMORY_SIZE:
            return
        minibatch = random.sample(self.replay_memory[replay_memory], MINIBATCH_SIZE)
        current_states = np.array([transition[0] for transition in minibatch])/100
        if not USE_CONV_NET:
            current_qs_list = self.model[model].predict(current_states) #crazy model fitting every step
        else:
            current_qs_list = self.model[model].predict(current_states.reshape(64, 52, 4, 1))

        new_current_states = np.array([transition[3] for transition in minibatch])/100
        if not USE_CONV_NET:
            future_qs_list = self.target_model[model].predict(new_current_states)
        else:
            future_qs_list = self.target_model[model].predict(new_current_states.reshape(64, 52, 4, 1))

        X = []
        Y = []

        for index, (current_state, action, reward, new_current_states, done) in enumerate(minibatch):
            if not done:
                max_future_q = np.max(future_qs_list[index])
                new_q = reward + DISCOUNT * max_future_q
            else:
                new_q = reward

            current_qs = current_qs_list[index]
            current_qs[action] = new_q

            X.append(current_state)
            Y.append(current_qs)

        self.model[model].fit(np.array(X).reshape(64, 52, 4, 1)/100,np.array(Y), batch_size = MINIBATCH_SIZE, verbose = 0, shuffle=False, callbacks=[self.tensorboard] if terminal_state else None)

        # updating to determine if we want to update target_model yet
        if terminal_state:
            self.target_update_counter[model] += 1

        if self.target_update_counter[model] > UPDATE_TARGET_EVERY:
            self.target_model[model].set_weights(self.model[model].get_weights())
            self.target_update_counter[model] = 0


if __name__ == "__main__":
    # For more repetitive results
    random.seed(1)
    np.random.seed(1)
    tf.set_random_seed(1)

    # Create models folder
    if not os.path.isdir('models'):
        os.makedirs('models')

    agents = list()
    envs = list()
    ep_rewards = list()

    if HYPERPARAM_DEBUGGING:
        for dense_layer in dense_layers:
            for layer_size in layer_sizes:
                envs.append(BlobEnv())
                agents.append(DQNAgent(layer_size, dense_layer))
                ep_rewards.append([-200])
                if not os.path.isdir(f'models/{layer_size}x{dense_layer}'):
                    os.makedirs(f'models/{layer_size}x{dense_layer}')
    else:
        envs.append(BlobEnv())
        agents.append(DQNAgent(64,2))
        ep_rewards.append([-200])
        if not os.path.isdir('models/official'):
            os.makedirs('models/official')


    for i in range(len(agents)):
        for episode in tqdm(range(1, EPISODES+1), ascii=True, unit="episode"):
            agents[i].tensorboard.step = episode

            episode_reward = 0
            step = 1
            current_state = envs[i].reset()

            done = False

            while not done:
                if np.random.random() > epsilon:
                    action = np.argmax(agents[i].get_qs(np.array([current_state]), "movement"))
                else:
                    action = np.random.randint(0, envs[i].ACTION_SPACE_SIZE)

                new_state, target_state, reward, done = envs[i].step(action)

                episode_reward += reward

                if SHOW_PREVIEW and not episode % AGGREGATE_STATS_EVERY:
                    envs[i].render()

                agents[i].update_replay_memory((current_state, action, reward, new_state, done), "movement")
                agents[i].train(done, step, "movement", "movement")

                current_state = new_state
                step += 1

            # Append episode reward to a list and log stats (every given number of episodes)
            ep_rewards[i].append(episode_reward)
            print(f"episode {episode} finished after {step} steps. final reward: {episode_reward}")
            if not episode % AGGREGATE_STATS_EVERY or episode == 1:
                #print(f"--------------------------------------\nep rewards[{i}]: {ep_rewards[i]}--------------------------------------\n")
                average_reward = sum(ep_rewards[i][-AGGREGATE_STATS_EVERY:])/len(ep_rewards[i][-AGGREGATE_STATS_EVERY:])
                min_reward = min(ep_rewards[i][-AGGREGATE_STATS_EVERY:])
                max_reward = max(ep_rewards[i][-AGGREGATE_STATS_EVERY:])
                agents[i].tensorboard.update_stats(reward_avg=average_reward, reward_min=min_reward, reward_max=max_reward, epsilon=epsilon)

                # Save model, but only when min reward is greater or equal a set value
                if average_reward >= MIN_REWARD:
                    agents[i].model["movement"].save(f'models/{agents[i].layer_size}x{agents[i].dense_layer}/{MODEL_NAME}__{max_reward:_>7.2f}max_{average_reward:_>7.2f}avg_{min_reward:_>7.2f}min__{int(time.time())}.model')

            if epsilon > MIN_EPSILON:
                epsilon *= EPSILON_DECAY
                epsilon = max(MIN_EPSILON, epsilon)