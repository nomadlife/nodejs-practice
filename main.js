var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var compression = require('compression');
var session = require('express-session')
var FileStore = require('session-file-store')(session)
var flash = require('connect-flash');
var sanitizeHtml = require('sanitize-html');

var low = require('lowdb');
var FileSync = require('./node_modules/lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);
db.defaults({
    users: [],
    topics: []
}).write();

var template = {
    HTML:function(title, list, body, control, authStatusUI='<a href="/auth/login">login</a>'){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB  - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${authStatusUI}
        <h1><a href="/">WEB(reverse)</a></h1>
        <a href="/topic/list">topics</a>
        <a href="/user/list">users</a>
        ${list}
        ${control}
        ${body}
      </body>
      </html>
      `;
    },list:function(filelist){
      var list = '<ul>';
      var i = 0;
      while(filelist && i < filelist.length){
        list = list + `<li><a href="/topic/${filelist[i].id}">${filelist[i].title}</a></li>`;
        i = i + 1;
      }
      list = list+'</ul>'; 
      return list;
    },
    userlist:function(filelist){
      var list = '<ul>';
      var i = 0;
      while(i < filelist.length){
        list = list + `<li><a href="/user/${filelist[i].id}">${filelist[i].displayName}</a></li>`;
        i = i + 1;
      }
      list = list+'</ul>'; 
      return list;
    }
  }
var auth = {
    isOwner:function(request, response){
        if(request.user){
          return true;
        } else {
          return false;
        }
      },
      
    statusUI:function(request, response){
        var authStatusUI = '<a href="/auth/login">Login</a> | <a href="/auth/register">Register</a>'
        if(this.isOwner(request, response)){
          authStatusUI = `${request.user.displayName}|<a href="/auth/logout">logout</a>`;
        }
        return authStatusUI;
      },
    topicUI:function(request, response, topic){
      var authTopicUI = '';
      if(request.user){
        authTopicUI =  '<br> <a href="/topic/create">create</a>'
        if((topic) && (request.user.id === topic.user_id)){
          authTopicUI = authTopicUI + ` <a href="/topic/update/${topic.id}">update</a>
          <form action="/topic/delete_process" method="post" style="display: inline-block;">
            <input type="hidden" name="id" value="${topic.id}">
            <input type="submit" value="delete">
          </form>`;
        }
      }
      return authTopicUI;
    }
}   
var shortid = require('shortid');

var helmet = require('helmet');
var bcrypt = require('bcryptjs');
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
  res.send(fmsg);
  // res.render('index',{messages:req.flash('info')})
})

var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize())
app.use(passport.session())
passport.serializeUser(function (user, done) {
    done(null, user.id)
});
passport.deserializeUser(function (id, done) {
    var user = db.get('users').find({ id: id }).value();
    done(null, user);
});
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'pwd'
    },
    function (email, password, done) {
        var user = db.get('users').find({ email: email }).value();
        if (user) {
            bcrypt.compare(password, user.password, function(err, result){
                if(result){
                    return done(null, user, {
                        message: 'Welcome'
                    });
                }else{
                    return done(null, false, {
                        message: 'Invalid password'
                    });
                };
            })
        } else {
            return done(null, false, {
                message: 'Invalid email'
            });
        }
    }
));
 

 
app.get('*',function(request, response, next){
    db.read();
  request.list = db.get('topics').value();
    next()
})

app.get('/', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.success) {
      feedback = fmsg.success[0];
    }
  
    var title = '';
    var description = 'Hello, Node.js';
    var list = '';
    var html = template.HTML(title, list,
      `
      <div>${feedback}</div>
      <h2>${title}</h2>${description}
      <img src="/images/hello.jpg" style="width:300px; display:block; margin-top:10px">`,
      '',
      auth.statusUI(request, response)
    );
    response.send(html)
  })

  app.get('/user/list', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.success) {
      feedback = fmsg.success[0];
    }
    var users = db.get('users').value();
    var title = '';
    var description = 'topic list';
    var list = template.userlist(users);
    var html = template.HTML(title, list,
      `<div>${feedback}</div><h2>${title}</h2>${description}`,
      '',
      auth.statusUI(request, response)
    );
    response.send(html)
  })

  app.get('/user/:userId', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.success) {
      feedback = fmsg.success[0];
    }
    var topic = db.get('topics').find({
      user_id: request.params.userId
    }).value();
    console.log(request.params.userId, topic);
    var title = '';
    var description = 'topic list';
    var list = template.list(topic);
    var html = template.HTML(title, list,
      `<div>${feedback}</div><h2>${title}</h2>${description}`,
      '',
      auth.statusUI(request, response)
    );
    response.send(html)
  })

  app.get('/topic/list', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.success) {
      feedback = fmsg.success[0];
    }
    var title = '';
    var description = 'topic list';
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `<div>${feedback}</div><h2>${title}</h2>${description}`,
      auth.topicUI(request, response),
      auth.statusUI(request, response)
    );
    response.send(html)
  })

  app.get('/topic/create', function (request, response) {
    if (!auth.isOwner(request, response)) {
      response.redirect('/auth/login');
      return false;
    }
    var title = 'WEB - create';
    var list = template.list(request.list);
    var html = template.HTML(title, list, `
        <form action="/topic/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            <input type="submit" value="create">
          </p>
        </form>
      `, '', auth.statusUI(request, response));
    response.send(html);
  })
  
  app.post('/topic/create_process', function (request, response) {
    if (!auth.isOwner(request, response)) {
      response.redirect('/auth/login');
      return false;
    }
    var post = request.body;
    var title = post.title;
    var description = post.description;
  
    var id = shortid.generate();
    db.get('topics').push({
      id: id,
      title: title,
      description: description,
      user_id: request.user.id
    }).write();
    response.redirect(`/topic/${id}`);
  })
  
  
  app.get('/topic/update/:pageId', function (request, response) {
    if (!auth.isOwner(request, response)) {
      response.redirect('/auth/login');
      return false;
    }

    var topic = db.get('topics').find({id:request.params.pageId}).value();
    if(topic.user_id !== request.user.id){
      request.flash('error','not yours!');
      return response.redirect('/');
    } 
  
    var title = topic.title;
    var description = topic.description;
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `
      <form action="/topic/update_process" method="post">
        <input type="hidden" name="id" value="${topic.id}">
        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
        <p><textarea name="description" placeholder="description">${description}</textarea></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,
      '',
      auth.statusUI(request, response)
    );
    response.send(html);
  })
  
  app.post('/topic/update_process', function (request, response) {
    if (!auth.isOwner(request, response)) {
      response.redirect('/auth/login');
      return false;
    }
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var description = post.description;
    var topic = db.get('topics').find({id:id}).value();
    if(topic.user_id !== request.user.id){
      request.flash('error','not yours!');
      return response.redirect('/');
    }
    db.get('topics').find({id:id}).assign({
      title:title, description:description
    }).write();
    response.redirect(`/topic/${topic.id}`)
  
  })
  
  app.post('/topic/delete_process', function (request, response) {
    if (!auth.isOwner(request, response)) {
      response.redirect('/auth/login');
      return false;
    }
    var post = request.body;
    var id = post.id;
    var topic = db.get('topics').find({id:id}).value();
    if(topic.user_id !== request.user.id){
      request.flash('error','not yours!');
      return response.redirect('/');
    }
    db.get('topics').remove({id:id}).write();
    response.redirect('/');
  })
  
  app.get('/topic/:pageId', function (request, response, next) {
    var topic = db.get('topics').find({
      id: request.params.pageId
    }).value();
    var user = db.get('users').find({
      id: topic.user_id
    }).value();
    //console.log(topic);
    
    var sanitizedTitle = sanitizeHtml(topic.title);
    var sanitizedDescription = sanitizeHtml(topic.description, {
      allowedTags: ['h1']
    });
    var list = template.list(request.list);
    var html = template.HTML(sanitizedTitle, list,
      `<h2>${sanitizedTitle}</h2>
      ${sanitizedDescription}
      <p>by ${user.displayName}</p>
      `,
      auth.topicUI(request, response, topic),
      auth.statusUI(request, response)
    );
    response.send(html);
  });
  
