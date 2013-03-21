!function(win, doc, $, io){　  
	var socket = io.connect(); 
	//记录当前坐位号
	var allNo= new Array();
	// 显示在线列表
	var showonline = function(n){ 
	}  
	var listener = function(){
		socket.on('connect', function(){  
			//alert('connect');
			$('#loadding').html('');
		});
		socket.on('disconnect', function(){ 
			//alert('diserror');
			$('#loadding').html('登录失败');
		}); 
		// 刷新在线列表
		socket.on('online list', function(n){
			var html = '';var ex='',pl='';
			for(var i=0;i<n.length;i++){//alert(n[i]);
				var m= n[i].split('|');	 
				if(m[1]=='true')ex='';else ex='游戏';
				if(m[2])pl='正在'+m[2]; else pl='空闲';
				html += '<div class="line">' + m[0] + '('+pl+ex+')</div>';
				if(m[0]==userName){ 
					if(m[1]=='true'){$('#pairs').html('你当前处于空闲状态<br>');
					$('#disconnect').hide();
					}else $('#disconnect').show();
					
				}
			}
			$('#nicknames').html(html); 
			return ;
			/*
			n.forEach(function(v){ alert(v);
				 html += '<div class="line" onclick="private_message(\'' + v + '\')">' + v + '</div>'; 
			});*/
		}); 
		//配对成功
		socket.on('pair success', function(n,name){
			 //alert('与'+name+'配对成功'); 
			 alert('你的对手是：'+name);
			 $('#room').html('加载游戏中');
			 //初始化
			 loadding();
			 //$('#pairs').html('你的对手是：'+name+'<br> ');
			 
		});
		//更新座位人
		socket.on('place list', function(n){
			for(var i=0;i<n.length;i++){  
				 var m= n[i].split('|'); 
				 var mlhtml = '',mrhtml='';
				 if(m[1]){
					 if(allNo[m[1]]){
						 var mt = allNo[m[1]].split('##');
						 $('#'+mt[0]).find('#'+mt[0]+'_'+mt[1]).html('');
						 $('#'+mt[0]).find('#'+mt[0]+'_'+mt[1]).bind('click',sitdown);
					 }
					 allNo[m[1]]=m[0]+'##l'; 
					 mlhtml = m[1]; 
					 if(m[3]=='true')mlhtml+='准备中';else if(m[1]==userName) {mlhtml+='<input type="button" value="准备" class="but_rel">'; }
					 $('#'+m[0]).find('#'+m[0]+'_l').html(mlhtml).unbind('click'); 
				 }
				 if(m[2]){  
				 	 if(allNo[m[2]]){
						 var mt = allNo[m[2]].split('##');
						 $('#'+mt[0]).find('#'+mt[0]+'_'+mt[1]).html('');
						 $('#'+mt[0]).find('#'+mt[0]+'_'+mt[1]).bind('click',sitdown);
					 }
					 allNo[m[2]]=m[0]+'##r'; 
					 mrhtml = m[2];
					 $('#'+m[0]).find('#'+m[0]+'_r').html(m[2]);
					 if(m[4]=='true' )mrhtml+='准备中';else if(m[2]==userName){mrhtml+='<input type="button" value="准备" class="but_rel">';
					 } 
					 $('#'+m[0]).find('#'+m[0]+'_r').html(mrhtml).unbind('click');
				 } 
			 } 
			 $('.rival').find('.but_rel').bind('click',ready);
		});
		socket.on('pair leave', function(to){
			alert('你的对手：'+to+'已离开');
			//返回游戏座位界面
			getRoom();
		});
		
		// 发送消息失败
		socket.on('message error', function(to, msg){
			alert('error');
		});
		
	};
	var loadding = function(){ 
		var pid=userName;
		socket.emit('loadding game', pid,function(m,p,m1){ 
			var html='<span class="p-dui">对手：'+p+'</span>';
			html+='<span class="p-my">当前：'+m+'</span>';
			html+='你的牌：';
			for(var i=0;i<m1.length;i++){
				html+=m1[i]+'|';
			}
			 $('#room').html(html);
			 
		});
	}
	var quit = function(){
		var to = userName; alert(userName);
		socket.emit('quit game', to,function(ok){ 
			if (ok) { 
				alert('ok');
			}else alert('error');
		});
	}
	var init = function(){
		listener(); 
		$('#disconnect').click(quit);
		getRoom();
		$('.rival').bind('click',sitdown);
		
	};
	// 格式化消息 
	function formatHTML(html){
		html = html.replace(/</g, '&lt;');
		html = html.replace(/>/g, '&gt;');
		return html;
	} 
	//格式化房间
	function getRoom(){
		var html='<ul>';
		for(var i=1;i<=15;i++){
			html += '<li id="p'+i+'"><dl class="rival" id="p'+i+'_l" lang="l"></dl><span>VS</span><dl class="rival" id="p'+i+'_r" lang="r"></dl>';
			html += '</li>';
		}
		 html += '</ul>';
		 $('#room').html(html);
	}
	function sitdown(){
		var pid = $(this).parent().attr('id');
		var fx = $(this).attr('lang');
		var tn = $('#'+pid).find('#'+pid+'_'+fx).html();
		if(tn==userName)return false;
		if($('#'+pid).find('#'+pid+'_'+fx).html()!=''){alert('当前座位有人');return false;}
		socket.emit('choose place', pid,fx,function(ok){ 
			 
		});
	} 
	function ready(){ 
		var z = $(this).parent().parent().attr('id'); 
		socket.emit('game ready', userName,z,function(ok){ 
			 
		});
	}
	init();
	//win.private_message = private_message;
}(window,document,jQuery,io)


