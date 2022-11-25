const start_menu = document.getElementsByClassName("start-menu");
const log_div = document.getElementsByClassName("log-div")[0];
const pinglog = document.getElementById("pinglog");
const average_ping_display = document.getElementById("average-ping-span");
const time_left_display = document.getElementById("time-left-span");
const invite_div = document.getElementsByClassName("invite-div")[0];
const invite_button = document.getElementById("invite-button");
const local_offer_input = document.getElementById("local-offer-input");
const connect_button = document.getElementById("connect-button");
const remote_answer_input = document.getElementById("remote-answer-input");
const join_div = document.getElementsByClassName("join-div")[0];
const join_button = document.getElementById("join-button");
const generate_answer_button = document.getElementById("generate-answer-button");
const local_answer_input = document.getElementById("local-answer-input");
const remote_offer_input = document.getElementById("remote-offer-input");
const anomaly_display = document.getElementById("anomalies-span");

let local_test_finished = false;
let remote_test_finished = false;
const anomaly_threshhold = 40;
const test_duration = 60 * 2 * 1000;
let test_timeout;
let anomaly_counter = 0;
let sent_ping_counter = 0;
const last_100_ping_times = [];
let received_ping_iterator = 0;
const unfulfilled_ping_requests = {};
let RTC_configuration = {'iceServers': 
							[
								{"urls": ["stun:stun.gmx.net",
								"stun:stun.l.google.com:19302",
								"stun:stun.services.mozilla.org"]}
							]
						};
let peer_connection = new RTCPeerConnection(RTC_configuration);
let datachannel = null;

peer_connection.onicecandidate = event => 
{
	if (!event.candidate) 
	{
		local_answer_input.innerText = JSON.stringify(peer_connection.localDescription);
		local_offer_input.innerText = JSON.stringify(peer_connection.localDescription);
	}
};

invite_button.onclick = function() 
{
	invite_div.style.display = "block";
	join_div.style.display = "none";
	start_menu[0].style.display = "none";
	start_menu[1].style.display = "none";
	datachannel = peer_connection.createDataChannel('test', {ordered: false});
	datachannel.onmessage = event => {Handle_Message(event);};

	peer_connection.createOffer()
	.then(offer => peer_connection.setLocalDescription(offer))
	.then(() => {local_offer_input.innerText = JSON.stringify(peer_connection.localDescription)})
	.catch(() => {pinglog.innerHTML += "Error creating offer<br>"});
};

connect_button.onclick = () => 
{
	const answer = remote_answer_input.value;
	const answer_description = new RTCSessionDescription(JSON.parse(answer));
	peer_connection.setRemoteDescription(answer_description);
	datachannel.onopen = () => 
	{
		pinglog.innerHTML += "Beginning test...<br>The test will run for two minutes.<br>";
		log_div.style.display = "block";
		invite_div.style.display = "none";
		start_menu[0].style.display = "none";
		start_menu[1].style.display = "none";
		const ping_interval = setInterval(Send_Ping_Request_And_Save_Timestamp, 17);
		const UI_visual_test_timer = new Date(test_duration);
		
		const UI_visual_timer_interval = setInterval(() => 
		{
			Decrement_UI_visual_test_timer(UI_visual_test_timer);
			time_left_display.innerText =`${UI_visual_test_timer.getMinutes()}:${UI_visual_test_timer.getSeconds() < 10 ? "0" : ""}${UI_visual_test_timer.getSeconds()}`;
		}, 1000);
		
		test_timeout = setTimeout(() =>
		{
			local_test_finished = true;
			pinglog.innerHTML += `
			Connection test finished.<br>
			Number of anomalies: ${anomaly_counter}<br>
			Average ping time: ${Calculate_Average_Ping()} ms<br>
			`;
			Test_Over_Cleanup(ping_interval, UI_visual_timer_interval);
			datachannel.send(JSON.stringify({type:"finished"}));
			if (remote_test_finished)
			{
				datachannel.close();
				peer_connection.close();
			}
		}, test_duration);
		
		datachannel.onclose = () => 
		{
			if (!local_test_finished || !remote_test_finished)
			{
				pinglog.innerHTML += `Connection test was prematurely canceled.<br>
				The other user cancelled the test, or there was a network error.`;
				Test_Over_Cleanup(ping_interval, UI_visual_timer_interval);
			}
		};
	};
};

