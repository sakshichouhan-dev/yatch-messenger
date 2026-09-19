const socket = io();
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatStream = document.getElementById("chatStream");
const typingNotice = document.getElementById("typingNotice");
const typingUser = document.getElementById("typingUser");

const currentUser = document.body.dataset.userEmail;
let typingTimeout;

// 1. Submit message
if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    socket.emit("chatMessage", {
      user: currentUser,
      text: text
    });

    socket.emit("stopTyping");
    chatInput.value = "";
  });
}

// 2. Detect typing in input
if (chatInput) {
  chatInput.addEventListener("input", () => {
    socket.emit("typing", currentUser.split("@")[0]);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping");
    }, 1200);
  });
}


// Render entire message history when opening the app
socket.on("loadHistory", (messages) => {
  // Clear any placeholder text except the welcome line if desired
  messages.forEach((msg) => {
    const isMe = msg.user === currentUser;
    const row = document.createElement("div");
    row.className = `msg-row ${isMe ? "sent" : "received"}`;

    row.innerHTML = `
      <span class="msg-sender">
        ${isMe ? "You" : msg.user}
        <span class="msg-time">${msg.time || ""}</span>
      </span>
      <div class="msg-text">${msg.text}</div>
    `;

    chatStream.appendChild(row);
  });

  chatStream.scrollTop = chatStream.scrollHeight;
});


// 3. Render incoming message with timestamp
socket.on("message", (payload) => {
  const isMe = payload.user === currentUser;
  const row = document.createElement("div");
  row.className = `msg-row ${isMe ? "sent" : "received"}`;

  row.innerHTML = `
    <span class="msg-sender">
      ${isMe ? "You" : payload.user}
      <span class="msg-time">${payload.time || ""}</span>
    </span>
    <div class="msg-text">${payload.text}</div>
  `;

  chatStream.appendChild(row);
  chatStream.scrollTop = chatStream.scrollHeight;
});

// 4. Handle typing indicators
socket.on("userTyping", (username) => {
  if (typingUser && typingNotice) {
    typingUser.textContent = username;
    typingNotice.style.display = "block";
  }
});

socket.on("userStopTyping", () => {
  if (typingNotice) {
    typingNotice.style.display = "none";
  }
});