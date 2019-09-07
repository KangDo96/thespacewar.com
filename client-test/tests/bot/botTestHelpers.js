const FakeState = require('../../matchTestUtils/FakeState.js');
const ClientState = require('../../../client/state/ClientState.js');
const FakeUserRepository = require('../../matchTestUtils/FakeUserRepository.js');
const FakeRawCardDataRepository = require('../../matchTestUtils/FakeRawCardDataRepository.js');
const BotSpawner = require('../../../client/ai/BotSpawner.js');
const GameConfig = require('../../../shared/match/GameConfig.js');

const BotId = 'BOT';
const PlayerId = 'P1A';

module.exports = {
    setupClientState,
    spawnBot,
    BotId,
    PlayerId
};

async function setupClientState(fakeClientState) {
    const clientState = ClientState({
        userRepository: FakeUserRepository({
            ownUser: { id: BotId, name: 'Mr.Robot' },
            opponentUser: { id: PlayerId, name: 'P1B' }
        }),
        opponentUser: { id: PlayerId }
    });

    const defaultedFakeClientState = defaultFakeClientState(fakeClientState);
    await clientState.update(defaultedFakeClientState);

    return clientState;
}

function defaultFakeClientState(stateOptions = {}) {
    stateOptions.playerOrder = [BotId, PlayerId];

    return FakeState(stateOptions);
}

function spawnBot({ clientState, matchController }) {
    const botSpawner = BotSpawner({
        matchController,
        clientState,
        rawCardDataRepository: FakeRawCardDataRepository(),
        userRepository: createFakeUserRepositoryToSpawnBot(clientState),
        gameConfig: GameConfig()
    });
    botSpawner.spawn();
}

function createFakeUserRepositoryToSpawnBot({ ownUser, opponentUser }) {
    return {
        getUserById: id => {
            if (id === ownUser.id) {
                return { name: 'Mr. Roboto', id: 'BOT' };
            }
            return opponentUser;
        }
    };
}
