//========================变量定义===============================
/**
 * modules引入
 */
var redis_ip='192.168.1.90';  
var redis_port=6379; 
var express = require('express'),
	sio = require('socket.io'),
	fs=require('fs'),
	path = require('path')
	url = require('url'),
	parseCookie = require('connect').utils.parseCookie,
	MemoryStore = require('connect/middleware/session/memory'),
	redis = require("redis"),
    redisClient = redis.createClient(redis_port,redis_ip);  
	 
/**
 * 私人聊天使用session
 */
var usersWS = {}, //私人聊天用的websocket
	storeMemory = new MemoryStore({
		reapInterval: 60000 * 10
	});//session store
//=========================app配置=============================	
/**
 * app配置 express配置
 */
var app = module.export = express.createServer();

app.configure(function(){
	//express.bodyParser()是Connect內建的middleware，设置此处可以将client提交过来的post请求放入request.body中
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'wyq',
		store:storeMemory 
	}));
	//express.methodOverride()也是Connect內建的，可以协助处理POST请求伪装PUT、DELETE和其他HTTP methods
	app.use(express.methodOverride());
	//app.router()是route requests， express.js的官方文件是这句可有可无
	app.use(app.router);//要放在bodyParser之后，处理post 
	//设置views路径和模板 __dirname 全局变量，即取得执行的js所在的路径
	app.set('views', __dirname + '/views');
	//设置express.js所使用的render engine。除了Jade之外express.js还支持EJS(embedded javascript)、Haml、CoffeScript和jQuerytemplate等js模板
	app.set('view engine', 'jade');
	//express.static()是一个Connect內建的中间件来处理静态的requests，例如css、js、img文件等。所以static()里面指定的文件夹中的文件会直接作为静态资源吐出来。
	app.use(express.static(__dirname + '/public'));
});
//=================配置socket.io=========================
/**
 * 配置socket.io
 * 
 */	
var io = sio.listen(app);
//设置session
io.set('authorization', function(handshakeData, callback){
	// 通过客户端的cookie字符串来获取其session数据
	handshakeData.cookie = parseCookie(handshakeData.headers.cookie)
	var connect_sid = handshakeData.cookie['connect.sid'];
	
	if (connect_sid) {
		storeMemory.get(connect_sid, function(error, session){
			if (error) {
				// if we cannot grab a session, turn down the connection
				callback(error.message, false);
			}
			else {
				// save the session data and accept the connection
				handshakeData.session = session;
				callback(null, true);
			}
		});
	}
	else {
		callback('nosession');
	}
});
//redis  
redisClient.on("error", function (err) {
    console.log("Error " + err);
}); 
function redis_set(key,value,time){
	redisClient.set(key,value, function (err, reply) { 
		if(reply)console.log(reply.toString());
	}); 
	redisClient.expire(key,time); 
}
function redis_get(key){
	redisClient.get(key, function (err, reply) { 
		if(reply)console.log(reply.toString()); 
	}); 
}
function redis_hset(hkey,h,v,time){
	redisClient.hset(hkey, h, v, function (err, reply) { 
		 if(reply)console.log('hash'+reply.toString());
	});
	//if(time)client.expire(hkey,time); 
}

 
function redis_rpush(hkey,v){
	redisClient.rpush(hkey,v, function(){  
		//redisClient.quit();  
	});
}
function redis_lrange(hkey,st,limit){
	var arr = new Array();
	redisClient.lrange(hkey, st,limit, function (err, replies){  
		replies.forEach(function (reply, i) {  
			if(reply){
				console.log("    " + i + ": " + reply);
				arr[i] = reply;
			}
		});
	});
	return arr;
}
 
function redis_hget(hkey ){
	var arr = new Array();
	redisClient.hkeys(hkey, function (err, replies) {
		//console.log(replies.length + " replies:");
		replies.forEach(function (reply, i) {
			if(reply)arr[i] = reply;
			 console.log("    " + i + ": " + reply);
		});
		redisClient.quit();
	});
	return arr;
}
//redis_set('wwewe','1',10); 
//console.log(redis_get('wwewe'));
//redis_hset('eee','l1','323');
//redis_hset('eee','l2','222323');
//redis_hset('msg_list','l1','wewewewe');
//var t = redis_hget('msg_list' ); 
// redis_lrange('msg_list_l',0,-1);

