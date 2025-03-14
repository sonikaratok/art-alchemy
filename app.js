const mysql2 = require("mysql2");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const { resolveInclude } = require("ejs");
// Add session requirement
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

// Add session configuration
app.use(session({
    secret: 'art-alchemy-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 } // 1 hour
}));

// Database connection
var db = mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "Mysql@123",
    database: "paint",
});

// Add middleware to make session available in all views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// connecting to database
db.connect(function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to database!");

        // Use the correct database name in the query
        db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'paint';`, (err, tables) => {
            if (err) {
                console.log("Error checking tables:", err);
                return;
            }
            
            // Convert tables to simple array for easier checking
            const tableNames = tables.map(table => table.table_name || table.TABLE_NAME);
            console.log("Existing tables:", tableNames);
            
            // Check if login_cred table exists
            if (!tableNames.includes('login_cred')) {
                // Modified to include id as primary key
                var sql = "CREATE TABLE login_cred (id int primary key auto_increment, name varchar(30), email varchar(50), passwd text);";
                db.query(sql, function(err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("LOGIN_CRED table created");
                    }
                });
            } else {
                // Check if id column exists and add it if not
                db.query("SHOW COLUMNS FROM login_cred LIKE 'id'", function(err, columns) {
                    if (err) {
                        console.log("Error checking columns:", err);
                    } else if (columns.length === 0) {
                        // Add id column
                        db.query("ALTER TABLE login_cred ADD COLUMN id int primary key auto_increment FIRST", function(err, result) {
                            if (err) {
                                console.log("Error adding id column to login_cred:", err);
                            } else {
                                console.log("Added id column to LOGIN_CRED table");
                            }
                        });
                    } else {
                        console.log("ID column already exists in LOGIN_CRED table");
                    }
                });
            }

            // Check if paintings table exists
            if (!tableNames.includes('paintings')) {
                // Modified to include user_id as foreign key to login_cred(id)
                var sql = "CREATE TABLE paintings (id int primary key auto_increment, name varchar(250), user_id int, imgpath text, imaghere longtext, descp longtext, FOREIGN KEY (user_id) REFERENCES login_cred(id));";
                db.query(sql, function(err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("PAINTINGS table created");
                    }
                });
            } else {
                // Check if user_id column exists and add it if not
                db.query("SHOW COLUMNS FROM paintings LIKE 'user_id'", function(err, columns) {
                    if (err) {
                        console.log("Error checking columns:", err);
                    } else if (columns.length === 0) {
                        // Add user_id column
                        db.query("ALTER TABLE paintings ADD COLUMN user_id int AFTER name", function(err, result) {
                            if (err) {
                                console.log("Error adding user_id column to paintings:", err);
                            } else {
                                console.log("Added user_id column to PAINTINGS table");
                                
                                // Add foreign key constraint
                                db.query("ALTER TABLE paintings ADD FOREIGN KEY (user_id) REFERENCES login_cred(id)", function(err, result) {
                                    if (err) {
                                        console.log("Error adding foreign key to paintings:", err);
                                    } else {
                                        console.log("Added foreign key constraint to PAINTINGS table");
                                    }
                                });
                            }
                        });
                    } else {
                        console.log("user_id column already exists in PAINTINGS table");
                    }
                });
            }

            // Check if contact table exists
            if (!tableNames.includes('contact')) {
                var sql = "CREATE TABLE contact (id int primary key auto_increment, name varchar(50), email varchar(60), message varchar(2000));";
                db.query(sql, function(err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("CONTACT table created");
                    }
                });
            } else {
                console.log("CONTACT table already exists");
            }
        });
    }
});

const upload = multer({storage:multer.memoryStorage()});

app.get("/",(req,res)=>{
    res.render('index', { user: req.session.user });
});

// Update user route to check for session
app.get("/user", (req, res) => {
    // Check if user is logged in
    if (req.session.user) {
        res.render("index1", { user: req.session.user });
    } else {
        res.redirect("/signin");
    }
});

app.get("/paintings", (req,res)=>{
    const sql = "SELECT p.*, l.name as artist_name FROM paintings p JOIN login_cred l ON p.user_id = l.id;";
    db.query(sql,(err,result,fields)=>{
        if(err) {
            res.send(err);
        }
        else{
            res.render("paintings", {
                products: result,
                user: req.session.user
            });
        }
    });
});

// Modify the imageUpload GET route to check login status
app.get("/imageUpload",(req,res)=>{
    if (!req.session.user) {
        return res.redirect("/signin");
    }
    res.render("imageUpload", { user: req.session.user });
});

// Modify the imageUpload POST route to use the session user's ID
app.post("/imageUpload", upload.single('ProductImage'), (req,res) => {
    if (!req.session.user) {
        return res.redirect("/signin");
    }
    
    var image = req.file.buffer.toString('base64');
    var name = req.body.name || "Untitled";
    var descp = req.body.descp;
    var userId = req.session.user.id;
    
    const sql = "INSERT INTO paintings VALUES(NULL, ?, ?, NULL, ?, ?);"  //primary key,name,user_id,imagePath,imageHere,descp
    db.query(sql,[name, userId, image, descp],(err,result,fields)=>{
        if(err) console.log(err);
        else{
            console.log("image added to database");
            res.redirect("/paintings");
        }
    });
});

app.get("/contact", (req,res)=>{
    res.render("contact", { user: req.session.user });
});

app.post("/contact",(req,res)=>{
    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;
    const sql = "INSERT INTO contact values (NULL,?,?,?)";
    db.query(sql,[name,email,message],(err,result,fields)=>{
        if(err) console.log(err);
        else {
            console.log("feedback inserted");
            res.redirect("/");
        }
    });
});

app.get("/signin",(req,res)=>{
    // If already logged in, redirect to user page
    if (req.session.user) {
        return res.redirect("/user");
    }
    res.render('signin');
});

// Update signin POST route to store user info including ID in session
app.post("/signin", (req, res) => {
    const name = req.body.nm;
    const password = req.body.pwd;
    const query = 'SELECT * FROM login_cred WHERE name = ? AND passwd = ?';
    db.query(query, [name, password], (error, results, fields) => {
        if (error) {
            console.error('Error executing the query: ' + error.message);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Check if any rows match the provided credentials
        if (results.length > 0) {
            // Store user info in session including ID
            req.session.user = {
                id: results[0].id,
                name: results[0].name,
                email: results[0].email
            };
            // Credentials are valid
            res.redirect('/user');
        } else {
            // Credentials are invalid
            res.send("invalid credentials");
        }
    });
});

// Add logout functionality
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

// Update signup POST route to store user info in session after signup
app.post("/signup", (req, res) => {
    const name = req.body.nm;
    const email = req.body.eml;
    const password = req.body.pwd;
    
    if(req.body.signin == true) {
        res.redirect("/signin");
    } else {
        const sql = "INSERT INTO login_cred (name, email, passwd) values (?,?,?)";
        db.query(sql, [name, email, password], (err, result, fields) => {
            if(err) console.log(err);
            else {
                console.log("signed up successfully");
                
                // Get the newly created user ID
                db.query("SELECT id FROM login_cred WHERE name = ? AND email = ?", [name, email], (err, results) => {
                    if (err) {
                        console.log(err);
                        return res.redirect("/signin");
                    }
                    
                    if (results.length > 0) {
                        // Store user info in session including ID
                        req.session.user = {
                            id: results[0].id,
                            name: name,
                            email: email
                        };
                        res.redirect("/user");
                    } else {
                        res.redirect("/signin");
                    }
                });
            }
        });
    }
});

app.get("/signup", (req, res) => {
    // If already logged in, redirect to user page
    if (req.session.user) {
        return res.redirect("/user");
    }
    res.render("signup");
});

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}
app.listen(port,()=>{
    console.log(`Server is up & running at ${port}`);
});