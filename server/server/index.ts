import util from "util";
import express, { Locals } from "express";
import morgan from "morgan";

const app = express();

app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
   res.send("OK");
});

interface Velocity {
   length: number;
   angular: number;
}

interface Vector2D {
   x: number;
   y: number;
}

type EntityId = string;
type PlayerId = string;

interface Boat {
   type: string;
   id: EntityId;
   velocity: Velocity;
   position: Vector2D;
   degree: number;
}

interface PlayerOwnedEntity {
   ownedEntityId: EntityId;
   playerId: PlayerId;
}

interface TickState {
   tickrate: number;
   currentTick: number;
   tickLoopId: NodeJS.Timer | null;
}

interface WorldState {
   id: string;
   tick: TickState;
   length: number;
   entities: Array<Boat>;
   playerOwnEntityRefList: Array<PlayerOwnedEntity>;
}
type SessionIdRequest = express.Request<{
   sessionId: string;
}>;
type SessionBasedRequest = express.Request<
   any,
   any,
   any,
   any,
   { world: WorldState }
>;
type PlayerRequest = express.Request<
   any,
   any,
   any,
   any,
   { world: WorldState; boat: Boat }
>;

let idCounter = 0;
function get_unique_id() {
   // 내맴 ㅋㅋ
   return String(idCounter++);
}

