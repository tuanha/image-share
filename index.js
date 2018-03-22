var express = require('express');
var http = require('http');   
var app = express();
var multer  = require('multer')
var engine = require('ejs-locals');
var bodyParser = require('body-parser')
var Sequelize = require('sequelize');

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

var sequelize = new Sequelize('imageshare', 'postgres', '123456', {
  host: 'localhost',
  dialect: 'postgres',
  operatorsAliases: false,
  define: {
    timestamps: false,
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

var Image = sequelize.define('image', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  title:Sequelize.STRING,
  name: Sequelize.STRING,
});

sequelize.sync().then(() => {});

app.get ("/", function(require, response){
  Image.findAll().then(images => {
    response.render('index', {data: images});
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
    res.render('images/new')
    console.log("hay nhap file")
  }else{
    Image.create({title: req.body.title, name: req.file.originalname}).then(function (image) {
      res.redirect('/')
   }).catch(error => {
    response.send("loi query" + error);
  })
  }
})

app.get ("/admin/images", function(require, response){
  Image.findAll().then(images => {
    response.render('admin/images/index', {data: images});
  }).catch(error => {
    response.send("loi query" + error);
  });
})

app.get ("/admin/images/delete/:id", function(require, response){
  Image.destroy({
    where: {
      id: require.params.id
    }
  });
  response.redirect('/admin/images')
})

app.get ("/admin/images/:id", function(require, response){
  Image.findById(require.params.id).then(image => {
    response.render('admin/images/edit', {data: image})
  }).catch(error => {
    response.send("loi query" + error);
  })
})

app.post ("/admin/images/:id", upload.single('image'), function(require, response){
  Image.findById(require.params.id).then(image => {
    image.title = require.body.title
    if(require.file != undefined){
      image.name = require.file.originalname
    }
    image.save().then(() => {
      response.redirect('/admin/images')
    }).catch(error => {
      response.send("loi update" + error);
    })
  }).catch(error => {
    response.send("Image khong ton tai" + error);
  });
})