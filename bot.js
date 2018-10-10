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
        cmd = cmd.toLowerCase();
		logger.info('Command passed is ' + cmd);
		logger.info('Args are as follows: ' + args);
        args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'beep':
                bot.sendMessage({
                    to: channelID,
                    message: 'Boop. Beep Beep? Boo-bop.'
                });
            break;
			// implementation in progress
            case 'report':
                if (!args[3])
                {
                    bot.sendMessage({
                        to: channelID,
                        message: '<@' + userID + '>, your report has invalid syntax. I know this error is not helpful, ask Hedonic for help for now.'
                    });
                }
                var entry;
                var loc = args[0].toUpperCase();
                var game = args[1];
                var description = args[2];
                var severity = args[3];
                var timeReported = new Date();
                timeReported = timeReported.toString();
                var reporter = userID;
                if (loc !== 'SCG' && loc !== 'GU' && loc !== 'MEM' && loc != 'SSP' && loc != 'CRG') {
                    bot.sendMessage({
                        to: channelID,
                        message: '<@' + userID + '>, please enter a valid location. Currently supported locations are: \nSCG GU MEM SSP CRG'
                    })
                }
                else {
                    var data = fs.readFileSync('storestatus/' + loc.toLowerCase() + '.csv');
                    var statusContents = data + '';
                    var statusLines = statusContents.split('\n');
                    entry = statusLines.length - 1;
                    var newReport = entry + ',' + game + ',' + description + ',' + severity + ',' + reporter + ',' + timeReported + ',ACTIVE\n';
                    fs.appendFileSync('storestatus/' + loc.toLowerCase() + '.csv', newReport);
                    logger.info('User ' + user + ' successfully submitted a report. Report is ' + loc.toUpperCase() + '-' + entry);
                    bot.sendMessage({
                        to: channelID,
                        message: '<@' + userID + '>, thanks for your report. Your report number is ' + entry + ', for the location ' + loc.toUpperCase()
                    });
                }
                writeStatus();
            break;
            case 'resolve':
                if (!args[1] || (args[0] !== 'SCG' && args[0] !== 'GU' && args[0] !== 'MEM' && args[0] != 'SSP' && args[0] != 'CRG')) {
                    bot.sendMessage({
                        to: channelID,
                        message: '<@' + userID + '>, please supply a location (using the abbreviation in the status list) and an entry ID.'
                    });
                    return;
                }
                var loc = args[0];
                var entryID = args[1];
                var newStatus = 'BEGIN\n';
                var data = fs.readFileSync('storestatus/' + loc.toLowerCase() + '.csv') + '';
                var lines = data.split('\n');
                var incrementer = 1;
                while (lines[incrementer]) {
                    var lineData = '';
                    lineData = lines[incrementer].split(',');
                    if (lineData[0] === entryID) {
                        lineData[6] = 'CLOSE';
                        logger.info('Entry ' + entryID + ' for location ' + loc.toUpperCase() + ' has been updated to a status of CLOSE by user ' + reverseLookup(userID));
                        var newLine = '';
                        for (i = 0; i < lineData.length; i++) {
                            newLine = newLine + lineData[i];
                            if (i !== 6) {
                                newLine = newLine + ',';
                            }
                        }
                        lines[incrementer] = newLine;
                    }
                    newStatus = newStatus + lines[incrementer] + '\n';
                    incrementer++;
                }
                fs.writeFileSync('storestatus/' + loc.toLowerCase() + '.csv', newStatus);
                bot.sendMessage({
                    to: channelID,
                    message: '<@' + userID + '>, entry ID ' + entryID + ' has been updated to a closed status. Please create a new report if the problem returns.'
                });
                writeStatus();
            break;
            case 'getrival':
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
						logger.debug('Looking up user ID ' + pieces[1].trim());
						discordID = reverseLookup(pieces[1]);
						if(discordID.length > 30) {
							discordID = discordID.substring(0,27) + '...';
						}
						var idSpaces = 30 - discordID.length;
						for(var i=0; i<idSpaces; i++) {
							discordID = discordID + ' ';
						}
						game = pieces[2].trim();
						if(game.length > 10) {
							game = game.substring(0,7) + '...';
						}
						var gameSpaces = 10 - game.length;
						for(var i=0; i<gameSpaces; i++) {
							game = game + ' ';
						}
						playerID = pieces[3].trim();
						if(playerID.length > 20) {
							playerID = playerID.substring(0,17) + '...';
						}
						var pidSpaces = 20 - playerID.length;
						for(var i=0; i<pidSpaces; i++) {
							playerID = playerID + ' ';
						}
						if(pieces[4]){
							playerName = pieces[4].trim();
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
			case 'addrival':
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
				
				var data = fs.readFile('rival_data/rivals.csv', (err, data) => {
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
								message: '<@' + userID + '>, I added rival data for you!```Entry ID: ' + entryID + ', User: ' + discordID + ', Game: ' + game + ', Rival Code: ' + playerID + ', In-Game Name (may be blank): ' + alias + '```'
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
			case 'announce':
				var mention = args[0];
				if(mention === 'here') {
					mention = '@here';
				} else if(mention === 'everyone') {
					mention = '@everyone';
				}
				var message = args[1];
				if(userID === '82254201769439232' || userID === '379031765383118848') {
					logger.info('User ID matched strict filter. Sending message.')
					bot.sendMessage({
						to: '248906720351354880',
						message: mention + ' ' + message
					});
				}
			break;
            case 'sendtest':
                var channel = args[0];
                var msg = args[1];
                if (userID === '82254201769439232' || userID === '379031765383118848') {
                    logger.info('User ID matched strict filter. Sending message.')
                    bot.sendMessage({
                        to: channel,
                        message: msg
                    });
                }
            break;
            case 'sendupdates':
                writeStatus();
            break;
            case 'editmessage':
                bot.editMessage({
                    channelID: args[0],
                    messageID: args[1],
                    message: args[2]
                });
         }
     }
	 
	 
});

