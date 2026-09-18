const express = require("express");
const app = express();
const mongoose = require("mongoose");
const User = require("./models/user");
const path = require("path");
const methodOverride = require("method-override");
const user = require("./models/user");
const session = require("express-session");


main()
.then( () => {
 console.log("connected sucessfilly");
})
.catch((err) =>{
  console.log(err);
});

async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/yutch');
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended : true}) );
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "super-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour session
  })
);

app.get("/", (req,res) =>{
  res.sendFile(path.join(__dirname, ' index.html '));
});



// --- SIGN UP / CREATE ACCOUNT ---

app.get("/new-account", (req, res) =>{
  res.render("newacc");
});

app.post("/new-account", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.send("Please provide both email and password.");
  }

  email = email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(`
        <h3>An account with this email already exists!</h3>
        <a href="/">Go to Sign In</a>
      `);
    }

    const newUser = new User({ email, password: password.trim() });
    await newUser.save();

    res.redirect("/?registered=true");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Error creating account.");
  }
});




// --- SIGN IN / LOGIN ---


app.post("/login", async (req, res) => {
  console.log("Raw body recieved:", req.body);
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

    // res.send(`
    //   <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
    //     <h1>Welcome, ${foundUser.email}!</h1>
    //     <p>You are successfully signed in.</p>
    //     <a href="/">Logout</a>
    //   </div>
    // `);
    req.session.userId = foundUser._id;
    req.session.userEmail = foundUser.email;


    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Error signing in.");
  }
});


// 1. Protected Dashboard Route
app.get("/dashboard", (req, res) => {
  // If no user is logged in, redirect them back to the login screen
  if (!req.session.userId) {
    return res.redirect("/");
  }

  // Render the dashboard with their email
  res.render("dashboard", { email: req.session.userEmail });
});

// 2. Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.send("Error logging out.");
    }
    // Clear cookie and redirect to login
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});


//forgot password
app.get("/forgot-password", (req,res) =>{
  res.render("forgetpassword", {message: null});
});

app.post("/forgot-password", async (req, res) =>{
    const { email } = req.body;

    try{
      const User = await user.findOne({email});

      if (!user) {
      return res.render("forgetpassword", { 
        message: "No account found with this email address." 
      });
    }

    res.render("forgetpassword", { 
      message: `A reset link has been simulated for ${email}. Check your inbox!` 
    });

  } catch (err) {
    console.error(err);
    res.render("forgetpassword", { 
      message: "An error occurred. Please try again." 
    });
  }
});
  



app.get("/clean-db", async (req, res) => {
  try {
    await User.deleteMany({});
    res.send("Database wiped clean! You can now create a fresh account.");
  } catch (err) {
    res.status(500).send("Failed to clear database: " + err.message);
  }
});

app.listen(3000, () =>{
  console.log("server is running");
});