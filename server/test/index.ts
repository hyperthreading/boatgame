import axios from "axios";
import util from "util";
// const axios = require("axios");
// const util = require("util");

async function test(name: string, fn: () => Promise<any>) {
    console.log("Running", name);
    try {
        await fn();
    } catch (e) {
        console.error("Failed with", e);
    }
}

function assert(predicate: boolean, comment: string) {
    if (!predicate) {
        throw Error("assertion failed for: " + comment);
    }
}

async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const inspect = (obj: any) =>
    util.inspect(obj, {
        showHidden: false,
        depth: null,
        colors: true,
    });

interface Vector2D {
    x: number;
    y: number;
}

interface BoatVelocity {
    length: number;
    angular: number;
}

interface BoatState {
    velocity: BoatVelocity;
    position: Vector2D;
}

type BoatStateChange = Partial<BoatState>;

function getDistance(pos1: Vector2D, pos2: Vector2D): number {
    return ((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2) ** 0.5;
}

const client = axios.create({
    baseURL: "http://localhost:8080/api/",
    timeout: 5000,
    headers: {
        Authorization: "Bearer test_player",
    },
});

const createSession = async () => {
    return (await client.post("/sessions/create")).data.data.sessionId;
};

const setupEngineForTesting = async (sessionId: string) => {
    await client.post(`/sessions/${sessionId}/engine/tick/stop`);
    await client.post(`/sessions/${sessionId}/engine/tick/set`, {
        data: {
            tickrate: 10,
        },
    });
};

const controlBoat = async (sessionId: string, data: BoatStateChange) =>
    client.post(`/sessions/${sessionId}/player/boat/set`, {
        data,
    });

const getBoat = async (sessionId: string) =>
    client.get(`/sessions/${sessionId}/player/boat`);

const proceedTick = async (sessionId: string, tickAmount: number) =>
    client.post(`/sessions/${sessionId}/engine/tick/proceed`, {
        data: {
            amount: tickAmount,
        },
    });

(async () => {
    await test("배가 앞으로 움직인다.", async () => {
        const sessionId = await createSession();
        await setupEngineForTesting(sessionId);
        await controlBoat(sessionId, {
            velocity: {
                length: 1,
                angular: 0,
            },
        });
        const oldResponse = await getBoat(sessionId);
        const oldPosition = oldResponse.data.data.position;
        await proceedTick(sessionId, 100);
        const response = await getBoat(sessionId);
        const newPosition = response.data.data.position;
        assert(
            getDistance(oldPosition, newPosition) === 10,
            `10만큼 이동해야 함 ${inspect(oldPosition)} -> ${inspect(
                newPosition
            )}`
        );
    });

    await test("배가 회전한다.", async () => {
        const sessionId = await createSession();
        await setupEngineForTesting(sessionId);
        await controlBoat(sessionId, {
            velocity: {
                length: 0,
                angular: 1,
            },
        });
        const oldResponse = await client.get(
            `/sessions/${sessionId}/player/boat`
        );
        const oldDegree = oldResponse.data.data;
        await proceedTick(sessionId, 100);
        const response = await getBoat(sessionId);
        const newDegree = response.data.data;
        assert(
            Math.abs(oldDegree.degree - newDegree.degree) === 10,
            `10만큼 회전해야 함 ${inspect(oldDegree)} -> ${inspect(newDegree)}`
        );
    });

    await test("세션마다 다른 상태를 갖는다.", async () => {});
})();
