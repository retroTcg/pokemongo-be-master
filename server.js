const express = require('express');
const app = express();
const helmet = require('helmet');
const cookieSession = require('cookie-session');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
require('dotenv').config();

const dbConnect = require('./dbConnect');

const userRoutes = require('./routes/user');
const deckRoutes = require('./routes/deck');
const PokemonRoutes = require('./routes/pokemon');

const cors = (req, res, next) => {
	var whitelist = [
		'http://localhost:4200',
		'http://localhost:3000',
		'http://localhost:8080',
		'https://www.allegedlytcg.com',
		'http://allegedlytcg.com',
		'https://allegedlytcg.com',
		'http://allegedlytcg.s3-website.us-east-2.amazonaws.com',
		'https://pr-49.d36zl7upiy9z6s.amplifyapp.com',
		'https://nextemon.vercel.app',
		'https://retrotcg.netlify.app'
	];
	let origin = req.headers.origin;
	if (whitelist.indexOf(origin) > -1) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}
	res.setHeader('Access-Control-Allow-Credentials', true);
	res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
	next();
};
app.use(cors);
app.use(express.json());
app.use(
	cookieSession({
		signed: false,
		// secure: process.env.NODE_ENV === 'test' ? false : true,
	}),
);

app.use(helmet());

// connect database
dbConnect();

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/deck', deckRoutes);
app.use('/api/v1/pokemon', PokemonRoutes);

const PORT = process.env.PORT || 6969;

let roomMap = {}; // holds All of the active rooms of the server
io.on('connection', (socket) => {
	console.log('made socket connection'); //each individualclient will have a socket with the server
	console.log(socket.id); //everytime a diff computer connects, a new id will be added

	socket.on('join_room', (room) => {
		console.log(
			'allegedly joining a room identified by the passed string...' +
				room,
		);
		let tempRoom = room; //whats ultimately sent back to client based on circumstances
		let rooms = Object.keys(socket.rooms);
		let thisRoom = io.sockets.adapter.rooms[room];
		console.log(rooms); // [ <socket.id>, 'room 237' ]

		if (typeof thisRoom !== 'undefined') {
			if (thisRoom.length == 0) {
				console.log(
					'no clients in that room, or is undefined creating room now',
				);
				socket.join(room); //room that socket/user wants to join
			} else if (thisRoom.length == 1) {
				console.log('joining 2nd client');
				socket.join(room);
			} else if (thisRoom.length == 2) {
				console.log('full room');
				console.log("here's a list of the connected clients:");
				let room = io.sockets.adapter.rooms['my_room'];
				//`` console.log(room[0]);
				// console.log(room[1]);``
				tempRoom = null;
			}
		} else {
			console.log(
				'room was undefined, joining and creating new room' + room,
			);
			socket.join(room);
			roomMap[room] = { x: 200, y: 200 };
			//when a new client connects, send position information
			position = roomMap[room];
			console.log('position sent is ' + position);
			io.to(room).emit('position', position);
		}
		socket.emit('joinResp', tempRoom); //sends confirmation to client by returning the room name, or null if the room was full/client already in room
	});

	socket.on('leave_room', (room) => {
		//how do they leave?
		//need their room(s)
		//emit a message indicating that the 'other' user left
		io.to(room).emit('gtfo', 'boot');
		disconnectRoom(room);
	});
	//TODO CHANGE THIS TO BOOKMARKED CONNECT/DISCONNECT METHO
	//     socket.on("disconnect", (room) =>{

	//         let thisRoom = io.sockets.adapter.rooms[room];
	//  // todo check if client is in that room
	//         if (typeof thisRoom !== 'undefined'){

	//             socket.leave(room);
	//             if (thisRoom.length == 0){
	//                 io.emit('lobbyUpdate', room){
	//                     //remove the roomname from all client lobby list
	//                 }
	//             }

	//         }
	//         else{
	//             console.log("an issue where the room wasn't found occured")
	//         }
	//     });

	//now listening for custom events fromc lient
});

function disconnectRoom(room, namespace = '/') {
	io.of(namespace)
		.in(room)
		.clients((err, clients) => {
			clients.forEach((clientId) =>
				io.sockets.connected[clientId].disconnect(),
			);
		});
}

server.listen(PORT, () => console.log(`listening on ${PORT}`));
