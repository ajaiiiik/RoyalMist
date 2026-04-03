require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session")
const passport = require("./config/passport");
const User = require("./model/userSchema");

const connectDB = require("./config/db");
const userRoutes = require("./router/userRouter"); 
const adminRoutes = require("./router/adminRouter");

const app = express();


//DATABASE 
connectDB();


//MIDDLEWARE
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());


app.use(express.static(path.join(__dirname, "public")));


//VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecretkey",
    resave: false,
    saveUninitialized: false,
    cookie :{
      maxAge:24*60*60*1000,
      httpOnly:true,
        secure: false,  
        sameSite: "lax"
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ROUTES
app.use('/',userRoutes);
app.use('/admin', adminRoutes); 



app.get("/", (req, res) => {
  res.redirect("/signup");
});


//SERVER 
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});