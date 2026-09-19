const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");

const User = require("./models/user");
const Message = require("./models/message");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/yutch");
}
main()
  .then(() => console.log("connected successfully"))
  .catch((err) => console.log(err));

// --- MIDDLEWARE & CONFIGURATION ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(
  session({
    secret: "super-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour session
  })
);

// --- 1. AUTHENTICATION & SIGN UP ---
app.get("/new-account", (req, res) => {
  res.render("newacc");
});

app.post("/new-account", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.send("Please provide both email and password.");
  }

  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(`
        <h3>An account with this email already exists!</h3>
        <a href="/">Go to Sign In</a>
      `);
    }

    const newUser = new User({ email, password });
    await newUser.save();

    res.redirect("/");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Error creating account.");
  }
});

// --- 2. SIGN IN / LOGIN ---
app.get("/", (req, res) => {
  res.render("index");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.send("Please enter both email and password.");
  }

  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    const foundUser = await User.findOne({ email });

    if (!foundUser) {
      return res.send(`
        <h3>User not found!</h3>
        <p>No user registered under <strong>${email}</strong>.</p>
        <a href="/new-account">Create Account</a> | <a href="/">Try Again</a>
      `);
    }

    if (foundUser.password !== password) {
      return res.send(`
        <h3>Incorrect password!</h3>
        <a href="/">Try Again</a> | <a href="/forgot-password">Reset Password</a>
      `);
    }

    req.session.userId = foundUser._id;
    req.session.userEmail = foundUser.email;
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Error signing in.");
  }
});

// --- 3. FORGOT / RESET PASSWORD ---
app.get("/forgot-password", (req, res) => {
  res.render("forgetpassword");
});

app.post("/forgot-password", async (req, res) => {
  let { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.send("Please enter both email and new password.");
  }

  email = email.trim().toLowerCase();
  newPassword = newPassword.trim();

  try {
    const foundUser = await User.findOne({ email });

    if (!foundUser) {
      return res.send(`
        <h3>User not found!</h3>
        <p>No user registered under <strong>${email}</strong>.</p>
        <a href="/new-account">Create Account</a> | <a href="/forgot-password">Try Again</a>
      `);
    }

    foundUser.password = newPassword;
    await foundUser.save();

    console.log(`Password reset successfully for: ${email}`);
    res.redirect("/");
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).send("Error updating password.");
  }
});

// --- 4. PROTECTED DASHBOARD ROUTE ---
app.get("/dashboard", (req, res) => {
  if (!req.session.userEmail) {
    return res.redirect("/");
  }
  res.render("dashboard", { email: req.session.userEmail });
});

// --- 5. LOGOUT ROUTE ---
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out.");
    }
    res.redirect("/");
  });
});

// --- 6. REAL-TIME SOCKET.IO & PERSISTENCE ---
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  // Send the last 50 messages to the user who just connected
  try {
    const previousMessages = await Message.find().sort({ createdAt: 1 }).limit(50);
    socket.emit("loadHistory", previousMessages);
  } catch (err) {
    console.error("Error loading chat history:", err);
  }

  // Handle incoming chat messages
  socket.on("chatMessage", async (data) => {
    const formattedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    const messageData = {
      user: data.user,
      text: data.text,
      time: formattedTime
    };

    // 1. Save to MongoDB
    try {
      const newMessage = new Message(messageData);
      await newMessage.save();
    } catch (err) {
      console.error("Error saving message:", err);
    }

    // 2. Broadcast to everyone
    io.emit("message", messageData);
  });

  // Handle typing events
  socket.on("typing", (username) => {
    socket.broadcast.emit("userTyping", username);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("userStopTyping");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// --- 7. SERVER LISTEN ---
server.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});