//=========================URL=============================
/**
 * url开始处理~
 * @param {Object} req
 * @param {Object} res
 */
app.get('/',function(req,res){
		
	if( req.session.name && req.session.name!==''){
		//需要判断下是否已经登录
		res.redirect('/chat');
	}else{
		//读取登录页面，要求登录
		var realpath = __dirname + '/views/' + url.parse('login.html').pathname;
		var txt = fs.readFileSync(realpath);//读取模板
		res.end(txt);
	}
});
app.get('/chat',function(req,res){
	if (req.session.name && req.session.name !== '') {
		//需要判断下是否已经登录
		res.render('chat',{name:req.session.name});
	}else{
		res.redirect('/');
	}
})
app.post('/chat',function(req,res){
	var name = req.body.nick;
	if(name && name!==''){
		req.session.name = name;//设置session
		res.render('chat',{name:name});
	}else{
		res.end('nickname cannot null');
	}
	
});
app.get('/web',function(req,res){
	res.render('web');
})
app.post('/web',function(req,res){
	res.render('web');
})
/*
//其他内容监听，在router.json里面配置，例如help等页面
var routes=JSON.parse(fs.readFileSync('router.json','utf8'));
for(var r in routes){
	app.get(r,function(tmp){
		return function(req,res){
			var template = tmp.template,
				data = tmp.data,
				render = tmp.render;
			var realpath = __dirname + '/views/' + url.parse(template).pathname;
			if(path.existsSync(realpath)){
				var txt = fs.readFileSync(realpath);
			}else{
				
				res.end('404'+realpath);
				return;
			}
			
			if(render){
				res.render(txt,data);
			}else{
				res.end(txt);
			}
		}
	}(routes[r]));
}
*/
//===================socket链接监听=================
/**
 * 开始socket链接监听
 * @param {Object} socket
 */
io.sockets.on('connection', function (socket){
	var session = socket.handshake.session;//session
	if(session==undefined){console.log('disconnected');return ;}
	var name = session.name;
	if(name==undefined || name==''){console.log('no name');return ;}
	usersWS[name] = socket;
	var refresh_online = function(){
		var n = [];
		for (var i in usersWS){
			n.push(i);
		}
		//广播给全体客户端
		io.sockets.emit('online list', n);//所有人广播
		//sockets.emit('online list', n);
		//socket.broadcast.emit('online list',n);
	}
	refresh_online();
	//emit 发送 broadcast 广播功能
	//广播信息给除当前用户之外的用户
	socket.broadcast.emit('system message', '【'+name + '】回来了，大家赶紧去找TA聊聊~~');
	var msg_l = redis_lrange('msg_list_l',0,-1); 
	socket.emit('message list', name, msg_l); 
	
	//公共信息 
	socket.on('public message',function(msg, fn){ 
		var json='{\'msg\':\''+msg+'\',\'user\':\''+name+'\',\'date\':\''+new Date()+'\'}';    
		redis_rpush('msg_list_l',json);
		//client.lpush('msg_list','334',msg);  
		socket.broadcast.emit('public message', name, msg); 
		fn(true);
	});
	//私人@信息
	socket.on('private message',function(to, msg, fn){
		var target = usersWS[to];
		if (target) {
			fn(true);
			target.emit('private message', name+'[私信]', msg);
		}
		else {
			fn(false)
			socket.emit('message error', to, msg);
		}
	}); 
	//掉线，断开链接处理
	socket.on('disconnect', function(){
		delete usersWS[name];
		session = null;
		socket.broadcast.emit('system message', '【'+name + '】无声无息地离开了。。。');
		refresh_online();
	});
	
});

//===========app listen 开始鸟~==========
app.listen(3000, function(){
	var addr = app.address();
	console.log('app listening on http://127.0.0.1：' + addr.port);
});
