import express from "express"
import bodyParser from "body-parser"
import mysql from "mysql"
import multer from "multer"
import ejs from "ejs"

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static("public"))
app.set("view engine", "ejs")

var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Mysql@123",
    database: "mysuru",
})

var f1 = 0
var f2 = 0
var f3 = 0

db.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected!");

        db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'mysuru';`, (err, tables) => {
            for (var i = 0; i < tables.length; i++) {
                if (tables[i].TABLE_NAME == "login_cred") f1 = 1;
            }
            if (!f1) {
                var sql = "CREATE TABLE login_cred (name varchar(30),email varchar(50),passwd text);"
                db.query(sql, function (err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("LOGIN_CRED created");
                    }
                });
            }


            for (var i = 0; i < tables.length; i++) {
                if (tables[i].TABLE_NAME == "paintings") f2 = 1;
            }
            if (!f2) {
                var sql = "CREATE TABLE paintings (id int primary key auto_increment, name varchar(250), imagepath text, imagehere longtext, descp longtext);"
                db.query(sql, function (err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("paintings created");
                    }
                });
            }


            for (var i = 0; i < tables.length; i++) {
                if (tables[i].TABLE_NAME == "contact") f3 = 1;
            }
            if (!f3) {
                var sql = "CREATE TABLE contact (id int primary key auto_increment, name varchar(50), email varchar(50), message varchar(2000));"
                db.query(sql, function (err, result) {
                    if (err) console.log(err);
                    else {
                        console.log("contact created");
                    }
                });
            }
        })
    }
})

app.get("/", (req, res) => {
    res.render("index")

})

app.get("/user", (req, res) => {
    res.render("index1")
})

app.get("/paintings", (req, res) => {
    const sql = "SELECT * FROM paintings;";
    db.query(sql, (err, result, fields) => {
        if (err) res.send(err);
        else {
            res.render("paintings", { products: result })
        }
    })
})

app.get("/imageUpload", (req, res) => {
    res.render("imageupload")
})

app.get("/signin", (req, res) => {
    res.render("signin")
})

app.get("/signup", (req, res) => {
    res.render("signup")
})

app.post("/contact", (req, res) => {
    const sql = "INSERT INTO contact VALUES(NULL,?,?,?);";
    const n = req.body.name
    const e = req.body.email
    const m = req.body.message
    db.query(sql, [n, e, m], (err, result, fields) => {
        if (err) res.send(err);
        else {
            console.log("CONTACT INSERTED");
            res.redirect("/");

        }
    })
})

app.post("/signup", (req, res) => {
    const sql = "INSERT INTO login_cred VALUES(?,?,?); ";
    const n = req.body.nm
    const e = req.body.eml
    const p = req.body.pwd
    db.query(sql, [n, e, p], (err, result, fields) => {
        if (err) res.send(err);
        else {
            console.log("USER INSERTED");
            res.redirect("/user");

        }
    })

})

app.post("/signin", (req, res) => {
    const sql = "SELECT * FROM login_cred WHERE name=? and passwd=?; ";
    const n = req.body.nm
    const p = req.body.pwd
    db.query(sql, [n, p], (err, result, fields) => {
        if (err) res.send(err);
        if (result.length > 0) {
            res.redirect("/user")
        }
        else {
            res.send("USER DOESN'T EXIST")
        }

    })

})
const upload = multer({ storage: multer.memoryStorage() });
app.post("/imageUpload", upload.single("ProductImage"), (req, res) => {
    const n = req.body.name
    const d = req.body.descp
    const e = req.body.email
    const image = req.file.buffer.toString("base64")
    const sql = "INSERT INTO paintings VALUES(NULL,?,NULL,?,?);";
    db.query(sql, [n, image, d], (err, result, fields) => {
        if (err) res.send(err);
        else {
            res.redirect("/paintings")
        }

    })

})


app.listen(3000, () => {
    console.log("the server used is 3000");
})