join_button.onclick = function() 
{
	join_div.style.display = "block";
	invite_div.style.display = "none";
	start_menu[0].style.display = "none";
	start_menu[1].style.display = "none";

	peer_connection.ondatachannel = event =>
	{
		pinglog.innerHTML += "Beginning test...<br>The test will run for two minutes.<br>";
		log_div.style.display = "block";
		join_div.style.display = "none";
		const UI_visual_test_timer = new Date(test_duration);
		const UI_visual_timer_interval = setInterval(() => 
		{
			Decrement_UI_visual_test_timer(UI_visual_test_timer);
			time_left_display.innerText =`${UI_visual_test_timer.getMinutes()}:${UI_visual_test_timer.getSeconds() < 10 ? "0" : ""}${UI_visual_test_timer.getSeconds()}`;
		}, 1000);
		
		datachannel = event.channel;
		datachannel.onmessage = event => {Handle_Message(event);};
		const ping_interval = setInterval(Send_Ping_Request_And_Save_Timestamp, 17);
		test_timeout = setTimeout(() => 
		{
			pinglog.innerHTML += `
			Connection test finished.<br>
			Number of anomalies: ${anomaly_counter}<br>
			Average ping time: ${Calculate_Average_Ping()} ms
			`;
			local_test_finished = true;
			Test_Over_Cleanup(ping_interval, UI_visual_timer_interval);
			datachannel.send(JSON.stringify({type:"finished"}));
			if (remote_test_finished)
			{
				datachannel.close();
				peer_connection.close();
				peer_connection = null;
				peer_connection = new RTCPeerConnection(RTC_configuration);
				
			}
			
		}, test_duration);
		
		datachannel.onclosing = () => 
		{
			if (!local_test_finished || !remote_test_finished)
			{
				pinglog.innerHTML += `Connection test was prematurely canceled.<br>
				The other user cancelled the test, or there was a network error.`;
				Test_Over_Cleanup(ping_interval, UI_visual_timer_interval);
			}
		};
	}
};

generate_answer_button.onclick = () => 
{
	const offer = remote_offer_input.value;
	const offer_description = new RTCSessionDescription(JSON.parse(offer))
	peer_connection.setRemoteDescription(offer_description)
	peer_connection.createAnswer()
	.then (answer => peer_connection.setLocalDescription(answer))
	.catch(() => {console.log("Connection error")});
};

function Calculate_Average_Ping() 
{
	return 	Math.round
			(
				last_100_ping_times.reduce
				(
					(previous_value, current_value) => previous_value + current_value
				) 
				/ last_100_ping_times.length
			) || 0;
}

function Handle_Message(event) 
{
	const data = JSON.parse(event.data);
	switch(data.type)
	{
		case "request":
			Send_Ping_Response(data.id);
			break;
		case "response":
			const ping_time = Date.now() - unfulfilled_ping_requests[data.id];
			delete unfulfilled_ping_requests[data.id];
			console.log(`${ping_time} ms`);

			if (received_ping_iterator >= 99) 
			{
				received_ping_iterator = 0;
			}

			last_100_ping_times[received_ping_iterator] = ping_time;
			received_ping_iterator++;
			const average_ping = Calculate_Average_Ping();
			average_ping_display.innerText = average_ping;
			
			if (ping_time >= (average_ping + anomaly_threshhold)) 
			{
				anomaly_counter++;
				anomaly_display.innerText = anomaly_counter;
				const timestamp = document.getElementById("time-left-span").innerText;
				pinglog.innerHTML += `
				<span class="anomaly-span">
					Ping spike: ${timestamp} ${ping_time} ms (+${ping_time - average_ping})
				</span>`;
				pinglog.innerHTML += "<br>";
			}
			break;
		case "finished":
			remote_test_finished = true;
			if (local_test_finished)
			{
				datachannel.close();
				peer_connection.close();
			}
			break;
	}
}

function Send_Ping_Request_And_Save_Timestamp() 
{
	datachannel.send(JSON.stringify
		({
			id: sent_ping_counter,
			type: "request"
		}));

	unfulfilled_ping_requests[sent_ping_counter.toString()] = Date.now();
	sent_ping_counter++;
}

function Send_Ping_Response(id) 
{
	datachannel.send(JSON.stringify
	({
		id,
		type: "response"
	}));
}

function Decrement_UI_visual_test_timer(UI_visual_test_timer)
{
	const seconds = UI_visual_test_timer.getSeconds();
	const minutes = UI_visual_test_timer.getMinutes();
	if (minutes === 0 && seconds === 0)
	{
		return;
	}
	
	if (seconds > 0)
	{
		UI_visual_test_timer.setSeconds(seconds - 1);
		return;
	}
	
	UI_visual_test_timer.setMinutes(minutes - 1);
	if (minutes > 0)
	{
		UI_visual_test_timer.setSeconds(59);
	}
}

function Test_Over_Cleanup(ping_interval, UI_visual_timer_interval)
{
	clearTimeout(test_timeout);
	clearInterval(ping_interval);
	clearInterval(UI_visual_timer_interval);
	average_ping_display.innerText = "";
	anomaly_display.innerText = "";
	anomaly_counter = 0;
	sent_ping_counter = 0;
	last_100_ping_times.length = 0;
	received_ping_iterator = 0;
	Object.keys(unfulfilled_ping_requests).
	forEach(key => delete unfulfilled_ping_requests[key]);
}