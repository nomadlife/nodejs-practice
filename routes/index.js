var express = require('express')
var router = express.Router()
var template = {
    HTML:function(title, list, body, control, authStatusUI='<a href="/auth/login">login</a>'){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB1 - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        ${authStatusUI}
        <h1><a href="/">WEB(passport)</a></h1>
        ${list}
        ${control}
        ${body}
      </body>
      </html>
      `;
    },list:function(filelist){
      var list = '<ul>';
      var i = 0;
      while(i < filelist.length){
        list = list + `<li><a href="/topic/${filelist[i].id}">${filelist[i].title}</a></li>`;
        i = i + 1;
      }
      list = list+'</ul>';
      return list;
    }
  }
var auth = require('../lib/auth')

router.get('/', function (request, response) {
  var fmsg = request.flash();
  var feedback = '';
  if (fmsg.success) {
    feedback = fmsg.success[0];
  }

  var title = '';
  var description = 'Hello, Node.js';
  var list = template.list(request.list);
  var html = template.HTML(title, list,
    `
      <div>${feedback}</div>
      <h2>${title}</h2>${description}
      <img src="/images/hello.jpg" style="width:300px; display:block; margin-top:10px">`,
    `<a href="/topic/create">create</a>`,
    auth.statusUI(request, response)
  );
  response.send(html)
})

module.exports = router;
