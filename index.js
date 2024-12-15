const express = require('express')
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const port = 8000;
const authMiddleware = require('./middleware/auth'); // Import auth middleware

const {mongoconnect} = require("./connection");
const authrouter = require("./routes/auth");
const cors = require('cors');
app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: "GET,POST,PUT,DELETE", 
    credentials: true, 
  })
);

app.use(cookieParser());
app.use(express.static('public'));
const staticroutes = require("./routes/static")
const postrouter = require("./routes/postRoutes")

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
mongoconnect("mongodb://127.0.0.1:27017/inotebook");
// const notesrouter = require("./routes/notes");
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));
// app.use('/',userdata);
app.use('/auth', authrouter);
app.use('/',staticroutes);
app.get('/',(req,res)=>{
console.log("hello world");

})
console.log("aja bhidle!!");

app.use('/posts',postrouter)
// app.use('/notes', notesrouter);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