function boat_new(): Boat {
   return {
      type: "player_boat",
      id: get_unique_id(),
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

function tickState_new(): TickState {
   return {
      tickrate: 10,
      currentTick: 0,
      tickLoopId: null
   };
}

function worldState_new(): WorldState {
   return {
      id: get_unique_id(),
      tick: tickState_new(),
      length: 10,
      entities: [],
      playerOwnEntityRefList: [],
   };
}

function worldState_checkPlayerExist(
   worldState: WorldState,
   playerId: PlayerId
) {
   return Boolean(
      worldState.playerOwnEntityRefList.find((ref) => ref.playerId === playerId)
   );
}

function worldState_addPlayer(worldState: WorldState, playerId: PlayerId) {
   const boat = boat_new();
   boat.position.x = Math.round(Math.random() * worldState.length);
   boat.position.y = Math.round(Math.random() * worldState.length);
   worldState.entities.push(boat);
   worldState.playerOwnEntityRefList.push({
      ownedEntityId: boat.id,
      playerId,
   });
}

const sessions: Array<WorldState> = [];

function findSession(sessionId: string): WorldState | undefined {
   return sessions.find((session) => session.id === sessionId);
}

function findPlayerBoat(
   world: WorldState,
   playerId: PlayerId
): Boat | undefined {
   const entityRef = world.playerOwnEntityRefList.find(
      (entityRef) => entityRef.playerId === playerId
   );
   if (!entityRef) {
      return;
   }

   const boat = world.entities.find(
      (entity) => entity.id === entityRef.ownedEntityId
   );
   if (!boat) {
      return;
   }

   return boat;
}

function engine_tick_continue(worldState: WorldState, tickAmount: number) {
   for (let tick = 0; tick < tickAmount; tick++) {
      worldState.entities.forEach((entity) => {
         if (entity.type === "player_boat") {
            function mulVector(v: Vector2D, l: number) {
               return {
                  x: v.x * l,
                  y: v.y * l,
               };
            }

            function addVector(v0: Vector2D, v1: Vector2D) {
               return {
                  x: v0.x + v1.x,
                  y: v0.y + v1.y,
               };
            }

            function applyVector(v: Vector2D, fn: (n: number) => number) {
               return {
                  x: fn(v.x),
                  y: fn(v.y),
               };
            }
            const degreeFromXAxis = 90 - entity.degree;
            const radian = (degreeFromXAxis * Math.PI) / 180;

            const roundTo = (n: number, digit: number) => {
               const mult = 1 / digit;
               return Math.round(n * mult) / mult;
            };

            const normalizedVector = {
               x: Math.sin(radian),
               y: Math.cos(radian),
            };

            const displacement = mulVector(
               normalizedVector,
               entity.velocity.length / worldState.tick.tickrate
            );

            // floating point가 근삿값인 관계로 10진수로 반올림 해줘야 함.
            entity.position = applyVector(
               addVector(entity.position, displacement),
               (n) => roundTo(n, 0.001)
            );

            entity.degree = roundTo(
               entity.degree +
               entity.velocity.angular / worldState.tick.tickrate,
               0.001
            );
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

function worldState_startTickLoop(world: WorldState) {
   world.tick.tickLoopId = setInterval(
      () => {
         engine_tick_continue(world, 1);
      }, 1000 / world.tick.tickrate
   )
}

function worldState_stopTickLoop(world: WorldState) {
   if (world.tick.tickLoopId === null) return;
   clearInterval(world.tick.tickLoopId);
}

const tickRouter = express.Router();
tickRouter.post("/start", (req, res) => {
   worldState_startTickLoop(res.locals.world);
   res.json({
      data: "ok",
   });
});
tickRouter.post("/stop", (req, res) => {
   worldState_stopTickLoop(res.locals.world);
   res.json({
      data: "ok",
   });
});
tickRouter.post("/set", (req: SessionBasedRequest, res) => {
   const world = res.locals.world;
   world.tick.tickrate = req.body.data.tickrate;
   res.json({
      data: "ok",
   });
});
tickRouter.post("/proceed", (req: SessionBasedRequest, res) => {
   const world = res.locals.world;

   engine_tick_continue(world, req.body.data.amount);
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

playerRouter.get("/boat", (req: PlayerRequest, res) => {
   const boat = res.locals.boat;

   res.json({
      data: boat,
   });
});

playerRouter.post("/boat/set", (req: PlayerRequest, res) => {
   const boat = res.locals.boat;

   let { length, angular } = req.body.data.velocity as Partial<Velocity>;
   length = length != undefined ? length : boat.velocity.length;
   angular = angular != undefined ? angular : boat.velocity.angular;
   boat.velocity = { ...boat.velocity, length, angular };

   res.json({
      data: boat,
   });
});

const sessionRouter = express.Router();
sessionRouter.use("/engine/tick", tickRouter);
sessionRouter.use(
   "/player",
   (req, res, next) => {
      const boat = findPlayerBoat(
         res.locals.world as WorldState,
         res.locals.playerId
      );
      if (!boat) {
         res.status(422).json({
            message: "Player not found",
         });
         return;
      }
      res.locals.boat = boat;

      next();
   },
   playerRouter
);
sessionRouter.post("/join", (req, res) => {
   const world = res.locals.world;
   const playerId = res.locals.playerId;
   if (worldState_checkPlayerExist(world, playerId)) {
      worldState_addPlayer(world, playerId);
      res.json({ message: "ok" });
   } else {
      res.status(422).json({ message: "player already has joined." });
   }
});

const sessionManagerRouter = express.Router();
sessionManagerRouter.post("/create", (req, res) => {
   const world = worldState_new();
   worldState_addPlayer(world, res.locals.playerId);
   worldState_startTickLoop(world);
   sessions.push(world);
   return res.json({ data: { sessionId: world.id } });
});

sessionManagerRouter.use(
   "/:sessionId",
   (req: SessionIdRequest, res, next) => {
      const world = findSession(req.params.sessionId);

      if (!world) {
         res.status(422).json({
            message: "World not found",
         });

         return;
      }

      res.locals.world = world;
      next();
   },
   sessionRouter
);
app.use(
   "/api/sessions",
   (req, res, next) => {
      try {
         res.locals.playerId = req.headers.authorization?.split(" ")[1] || "";
      } catch (e) {
         res.status(401).json({ message: "invalid token" });
         return;
      }
      next();
   },
   sessionManagerRouter
);

app.listen(8080, () => {
   console.log("Server is listening on 8080");
});
