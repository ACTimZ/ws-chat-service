let jwt = require('jsonwebtoken')

let jwt_token = jwt.sign(
  {
    username: 'Person_1'
  },
  'secret_key',
  {
    expiresIn: '24h'
  }
)

console.log('Ваш токен: ', jwt_token)
