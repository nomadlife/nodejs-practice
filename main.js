var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var compression = require('compression');
var session = require('express-session')
var FileStore = require('session-file-store')(session)
var flash = require('connect-flash');
var db = require('./lib/db')
var helmet = require('helmet');
app.use(helmet())
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}))
app.use(compression());
app.use(session({
  //secure: true, //for https connection
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store:new FileStore()
}))
app.use(flash());

app.get('/flash',function(req,res){
  req.flash('info', 'Flash is back')
  res.send('flash');
})

app.get('/flash-display', function(req,res){
  var fmsg = req.flash();
  console.log(fmsg);
  res.send(fmsg);
  // res.render('index',{messages:req.flash('info')})
})

var passport = require('./lib/passport')(app)

app.get('*',function(request, response, next){
  request.list = db.get('topics').value();
    next()
})

var indexRouter = require('./routes/index');
var topicRouter = require('./routes/topic');
var authRouter = require('./routes/auth')(passport);
app.use('/',indexRouter);
app.use('/topic', topicRouter);
app.use('/auth', authRouter);



app.use(function(req, res, next){
  res.status(404).send('sorry cant find that!')
})

app.use(function(err,req,res,nex){
  console.error(err.stack)
  res.status(500).send('Something broke!')
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})
