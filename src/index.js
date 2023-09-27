const express = require('express')
const http = require('http')
const path = require('path')
const socket = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const publicPath = path.join(__dirname, '../public')

const app = express()
const server = http.createServer(app)
const io = socket(server)

const port = process.env.PORT || 3000

app.use(express.static(publicPath))


io.on('connection', (socket) => {
    console.log("New Websocket connection");

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id:socket.id, ...options })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', "Welcome!"))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        console.log(`${user.username} is joined in ${user.room}`);

        callback()

    })

    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        console.log("sendMessage ", user);
        const filter = new Filter()

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username,msg))
        callback("Delivered!")
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        console.log("sendLocation ", user);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

})


server.listen(port, () => {
    console.log('Server is up on ', port);
})