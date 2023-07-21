const util = require("util");

const express = require("express");
const app = express();

app.use(require("morgan")("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
    res.send("OK");
});

function boat_new() {
    return {
        type: "player_boat",
        velocity: {
            length: 0,
            angular: 0,
        },
        position: {
            x: 0,
            y: 0,
        },
        degree: 0,
    };
}

function tickState_new() {
    return {
        tickrate: 0,
        currentTick: 0,
    };
}

function worldState_new() {
    return {
        tick: tickState_new(),
        entities: [boat_new()],
    };
}

const testWorld = worldState_new();

function engine_tick_continue(worldState, tickAmount) {
    for (let tick = 0; tick < tickAmount; tick++) {
        worldState.entities.forEach((entity) => {
            if (entity.type === "player_boat") {
                function mulVector(v, l) {
                    return {
                        x: v.x * l,
                        y: v.y * l,
                    };
                }

                function addVector(v0, v1) {
                    return {
                        x: v0.x + v1.x,
                        y: v0.y + v1.y,
                    };
                }

                function applyVector(v, fn) {
                    return {
                        x: fn(v.x),
                        y: fn(v.y),
                    };
                }
                const degreeFromXAxis = 90 - entity.degree;
                const radian = (degreeFromXAxis * Math.PI) / 180;

                const roundTo = (n, digit) => {
                    const mult = 1 / digit;
                    return Math.round(n * mult) / mult;
                };

                const normalizedVector = {
                    x: Math.sin(radian),
                    y: Math.cos(radian),
                };

                const displacement =
                    mulVector(
                        normalizedVector,
                        entity.velocity.length / worldState.tick.tickrate
                    );

                // floating point가 근삿값인 관계로 10진수로 반올림 해줘야 함.
                entity.position = applyVector(
                    addVector(entity.position, displacement),
                    (n) => roundTo(n, 0.001)
                );

                entity.degree = roundTo(entity.degree + entity.velocity.angular / worldState.tick.tickrate, 0.001);
            }
        });
    }
    worldState.tick.currentTick += tickAmount;
    console.log(
        util.inspect(worldState, {
            showHidden: false,
            depth: null,
            colors: true,
        })
    );
}

const tickRouter = express.Router();
tickRouter.post("/start", (req, res) => {
    res.json({
        data: "ok",
    });
});
tickRouter.post("/stop", (req, res) => {
    res.json({
        data: "ok",
    });
});
tickRouter.post("/set", (req, res) => {
    testWorld.tick.tickrate = req.body.data.tickrate;
    res.json({
        data: "ok",
    });
});
tickRouter.post("/proceed", (req, res) => {
    engine_tick_continue(testWorld, req.body.data.amount);
    res.json({
        data: "ok",
    });
});
tickRouter.post("/add-breakpoint", (req, res) => {
    res.json({
        data: "ok",
    });
});

const playerRouter = express.Router();
playerRouter.get("/boat", (req, res) => {
    const boat = testWorld.entities[0];

    res.json({
        data: boat,
    });
});

playerRouter.post("/boat/set", (req, res) => {
    const boat = testWorld.entities[0];
    boat.velocity.length = req.body.data.velocity.length;
    boat.velocity.angular = req.body.data.velocity.angular;

    res.json({
        data: boat,
    });
});

const sessionRouter = express.Router();
sessionRouter.use("/engine/tick", tickRouter);
sessionRouter.use("/player", playerRouter);

const sessionManagerRouter = express.Router();
sessionManagerRouter.post("/create", (req, res) =>
    res.json({ data: { sessionId: "test" } })
);
sessionManagerRouter.use("/:sessionId", sessionRouter);
app.use("/api/sessions", sessionManagerRouter);

app.listen(8080, () => {
    console.log("Server is listening on 8080");
});
