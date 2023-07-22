import { useEffect, useState } from "react";
import "./App.css";
import axios from "axios";

interface Velocity {
  length: number;
  angular: number;
}
type VelocityChange = Partial<Velocity>;

const client = axios.create({
  baseURL: "/api",
});

const createSession = async () => {
  return (await client.post(`/sessions/create`)).data.data.sessionId;
};

const joinSession = async (sessionId: string) => {
  return await client.post(`/sessions/${sessionId}/join`);
};

const proceed = async (sessionId: string, amount: number) => {
  return (
    await client.post(`/sessions/${sessionId}/engine/tick/proceed`, {
      data: {
        amount,
      },
    })
  ).data;
};

const getBoatState = async (sessionId: string) => {
  return (await client.get(`/sessions/${sessionId}/player/boat`)).data.data;
};

const setBoatState = async (sessionId: string, velocity: VelocityChange) => {
  return (
    await client.post(`/sessions/${sessionId}/player/boat/set`, {
      data: {
        velocity,
      },
    })
  ).data.data;
};

function App() {
  const worldLength = 10;
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleCreateSession = async () => {
    const sessionId = await createSession();
    setSessionId(sessionId);
  };

  const [sessionIdInputText, setSessionIdInputText] = useState<string>("");

  const handleJoinSession = async (sessionId: string) => {
    await joinSession(sessionId);
    setSessionId(sessionId);
  };

  const [tickAmountInputText, setTickAmountInputText] = useState<string>("");

  const [boat, setBoat] = useState<{
    velocity: Velocity;
    position: { x: number; y: number };
    degree: number;
  }>({
    velocity: { length: 0, angular: 0 },
    position: { x: worldLength / 2, y: worldLength / 2 },
    degree: 0,
  });

  useEffect(() => {
    if (sessionId === null) return;
    const timerId = setInterval(async () => {
      const boat = await getBoatState(sessionId);
      setBoat(boat);
    }, 100);

    return () => {
      clearInterval(timerId);
    };
  }, [sessionId]);

  const changeBoatVelocity = async (deltaChange: VelocityChange) => {
    if (sessionId === null) return;

    const delta: Velocity = {
      length: deltaChange.length || 0,
      angular: deltaChange.angular || 0,
    };
    const targetVelocity = {
      length: boat.velocity.length + delta.length,
      angular: boat.velocity.angular + delta.angular,
    };
    await setBoatState(sessionId, targetVelocity);
  };

  return (
    <>
      <h1>Boatgame</h1>
      <div
        style={{
          display: "flex",
        }}
      >
        <section>
          <div
            style={{
              width: 500,
              height: 500,
              border: "1px solid black",
              background: "white",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: boat.position.x * 50 - 25,
                left: boat.position.y * 50 - 25,
                rotate: `-${boat.degree}deg`,
                background: "black",
                border: "1px solid black",
                borderRadius: 50,
                width: 50,
                height: 50,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 50 - 50 / 2,
                  left: 50 / 2,
                  width: 0,
                  height: 50 / 2,
                  border: "1px solid red",
                }}
              ></div>
            </div>
          </div>
        </section>
        <div style={{ width: 100 }}></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <section>
            <h3>Session</h3>
            {sessionId === null ? (
              <p>Currently not joined in session</p>
            ) : (
              <p>Current Session: {sessionId}</p>
            )}
            <button onClick={handleCreateSession}>Create</button>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <input
                onChange={(e) => {
                  setSessionIdInputText(e.target.value);
                }}
              ></input>
              <button
                onClick={() => {
                  handleJoinSession(sessionIdInputText);
                }}
              >
                Join
              </button>
            </div>
          </section>
          <section>
            <h3>Control</h3>
            <div>
              <p>Velocity</p>
              <p>
                {boat.velocity.length} u/s
                <button
                  onClick={() => {
                    changeBoatVelocity({ length: 0.5 });
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => {
                    changeBoatVelocity({ length: -0.5 });
                  }}
                >
                  -
                </button>
              </p>
              <p>
                {boat.velocity.angular} deg/s
                <button
                  onClick={() => {
                    changeBoatVelocity({ angular: 15 });
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => {
                    changeBoatVelocity({ angular: -15 });
                  }}
                >
                  -
                </button>
              </p>
            </div>
            <div>
              <p>Tick</p>
              <input
                onChange={(e) => setTickAmountInputText(e.target.value)}
              ></input>
              <button
                onClick={() => {
                  if (sessionId === null) {
                    return;
                  }
                  proceed(sessionId, Number(tickAmountInputText));
                }}
              >
                proceed
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default App;
