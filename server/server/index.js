const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.send("OK");
});

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
  res.json({
    data: "ok",
  });
});
tickRouter.post("/proceed", (req, res) => {
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
  res.json({
    data: {
      position: {
        x: 0,
        y: 0,
      },
    },
  });
});

playerRouter.post("/boat/set", (req, res) => {
  res.json({
    data: {
      position: {
        x: 0,
        y: 0,
      },
    },
  });
});

const sessionRouter = express.Router();
sessionRouter.use("/engine/tick", tickRouter);
sessionRouter.use("/player", playerRouter);

app.use("/api/sessions/:sessionId", sessionRouter);

app.listen(8080, () => {
  console.log("Server is listening on 8080");
});
