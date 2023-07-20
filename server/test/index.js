const axios = require("axios");

async function test(name, fn) {
    console.log("Running", name);
    try {
        await fn();
    } catch (e) {
        console.error("Failed with", e);
    }
}

function assert(predicate, comment) {
    if (!predicate) {
        throw Error("assertion failed for: " + comment);
    }
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getDistance(pos1, pos2) {
    return ((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2) ** 0.5;
}

const client = axios.create({
    baseURL: "http://localhost:8080/api/",
    timeout: 5000,
});

(async () => {
    await test("배가 앞으로 움직인다.", async () => {
        const sessionId = (await client.post("/sessions/create")).data.data
            .sessionId;
        await client.post(`/sessions/${sessionId}/engine/tick/stop`);
        await client.post(`/sessions/${sessionId}/engine/tick/set`, {
            data: {
                tickrate: 10,
            },
        });
        await client.post(`/sessions/${sessionId}/player/boat/set`, {
            data: {
                velocity: {
                    length: 1,
                    degree: 0,
                },
            },
        });
        const oldResponse = await client.get(
            `/sessions/${sessionId}/player/boat`
        );
        const oldPosition = oldResponse.data.data.position;
        await client.post(`/sessions/${sessionId}/engine/tick/proceed`, {
            data: {
                amount: 100,
            },
        });
        const response = await client.get(`/sessions/${sessionId}/player/boat`);
        const newPosition = response.data.data.position;
        console.log(oldPosition, newPosition);
        assert(
            getDistance(oldPosition, newPosition) === 10,
            "10만큼 이동해야 함"
        );
    });
})();
