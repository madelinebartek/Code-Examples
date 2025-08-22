const socket = io(); // Connect to server
let isRegister = false; 

document.addEventListener('DOMContentLoaded', function () {
  const usernameInput = document.getElementById('user_name');
  const connectButton = document.getElementById('connect_button');
  const messageBox = document.getElementById('msgBox');
  const sendButton = document.getElementById('send_button');
  const messagesDiv = document.getElementById('messages');
  const clearButton = document.getElementById('clear_button')

  //checks if the username passed in is valid or not
  function isValidUsername(username) {
    const usernamePattern = /^[A-Za-z][A-Za-z0-9]*(\s[A-Za-z0-9]+)*[A-Za-z0-9]$/
    return usernamePattern.test(username) && !/^(me|Me|ME)$/.test(username)
  }

  //adds to connect button, a function that checks if username is valid, and if it is, disables the username box and connect button
  connectButton.addEventListener('click', function () {
    const username = usernameInput.value.trim()
    if (!isValidUsername(username)) {
      let msgDiv = document.createElement('div')
      msgDiv.textContent = `ERROR: ${username} IS NOT A VALID USER NAME`
      messagesDiv.appendChild(msgDiv)
      usernameInput.value = ''
      return;
    }
    
    socket.emit('register', username);

    usernameInput.setAttribute('disabled', '')
    connectButton.setAttribute('disabled', '')
    
  });

  sendButton.addEventListener('click', function () {
    if(!isRegister) { //another check to make sure user is registered before sending messages, except shouldn't ever occur as button and message box are disabled and only enabled once registered
      let msgDiv = document.createElement('div')
      msgDiv.textContent = "ERROR: You must register before sending messages"
      messagesDiv.appendChild(msgDiv)
      return; 
    }

    const message = messageBox.value.trim();
    //checks to make sure message isn't blank  
    if (message !== '') {
      socket.emit('clientSays', message)
      messageBox.value = '';
    }
  });

  //clears sent messages for the user 
  clearButton.addEventListener('click', function(){
    messagesDiv.innerHTML = ''
  })

  //checks to see if the message is meant to be private or not
  //sends message out to all or to intended recipients (based on if private or not)
  //format of the message changes depending on who the intended recipients are (green if private, blue if the message for the message appearing on the sender's screen, black for everyone else)
  socket.on('serverSays', function ({sender, message, private: isPrivate, recipients}) {
    let msgDiv = document.createElement('div');
    
    if (isPrivate) {
      msgDiv.className = 'private';
      if (sender === usernameInput.value) { 
        //message sent to the user who sent private message
        msgDiv.textContent = `Me {to: ${recipients.join(', ')}}: ${message}`;
      } else {
        //private message sent to the recipient
        msgDiv.textContent = `${sender}: ${message}`;
      }
    } else if (sender === usernameInput.value) {
      //public message sent to user who sent message
      msgDiv.className = 'sender';
      msgDiv.textContent = `Me: ${message}`;
    } else {
      //public message sent to everyone else 
      msgDiv.className = 'other';
      msgDiv.textContent = `${sender}: ${message}`;
    }
    
    messagesDiv.appendChild(msgDiv);
  })

  //turns on flag that says user is registered and enables the message box and send button 
  socket.on('acknowledge', function (message) {
    isRegister = true;
    messagesDiv.innerHTML += `<div>${message}</div>`;

    messageBox.removeAttribute('disabled')
    sendButton.removeAttribute('disabled')
  });

  document.addEventListener('keydown', function (event) {
    if (event.keyCode === 13) {
      sendButton.click();
    }
  });
});
