let WebSocket = require("ws")
let readline = require("readline")
let jwt = require("jsonwebtoken")

let secret_code = "secret_key"
let port = 1515

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let socket
let username = ""
let room = ""

function prompt(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  username = await prompt("Ваше имя: ")
  room = await prompt("В какую комнату хотите войти: ")

  let jwt_token = jwt.sign(
    {
      username,
    },
    secret_code,
    {
      expiresIn: "24h",
    }
  )

  socket = new WebSocket(`ws://localhost:${port}?token=${jwt_token}`)

  socket.on("open", () => {
    socket.send(
      JSON.stringify({
        type: "join",
        username,
        room,
      })
    )

    console.log("Вы подключились!")
    promptLoop()
  })

  socket.on("message", (data) => {
    try {
      let data_with_message = JSON.parse(data)
      if (data_with_message.username) {
        console.log(
          `${data_with_message.username}: ${data_with_message.message}`
        )
      } else {
        console.log(`System: ${data_with_message.message}`)
      }
    } catch (e) {
      console.log("Ошибка: ", data)
    }
  })

  socket.on("close", () => {
    console.log("Соединение разорвано!")
    process.exit(0)
  })

  socket.on("error", (error) => {
    console.error("Ошибка: ", error.message)
  })
}

async function promptLoop() {
  while (true) {
    let terminal_input_field = await prompt("")
    if (terminal_input_field === "/exitroom") {
      socket.send(
        JSON.stringify({
          type: "leave",
          username,
          room,
        })
      )
      socket.close()
      break
    }
    socket.send(
      JSON.stringify({
        type: "message",
        username,
        room,
        message: terminal_input_field,
      })
    )
  }
}

main()