function reverseLookup(userID) {
	//Check if the user's ID already exists in the system. We need this for rival lookup.
	var data = fs.readFileSync('discord_ID_mapping/discordIDs.csv');
	if(data == '') {
		logger.warn('No data returned from file!');
	}
	var idContents = data + '';
	var idDataLines = idContents.split('\n');
	var incrementer = 1;
	while(idDataLines[incrementer]) {
		if(idDataLines[incrementer].includes(userID)) {
			var idDataSplit = idDataLines[incrementer].split(',');
			var userName = idDataSplit[1];
			return userName.trim();
		}
		else {
			incrementer++;
		}
	}
	logger.warn('No match was found for user ID ' + userID + 'in lookup.');
	return -1;
}

function writeStatus() {
    var newStatus = '```';
    var locations = ['scg', 'ssp', 'mem', 'crg', 'gu'];
    for (i=0;i<locations.length;i++) {
        var data = fs.readFileSync('storestatus/' + locations[i].toLowerCase() + '.csv');
        data = data + '';
        var statusLines = data.split('\n');
        var nextLine = 1;
        var locData = locations[i].toUpperCase() + ' REPORTS\n-----------\n';
        var reportData = '';
        while (statusLines[nextLine]) {
            var lineData = statusLines[nextLine].split(',');
            if (lineData[6] === 'ACTIVE') {
                reportData = reportData + 'Entry: ' + lineData[0] + ' | Reported by ' + reverseLookup(lineData[4]) + ' at ' + lineData[5] + '\n     Game: ' + lineData[1] + ' | Severity: ' + lineData[3] + '\n          Description: ' + lineData[2] + '\n'
            }
            nextLine++;
        }
        if (reportData === '') {
            reportData = 'No Current Issues Reported!\n'
        }
        locData = locData + reportData + '\n\n';
        newStatus = newStatus + locData;
    }
    newStatus = newStatus + '```';
    logger.info('Editing Status Message...');
    bot.editMessage({
        channelID: '274293259843534849',
        messageID: '499384943009595442',
        message: newStatus
    });
}