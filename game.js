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
var usersWS = [],  
	storeMemory = new MemoryStore({
		reapInterval: 60000 * 10
	});//session store
//位置
var arrPlace = [];
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
//=========================URL=============================
/**
 * url开始处理~
 * @param {Object} req
 * @param {Object} res
 */
app.get('/',function(req,res){
	res.redirect('/web');
});
app.get('/game',function(req,res){ 
	var _get = url.parse(req.url, true).query; 
	if(_get['uid'])req.session.name = _get['uid']; 
	res.render('game',{name:req.session.name}); 
});　
app.get('/web',function(req,res){
	//if(req.session.name)res.write(req.session.name);
	var _get = url.parse(req.url, true).query;
	//console.log(_get['uid']);
	if(_get['uid'])req.session.name = _get['uid'];
	//res.write(_get['uid']); 
	res.render('web',{name:req.session.name});
	//res.end();
	//var realpath = __dirname + '/views/' + url.parse('login.html').pathname;
	/*
	res.render('web');
	if( req.session.name && req.session.name!==''){
		//需要判断下是否已经登录
		res.redirect('/chat');
	}else{
		//读取登录页面，要求登录
		var realpath = __dirname + '/views/' + url.parse('login.html').pathname;
		var txt = fs.readFileSync(realpath);//读取模板
		res.end(txt);
	}*/ 
});　
app.post('/web',function(req,res){
	res.render('web');
})　
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
	
	if(usersWS[name]){}else {
		usersWS[name] = [];
		usersWS[name]['socket'] = socket;
		usersWS[name]['name'] = name;
		usersWS[name]['isfree'] = 'true';
		usersWS[name]['dismatch']='';
		usersWS[name]['ready']='false'; 
	}
	if(arrPlace[name] && arrPlace[name]['place'])usersWS[name]['place']=arrPlace[name]['place'];else usersWS[name]['place']='';
	var refresh_online = function(){
		var n = [];
		//n.push(name);  
		for (var ii in usersWS){
			n.push(ii+'|'+usersWS[ii]['isfree']+'|'+usersWS[ii]['place']); 
			//console.log(ii+'|'+usersWS[ii]['isfree']+'|'+usersWS[ii]['place']+'|'); 
		}
		//广播给全体客户端
		io.sockets.emit('online list', n);//所有人广播  
	}
	var refresh_place = function(){
		var n = new Array(); var kk = 0;
		for (var ii in arrPlace){
			if(arrPlace[ii] && arrPlace[ii]['id']){
				var lr='',rr='';
				if(arrPlace[ii]['l'] && usersWS[arrPlace[ii]['l']])lr=usersWS[arrPlace[ii]['l']]['ready'];else lr='false';
				if(arrPlace[ii]['r'] && usersWS[arrPlace[ii]['r']])rr=usersWS[arrPlace[ii]['r']]['ready'];else rr='false';
				n[kk]=arrPlace[ii]['id']+'|'+arrPlace[ii]['l']+'|'+arrPlace[ii]['r']+'|'+lr+'|'+rr; 
				//是否都已准备
				if(lr =='true' && rr=='true'){ 
					var target = usersWS[arrPlace[ii]['l']]['socket'];
					var target1 = usersWS[arrPlace[ii]['r']]['socket'];
					usersWS[arrPlace[ii]['r']]['match'] = arrPlace[ii]['l'];
					usersWS[arrPlace[ii]['r']]['dismatch'] = '';
					usersWS[arrPlace[ii]['r']]['isfree'] = 'false';
					usersWS[arrPlace[ii]['l']]['match'] = arrPlace[ii]['r'];
					usersWS[arrPlace[ii]['l']]['dismatch'] = '';
					usersWS[arrPlace[ii]['l']]['isfree'] = 'false';
					arrPlace[ii]['is_d']='true';
					target.emit('pair success', 'pair',arrPlace[ii]['r']);
					target1.emit('pair success', 'pair',arrPlace[ii]['l']);
				}
				console.log(n[kk]);  
				kk++;
			}
		} 
		refresh_online();
		io.sockets.emit('place list', n);//所有人 */ 
	}
	socket.on('match game',function(to, fn){ 
		for (var i in usersWS){ 
			//if(i!=name)n.push(i); 
			//匹配 
			if(usersWS[i] && usersWS[name]){ 
				if(usersWS[i]['isfree']=='true' && usersWS[i]['dismatch']=='' && i!=name){   
					var target = usersWS[i]['socket'];
					var target1 = usersWS[name]['socket'];
					if (target) { 
						target.emit('pair success', 'pair',name);
						target1.emit('pair success', 'pair',i);
						usersWS[i]['isfree'] = 'false';
						usersWS[i]['match'] = name;
						usersWS[i]['dismatch'] = '';
						usersWS[name]['isfree'] = 'false';
						usersWS[name]['match'] = i;
						usersWS[name]['dismatch'] = '';
					}
					break;
				}
			} 
		} 
	});
	//选择座位
	socket.on('choose place',function(pid,fx,fn){
		var garr = new Array();
		if(pid && fx && session.name){ 
		 
			if(usersWS[session.name]['place']){
				var name_place = usersWS[session.name]['place'];
				if(arrPlace[name_place]['r'] && arrPlace[name_place]['r']==name)arrPlace[name_place]['r']='';
				if(arrPlace[name_place]['l'] && arrPlace[name_place]['l']==name)arrPlace[name_place]['l']='';
			}
		
			if(arrPlace[pid]){}else{arrPlace[pid] = [];arrPlace[pid]['l']=arrPlace[pid]['r']='';
			//是否开始
			arrPlace[pid]['is_d']='false';} 
			arrPlace[pid]['id'] = pid;
			
			arrPlace[pid][fx] = session.name; 
			usersWS[session.name]['place'] = pid; 
			usersWS[session.name]['ready'] = 'false'; 
		} 
		refresh_place();
	});
	//游戏准备
	socket.on('game ready',function(to,fn){
		if(session.name){
			usersWS[session.name]['ready']='true';
		}
		console.log(session.name+'|'+usersWS[session.name]['ready']);
		refresh_place();
	});
	socket.on('loadding game',function(to,fn){
		var m1 = new Array(),m2=new Array();
		for(var i=0;i<5;i++){
			m1[i] = fRandomBy(1,15);
		}
		/*
		for(var i=0;i<5;i++){
			m2[i] = fRandomBy(1,15);
		}*/
		fn(session.name,usersWS[session.name]['match'],m1,m2);
	});  
	socket.on('quit game',function(to, fn){
		var target = usersWS[to];
		if (target) { 
			var ds  = usersWS[to]['match']; 
			usersWS[to]['isfree']='true';usersWS[to]['match']='';usersWS[to]['dismatch']=ds;
			if(ds && usersWS[ds]){usersWS[ds]['isfree']='true';usersWS[ds]['match']='';usersWS[ds]['dismatch']=to;}
			refresh_online(); 
			fn(true);
			//target.emit('private message', name+'[私信]', msg); 
		}
		else {
			fn(false)
			socket.emit('message error', to, msg);
		}
	});  
	refresh_place();
	//掉线，断开链接处理
	socket.on('disconnect', function(){ 
		//处理配对用户
		for (var i in usersWS){
			if(name==usersWS[i]['match']){
				var target = usersWS[i]['socket'];
				target.emit('pair leave', name);
				console.log(i);
				usersWS[i]['isfree']='true';usersWS[i]['match']='';
				usersWS[name]['isfree']='true';usersWS[name]['match']=''; 
				usersWS[i]['place']='';
				usersWS[name]['ready']=usersWS[i]['ready']='false'; 
			}
		}  		
		if(usersWS[name]['place']){
			var place = usersWS[name]['place'];
			if(arrPlace[place]['r'] && arrPlace[place]['r']==name){ 
				arrPlace[place]['r']='';}
			if(arrPlace[place]['l'] && arrPlace[place]['l']==name){ 
				arrPlace[place]['l']='';
			}
			if(arrPlace[place]['is_d']=='true')arrPlace[place]['l']=arrPlace[place]['r']='';
		} 
		delete usersWS[name];
		session = null;
		console.log(name+'leave');
		//socket.broadcast.emit('system message', '【'+name + '】无声无息地离开了。。。');
		refresh_place();
	});
	function fRandomBy(under, over){ 
		switch(arguments.length){ 
		case 1: return parseInt(Math.random()*under+1); 
		case 2: return parseInt(Math.random()*(over-under+1) + under); 
		default: return 0; 
		} 
	} 
	
});

//===========app listen 开始鸟~==========
app.listen(3000, function(){
	var addr = app.address();
	console.log('app listening on http://127.0.0.1：' + addr.port);
});