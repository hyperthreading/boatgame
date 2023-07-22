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

const roundTo = (n: number, digit: number) => {
   const mult = 1 / digit;
   return Math.round(n * mult) / mult;
};

function getDistance(pos1: Vector2D, pos2: Vector2D): number {
   return ((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2) ** 0.5;
}

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


type EntityId = string;
type PlayerId = string;

interface BoatProperty {
   velocity: Velocity;
   position: Vector2D;
   degree: number;
   scanRange: number;
}

interface Boat extends Entity, BoatProperty {
   type: "player_boat"
}

function isBoat(obj: Entity | Boat): obj is Boat {
   return obj.type === "player_boat";
}

interface Entity {
   id: EntityId;
   type: string;
   position: Vector2D;
}

interface CreateEntityData {
   type: string;
   position: Vector2D;
}

function isExistingEntity(obj: Entity | CreateEntityData): obj is Entity {
   return obj.hasOwnProperty("id");
}

function isNewEntity(obj: Entity | CreateEntityData): obj is CreateEntityData {
   return !obj.hasOwnProperty("id");
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
   entities: Array<Entity>;
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

type BoatChangeRequest = express.Request<{
   velocity: Partial<Velocity>;
   position: Vector2D;
   scanRange: number;
}>;

let idCounter = 0;
function get_unique_id() {
   // 내맴 ㅋㅋ
   return String(idCounter++);
}

const WORLD_LENGTH = 10;
const BOAT_SCAN_RANGE = 5;

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
      scanRange: BOAT_SCAN_RANGE,
   };
}

function tickState_new(): TickState {
   return {
      tickrate: 10,
      currentTick: 0,
      tickLoopId: null,
   };
}

function worldState_new(): WorldState {
   return {
      id: get_unique_id(),
      tick: tickState_new(),
      length: WORLD_LENGTH,
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


// TODO: index plz
function worldState_findEntityById(worldState: WorldState, id: EntityId) {
   return worldState.entities.find(ent => ent.id === id);
}

// TODO: it might be possible to index the search
function worldState_findEntityWithinRange(worldState: WorldState, position: Vector2D, range: number) {
   return worldState.entities.filter(entity =>
      getDistance(position, entity.position) <= range
   );
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

   const boat = worldState_findEntityById(world, entityRef.ownedEntityId);
   if (!boat || !isBoat(boat)) {
      return;
   }

   return boat;
}

function engine_tick_continue(worldState: WorldState, tickAmount: number) {
   for (let tick = 0; tick < tickAmount; tick++) {
      worldState.entities.forEach((entity) => {
         if (isBoat(entity)) {
            const degreeFromXAxis = 90 - entity.degree;
            const radian = (degreeFromXAxis * Math.PI) / 180;

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
}

function worldState_startTickLoop(world: WorldState) {
   world.tick.tickLoopId = setInterval(() => {
      engine_tick_continue(world, 1);
   }, 1000 / world.tick.tickrate);
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

function filterUndefined<T extends {}>(obj: T): any {
   return Object.fromEntries(
      Object.entries(obj).filter(([k, v]) => v !== undefined)
   );
}

playerRouter.post("/boat/set", (req: BoatChangeRequest, res) => {
   const boat = res.locals.boat;

   const velocityChange = filterUndefined(
      req.body.data.velocity as Partial<Velocity> || {}
   );
   const position = req.body.data.position || boat.position;
   const scanRange = req.body.data.scanRange || boat.scanRange;
   boat.velocity = { ...boat.velocity, ...velocityChange, position, scanRange };

   res.json({
      data: boat,
   });
});

playerRouter.get("/boat/scan", (req, res) => {
   const world: WorldState = res.locals.world;
   const boat: Boat = res.locals.boat;

   const entityWithinRange = worldState_findEntityWithinRange(world, boat.position, boat.scanRange);
   res.json({
      data: entityWithinRange.filter(entity => entity.id !== boat.id),
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

type UpsertMultipleEntityRequest = express.Request<any, any, {
   data: Array<Entity | CreateEntityData>
}>

sessionRouter.post("/upsert_multiple_entity", (req: UpsertMultipleEntityRequest, res) => {
   const upsertList = req.body.data;
   const updateList = upsertList.filter(isExistingEntity);
   const insertList = upsertList.filter(isNewEntity);

   const world = res.locals.world as WorldState;

   const result: Entity[] = [];

   insertList.forEach(data => {
      const entity = {
         ...data,
         id: get_unique_id()
      };
      world.entities.push(entity)
      result.push(entity);
   });
   updateList.forEach(data => {
      const entity = worldState_findEntityById(world, data.id)
      if (!entity) return;
      Object.assign(entity, data);
      result.push(entity)
   });

   res.json({
      message: "ok",
      data: result,
   });
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
