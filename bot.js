var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var fs = require('fs');
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
	var lookup = reverseLookup(userID);
	if(lookup === -1) {
		var newIdPair = userID + ',' + user + '\n';
		fs.appendFile('discord_ID_mapping/discordIDs.csv', newIdPair, (err) => {
			if(err) throw err;
			logger.info('Mapped '+ userID + ' to ' + user);
		});
	}
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split('|');
        var cmd = args[0];
		logger.info('Command passed is ' + cmd);
		logger.info('Args 1 is ' + args);
        args = args.splice(1);
		logger.info('Args 2 is ' + args);
        switch(cmd) {
            // !ping
            case 'beep':
                bot.sendMessage({
                    to: channelID,
                    message: 'Boop. Beep Beep? Boo-bop.'
                });
                break;
			// implementation in progress
            case 'getRival':
				var playerID;
                var game;
                var playerName = '';
                var discordID;
				var fullOutput;
				fullOutput = 'Username                      |Game      |Rival ID            |In-Game Name   \n'
				fs.readFile('rival_data/rivals.csv', (err, data) => {
					var rivalContents = data + '';
					var rivalLines = rivalContents.split('\n');
					var nextLine = 1;
					while(rivalLines[nextLine]) {
						var currentEntry = rivalLines[nextLine];
						var pieces = currentEntry.split(',');
						discordID = reverseLookup(pieces[1]);
						if(discordID.length > 30) {
							discordID = discordID.substring(0,27) + '...';
						}
						var idSpaces = 30 - discordID.length;
						for(var i=0; i<idSpaces; i++) {
							discordID = discordID + ' ';
						}
						game = pieces[2];
						if(game.length > 10) {
							game = game.substring(0,7) + '...';
						}
						var gameSpaces = 10 - game.length;
						for(var i=0; i<gameSpaces; i++) {
							game = game + ' ';
						}
						playerID = pieces[3];
						if(playerID.length > 20) {
							playerID = playerID.substring(0,17) + '...';
						}
						var pidSpaces = 20 - playerID.length;
						for(var i=0; i<pidSpaces; i++) {
							playerID = playerID + ' ';
						}
						if(pieces[4]){
							playerName = pieces[4];
							if(playerName.length > 15) {
								playerName = playerName.substring(0,12) + '...';
							}
							var nameSpaces = 15 - playerName.length;
							for(var i=0; i<nameSpaces; i++) {
								playerName = playerName + ' ';
							}
						}
						fullOutput = fullOutput + discordID + '|' + game + '|' + playerID + '|' + playerName + '\n';
						nextLine++;
					}
					bot.sendMessage({
						to: channelID,
						message: 'I am not yet ready for a rival lookup, so for the meantime, here is the whole database of rivals which are currently stored. Soon, you will be able to do lookups. ```' + fullOutput + '```'
					})
				});
			break;
			case 'addRival':
				var discordID;
				var entryID;
				var playerID;
				var game;
				var alias;
				discordID = user;
				game = args[0];
				playerID = args[1];
				if(args[2]) {
					alias = args[2];
				}
				
				fs.readFile('rival_data/rivals.csv', (err, data) => {
					if (err) {
						console.error('Error opening rival file.');
						throw err;
					}
					var fileContents = data + '';
					var dataLines = fileContents.split('\n');
					var lineCheck = 1;
					while(dataLines[lineCheck]) {
						lineCheck++;
					}
					entryID = lineCheck;
					var newEntry = entryID + ',' + userID + ',' + game + ',' + playerID;
					if(alias) {
						newEntry = newEntry + ',' + alias;
					}
					newEntry = newEntry + '\n';
					fs.appendFile('rival_data/rivals.csv', newEntry, (err) => {
						if(err) {
							bot.sendMessage({
								to: channelID,
								message: '<@' + userID + '>, adding your rival code failed. Yell at <@82254201769439232> to fix it.'
							}); 
						}
						else {
							bot.sendMessage({
								to: channelID,
								message: '<@' + userID + '>, I added rival data for you! Here is what I have! ```Entry ID: ' + entryID + ', User: ' + discordID + ', Game: ' + game + ', Rival Code: ' + playerID + ', In-Game Name (may be blank): ' + alias + '```'
							});
						}
					});
				});
			break;
			case 'help':
				bot.sendMessage({
					to: channelID,
					message: 'Here is how you can use my commands!\n```!help: returns this message.\n\nExample: !help\n\n\n!getRival: returns entire rival list (currently, its a WIP)\n\nExample: !getRival\n\n\n!addRival|GAME_NAME|RIVAL_CODE|IN_GAME_NAME: adds a Rival ID for yourself in a list available to other users to pull back.\n\nArguments:\n \nGAME_NAME (required) -- name of the game. Please use an abbreviation if it has a well known one.\nRIVAL_CODE (required) -- the way people will look you up. If your game does not have a number (like Pump) and just uses a name, use it here.\nIN_GAME_NAME (optional) -- your profile name. This is optional as many games let you change this, but feel free to supply it if you like.\n\nExample: !addRival|IIDX|4432-5464|HEDNIC\n\nMore commands soon!\n\n```'
				});
			break;
         }
     }
	 
	 
});

function reverseLookup(userID) {
	//Check if the user's ID already exists in the system. We need this for rival lookup.
	var data = fs.readFileSync('discord_ID_mapping/discordIDs.csv');
	var idContents = data + '';
	var idDataLines = idContents.split('\n');
	var incrementer = 1;
	while(idDataLines[incrementer]) {
		if(idDataLines[incrementer].includes(userID)) {
			var idDataSplit = idDataLines[incrementer].split(',');
			var userName = idDataSplit[1];
			return userName;
		}
		else {
			incrementer++;
		}
	}
	return -1;
}