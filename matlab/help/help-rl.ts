// Help entries for the Reinforcement Learning Toolbox, extracted from rl.ts.
// Keyed by function name; consumed via ToolboxModule.help (see tb/types.ts).
import type { HelpEntry } from './types';

export const HELP_RL: Record<string, HelpEntry | string> = {
    rlNumericSpec: {
      summary: 'Create a numeric observation or action specification',
      syntax:  ['spec = rlNumericSpec(dim)'],
      description: ['Creates an rlNumericSpec with the given scalar dimension. LowerLimit=-Inf, UpperLimit=Inf.'],
      seealso: ['rlFiniteSetSpec', 'rlFunctionEnv'],
    },
    rlFiniteSetSpec: {
      summary: 'Create a finite set action specification',
      syntax:  ['spec = rlFiniteSetSpec(elements)'],
      description: ['Creates an rlFiniteSetSpec where elements is a row vector of valid discrete actions.'],
      seealso: ['rlNumericSpec', 'rlQAgent'],
    },
    rlFunctionEnv: {
      summary: 'Create a custom RL environment from step/reset functions',
      syntax:  ['env = rlFunctionEnv(obsInfo, actInfo, stepFn, resetFn)'],
      description: ['stepFn(obs,act) returns [nextObs, reward, isDone]; resetFn() returns initialObs.'],
      seealso: ['train', 'sim'],
    },
    rlTrainingOptions: {
      summary: 'Create training options for RL agent training',
      syntax:  ['opts = rlTrainingOptions(Name,Value,...)'],
      description: [
        'Name-value pairs: MaxEpisodes (500), MaxStepsPerEpisode (200), Verbose (0),',
        'ScoreAveragingWindowLength (5), StopTrainingValue (Inf), StopTrainingCriteria.',
      ],
      seealso: ['train', 'rlQAgentOptions', 'rlDQNAgentOptions', 'rlPPOAgentOptions'],
    },
    rlQAgentOptions: {
      summary: 'Create options for Q-learning agent',
      syntax:  ['opts = rlQAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), LearnRate (0.1), Epsilon (1), EpsilonDecay (0.005), EpsilonMin (0.01).'],
      seealso: ['rlQAgent'],
    },
    rlDQNAgentOptions: {
      summary: 'Create options for DQN agent',
      syntax:  ['opts = rlDQNAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), LearnRate (1e-3), MiniBatchSize (64), ExperienceBufferLength (10000), TargetUpdateFrequency (100).'],
      seealso: ['rlDQNAgent'],
    },
    rlPPOAgentOptions: {
      summary: 'Create options for PPO agent',
      syntax:  ['opts = rlPPOAgentOptions(Name,Value,...)'],
      description: ['Name-value: DiscountFactor (0.99), GAEFactor (0.95), ClipFactor (0.2), NumEpoch (3), MiniBatchSize (64), LearnRate (3e-4), ExperienceHorizon (128).'],
      seealso: ['rlPPOAgent'],
    },
    rlQAgent: {
      summary: 'Create a Q-learning agent with epsilon-greedy exploration',
      syntax:  ['agent = rlQAgent(obsInfo, actInfo)', 'agent = rlQAgent(obsInfo, actInfo, opts)'],
      description: ['Tabular Q-learning; obsInfo must be rlNumericSpec or rlFiniteSetSpec; actInfo must be rlFiniteSetSpec.'],
      seealso: ['rlDQNAgent', 'train', 'getAction'],
    },
    rlDQNAgent: {
      summary: 'Create a Deep Q-Network (DQN) agent',
      syntax:  ['agent = rlDQNAgent(obsInfo, actInfo)', 'agent = rlDQNAgent(obsInfo, actInfo, opts)'],
      description: ['DQN with 2-layer FC network, experience replay, and target-network soft updates.'],
      seealso: ['rlQAgent', 'rlPPOAgent', 'train'],
    },
    rlPPOAgent: {
      summary: 'Create a Proximal Policy Optimization (PPO) agent',
      syntax:  ['agent = rlPPOAgent(obsInfo, actInfo)', 'agent = rlPPOAgent(obsInfo, actInfo, opts)'],
      description: ['PPO with GAE advantage estimation, clipped surrogate objective, and separate actor/critic networks.'],
      seealso: ['rlDQNAgent', 'train'],
    },
    rlPGAgent: {
      summary: 'Create a REINFORCE policy gradient agent',
      syntax:  ['agent = rlPGAgent(obsInfo, actInfo)'],
      seealso: ['rlACAgent'],
    },
    rlACAgent: {
      summary: 'Create an Actor-Critic (AC) agent',
      syntax:  ['agent = rlACAgent(obsInfo, actInfo)'],
      seealso: ['rlPGAgent', 'rlDDPGAgent'],
    },
    rlDDPGAgent: {
      summary: 'Create a Deep Deterministic Policy Gradient (DDPG) agent',
      syntax:  ['agent = rlDDPGAgent(obsInfo, actInfo)'],
      seealso: ['rlTD3Agent', 'rlACAgent'],
    },
    rlTD3Agent: {
      summary: 'Create a Twin Delayed DDPG (TD3) agent',
      syntax:  ['agent = rlTD3Agent(obsInfo, actInfo)'],
      seealso: ['rlDDPGAgent'],
    },
    rlReplayMemory: {
      summary: 'Create an experience replay buffer',
      syntax:  ['buf = rlReplayMemory(capacity)'],
      seealso: ['rlPrioritizedReplayMemory'],
    },
    rlPrioritizedReplayMemory: {
      summary: 'Create a prioritized experience replay buffer',
      syntax:  ['buf = rlPrioritizedReplayMemory(capacity, alpha)'],
      seealso: ['rlReplayMemory'],
    },
    rlValueFunction: {
      summary: 'Create a value function approximator',
      syntax:  ['vf = rlValueFunction(net, obsInfo)'],
      seealso: ['rlQValueFunction'],
    },
    rlQValueFunction: {
      summary: 'Create a Q-value function approximator',
      syntax:  ['qf = rlQValueFunction(net, obsInfo, actInfo)'],
      seealso: ['rlValueFunction', 'rlDQNAgent'],
    },
    rlContinuousDeterministicActor: {
      summary: 'Create a continuous deterministic actor representation',
      syntax:  ['actor = rlContinuousDeterministicActor(net, obsInfo, actInfo)'],
      seealso: ['rlStochasticActor', 'rlDDPGAgent'],
    },
    rlStochasticActor: {
      summary: 'Create a stochastic actor representation',
      syntax:  ['actor = rlStochasticActor(net, obsInfo, actInfo)'],
      seealso: ['rlContinuousDeterministicActor', 'rlPPOAgent'],
    },
    train: {
      summary: 'Train a reinforcement learning agent',
      syntax:  ['trainStats = train(agent, env, trainingOptions)'],
      description: ['Runs a real training loop. For rlQAgent: tabular Q-learning. For rlDQNAgent: DQN with replay buffer. For rlPPOAgent: PPO with GAE.'],
      seealso: ['sim', 'getAction'],
    },
    sim: {
      summary: 'Simulate a reinforcement learning agent in an environment',
      syntax:  ['simOut = sim(agent, env)'],
      description: ['Runs one episode and returns a SimulationOutput with TotalReward and NumSteps.'],
      seealso: ['train', 'getAction'],
    },
    getAction: {
      summary: 'Get action from agent given an observation',
      syntax:  ['action = getAction(agent, obs)'],
      description: ['Returns the agent\'s chosen action for the given observation. For Q/DQN agents uses epsilon-greedy; for PPO uses stochastic policy.'],
      seealso: ['train', 'sim'],
    },
  };
