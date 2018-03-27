var express = require('express');
var http = require('http');   
var app = express();
var multer  = require('multer')
var engine = require('ejs-locals');
var bodyParser = require('body-parser')
var Sequelize = require('sequelize');
var db = require('./models');
var expressValidator = require('express-validator');
var expressValidator = require('express-validator');
var Passport = require('passport');
var LocalStrategy = require('passport-local').Strategy
var session = require('express-session');
var flash = require('connect-flash');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({secret: 'mysecret', cookie: {maxAge: 1000*60*10}}))
app.use(expressValidator());
app.use(Passport.initialize());
app.use(Passport.session());
app.use(flash());
app.use(function (req, res, next) {
  res.locals.current_user = req.isAuthenticated();
  res.locals.error = req.flash('error');
  next();
});

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

db.sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

var Image = db.sequelize.define('images', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  title: {type: Sequelize.STRING, allowNull: false},
  name: {type: Sequelize.STRING, allowNull: false}
});

var User = db.sequelize.define('users', {
  id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
  username: {type: Sequelize.STRING, allowNull: false, unique: true},
  password: {type: Sequelize.STRING, allowNull: false}
});

db.sequelize.sync().then(() => {});

Passport.use(new LocalStrategy(
  (username, password, done) => {
    User.findOne({where: {username: username,password: password}}).then(user => {;
      return done(null, user)
    }).catch(error => {
      return done(null, false);
    }); 
  }
))

Passport.serializeUser((user, done) => {
  done(null, user.username)
})

Passport.deserializeUser((username, done) => {
  User.findOne({username: username}).then(user => {
    if(user){
      return done(null, user)
    }else{
      return done(null, false)
    }
  });
});

function checkLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect('/users/login');
  }
}

app.get ("/", function(require, response){
  Image.findAll({order: [['createdAt', 'DESC']]}).then(images => {
    response.render('index', {data: images});
  });
})

app.get ("/about", function(require, response){
  response.render('about')
})

app.get ("/images/new", checkLogin, function(require, response){
  response.render('images/new') 
})

app.post('/images/upload', checkLogin, upload.single('image'), function (req, res, next) {
  if(req.file == undefined){
    res.render('images/new')
    console.log("hay nhap file")
  }else{
    Image.create({title: req.body.title, name: req.file.originalname}).then(function (image) {
      res.redirect('/')
    }).catch(error => {
      res.send("loi query" + error);
    })
  }
})

app.get ("/admin/images", checkLogin, function(require, response){
  Image.findAll().then(images => {
    response.render('admin/images/index', {data: images});
  }).catch(error => {
    response.send("loi query" + error);
  });
})

app.get ("/admin/images/delete/:id", function(require, response){
  if(require.isAuthenticated()){
    Image.destroy({
      where: {
        id: require.params.id
      }
    });
    response.redirect('/admin/images')
  }else{
    response.redirect('/users/login')
  }
})

app.get ("/admin/images/:id", function(require, response){
  if(require.isAuthenticated()){
    Image.findById(require.params.id).then(image => {
      response.render('admin/images/edit', {data: image})
    }).catch(error => {
      response.send("loi query" + error);
    })
  }else{
    response.redirect('/users/login')
  }
})

app.post ("/admin/images/:id", checkLogin, upload.single('image'), function(require, response){
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

app.get ("/users/register", function(require, response){
  response.render('users/register', { errors: false })
})

app.route('/users/login')
.get((req, res) => {
  if(req.isAuthenticated()){
    res.redirect('/')
  }else{
    res.render('users/login'); 
  }
})
.post(Passport.authenticate('local', {
  failureRedirect: '/users/login',
  successRedirect: '/images/new',
  failureFlash: 'Invalid username or password.'
}))

app.route('/users/logout').get((req, res) => {
  req.session.destroy(function (err) {
    res.redirect('/');
  });
})

app.post ("/users/register", function(require, response, next){
  require.check('username', 'Username is required').notEmpty();
  require.check('password', 'Password is required').notEmpty();
  require.check('password', 'passwords must be at least 6 chars long').isLength({ min: 6 });
  require.check('confirm_password', 'confirm_password field must have the same value as the password field').equals(require.body.password);

  const errors = require.validationErrors();
  if (errors) {
    response.render('users/register', {errors: errors})
  }else{
    User.create({username: require.body.username, password: require.body.password}).then(function (user) {
      Passport.authenticate('local')(require, response, function () {
        response.redirect('/');
      })
     }).catch(error => {
      require.flash('error', error.errors[0].message);
      response.redirect('/users/register');
    })
  }
  
})
