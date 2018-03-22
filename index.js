var express = require('express');
var http = require('http');   
var app = express();
var multer  = require('multer')
var engine = require('ejs-locals');
var mysql = require('mysql');
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));
http.createServer(app).listen(process.env.PORT || 3000);

app.engine('ejs', engine);
app.set("views", "./views")
app.set('view engine', 'ejs');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "imageshare"
});

con.connect(function(err) {
  if (err) throw err
});

app.get ("/", function(require, response){
  con.query("SELECT * FROM images", function(err, result, fields){
    if(err){
      response.end();
      return console.error("loi query", err);
    }else{
      response.render('index', {data: result});
    }
  });
})

app.get ("/about", function(require, response){
  response.render('about')
})

app.get ("/images/new", function(require, response){
  response.render('images/new')
})

app.post('/images/upload', upload.single('image'), function (req, res, next) {
  if(req.file == undefined){
    res.send("hay nhap file")
  }else{
    con.query("INSERT INTO images (title, name) VALUES ('"+ req.body.title + "','" + req.file.originalname + "')", function(err, result){
      if(err){
        console.error("loi query", err);
        res.send("loi query");
      }
      res.redirect('/')
    });
  }
})

app.get ("/admin/images", function(require, response){
  con.query("SELECT * FROM images", function(err, result, fields){
    if(err){
      response.end();
      return console.error("loi query", err);
    }else{
      response.render('admin/images/index', {data: result});
    }
  });
})

app.get ("/admin/images/delete/:id", function(require, response){
  con.query("DELETE FROM images WHERE id = '" + require.params.id + "'", function(err, result, fields){
    if(err){
      response.send("loi query", err);
    }else{
      response.redirect('/admin/images')
    }
  });
})

app.get ("/admin/images/:id", function(require, response){
  con.query("SELECT * FROM images WHERE id = '" + require.params.id + "'", function(err, result, fields){
    if(err){
      response.send("loi query", err);
    }else{
      response.render('admin/images/edit', {data: result[0]})
    }
  });
})

app.post ("/admin/images/:id", upload.single('image'), function(require, response){
  if(require.file == undefined){
    var sql = "UPDATE images SET title = '" + require.body.title + "' WHERE id = '" + require.params.id + "'";
  }else{
    var sql = "UPDATE images SET title = '"+ require.body.title + "', name = '" + require.file.originalname + "' WHERE id = " + require.params.id + "";
  }
  con.query(sql, function(err, result, fields){
    if(err){
      console.error("loi query", err);
      response.send("loi query");
    }else{
      response.redirect('/admin/images')
    }
  });
})