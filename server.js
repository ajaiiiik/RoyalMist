require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session")

const connectDB = require("./config/db");
const userRoutes = require("./router/userRouter"); 

const app = express();


//DATABASE 
connectDB();


//MIDDLEWARE
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 


//VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true,
  })
);


// ROUTES
app.use("/auth", userRoutes);



app.get("/", (req, res) => {
  res.redirect("/auth/signup");
});


//SERVER 
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});