app.get('/auth/login', function (request, response) {
    var fmsg = request.flash();
    var feedback = '';
    if (fmsg.error) {
      feedback = fmsg.error[0];
    }

    var title = 'login';
    var list = '';
    var html = template.HTML(title, list, `
  <div style="color:red;">${feedback}</div>
  <form action="/auth/login_process" method="post">
  <p><input type="text" name="email" placeholder="email" value="test@gmail.com"></p>
  <p><input type="password" name="pwd" placeholder="password" value="111111"></p>
  <p>
  <input type="submit" value="login">
  </p>
  </form>
  `, '' ,auth.statusUI(request, response));
    response.send(html);
  })


app.post('/auth/login_process',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth/login',
    failureFlash: true,
    successFlash: true
  }));

app.get('/auth/register', function (request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.error) {
    feedback = fmsg.error[0];
  }

  var title = 'user register';
  var list = '';
  var html = template.HTML(title, list, `
<div style="color:red;">${feedback}</div>
<form action="/auth/register_process" method="post">
<p><input type="text" name="email" placeholder="email" value="test2@gmail.com"></p>
<p><input type="password" name="pwd" placeholder="password" value="111111"></p>
<p><input type="password" name="pwd2" placeholder="password" value="111111"></p>
<p><input type="text" name="displayName" placeholder="display name" value="tester2"></p>
<p><input type="submit" value="register"></p>
</form>
`, '');
  response.send(html);
})

app.post('/auth/register_process', function (request, response) {
  // todo : validation
  // check email duplicaation check
  // check if pwd,pwd2 are same
  var post = request.body;
  var email = post.email;
  var pwd = post.pwd;
  var pwd2 = post.pwd2;
  var displayName = post.displayName;
  if(pwd !== pwd2){
    request.flash('error','password must same!');
    response.redirect('/auth/register');
  }else{
    bcrypt.hash(pwd, 10, function(err, hash) {
      var user = {
        id:shortid.generate(),
        email:email,
        password:hash,
        displayName:displayName
      }
        db.get('users').push(user).write();
        request.login(user, function(err){
          return response.redirect('/');
        })
  });


    }
});

app.get('/auth/logout', function (request, response) {
  request.logout();
  response.redirect('/');
})


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
