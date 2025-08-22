/*
(c) 2025 Louis D. Nel
Based on:
https://socket.io
see in particular:
https://socket.io/docs/
https://socket.io/get-started/chat/

Before you run this app first execute
>npm install
to install npm modules dependencies listed in the package.json file
Then launch this server:
>node server.js

To test open several browsers to: http://localhost:3000/chatClient.html

*/
const server = require('http').createServer(handler)
const io = require('socket.io')(server) //wrap server app in socket io capability
const fs = require('fs'); //file system to server static files
const { register } = require('module');
const url = require('url'); //to parse url strings
const PORT = process.argv[2] || process.env.PORT || 3000 //useful if you want to specify port through environment variable
                                                         //or command-line arguments

const ROOT_DIR = 'html' //dir to serve static files from

const MIME_TYPES = {
  'css': 'text/css',
  'gif': 'image/gif',
  'htm': 'text/html',
  'html': 'text/html',
  'ico': 'image/x-icon',
  'jpeg': 'image/jpeg',
  'jpg': 'image/jpeg',
  'js': 'application/javascript',
  'json': 'application/json',
  'png': 'image/png',
  'svg': 'image/svg+xml',
  'txt': 'text/plain'
}

function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES['txt']
}

server.listen(PORT) //start http server listening on PORT

function handler(request, response) {
  //handler for http server requests including static files
  let urlObj = url.parse(request.url, true, false)
  console.log('\n============================')
  console.log("PATHNAME: " + urlObj.pathname)
  console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
  console.log("METHOD: " + request.method)

  let filePath = ROOT_DIR + urlObj.pathname
  if (urlObj.pathname === '/') filePath = ROOT_DIR + '/chatClient.html'

  fs.readFile(filePath, function(err, data) {
    if (err) {
      //report error to console
      console.log('ERROR: ' + JSON.stringify(err))
      //respond with not found 404 to client
      response.writeHead(404);
      response.end(JSON.stringify(err))
      return
    }
    response.writeHead(200, {
      'Content-Type': get_mime(filePath)
    })
    response.end(data)
  })

}

const activeUsers = new Set()
const registeredUsers = new Map()

//Socket Server
io.on('connection', function(socket) {
  console.log('user connected')

  socket.on('register', function(username){
    if(activeUsers.has(username)){
      socket.emit('serverSays', {sender: "Server", message: "ERROR: Username already in use"})
      return
    }
    //registers users after checking if username already exists or not
    socket.username = username
    activeUsers.add(username)
    registeredUsers.set(socket.id, username)
    socket.emit('acknowledge', `You are now connected as ${username}`)
  })

  socket.on('clientSays', function(data) {
    if (!socket.username) { //checks if registered if user is trying to send message. This should never occur as the message box and send buttons are disabled and only get enabled once registered 
      socket.emit('serverSays', { sender: "Server", message: "ERROR: You must register before sending messages" })
      return
    }
    
    let message = data.trim()
    let recipients = []
    let privateMessage = false
    let match = message.match(/^([\w\s,]+):\s*(.+)$/) //checks to see if the message being sent is private or not

    if (match) { 
      //gets the intended recipients from the message and then filters out any unactive users
      let rawRecipients = match[1].split(',').map(name => name.trim())
      let validRecipients = rawRecipients.filter(name => activeUsers.has(name))
      
      //a check again to make sure there is valid recipients
      if (validRecipients.length > 0) {
        recipients = validRecipients
        message = match[2] //actual message
        privateMessage = true
      }
    }
    
    if (privateMessage) {
      //sends message to each recipient individually
      recipients.forEach(recipient => {
        let recipientSocket = [...registeredUsers.entries()].find(([id, name]) => name === recipient)
        if (recipientSocket) { //if found, send to user
          io.to(recipientSocket[0]).emit('serverSays', { sender: socket.username, message, private: true })
        }
      })
      //special format for the sender
      socket.emit('serverSays', { sender: `Me {to: ${recipients.join(', ')}}`, message, private: true, recipients })
    } else {
      //if not private, send to each active/registered user
        registeredUsers.forEach((_, id) =>{
         io.to(id).emit('serverSays', { sender: socket.username, message })
      })
    }


    console.log('RECEIVED: ' + data)

  })

  socket.on('disconnect', function(data) {
    //event emitted when a client disconnects
    if(socket.username){
      activeUsers.delete(socket.username)
      registeredUsers.delete(socket.id)
      console.log(`User ${socket.username} disconnected`)
    }
    console.log('client disconnected')
  })
})

console.log(`Server Running at port ${PORT}  CNTL-C to quit`)
console.log(`To Test:`)
console.log(`Open several browsers to: http://localhost:${PORT}/chatClient.html`)
