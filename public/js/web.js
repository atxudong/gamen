!function(win, doc, $, io){　
	var socket = io.connect(); 
	// 显示在线列表
	var showonline = function(n){
		var html = '';
		n.forEach(function(v){
			html += '<div class="line" onclick="private_message(\'' + v + '\')">' + v + '</div>';
		});
		$('#nicknames').html(html);
	}  
	var listener = function(){
		socket.on('connect', function(){  
			alert('connect');
		});
		socket.on('disconnect', function(){ 
			alert('diserror');
		}); 
		// 刷新在线列表
		socket.on('online list', function(n){
			var html = '';
			for(var i=0;i<n.length;i++){
				html += '<div class="line">' + n[i] + '</div>';
			}
			$('#nicknames').html(html);
			return ;
			/*
			n.forEach(function(v){ alert(v);
				 html += '<div class="line" onclick="private_message(\'' + v + '\')">' + v + '</div>'; 
			});*/
		}); 
		// 发送消息失败
		socket.on('message error', function(to, msg){
			alert('error');
		});
	};

	var init = function(){
		listener(); 
	};
	// 格式化消息 
	function formatHTML(html){
		html = html.replace(/</g, '&lt;');
		html = html.replace(/>/g, '&gt;');
		return html;
	}
	init();
	//win.private_message = private_message;
}(window,document,jQuery,io)