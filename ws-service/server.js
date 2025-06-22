let WebSocket = require("ws")
let { v4: uuidv4 } = require("uuid")
let jwt = require("jsonwebtoken")
let url = require("url")

let port_adress = 1515
let secret_code = "secret_key"
let wss = new WebSocket.Server({ port: port_adress })
let interval_timeout = 5000 // отключение системой пользователя, если тот неактивен 5 секунд
let security_info

let rooms = new Map()

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

function broadcast(room, data, except = null) {
  let clients = rooms.get(room)
  if (!clients) return
  clients.forEach((client) => {
    if (client !== except) {
      send(client, data)
    }
  })
}

function validate(data) {
  if (!data.type || !["join", "leave", "message"].includes(data.type)) {
    return 'Вы не указали поле "type", которое должно быть со значением "join", "leave" или "message"'
  }
  if (!data.username || typeof data.username !== "string") {
    return 'Вы не указали поле "username"!'
  }
  if (!data.room || typeof data.room !== "string") {
    return 'Вы не указали поле "room"!'
  }
  if (data.type === "message" && !data.message) {
    return 'Вы не указали поле "message"!'
  }
  return null
}

function heartbeat() {
  this.isAlive = true
}

wss.on("connection", function (ws, req) {
  ws.isAlive = true
  ws.on("pong", heartbeat)

  let query = url.parse(req.url, true).query
  let jwt_token = query.token

  if (!jwt_token) {
    ws.close(4001, "Токен отсутствует")
    return
  }

  try {
    security_info = jwt.verify(jwt_token, secret_code)
  } catch (e) {
    ws.close(4002, "Неверный токен")
    return
  }

  ws.id = uuidv4()
  ws.username = security_info.username

  ws.on("message", function (string_input) {
    let data
    try {
      data = JSON.parse(string_input)
    } catch {
      return send(ws, {
        type: "error",
        message: "Неверный JSON",
      })
    }

    let error = validate(data)
    if (error) {
      return send(ws, {
        type: "error",
        message: `Ошибка валидации: ${error}`,
      })
    }

    let { type, username, room, message } = data
    ws.room = room

    if (!rooms.has(room)) {
      rooms.set(room, new Set())
    }

    rooms.get(room).add(ws)

    if (type == "join") {
      broadcast(
        room,
        {
          type: "system",
          message: `Пользователь ${username} вошёл в комнату "${room}"`,
        },
        ws
      )
    } else if (type == "message") {
      broadcast(room, {
        type: "message",
        username,
        message,
      })
    } else if (type == "leave") {
      broadcast(
        room,
        {
          type: "system",
          message: `Пользователь ${username} покинул комнату`,
        },
        ws
      )
      rooms.get(room).delete(ws)
    }
  })

  ws.on("close", () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws)
      broadcast(ws.room, {
        type: "system",
        message: `${ws.username || "Пользователь"} отключился`,
      })
    }
  })
})

let interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate()
      return
    }
    ws.isAlive = false
    ws.ping()
  })
}, interval_timeout)

wss.on("close", function close() {
  clearInterval(interval)
})

console.log(`WebSocketServer запущен по адресу - ws://localhost:${port_adress}`)