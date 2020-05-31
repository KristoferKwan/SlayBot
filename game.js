"use strict";

function Game(map, editorMode)
{
	this.players = [];
	this.corpses = [];
	this.zombies = [];
	this.movableObjects = [];
	this.projectiles = [];
	this.grenades = [];
	this.objects = [];
	this.effects = [];
	this.floatingTexts = [];
	this.teleporters = [];
	this.cameraX = 0;
	this.cameraY = 0;
	this.cameraX2 = 0;
	this.cameraY2 = 0;
	this.redScreen = 0;
	this.lastEmptyClipSound = -9999;
	this.targetX = 0;
	this.targetY = 0;
	this.mouseDowned = false;
	this.fire2Downed = false;
	this.mouseDownSent = false;
	this.fire2DownSent = false;
	
	this.ticksCounter = 0;
	
	this.pingRandomizer = Math.floor(Math.random() * 50);
	this.playingPlayer = null;
	this.playingPlayerZombieKillStreak = 0;
	this.playingPlayerAbilities = (playerData && playerData.authLevel >= 6) ? playerData.abilities : getDefaultAbilityObj(abilities);;
	this.playingPlayerIsZombie = false;
	this.playingPlayerID = -1;
	this.playingPlayerAmmo = [];
	this.playingPlayerClips = [];
	this.lastTimeMousePosSent = -999;
	this.noShootUntil = -999;
	this.lastPickUp = -999;
	this.lastAbilityUses = [-9999, -9999, -9999];
	this.targetLockedPlayer = null;
	this.switchWeaponSound = null;
	this.playingPlayerEnergy = CONST.START_ENERGY;
	this.playingPlayerCountActiveHeatseeking2Missiles = 0;
	this.flashedFrom = -9999;
	this.flashBonusFactor = 1;
	this.showEnemiesOnMinimapUntil = -999;

	this.map = map;
	this.mapWelcome = map == map1;

	this.isLowGraphicEffect = window.graphicSettings < 1;
	
	this.type = MAP_TYPE_SETTINGS[map.type] ? MAP_TYPE_SETTINGS[map.type] : MAP_TYPE_SETTINGS[MAP_TYPE.TOURNAMENT_UNRANKED];
	this.interface_ = new Interface(map);

	this.groundMinX = 0;
	this.groundMaxX = this.map.x;
	this.groundMinY = 0;
	this.groundMaxY = this.map.y;
    this.turnBoss = false;

	this.fpsAvg = 0;
	this.fpsAvgTs = 0;
	this.fpsFresh = [];
	this.fpsCount = 0;
	this.fpsTs = 0;
	this.fpsLog = {};
	this.fps = 0;

	this.editingMode = editorMode;
	this.objectsToDraw = [];
	this.tilesCashes = [];
	this.groundCanvas = [];
	this.initMap(map);
	this.createGroundCanvas();
	this.generateTilesCanvasses();

	for(var i = 0; i < this.tiles.length; i++)
		if(this.tiles[i].type.blockVision)
			this.createVisionTile(this.tiles[i]);

	this.fairies = [];
	this.lastCursorStr = "";
	KeyManager.activeAbility = null;

	this.camFlyX = 0;
	this.camFlyY = 0;

	// torches
	this.torches = [];
	for(var i = 0; i < this.tiles.length; i++)
		if(this.tiles[i].type.isTorch)
			this.torches.push({
				x: this.tiles[i].x,
				y: this.tiles[i].y,
				nextEmit: -9999,
				offsetX: this.tiles[i].type.flameOffsetX ? this.tiles[i].type.flameOffsetX : 0,
				offsetY: this.tiles[i].type.flameOffsetY ? this.tiles[i].type.flameOffsetY : 0
			});

	this.whiteCircles = [];
	this.rumbleUntil = 0;
	this.rumblePower = 0;

	this.createBlockArray();

	this.editor = null;
	this.replayMode = false;
	this.replayIndex = 1;

	this.spawningPoints = map.spawningPoints ? map.spawningPoints : [];
	this.spawningPointsRed = map.spawningPointsRed ? map.spawningPointsRed : [];
	this.spawningPointsBlue = map.spawningPointsBlue ? map.spawningPointsBlue : [];
	this.waypoints = map.waypoints ? map.waypoints : [];
	this.redFlag = null;
	this.blueFlag = null;
	this.scoreTeam1 = 0;
	this.scoreTeam2 = 0;
	this.roundTime = 0;

	this.specX = map.x / 2 - WIDTH / 2 / FIELD_SIZE;
	this.specY = map.y / 2 - HEIGHT / 2 / FIELD_SIZE;
	this.specPlayer = null;
	this.iAmSpec = false;

    if(!this.editingMode && !this.mapWelcome)
    {
        this.miniMap = F$('miniMap');
	}
	else
	{
		let map = F$('miniMap');
		if(map)
			map.hide();
		
		this.miniMap = null;
	}

	SCALE_CONST = 0.06;
	resize();

	this.interface_.killAllMsgs();
	this.victoryMsg = "";

	window.replayOptionsIndex = 3;
	window.replayOption = window.replayOptions[window.replayOptionsIndex];
	this.fastForward = false;
	this.setNextMaps({});
	
	this.updList = {
		wC:   2,
		bZ:   7,
		trn:  2,
		js:   3,
		pa:   3,
		cZ:   1,
		rp:   5,
		p2u:  3,
		ts:	  2,
		rsh:  3,
		o2u:  2,
		nF:   3,
		stu:  2,
		aiu:  3,
		hpU:  2,
		blk:  4,
		blP:  5,
		tB:   1,
		ptz:  1,
		pptz: 1,
		zph:  3,
		blO:  5,
		ab:   2,
		ab2:  2,
		luP:  1,
		rl:   1,
		rl2:  4,
		att:  3,
		abc:  3
	};
};

Game.isIngameCommand = (function() {
    var ingameCommands = ["upd", "nP", "nZ", "pid", "pL", "proD", "hp", "hpO", "pro", "nO", "proM", "grn", "rl2", "rsp", "rsh", "next-maps", "beam1", "beam2"];

	return function(command) {
		return ingameCommands.indexOf(command) >= 0 || command.indexOf("chat") >= 0;
	};
})();

Game.prototype.mouseDown = function()
{
	this.mouseDowned = true;
	
	if(!this.playingPlayer || !this.playingPlayer.isShootable())
		return;
	
	this._mouseDown();
};

Game.prototype.fire2Down = function()
{
	this.fire2Downed = true;
	
	if(!this.playingPlayer || !this.playingPlayer.isShootable())
		return;
	
    this._fire2Down();
};

Game.prototype._mouseDown = function()
{
    this.targetX = getMouseGamePlayX();
    this.targetY = getMouseGamePlayY();
    network.send("md$" + this.targetX + "$" + this.targetY + (this.targetLockedPlayer ? ("$" + this.targetLockedPlayer.id) : ""));
    this.mouseDownSent = true;
};

Game.prototype._fire2Down = function()
{
    this.targetX = getMouseGamePlayX();
    this.targetY = getMouseGamePlayY();
    network.send("f2d$" + this.targetX + "$" + this.targetY + (this.targetLockedPlayer ? ("$" + this.targetLockedPlayer.id) : ""));
    this.fire2DownSent = true;
};

Game.prototype.mouseUp = function()
{
    this.mouseDowned = false;
	
    if(this.mouseDownSent)
    {
        network.send("mu");
        this.mouseDownSent = false;
	}
};

Game.prototype.fire2Up = function()
{
    this.fire2Downed = false;
	
    if(this.fire2DownSent)
    {
        network.send("f2u");
        this.fire2DownSent = false;
	}
};

Game.prototype.mouseUpdate = function()
{
    var x = getMouseGamePlayX();
    var y = getMouseGamePlayY();
    if(!floatEqual(this.targetX, x) || !floatEqual(this.targetY, y))
    {
        this.targetX = x;
        this.targetY = y;
        network.send("mp$" + x + "$" + y + (this.targetLockedPlayer ? ("$" + this.targetLockedPlayer.id) : ""));
    }
    
    this.lastTimeMousePosSent = Date.now();
};

Game.prototype.playerSortHandler = function(p1, p2)
{
	var key = game.type.winningCondition || "souls";
	return p2[key] - p1[key] || p2.score - p1.score || (p2.id == game.playingPlayerID) - (p1.id == game.playingPlayerID);
};

Game.prototype.refreshUIs = function()
{
	if(this.type.team && this.type.souls)
	{
		this.scoreTeam1 = 0;
		this.scoreTeam2 = 0;

		for(var i = 0; i < this.players.length; i++)
		{
			if(this.players[i].team == 1)
				this.scoreTeam1 += this.players[i].souls;
			else if(this.players[i].team == 2)
				this.scoreTeam2 += this.players[i].souls;
		}

        F$("rankInGame").refreshTeamScore();
	}
	
    F$("rankInGame").refreshRank();
	var myRank = this.interface_.refreshTop3();
	if(myRank > 0)
		game.myRank = myRank;
};

Game.prototype.createDefaultBorder = function()
{
	var default_ = [2, 3, 4, 5];
	for(var x = -1; x <= this.map.x; x++)
		this.tiles.push(createTile({x: x, y: -1, id: default_[Math.floor(Math.random() * default_.length)]}));

	default_ = [6, 7, 8, 9];
	for(var y = 0; y <= this.map.y; y++)
		this.tiles.push(createTile({x: -1, y: y, id: default_[Math.floor(Math.random() * default_.length)]}));

	default_ = [10, 11, 12, 13];
	for(var y = 0; y <= this.map.y; y++)
		this.tiles.push(createTile({x: this.map.x, y: y, id: default_[Math.floor(Math.random() * default_.length)]}));

	default_ = [14, 15, 16, 17];
	for(var x = -1; x <= this.map.x; x++)
		this.tiles.push(createTile({x: x, y: this.map.y, id: default_[Math.floor(Math.random() * default_.length)]}));
};

Game.prototype.createBlockArray = function(x, y)
{
	this.walkways = [];
	this.pathingArray = [];
	this.shiftArray = [];
	this.bushArray = [];

	for(var x = 0; x < this.map.x; x++)
	{
		this.pathingArray[x] = [];
		this.shiftArray[x] = [];
		this.bushArray[x] = [];
		for(var y = 0; y < this.map.y; y++)
		{
			this.pathingArray[x][y] = 10;
			this.shiftArray[x][y] = [0, 0];
			this.bushArray[x][y] = false;
		}
	}

	// go through tiles and block everything
	for(var i = 0; i < this.tiles.length; i++)
	{
		var tile = this.tiles[i];
		var type = tile.type;

		if(type && !type.movable)
		{
			if(type.pathing < 10)
				for(var x = 0; x < type.w; x++)
					for(var y = 0; y < type.h; y++)
						if(tile.x >= 0 && tile.x <= this.map.x && tile.y >= 0 && tile.y <= this.map.y && this.pathingArray[x + tile.x])
							this.pathingArray[x + tile.x][y + tile.y] = type.pathing;

			if(type.shiftX || type.shiftY)
			{
				if(type.shiftX && this.shiftArray[tile.x] && this.shiftArray[tile.x][tile.y])
					this.shiftArray[tile.x][tile.y][0] = type.shiftX;

				if(type.shiftY && this.shiftArray[tile.x] && this.shiftArray[tile.x][tile.y])
					this.shiftArray[tile.x][tile.y][1] = type.shiftY;

				this.walkways.push({
					x: tile.x,
					y: tile.y,
					shiftX: tile.shiftX,
					shiftY: tile.shiftY,
					type: type
				});
			}
		}

		if(type && type.blockVision)
			this.bushArray[tile.x][tile.y] = true;
	}

	// go through ground tiles and block everything
	for(var i = 0; i < this.groundTiles.length; i++)
	{
		var tile = this.groundTiles[i];
		var type = tile.type;

		if(type)
		{
			if(tile.x >= 0 && tile.x <= this.map.x && tile.y >= 0 && tile.y <= this.map.y && type.pathing && type.pathing < 10 && this.pathingArray[tile.x])
				this.pathingArray[tile.x][tile.y] = type.pathing;

			if(type.shiftX || type.shiftY)
			{
				if(type.shiftX && this.shiftArray[tile.x] && this.shiftArray[tile.x][tile.y])
					this.shiftArray[tile.x][tile.y][0] = type.shiftX;

				if(type.shiftY && this.shiftArray[tile.x] && this.shiftArray[tile.x][tile.y])
					this.shiftArray[tile.x][tile.y][1] = type.shiftY;

				this.walkways.push({
					x: tile.x,
					y: tile.y,
					shiftX: tile.shiftX,
					shiftY: tile.shiftY,
					type: type
				});
			}

			if(type.isTeleporter && this.pathingArray[tile.x] && this.pathingArray[tile.x][tile.y])
				this.pathingArray[tile.x][tile.y] = 11; // make pathing 11, so no things can be build on the teleporter
		}
	}
};

Game.prototype.startEditingMode = function()
{
	this.editingMode = true;
	this.editor = new Editor();
};

Game.prototype.addCircle = function(x, y, img)
{
	this.whiteCircles.push({
		x: x,
		y: y,
		time: this.ticksCounter,
		img: img
	});
};

Game.prototype.getFieldPath = function(x, y)
{
	return this.pathingArray[x] ? (this.pathingArray[x][y] ? this.pathingArray[x][y] : 0) : 0;
};

// for player collision; water has higher height, so players dont walk / jump into it
Game.prototype.getHeight = function(x, y)
{
	var block = this.getFieldPath(x, y);

	var blockHeight = 0;

	if(block < 5)
		blockHeight = 9999;

	else if(block == 5)
		blockHeight = 0.6;

	else if(block == 9)
		blockHeight = 0.6;

	else if(block < 10)
		blockHeight = 0.2;

	return blockHeight;
};

// for projectiles; water has height 0
Game.prototype.getHeight2 = function(x, y)
{
	var block = this.getFieldPath(x, y);

	var blockHeight = 0;

	if(block < 5)
		blockHeight = 9999;

	else if(block == 5)
		blockHeight = 0.6;

	else if(block == 9)
		blockHeight = 0;

	else if(block < 10)
		blockHeight = 0.2;

	return blockHeight;
};

// for corpses; water has height inf, so corpses dont land on water (will be implemented later)
Game.prototype.getHeight3 = function(x, y)
{
	var block = this.getFieldPath(x, y);

	var blockHeight = 0;

	if(block < 5)
		blockHeight = 9999;

	else if(block == 5)
		blockHeight = 0.6;

	else if(block == 9)
		blockHeight = 9999;

	else if(block < 10)
		blockHeight = 0.2;

	return blockHeight;
};

Game.prototype.raytrace = function(fromX, fromY, toX, toY)
{
	var vecX = toX - fromX;
	var vecY = toY - fromY;

	var dist = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
	var len = Math.sqrt(vecX * vecX + vecY * vecY);

	vecX *= 0.25 / len;
	vecY *= 0.25 / len;

	fromX += vecX * 3;
	fromY += vecY * 3;
	dist -= 0.75;

	while(dist > 0.75)
	{
		if(this.getFieldPath(Math.floor(fromX), Math.floor(fromY)) <= 5)
			return false;

		fromX += vecX;
		fromY += vecY;
		dist -= 0.25;
	}

	return true;
};

Game.prototype.reload2 = function(data)
{
	this.playingPlayerAmmo[data[1]] = parseInt(data[3]);
	this.playingPlayerClips[data[1]] = parseInt(data[2]);
};

Game.prototype.generateTilesCanvasses = function()
{
	var min = -1;
	var max = this.map.y;
	
	for(var tile of this.tiles)
		if(!tile.ground && (!tile.type.movable || this.editingMode) && !tile.blockVision)
		{
			var y_ = tile.y + tile.type.h - 1;

			min = Math.min(min, y_);
			max = Math.max(max, y_);
		}
	
	for(var y = min; y <= max; y++)
		this.refreshBlockingTilesCanvas(y);
};

Game.prototype.createVisionTile = function(tile)
{
	var obj = {
		y_: tile.y,
		y2_: tile.y + 0.5,
		x_: tile.x,
		x2_: tile.x + 0.5,
		tile: tile,
		img: tile.type.img,
		getYDrawingOffset: function() {
			return this.y_;
		},
		draw: function(exactTicks, x1, y1, x2, y2) {

			if(y1 < this.y_ + 2 && y2 > this.y_ - 3 && x1 < this.x_ + 2 && x2 > this.x_ - 2)
			{
				c.globalAlpha = (game.playingPlayer && game.bushArray[Math.floor(game.playingPlayer.x)] && game.bushArray[Math.floor(game.playingPlayer.x)][Math.floor(game.playingPlayer.y)] &&
					Math.sqrt(Math.pow(this.x2_ - game.playingPlayer.x, 2) + Math.pow(this.y2_ - game.playingPlayer.y, 2)) <= CONST.BUSH_VISION_RANGE) ? 0.4 : 1;
				c.drawImage(imgs.tileSheet, this.img.x, this.img.y, this.img.w, this.img.h, (this.x_ - x1) * FIELD_SIZE, (this.y_ - y1 + 1) * FIELD_SIZE - this.img.h * SCALE_FACTOR, this.img.w * SCALE_FACTOR, this.img.h * SCALE_FACTOR);
				c.globalAlpha = 1;
			}
		}
	};

	this.addToObjectsToDraw(obj);
};

Game.prototype.refreshBlockingTilesCanvas = function(y)
{
	var tiles = [];
	var maxHeight = 1;
	var frames = 1;

	// add all tiles that have this y coordinate
	for(var i = 0; i < this.tiles.length; i++)
		if(!this.tiles[i].ground && (!this.tiles[i].type.movable || this.editingMode) && !this.tiles[i].type.blockVision)
		{
			var tile = this.tiles[i];
			var tileType = tile.type;

			if(tile.y + tileType.h - 1 == y)
			{
				tiles.push(tile);
				maxHeight = Math.max(maxHeight, tileType.img.h);

				if(tileType.img2)
					frames = 2;
			}
		}

	// sort the tiles by their exact y offset
	tiles = sortBy(tiles, (tile) => { return tile.x; });

	// create canvas and set parameters
	var obj = null;

	if(this.tilesCashes[y])
		this.objectsToDraw.erease(this.tilesCashes[y]);

	obj = {
		y_: y,
		getYDrawingOffset: function() {
			return this.y_;
		},
		draw: function(exactTicks, x1, y1, x2, y2) {
			var canv = this["canvas" + (Math.floor(exactTicks / 10) % 2 + 1)];
			if(!canv)
				canv = this.canvas1;

			if(y1 < this.y_ + 2 && y2 > this.y_ - 3 && canv.height > 1)
				c.drawImage(canv, -(x1 + 12) * FIELD_SIZE, (this.y_ + 1 - y1 + 4 / 16) * FIELD_SIZE - canv.height * SCALE_FACTOR, canv.width * SCALE_FACTOR, canv.height * SCALE_FACTOR);
		}
	};

	this.tilesCashes[y] = obj;
	this.addToObjectsToDraw(obj);

	for(var k = 1; k <= frames; k++)
	{
		var canvas = document.createElement('canvas');
		var ctx = canvas.getContext("2d");

		canvas.width = (this.map.x + 24) * 16;
		canvas.height = maxHeight;

		// draw the tiles on the canvas
		for(var i = 0; i < tiles.length; i++)
		{
			var tile = tiles[i];
			var tileType = tile.type;
			var img = tileType["img" + k] ? tileType["img" + k] : tileType.img;

			var x_ = Math.floor((tile.x + 12) * 16 + (tileType.w * 16 - img.w) / 2);
			var y_ = Math.floor(maxHeight - img.h);
			ctx.drawImage(imgs.tileSheet, img.x, img.y, img.w, img.h, x_, y_, img.w, img.h);
		}

		obj["canvas" + k] = canvas;
	}
};

Game.prototype.addToObjectsToDraw = function(o)
{
	this.objectsToDraw.push(o);
};

Game.prototype.createGroundCanvas = function()
{
	var frames = 1;
	
	this.groundMinX = -16;
	this.groundMaxX = this.map.x + 16;
	this.groundMinY = -10;
	this.groundMaxY = this.map.y + 10;
	
	for(var i = 0; i < this.groundTiles.length; i++)
	{
		var tile = this.groundTiles[i];
		
		if(tile.type.img2)
			frames = 2;
	}
	
	this.groundCanvas = [];
	
	for(var k = 1; k <= frames; k++)
	{
		var canv = document.createElement("canvas");
		this.groundCanvas.push(canv);
		canv.width = 16 * (this.groundMaxX - this.groundMinX);
		canv.height = 16 * (this.groundMaxY - this.groundMinY);

		// inner tiles
		if(tileTypes[this.map.defaultTiles])
			for(var x = 0; x < (this.map.x * 16); x += 16)
				for(var y = 0; y < (this.map.y * 16); y += 16)
				{
					var tile = tileTypes[this.map.defaultTiles];
					canv.getContext("2d").drawImage(imgs.tileSheet, tile.img.x, tile.img.y, tile.img.w, tile.img.h, x - this.groundMinX * 16, y - this.groundMinY * 16, 16, 16);
				}

		// outta tiles
		if(tileTypes[this.map.defaultTilesOutter])
			for(var x = 0; x < canv.width; x += 16)
				for(var y = 0; y < canv.height; y += 16)
					if(x < -this.groundMinX || x > (-this.groundMinX + this.map.x) || y < -this.groundMinY || y > (-this.groundMinY + this.map.y))
					{
						var tile = tileTypes[this.map.defaultTilesOutter];
						canv.getContext("2d").drawImage(imgs.tileSheet, tile.img.x, tile.img.y, tile.img.w, tile.img.h, x, y, 16, 16);
					}

		for(var i = 0; i < this.groundTiles.length; i++)
		{
			var tile = this.groundTiles[i].type;
			var img = tile["img" + k];
			if(!img)
				img = tile.img;

			var x = tile.w * 8 - img.w / 2;
			var y = tile.h * 8 - img.h / 2;
			canv.getContext("2d").drawImage(imgs.tileSheet, img.x, img.y, img.w, img.h, (this.groundTiles[i].x - this.groundMinX) * 16 + x, (this.groundTiles[i].y - this.groundMinY) * 16 + y, img.w, img.h);
		}
	}
};

Game.prototype.getObjectFromID = function(id)
{
	for(var k = 0; k < this.objects.length; k++)
		if(this.objects[k].id == id)
			return this.objects[k];
	
	return null;
};

Game.prototype.getPlayerFromID = function(id)
{
	for(var k = 0; k < this.players.length; k++)
		if(this.players[k].id == id)
			return this.players[k];

	for(var k = 0; k < this.zombies.length; k++)
		if(this.zombies[k].id == id)
			return this.zombies[k];

	for(var k = 0; k < this.movableObjects.length; k++)
		if(this.movableObjects[k].id == id)
			return this.movableObjects[k];

	for(var k = 0; k < this.corpses.length; k++)
		if(this.corpses[k].id == id)
			return this.corpses[k];

	return null;
};

Game.prototype.resetPlayingPlayerStats = function()
{
	if(this.playingPlayer)
		for(var i = 0; i < 20; i++)
		{
			this.playingPlayer.weaponCooldowns[i] = 0;
			this.playingPlayerAmmo[i] = (weapons[i] && weapons[i].ammoSize) ? 0 : 99999999;
			this.playingPlayerClips[i] = (weapons[i] && weapons[i].ammoSize) ? 0 : 99999999;
		}
	
	this.cureTick = 0;
	this.playingPlayerZombieKillStreak = 0;
	this.playingPlayerEnergy = CONST.START_ENERGY;
	this.playingPlayerCountActiveHeatseeking2Missiles = 0;
	KeyManager.activeAbility = null;
	this.showEnemiesOnMinimapUntil = -999;
	this.lastAbilityUses = [-9999, -9999, -9999];
	this.noShootUntil = -999;
};

Game.prototype.init = function(d, str)
{
	slayOne.viewHelpers.hidePopup("account");
	Skin.close();
	CustomBuild.close();
	slayOne.views.homeScreen.hideWindow();
	slayOne.viewHelpers.hideAd();
	F$('bottomBar').remove();
	F$('resourceBar').hide();
	uiManager.refreshMenuButtons();
	
	this.type = MAP_TYPE_SETTINGS[parseInt(d[2])];
	this.roundTime = parseInt(d[3]);
	this.ticksCounter = parseInt(d[4]);
	this.scoreTeam1 = parseInt(d[5]);
	this.scoreTeam2 = parseInt(d[6]);
	
	if(this.type.lives)
		soundManager.playSound(SOUND.LADDER_START);
	
	this.fpsAvg = 0;
	this.fpsAvgTs = 7 + (Date.now() / 1000) | 0;
	
	var ammo = [];
	if(this.map.ammo)
		for(var k = 0; k < this.map.ammo.length; k++)
		{
			ammo[k] = new Ammo(this.map.ammo[k].weapon, this.map.ammo[k].x + 0.5, this.map.ammo[k].y + 0.5, k);

			if(ammo[k].itemType && ammo[k].itemType.special == "redFlag")
			{
				this.redFlag = ammo[k];
				this.redFlag.currentX = parseFloat(d[7]);
				this.redFlag.currentY = parseFloat(d[8]);
			}

			if(ammo[k].itemType && ammo[k].itemType.special == "blueFlag")
			{
				this.blueFlag = ammo[k];
				this.blueFlag.currentX = parseFloat(d[9]);
				this.blueFlag.currentY = parseFloat(d[10]);
			}

			this.addToObjectsToDraw(ammo[k]);
		}
	
	var splitMsg = str.split("%split%");
	// var splitMsg = str.split("$%split%"); ?????
	
	if(splitMsg[6])
	{
		var corpses = splitMsg[6].split("$");
		for(var i = 1; i < corpses.length; i += 3)
		{
			var x = corpses[i] / CONST.TRANSMUL;
			var y = corpses[i + 1] / CONST.TRANSMUL;

			this.addCorpses(new Corpse(corpses[i + 2], x, y, 0, false, (Math.random() > 0.5) ? 1 : 0));
		}
	}
	
	this.players = [];
	this.zombies = [];
	
	var player_inc = 28;
	// var player_inc = 24; replay mode 3 ?!?
	if(this.replayMode && playingReplayVersion == 1)
		player_inc = 22;
	else if(this.replayMode && playingReplayVersion == 2)
		player_inc = 23;
	
	var p = splitMsg[1].split("$");
	
	for(var i = 0; i < p.length - 5; i += player_inc)
	{
		var x = p[i + 1] / CONST.TRANSMUL;
		var y = p[i + 2] / CONST.TRANSMUL;
		var x0 = p[i + 9] / CONST.TRANSMUL;
		var y0 = p[i + 10] / CONST.TRANSMUL;
		var isHumanZombie = p[i + 22] == "1";
		var isFakeCorpse = p[i + 23] == "1";
		
		this.players.push(new Player(p[i], x, y, p[i + 3], p[i + 4], p[i + 5], p[i + 6], p[i + 7], p[i + 8], x0, y0, p[i + 11], p[i + 12], p[i + 13], p[i + 14], p[i + 15],
			p[i + 16], p[i + 17], p[i + 18], p[i + 19], p[i + 20], p[i + 21], isHumanZombie, isFakeCorpse, p[i + 24], p[i + 25], p[i + 26], p[i + 27]));
	}
	
	var z = splitMsg[2].split("$");
	for(var i = 0; i < z.length - 5; i += 11)
	{
		var x = z[i + 1] / CONST.TRANSMUL;
		var y = z[i + 2] / CONST.TRANSMUL;
		var x0 = z[i + 4] / CONST.TRANSMUL;
		var y0 = z[i + 5] / CONST.TRANSMUL;
		
		this.zombies.push(new Zombie(z[i], x, y, z[3], x0, y0, z[6], z[7], z[8], z[9], 0, z[10]));
	}

	var itms = splitMsg[3].split("$");
	for(var i = 0; i < itms.length - 1; i += 2)
	{
		for(var k = 0; k < ammo.length; k++)
			if(ammo[k].id == itms[i])
			{
				ammo[k].isActive = false;
				ammo[k].respawnAt = this.ticksCounter + parseInt(itms[i + 1]) - 2;
				k = ammo.length;
			}
	}

	var obs = splitMsg[4].split("$");
	for(var i = 0; i < obs.length - 5; i += 10)
		this.objects.push(new Object_(obs[i], this.getPlayerFromID(obs[i + 4]), abilities[obs[i + 3]], obs[i + 1], obs[i + 2], obs[i + 5], obs[i + 6], obs[i + 7], obs[i + 8], obs[i + 9]));

	if(splitMsg[5])
	{
		var mobs = splitMsg[5].split("$");
		for(var i = 0; i < mobs.length - 5; i += 7)
		{
			var x = mobs[i + 1] / CONST.TRANSMUL;
			var y = mobs[i + 2] / CONST.TRANSMUL;
			var x0 = mobs[i + 3] / CONST.TRANSMUL;
			var y0 = mobs[i + 4] / CONST.TRANSMUL;
			var hp = parseFloat(mobs[i + 6]);
			this.movableObjects.push(new MovableObject(mobs[i], x, y, x0, y0, tileTypes[mobs[i + 5]], hp));
		}
	}
	
	if(splitMsg[7])
		this.voterId = splitMsg[7];
	
	if(!this.replayMode)
	    F$('rankInGame').show();
	
	if(d[11] != -1 && this.redFlag)
	{
		this.redFlag.carriedBy = this.getPlayerFromID(d[11]);
		this.redFlag.isActive = false;
	}
	
	if(d[12] != -1 && this.blueFlag)
	{
		this.blueFlag.carriedBy = this.getPlayerFromID(d[12]);
		this.blueFlag.isActive = false;
	}
	
	this.id = d[13];
	
	// preStore stuff
	var time = Date.now();
	
	if(preStore.pid && preStore.pid.time + 5000 > time)
		this.setPlayingPlayerID(preStore.pid.value);
	
	for(var i = 0; preStore.newPlayers.length; i++)
		if(preStore.newPlayers[i].time + 5000 > time)
			this.newPlayer(preStore.newPlayers[i].value);
	
	for(var i = 0; preStore.newZombies.length; i++)
		if(preStore.newZombies[i].time + 5000 > time)
			this.newZombie(preStore.newZombies[i].value);
	
	preStore = {
		newPlayers: [],
		newZombies: [],
		pid: null
	};
	
	this.refreshUIs();
	
	if(document.getElementById("rankTableTitle"))
		document.getElementById("rankTableTitle").innerHTML = this.map.name;
	
	if(this.miniMap)
		this.miniMap.show(this);
	
	if(!this.mapWelcome && !this.editingMode)
	{
		this.interface_.addMsg("[" + slayOne.widgets.lang.get("game.msg.chat.tip") + "]", "#8CD882");
		
		if(this.type.startMsg)
			this.interface_.addMsg(this.type.startMsg, "#8CD882");
	}
};

Game.prototype.emote = function(splitMsg)
{
	var p = this.getPlayerFromID(splitMsg[1]);

	if(p && emotes[splitMsg[2]])
		p.emote(emotes[splitMsg[2]]);
};

Game.prototype.playingPlayerIsNotStunned = function()
{
	return this.playingPlayer && this.playingPlayer.bouncePoints.length == 0;
};

Game.prototype.getGrenadeOrProjectileById = function(id)
{
	for(var i = 0; i < this.projectiles.length; i++)
		if(this.projectiles[i].id == id)
			return this.projectiles[i];

	for(var i = 0; i < this.grenades.length; i++)
		if(this.grenades[i].id == id)
			return this.grenades[i];

	return null;
};

Game.prototype.getNextFreeField = function(x, y, max, x0, y0)
{
	x = Math.floor(x);
	y = Math.floor(y);

	for(var i = 0; i < nbs.length; i++)
	{
		var x_ = x + nbs[i].x;
		var y_ = y + nbs[i].y;

		if(this.getFieldPath(x_, y_) == 10 && (!max || Math.sqrt(Math.pow(x_ + 0.5 - x0, 2) + Math.pow(y_ + 0.5 - y0, 2)) <= max))
			return {x: x_ + 0.5, y: y_ + 0.5};
	}
	
	return null;
};

Game.prototype.receiveUpdate = function(data)
{
	var mode = "normal";
	var step = 5;
	
	var ticksCounter = this.ticksCounter < 0 ? this.roundTime : this.ticksCounter;
	var now = Date.now();
	if(!this.lastSecondTime || now - this.lastSecondTime > 1000)
	{
		this.tps = ticksCounter - this.lastSecondCounter;
		this.lastSecondCounter = ticksCounter;
		this.lastSecondTime = now;
	}
	
	if(this.ticksCounter == -1 && this.isTutorial())
		this.interface_.setMainKillMsg(F_("game.die"), "#36FF36", "textInGreen");
	
	// update leave game window
	if(window.leavingGame)
	{
		var secondsLeft = Math.max(Math.floor((window.leaveGameLeftTicks - this.ticksCounter) / 20 + 5.9), 0);
		slayOne.viewHelpers.getFloatTip(window.leaveGameFloatTip).setContent(slayOne.widgets.lang.get("msg.leave_game", {
			seconds: secondsLeft
		}));
	}

	var modeList = [];
	var modeListUp = false;
	for(var i = 2, j = data.length; i < j; i += step)
	{
		var row = data[i];
		if(!Number.isInteger(row) && this.updList[row])
		{
			i++;
			mode = row;
			step = this.updList[row];
		}
		
		if(GameUpdateMode[mode])
			GameUpdateMode[mode](this, data[i], data, i);
	}
	
	if(this.ticksCounter >= 0)
	{
		this.drawFilter('projectiles', true);
		this.drawFilter('grenades', true);
		this.drawFilter('effects', true);
		this.drawFilter('floatingTexts');

        var playerChanged = false;

		var _this = this;
		this.drawFilter('players', function(row) {
			_this.objectsToDraw.erease(row);
			playerChanged = true;
		});

		this.drawFilter('corpses', ticksCounter, true);

		if(playerChanged)
			this.refreshUIs();

		this.drawFilter('zombies', true);
		this.drawFilter('movableObjects', true);
		this.drawFilter('objects', function(row) {
			row.die();
		});

		for(var o of this.objectsToDraw)
			if(!o.isActive && o.isAmmo && o.respawnAt <= this.ticksCounter && !o.carriedBy)
			{
				o.isActive = true;
				o.createSpawnEffect();
			}

		if(this.ticksCounter % 20 == 17)
		{
			var th = this.type.humans_souls_per_sec;
			var tz = this.type.zombies_souls_per_sec;
			if(th || tz)
			{
				for(var p of this.players)
				{
					if(p.dieAt)
						continue;
					p.setSouls(p.souls + (p.isHumanZombie ? th : tz));
				}
			}
		}
	}

	// sort drawable units
	if(!this.fastForward)
		this.sortObjectsToDraw();

	if(this.ticksCounter >= 0)
	{
		// graphic stuff
		if(!this.fastForward)
		{
			this.torchesEmitFire();
			this.teleporterPillars();
			this.updateFairies(ticksCounter);
		}

		if(this.playingPlayer)
		{
			this.playingPlayerEnergy = Math.min(this.playingPlayerEnergy + this.playingPlayer.energyRegeneration + CONST.ENERGY_REG_RATE, 100);

			if(this.playingPlayer.isInvisible)
				this.playingPlayerEnergy = Math.max(this.playingPlayerEnergy + this.playingPlayer.invisEnergyRate, 0);

			if(this.mouseDowned && !this.mouseDownSent && this.playingPlayer.isShootable())
				this._mouseDown();

			if(this.fire2Downed && !this.fire2DownSent && this.playingPlayer.isShootable())
				this._fire2Down();
		}
	}

	this.ticksCounter = data[1] !== undefined ? parseInt(data[1]) : (this.ticksCounter + 1);

	if(this.roundTime > 0 && this.ticksCounter == this.roundTime) // round end
		this.roundEnd();

	if(this.ticksCounter == -1)
	{ // new round start
		// this.roundStart();
	}
	else
		lastUpdate = now;
	
	if(this.ticksCounter % 50 == this.pingRandomizer)
	{
		network.send("ping");
		network.lastTimePingSent = now;
	}
	
	if(this.type.lives && (this.ticksCounter == 40 || this.ticksCounter == 60 || this.ticksCounter == 80))
		soundManager.playSound(SOUND.TICK);
	
	if(this.type.lives && this.ticksCounter == 100)
		soundManager.playSound(SOUND.LADDER_GONG);
};

Game.prototype.sortObjectsToDraw = function()
{
	this.objectsToDraw.sort((a, b) => {
		var ya = a.getYDrawingOffset();
		var yb = b.getYDrawingOffset();
		if(ya != ya)
			ya = -10;
		
		if(yb != yb)
			yb = -10;
		
		if(ya === yb)
			return 0;
		
		return ya > yb ? 1 : -1;
	});
}

Game.prototype.initMap = function(map)
{
	this.tiles = [];
	for(var row of map.tiles) {
		var tile = createTile(row);
		this.tiles.push(tile);
		if (tile.type.isTeleporter) {
			this.teleporters.push({
				x: tile.x + 0.5,
				y: tile.y + 0.5
			});
		}
	}

	this.groundTiles = [];
	for (var row of map.groundTiles) {
		var tile = createTile(row);
		this.groundTiles.push(tile);
		if (tile.type.isTeleporter) {
			this.teleporters.push({
				x: tile.x + 0.5,
				y: tile.y + 0.5
			});
		}
	}

	if (!map.noBorder) {
		this.createDefaultBorder();
	}

	this.noGridTiles = [];
	if (map.noGridTiles) {
		for (var row of map.noGridTiles) {
			var tile = createTile(row);
			new Tile(tile.x, tile.y, tile.type, this);
		}
	}
};

Game.prototype.torchesEmitFire = function() {

	if(this.isLowGraphicEffect)
		return;

	for(var t of this.torches)
	{
		if(this.ticksCounter == 1)
			new Sprite({
				x: t.x + 0.5 + t.offsetX,
				y: t.y + 0.3 + t.offsetY,
				img: imgCoords.fire4,
				scaleFunction: () => { return 1 + Math.sin(this.ticksCounter * 0.4) * 0.1; },
				age: 99999999,
				xFunction: () => { return Math.sin(this.ticksCounter * 0.5) * 0.02; },
				yFunction: () => { return Math.sin(this.ticksCounter * 0.7324) * 0.0223; },
				zFunction: () => { return 1.1; }
			});

		if(t.x + 5 >= this.cameraX && t.y + 5 >= this.cameraY && t.x - 5 <= this.cameraX2 && t.y - 5 <= this.cameraY2)
		{
			if(Math.random() < 0.02) // flare
				new Flare(t.x + 0.5 + t.offsetX, t.y + t.offsetY, 1.2);

			if(t.nextEmit <= this.ticksCounter)
			{
				t.nextEmit = this.ticksCounter + graphics[graphicSettings].torchEmitTime + Math.floor(Math.random() * 2);

				new Sprite({
					x: t.x + 0.5 + Math.random() * 0.2 - 0.1 + t.offsetX,
					y: t.y + 0.3 + Math.random() * 0.2 + t.offsetY,
					img: imgCoords["fire" + (Math.floor(Math.random() * 2) + 2)],
					scaleFunction: (age) => { return -1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9; },
					age: Math.random() * 10 + 35,
					zFunction: (age) => { return 1.1 + age * 0.02; }
				});

				new Sprite({
					x: t.x + 0.5 + Math.random() * 0.2 - 0.1 + t.offsetX,
					y: t.y + Math.random() * 0.2 + t.offsetY,
					img: imgCoords.light_yellow,
					scaleFunction: (age) => { return (-1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9) * 4.3; },
					alphaFunction: (age) => { return Math.max((-1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9) * 3.7, 0) * 0.012; },
					age: Math.random() * 10 + 35,
					zFunction: (age) => { return 0.8 + age * 0.02; }
				});
			}
		}
	}
}

Game.prototype.updateFairies = function(ticksCounter)
{
	if(this.isLowGraphicEffect)
		return;

	for(var i = this.fairies.length - 1; i >= 0; i--)
		if(!this.fairies[i].update(ticksCounter))
			this.fairies.splice(i, 1);

	var countFairies = (this.map.x * this.map.y) / 9;
	while(this.fairies.length < countFairies)
		this.fairies.push(new Fairy(Math.random() * this.map.x, Math.random() * this.map.y));
};

Game.prototype.teleporterPillars = function()
{
	// teleporter pillars
	if(this.ticksCounter % 3 == 1)
		for(var k = 0; k < this.teleporters.length; k++)
		{
			var t = this.teleporters[k];
			if(t.x + 3 >= this.cameraX && t.y + 3 >= this.cameraY && t.x - 3 <= this.cameraX2 && t.y - 3 <= this.cameraY2)
			{
				var randomAngle = Math.random() * Math.PI * 2;
				var rand = Math.random() * 0.7;

				new Sprite({
					x: t.x + Math.cos(randomAngle) * rand,
					y: t.y - 0.3 + Math.sin(randomAngle) * rand,
					z: Math.random(),
					img: imgCoords.particleWhite,
					scaleFunction: function(age) { return this.scale_; },
					scale_: Math.random() * 2 + 2,
					z_: 0.04 + Math.random() * 0.05,
					zFunction: function(age) { return age * this.z_; },
					alphaFunction: function(age) { return Math.min(age * 0.1, 0.7, this.ticksLeft * 0.05); },
					age: 26
				});
			}
		}

	// teleporter pillars 1.5
	if(this.ticksCounter % 8 == 1)
		for(var k = 0; k < this.teleporters.length; k++)
		{
			var t = this.teleporters[k];
			if(t.x + 3 >= this.cameraX && t.y + 3 >= this.cameraY && t.x - 3 <= this.cameraX2 && t.y - 3 <= this.cameraY2)
			{
				var randomAngle = Math.random() * Math.PI * 2;
				var rand = Math.random() * 0.7;

				new Sprite({
					x: t.x + Math.cos(randomAngle) * rand * 0.3,
					y: t.y - 0.3 + Math.sin(randomAngle) * rand * 0.3,
					z: Math.random(),
					img: imgCoords.particlePurple,
					scaleFunction: function(age) { return this.scale_; },
					scale_: Math.random() * 2 + 2,
					z_: 0.04 + Math.random() * 0.05,
					zFunction: function(age) { return age * this.z_ * 0.5; },
					xFunction: function(age) { return Math.cos((age + this.offset_) * 0.2) * this.radius_; },
					yFunction: function(age) { return Math.sin((age + this.offset_) * 0.2) * this.radius_; },
					alphaFunction: function(age) { return Math.min(age * 0.1, 0.4, this.ticksLeft * 0.05); },
					radius_: Math.random() * 0.3 + 0.3,
					offset_: Math.random() * 10,
					age: 41
				});
			}
		}

	// teleporter pillars 2
	if(this.ticksCounter % 5 == 1)
		for(var k = 0; k < this.teleporters.length; k++)
		{
			var t = this.teleporters[k];
			if(t.x + 3 >= this.cameraX && t.y + 3 >= this.cameraY && t.x - 3 <= this.cameraX2 && t.y - 3 <= this.cameraY2)
			{
				var randomAngle = Math.random() * Math.PI * 2;
				var rand = Math.random() * 0.7;

				new Sprite({
					x: t.x + Math.cos(randomAngle) * rand,
					y: t.y - 1.1 + Math.sin(randomAngle) * rand,
					z: Math.random(),
					img: imgCoords.pillar_of_light,
					scaleFunction: function(age) { return this.scale_ + age * 0.04; },
					alphaFunction: function(age) { return Math.min(age * 0.05, 0.5, this.ticksLeft * 0.05); },
					scale_: Math.random() * 0.2 + 2,
					z_: 0.01 + Math.random() * 0.02,
					zFunction: function(age) { return age * this.z_; },
					age: 26
				});
			}
		}
};

Game.prototype.roundStart = function()
{
	soundManager.playSound(SOUND.START);

	this.interface_ = new Interface(this.map);

	if(this.type.team)
	{
		this.scoreTeam1 = 0;
		this.scoreTeam2 = 0;
		F$("rankInGame").refreshTeamScore();
	}

	for(var i = 0; i < this.projectiles.length; i++)
	{
		this.objectsToDraw.erease(this.projectiles[i]);
		this.projectiles.splice(i, 1);
		i--;
	}

	for(var i = 0; i < this.grenades.length; i++)
	{
		this.objectsToDraw.erease(this.grenades[i]);
		this.grenades.splice(i, 1);
		i--;
	}

	for(var i = 0; i < this.effects.length; i++)
	{
		this.objectsToDraw.erease(this.effects[i]);
		this.effects.splice(i, 1);
		i--;
	}

	this.floatingTexts = [];

	for(var i = 0; i < this.objects.length; i++)
		this.objects[i].die();

	this.objects = [];

	for(var i = 0; i < this.players.length; i++)
	{
		if(this.players[i].removeAt)
		{
			this.objectsToDraw.erease(this.players[i]);
			this.players.splice(i, 1);
			i--;
		}
		else
		{
			if(this.players[i].isHumanZombie)
				this.players[i].turnHuman();
			this.players[i].init();
			this.players[i].weapon = weapons[0];
			this.players[i].hp = this.players[i].maxHP;
			this.players[i].armor = 0;
			this.players[i].setKills(0);
			this.players[i].setDeaths(0);
			this.players[i].setSouls(0);
			this.players[i].setElo(0);
			this.players[i].createSpawnEffect(this.playingPlayer == this.players[i]);
		}
	}

	for(var i = 0; i < this.objectsToDraw.length; i++)
		if(this.objectsToDraw[i].isAmmo)
			this.objectsToDraw[i].isActive = true;

	this.refreshUIs();

	for(var i = 0; i < this.zombies.length; i++)
		this.objectsToDraw.erease(this.zombies[i]);

	for(var i = 0; i < this.corpses.length; i++)
		this.objectsToDraw.erease(this.corpses[i]);

	for(var i = 0; i < this.movableObjects.length; i++)
		this.objectsToDraw.erease(this.movableObjects[i]);

	this.zombies = [];
	this.movableObjects = [];
	this.corpses = [];

	// create new default movable objects
	var id_counter_mobs = 90000;

	// check all tiles
	for(var i = 0; i < this.map.tiles.length; i++)
	{
		tile = createTile(this.map.tiles[i]);
		type = tile.type;

		if(type && type.movable)
			this.movableObjects.push(new MovableObject(id_counter_mobs++, tile.x + 0.5, tile.y + 0.5, tile.x + 0.5, tile.y + 0.5, type));
	}

	if(this.redFlag)
	{
		this.redFlag.currentX = this.redFlag.x;
		this.redFlag.currentY = this.redFlag.y;

		if(this.redFlag.carriedBy)
		{
			this.redFlag.carriedBy = null;
			this.addToObjectsToDraw(this.redFlag);
		}
	}
	
	if(this.blueFlag)
	{
		this.blueFlag.currentX = this.blueFlag.x;
		this.blueFlag.currentY = this.blueFlag.y;

		if(this.blueFlag.carriedBy)
		{
			this.blueFlag.carriedBy = null;
			this.addToObjectsToDraw(this.blueFlag);
		}
	}
	
	this.resetPlayingPlayerStats();
	
	for(var i = 0; i < this.torches.length; i++)
		this.torches[i].nextEmit = 1;
	
	for(var i = 0; i < this.objectsToDraw.length; i++)
		if(this.objectsToDraw[i].lastSpawnTick)
			this.objectsToDraw[i].lastSpawnTick = -99999;
	
	this.setNextMaps({});
	F$('rankInGame').hide();
	F$('result').hide();
	
	// hide ad div (in case it was shown)
	slayOne.viewHelpers.hideAd();
	uiManager.hideDeathScreen();
};

Game.prototype.roundEnd = function()
{
	var playerWithTopScore = null;
	var topScore = 0;
	
	if(this.type.winningCondition && !this.type.team)
		for(var i = 0; i < this.players.length; i++)
			if(this.players[i][this.type.winningCondition] > topScore)
			{
				topScore = this.players[i][this.type.winningCondition];
				playerWithTopScore = this.players[i];
			}
	
	if(this.isTutorial())
	{
		this.victoryMsg = F_('tutorial.complete');
		soundManager.playSound(SOUND.WIN);
	}
	
	else if(this.type.coopZombieMode)
	{
		var countAliveHumans = 0;
		var humanPlayerName = "";
		for(var i = 0; i < this.players.length; i++)
			if(!this.players[i].isHumanZombie && !this.players[i].dieAt)
			{
				countAliveHumans++;
				humanPlayerName = this.players[i].name;
			}

		if(countAliveHumans == 1)
			this.victoryMsg = humanPlayerName + " wins";

		else if(countAliveHumans == 0)
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.win", {
				winnerName: slayOne.widgets.lang.get("game.stats.zombies.name")
			});

		else if(countAliveHumans > 0)
		{
			// get human with most souls
			var souls = -999;
			var pl = "";
			for(var i = 0; i < this.players.length; i++)
				if(!this.players[i].isHumanZombie && !this.players[i].dieAt && this.players[i].souls > souls)
				{
					pl = this.players[i];
					souls = pl.souls;
				}

			this.victoryMsg = pl.name + " wins";
		}

		else
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.win", {
				winnerName: slayOne.widgets.lang.get("game.stats.zombies.name")
			});

		if(!this.playingPlayer || (this.playingPlayer.team == 1 && countAliveHumans > 0) || (this.playingPlayer.team == 2 && countAliveHumans == 0))
			soundManager.playSound(SOUND.WIN);

		else
			soundManager.playSound(SOUND.LOSE);
	}

	else
	{
		if(this.type.team && this.scoreTeam1 > this.scoreTeam2)
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.win", {
				winnerName: slayOne.widgets.lang.get("game.stats.team1.name")
			});

		else if(this.type.team && this.scoreTeam2 > this.scoreTeam1)
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.win", {
				winnerName: slayOne.widgets.lang.get("game.stats.team2.name")
			});

		else if(this.type.team)
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.draw");

		else if(playerWithTopScore)
			this.victoryMsg = slayOne.widgets.lang.get("game.msg.win_with_reason", {
				winnerName: playerWithTopScore.name,
				reason: topScore + " " + slayOne.widgets.lang.get(this.type.winningConditionLabel)
			});

		else
			this.victoryMsg = "";

		if((this.type.team && this.playingPlayer && this.playingPlayer.team == 1 && this.scoreTeam1 > this.scoreTeam2) || playerWithTopScore == this.playingPlayer)
			soundManager.playSound(SOUND.WIN);

		else if(this.type.team && this.playingPlayer.team == 1 && this.scoreTeam2 > this.scoreTeam1)
			soundManager.playSound(SOUND.LOSE);

		else
			soundManager.playSound(SOUND.END);
	}

	F$('rankInGame').show(this.playingPlayerID);
};

Game.prototype.isTutorial = function()
{
	return this.map && this.map.special == "tutorial1";
};

Game.prototype.setNextMaps = function(nextMaps)
{
	this.nextMaps = nextMaps;
	if(F$('rankInGame_mapList') instanceof HTMLElement)
		F$('rankInGame_mapList').maps = Object.values(nextMaps);
};

Game.prototype.voteNextMap = function(mapId,voterId)
{
	var map = this.nextMaps[mapId];
	if(map)
	{
		map.votes++;
		
		if(voterId == this.voterId)
			map.voted = true;
		
		F$('rankInGame_mapList').render();
	}
};

Game.prototype.getFlagText = function()
{
	if(!this.redFlag || !this.blueFlag)
		return null;

	for(var i = 1; i <= 2; i++)
		if(this.playingPlayer && this.playingPlayer.team == i)
		{
			var ownFlag = i == 1 ? this.redFlag : this.blueFlag;
			var enemyFlag = i == 2 ? this.redFlag : this.blueFlag;

			if(ownFlag && ownFlag.carriedBy)
				return "game.msg.flag_enemy_has";

			if(ownFlag && (ownFlag.currentX != ownFlag.x || ownFlag.currentY != ownFlag.y))
				return "game.msg.flag_not_home";

			if(enemyFlag && enemyFlag.carriedBy == this.playingPlayer)
				return "game.msg.flag_you_have";

			if(enemyFlag && enemyFlag.carriedBy && enemyFlag.carriedBy != this.playingPlayer)
				return "game.msg.flag_ally_has";

			return "game.msg.flag_default";
		}
};

Game.prototype.getZombieCoopText = function()
{
	if(this.ticksCounter < this.type.convertTime)
		return slayOne.widgets.lang.get("game.msg.zombie_prep", {
			sec: Math.floor((this.type.convertTime - game.ticksCounter) / 20)
		});

	if(this.playingPlayer && this.playingPlayer.isHumanZombie)
	{
		var num = 2 - this.playingPlayerZombieKillStreak;

		if(this.cureTick)
			return slayOne.widgets.lang.get("game.msg.zombie_cure");
		
		else if(num > 0)
			return slayOne.widgets.lang.get("game.msg.zombie_zombie", {
				num: num
			});

		return '';
	}

	var human = 0;
	var zombie = 0;
	for(var i in this.players)
	{
		var p =  this.players;
		if(!p)
			continue;
		
		if(this.players[i].isHumanZombie)
			zombie++;
		else if (this.players[i].id)
			human++;
	}

	return slayOne.widgets.lang.get("game.msg.zombie_human", {
		human: human,
		zombie: zombie
	});
};

Game.prototype.getClosestAlly = function(x, y, range)
{
	var bestPlayer = null;
	var bestDist = range;

	var players = this.players.concat(this.zombies);
	for(var i = 0; i < players.length; i++)
	{
		var p = players[i];
		if(p != this.playingPlayer && !p.dieAt && p.team != 0 && p.team == this.playingPlayer.team)
		{
			var dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
			if(dist < bestDist)
			{
				bestPlayer = p;
				bestDist = dist;
			}
		}
	}

	return bestPlayer;
};

Game.prototype.refreshLockedPlayer = function(x, y)
{
	var bestPlayer = null;
	var bestDist = 2;

	var players = this.players.concat(this.zombies);
	for(var i = 0; i < players.length; i++)
	{
		var p = players[i];
		if(p != this.playingPlayer && !p.dieAt && !p.isInvisible && (p.team == 0 || p.team != this.playingPlayer.team))
		{
			var dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
			if(dist < bestDist)
			{
				bestPlayer = p;
				bestDist = dist;
			}
		}
	}

	if(bestPlayer)
		this.targetLockedPlayer = bestPlayer;
};

Game.prototype.newBeam1 = function(data)
{
	var shooter = this.getPlayerFromID(data[1]);

	this.projectiles.push(new Beam(shooter, null, data[2], data[3], weapons[data[4]]));
	this.playerShoots(shooter, data[4], data[5]);
};

Game.prototype.newBeam2 = function(data)
{
	var shooter = this.getPlayerFromID(data[1]);
	var victim = this.getPlayerFromID(data[2]);
	var wpn = weapons[data[4]];

	if(!shooter || !victim)
		return;

	var victimOldHP = victim.hp;
	var shooterOldHP = shooter.hp;
	victim.hp = parseFloat(data[3]);
	shooter.hp = parseFloat(data[5]);

	victim.hpGlideAmount = victim.hp - victimOldHP;
	victim.hpGlideStart = this.ticksCounter;
	victim.hpGlideEnd = this.ticksCounter + wpn.lifetime;

	shooter.hpGlideAmount = shooter.hp - shooterOldHP;
	shooter.hpGlideStart = this.ticksCounter;
	shooter.hpGlideEnd = this.ticksCounter + wpn.lifetime;

	if(shooter.hp > shooterOldHP && shooter.x + 3 >= this.cameraX && shooter.y + 3 >= this.cameraY && shooter.x - 3 <= this.cameraX2 && shooter.y - 3 <= this.cameraY2 && !this.fastForward)
		new Sprite({
			x: shooter.x + Math.random() * 0.5 - 0.25,
			y: shooter.y + 0.5 + Math.random() * 0.5,
			img: imgCoords.heal,
			scaleFunction: (age) => { return -1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9; },
			age: Math.random() * 10 + 35,
			xR: Math.random() * 0.1 - 0.05,
			xFunction: function(age) { return Math.pow(age, 0.7) * this.xR; },
			zFunction: (age) => { return 1.4 + age * 0.02; }
		});

	if(victim.hp > victimOldHP && victim.x + 3 >= this.cameraX && victim.y + 3 >= this.cameraY && victim.x - 3 <= this.cameraX2 && victim.y - 3 <= this.cameraY2 && !this.fastForward)
		new Sprite({
			x: victim.x + Math.random() * 0.5 - 0.25,
			y: victim.y + 0.5 + Math.random() * 0.5,
			img: imgCoords.heal,
			scaleFunction: (age) => { return -1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9; },
			age: Math.random() * 10 + 35,
			xR: Math.random() * 0.1 - 0.05,
			xFunction: function(age) { return Math.pow(age, 0.7) * this.xR; },
			zFunction: (age) => { return 1.4 + age * 0.02; }
		});

	this.projectiles.push(new Beam(shooter, victim, null, null, wpn));
	this.playerShoots(shooter, data[4]);
};

Game.prototype.playerShoots = function(p, weaponID, remainingBullets)
{
	var wpn = weapons[weaponID];
	
	if(wpn.dummyFor)
	{
		wpn = weapons[wpn.dummyFor];
		weaponID = wpn.id;
	}
	
	if(p && !p.isZombie)
	{
		p.lastTickFire = this.ticksCounter;
		p.noInvisUntil = this.ticksCounter + 40;
		p.invincibleUntil = -99999;
	}

	if(p && p == this.playingPlayer)
	{
		this.playingPlayerClips[weaponID]--;
		this.playingPlayer.weaponCooldowns[weaponID] = this.playingPlayerClips[weaponID] > 0 ? wpn.cooldown : 0;

		if(typeof remainingBullets !== "undefined")
			this.playingPlayerClips[weaponID] = parseFloat(remainingBullets);
	}
};

Game.prototype.newProjectileMulti = function(data)
{
	var weapon = weapons[data[3]];
	
	for(var i = 5; data[i]; i += 5)
		this.projectiles.push(new Projectile(data[i + 1], data[i + 2], data[i + 3], data[i + 4], data[1], data[i], weapon, false, data[4], true));
	
	if(data[4] >= 0)
		this.playerShoots(this.getPlayerFromID(data[2]), data[3], data[4]);
	
	var x = parseFloat(data[6]);
	var y = parseFloat(data[7]);
	
	var vecX = parseFloat(data[8]);
	var vecY = parseFloat(data[9]);
	
	if(x + 4 >= this.cameraX && y + 4 >= this.cameraY && x - 4 <= this.cameraX2 && y - 4 <= this.cameraY2 && !this.fastForward)
	{
		if(weapon.soundName)
			soundManager.playSound(SOUND[weapon.soundName], x, y, weapon.volume ? weapon.volume : 1);

		if(weapon.spawnBullets && graphics[graphicSettings].spawnBullets)
			new Bullet(x, y);

		for(var i = 1; i < 5; i++)
		{
			new Sprite({
				x: x + Math.random() * 0.3 - 0.15,
				y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
				img: imgCoords.dust1,
				scaleFunction: function(age) { return this.scale_ - age * 0.01; },
				scale_: Math.random() + 1.1,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
				age: (2.7 + Math.random()) * 20,
				x_: vecX * 2.25,
				y_: vecY * 2.25,
				i_: i / 5,
				xFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
				yFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
			});
		}

		for(var i = 1; i < 3; i++)
			new Sprite({
				x: x + vecX + Math.random() * 0.3 - 0.15,
				y: y + vecY - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
				img: imgCoords.dust1,
				scaleFunction: function(age) { return this.scale_ - age * 0.01; },
				scale_: Math.random() + 1.1,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
				age: (2.7 + Math.random()) * 20,
				x_: -vecY * 2.25,
				y_: vecX * 2.25,
				i_: i / 5,
				xFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
				yFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
			});

		for(var i = 1; i < 3; i++)
			new Sprite({
				x: x + vecX + Math.random() * 0.3 - 0.15,
				y: y + vecY - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
				img: imgCoords.dust1,
				scaleFunction: function(age) { return this.scale_ - age * 0.01; },
				scale_: Math.random() + 1.1,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
				age: (2.7 + Math.random()) * 20,
				x_: vecY * 2.25,
				y_: -vecX * 2.25,
				i_: i / 5,
				xFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
				yFunction: function(age) { return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
			});
	}
};

Game.prototype.newObject = function(data)
{
	var p = this.getPlayerFromID(data[5]);
	var ab = abilities[data[4]];

	this.objects.push(new Object_(data[1], p, ab, data[2], data[3], data[8], data[8], data[7], data[9], null, data[10], data[11]));

	if(p == this.playingPlayer)
	{
		this.playingPlayerEnergy -= ab.energy;
		this.lastAbilityUses[pl_active_abilities[0] == ab ? 0 : 1] = this.ticksCounter;
	}

	if(ab.type == "throw")
		p.lastThrow = this.ticksCounter;

	if(ab.type != "throw" && p.x + 2 >= this.cameraX && p.y + 2 >= this.cameraY && p.x - 2 <= this.cameraX2 && p.y - 2 <= this.cameraY2 && !this.fastForward)
	{
		for(var k = 0; k < 9; k++)
		{
			var randomAngle = Math.random() * Math.PI * 2;
			var rand = Math.random() * 0.7;

			new Sprite({
				x: p.x + Math.cos(randomAngle) * rand,
				y: p.y - SHOT_HEIGHT + Math.sin(randomAngle) * rand,
				z: Math.random(),
				img: imgCoords.particleWhite,
				scaleFunction: function(age) { return this.scale_; },
				scale_: Math.random() * 2 + 2,
				z_: Math.random() * 0.09,
				zFunction: function(age) { return age * this.z_; },
				age: 15 + Math.random() * 10
			});
		}
	}
};

Game.prototype.newProjectile = function(data)
{
	var weapon = weapons[data[8]];

	if(weapon == weapons[2]) // flamethrower
	{
		var x = parseFloat(data[1]);
		var y = parseFloat(data[2]);

		if(x + 10 >= this.cameraX && y + 10 >= this.cameraY && x - 10 <= this.cameraX2 && y - 10 <= this.cameraY2 && !this.fastForward)
		{
			var vecX = parseFloat(data[3]);
			var vecY = parseFloat(data[4]);

			var len = Math.sqrt(vecX * vecX + vecY * vecY);

			vecX *= weapons[2].projectileSpeed / len;
			vecY *= weapons[2].projectileSpeed / len;

			new Sprite({
				x: x,
				y: y,
				img: imgCoords["fire" + (Math.floor(Math.random() * 3) + 2)],
				scaleFunction: (age) => { return 1.2 + age * 0.15; },
				r1: vecX,
				r2: vecY,
				age: weapons[2].lifetime,
				zFunction: (age) => { return SHOT_HEIGHT + age * 0.04; },
				xFunction: function(age) { return age * this.r1; },
				yFunction: function(age) { return age * this.r2; },
				dieOnCollision: true
			});

			if(graphics[graphicSettings].additionalFTFire)
				new Sprite({
					x: x,
					y: y,
					img: imgCoords["fire" + (Math.floor(Math.random() * 3) + 2)],
					scaleFunction: (age) => { return 1.2 + age * 0.15; },
					r1: vecX * (Math.random() * 0.2 + 0.9),
					r2: vecY * (Math.random() * 0.2 + 0.9),
					age: weapons[2].lifetime,
					zFunction: (age) => { return SHOT_HEIGHT; },
					xFunction: function(age) { return age * this.r1; },
					yFunction: function(age) { return age * this.r2; },
					dieOnCollision: true
				});

			new Sprite({
				x: x,
				y: y + SHOT_HEIGHT,
				img: imgCoords.light_yellow,
				scaleFunction: (age) => { return 4; },
				r1: vecX * (Math.random() * 0.2 + 0.9),
				r2: vecY * (Math.random() * 0.2 + 0.9),
				age: weapons[2].lifetime,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.1; },
				zFunction: (age) => { return SHOT_HEIGHT + age * 0.05; },
				xFunction: function(age) { return age * this.r1; },
				yFunction: function(age) { return age * this.r2; },
				dieOnCollision: true
			});

			if(graphics[graphicSettings].additionalFTFire)
				new Sprite({
					x: x,
					y: y,
					img: imgCoords.dust1,
					scaleFunction: (age) => { return 1 + age * 0.2; },
					r1: vecX * (Math.random() * 0.2 + 0.9),
					r2: vecY * (Math.random() * 0.2 + 0.9),
					age: weapons[2].lifetime,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.3; },
					zFunction: (age) => { return SHOT_HEIGHT + age * 0.05; },
					xFunction: function(age) { return age * this.r1; },
					yFunction: function(age) { return age * this.r2; },
					dieOnCollision: true
				});
		}
	}

	else
	{
		// heal wpn
		this.projectiles.push(new Projectile(data[1], data[2], data[3], data[4], data[5], data[6], weapon, data[9], data[10], false, data[7], data[12]));
		
		if(data[7] == this.playingPlayerID && weapon.isHeatSeeking2)
			this.playingPlayerCountActiveHeatseeking2Missiles++;
	}

	if(data[11] != "-1")
	{
		for(var i = 0; i < this.objects.length; i++)
			if(this.objects[i].id == data[11])
			{
				this.objects[i].shoot(0, 0, parseFloat(data[3]), parseFloat(data[4]));
				i = this.objects.length;
			}
	}
	else
		this.playerShoots(this.getPlayerFromID(data[7]), data[8], data[10]);
};

Game.prototype.newGrenade = function(data)
{
	var p = this.getPlayerFromID(data[8]);

	this.grenades.push(new Grenade(data[1], data[2], data[3], data[4], data[5], data[6], data[7], weapons[data[9]], p));

	if(data[10] != "-1")
	{
		for(var i = 0; i < this.objects.length; i++)
			if(this.objects[i].id == data[10])
			{
				this.objects[i].shoot(parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3]), parseFloat(data[4]));
				i = this.objects.length;
			}
	}
	else
		this.playerShoots(p, data[9]);
};

Game.prototype.newPlayer = function(data)
{
	var x = data[2] / CONST.TRANSMUL;
	var y = data[3] / CONST.TRANSMUL;
	var isHumanZombie = data[15] == "1";
	var p = new Player(data[1], x, y, data[4], data[5], data[6], 0, 0, null,
		x, y, data[7], data[8], false, data[9], data[10], data[11], data[12], 0,
		data[13], data[14], 0, isHumanZombie, null, null, data[16], data[17], data[18]);

	this.interface_.addMsg(slayOne.widgets.lang.get("game.msg.player_join", {
		playerName: p.name
	}), "#ACACAC");

	this.players.push(p);

	if(!this.playingPlayer)
		this.checkPlayingPlayer();

	if(this.ticksCounter >= 2)
		p.invincibleUntil = this.ticksCounter + CONST.SPAWN_INVINCIBILITY;

	p.createSpawnEffect();

	this.refreshUIs();
};

Game.prototype.newZombie = function(data)
{
	var x = data[2] / CONST.TRANSMUL;
	var y = data[3] / CONST.TRANSMUL;
	var z = new Zombie(data[1], x, y, data[4], x, y, data[5], data[6], data[7], data[8], data[9], data[10]);
	
	this.zombies.push(z);
	
	z.createSpawnEffect();
};

Game.prototype.setPlayingPlayerID = function(id)
{
	var id = parseInt(id);
	this.playingPlayerID = id;
	this.checkPlayingPlayer();
	F$('rankInGame').refreshPlaying();
};

Game.prototype.checkPlayingPlayer = function()
{
	if(game.iAmSpec)
		return;
	
	for(var p of this.players)
	{
		if(p.id !== this.playingPlayerID)
			continue;
		
		this.playingPlayer = p;
		
		this.resetPlayingPlayerStats();
		
		var tr = document.getElementById('tr_' + this.playingPlayerID);
		if(tr)
			tr.className = "playingPlayerTR";

		if(this.isTutorial())
			this.playingPlayerAbilities = getTutorialAbilityObj(abilities);
		
		else if(this.playingPlayer.isHumanZombie)
			this.playingPlayerAbilities = getDefaultZombieAbilityObj((playerData && playerData.authLevel >= 6) ? playerData.abilities : getDefaultAbilityObj(abilities), abilities);
		
		else
			this.playingPlayerAbilities = (playerData && playerData.authLevel >= 6) ? playerData.abilities : getDefaultAbilityObj(abilities);
		
		F$('rankInGame').hide();
		
		this.setActiveAbilities();
		
		break;
	}
};

Game.prototype.setActiveAbilities = function()
{
	pl_active_abilities = [];

	var k = 0;
	for(var ab of abilities)
	{
		if(ab.type != "passive" && this.playingPlayerAbilities[ab.id] && this.playingPlayerAbilities[ab.id].lvl > 0)
		{
			pl_active_abilities[k] = ab;
			k++;
			
			if(k > 1)
				return;
		}
	}
};

Game.prototype.corpseBounce = function(x, y, radius)
{
	var players = this.players.concat(this.zombies);

	for(var i = 0; i < players.length; i++)
		if(players[i].dieAt && !players[i].noCorpseBounce && players[i].z < 0.8 && Math.sqrt(Math.pow(players[i].x - x, 2) + Math.pow(players[i].y - y, 2)) <= radius)
		{
			var p = players[i];

			var vecX = p.x - x;
			var vecY = p.y - y;

			var vecH = Math.max((Math.min(Math.max(radius - Math.sqrt(vecX * vecX + vecY * vecY), 1.0), 1.8) + 0.2) * 0.2, 0.001);
			var speed = vecH * 2.5;

			var len = Math.sqrt(vecX * vecX + vecY * vecY);

			vecX *= speed / len;
			vecY *= speed / len;

			p.bouncePoints = createBounce2(p.x, p.y, vecX, vecY, vecH, this);
		}
};

Game.prototype.playerRespawns = function(data)
{
	this.getPlayerFromID(data[1]).respawn(data[2], data[3], data[4]);
	this.refreshUIs();
};

Game.prototype.playerLeaves = function(data)
{
	for(var i = 0; i < this.players.length; i++)
		if(this.players[i].id == data[1])
		{
			this.interface_.addMsg(slayOne.widgets.lang.get("game.msg.player_leave", {
				playerName: this.players[i].name
			}), "#ACACAC");
			this.players[i].die();
			this.players[i].removeAt = this.ticksCounter + 60;
			break;
		}
};

Game.prototype.projectileDies = function(data)
{
	for(var i = 0; i < this.projectiles.length; i++)
		if(this.projectiles[i].id == data[1])
		{
			this.projectiles[i].createDeathEffect(data[2], data[3], data[4]);
			if(!this.projectiles[i].dieAt && this.projectiles[i].playerID == this.playingPlayerID && this.projectiles[i].weapon.isHeatSeeking2)
				this.playingPlayerCountActiveHeatseeking2Missiles--;
			this.projectiles[i].dieAt = this.ticksCounter + 10;
			return;
		}
};

Game.prototype.hpUpdateObject = function(data)
{
	var attacker = this.getPlayerFromID(data[5]);

	var o = null;
	for(var i = 0; i < this.objects.length; i++)
		if(this.objects[i].id == data[1])
		{
			o = this.objects[i];
			o.hp = parseFloat(data[2]);
			o.hitUntil = this.ticksCounter + 2;

			if(attacker && attacker.isZombie)
				attacker.performHit(o);

			if(attacker && (attacker.isZombie || attacker.isHumanZombie))
				soundManager.playSound(SOUND.MECH_IMPACT, o.x, o.y, 0.7);

			if(o.hp <= 0)
			{
				o.die();
				this.objects.splice(i, 1);
			}

			i = this.objects.length;
		}

	if(data[3] == "true")
		for(var i = 0; i < this.projectiles.length; i++)
			if(this.projectiles[i].id == data[4])
			{
				this.projectiles[i].createHitEffect(o);
				return;
			}
};

Game.prototype.hpUpdate = function(data)
{
	var victim = this.getPlayerFromID(data[1]);
	var attacker = this.getPlayerFromID(data[7]);

	if(victim)
	{
		if(!victim.isMovableObject && attacker && (attacker.isZombie || attacker.isHumanZombie))
			attacker.performHit(victim);

		victim.hpUpdate(data[2], data[3], data[19], attacker);

		if(victim.invincibleUntil < this.ticksCounter)
		{
			victim.hitUntil = this.ticksCounter + 2;
			victim.lastHit = this.ticksCounter;
		}

		if(data.length > 9)
			this.playerDies(victim, attacker, data[5], data[9], data[6], data[10], data[11], data[12], data[13], data[14], data[15], data[16], data[17], data[18], data[19], data[20],
				data[21], data[22], data[23], data[24], data[25], data[26], data[27], data[28]);

		if(data[8] > 0 && attacker)
		{
			if(attacker['performLifesteal'])
				attacker.performLifesteal(parseFloat(data[8]));
			
			else
				console.warn("attacker no performLifesteal", attacker);
		}
	}

	if(data[4] == "true")
		for(var i = 0; i < this.projectiles.length; i++)
			if(this.projectiles[i].id == data[5])
			{
				this.projectiles[i].createHitEffect(victim);
				return;
			}
};

Game.prototype.playerDies = function(victim, killer, projectileID, newKillCount, murderWeaponId, newDeathCount, multiKillCount, killStreak, victimKillStreak, soulsKiller,
	soulsVictim, killerElo, victimElo, splash, objX, objY, objAOE, objID, startX, startY, vecX, vecY, vecH)
{
	if(splash == "true")
	{
		new Splash(victim.x, victim.y, imgCoords.splash, 2);
		victim.noDraw = true;
	}

	var projectile = this.getGrenadeOrProjectileById(projectileID);
	var obj = null;

	if(objID && objID >= 0)
		for(var i = 0; i < this.objects.length; i++)
			if(this.objects[i].id == objID)
			{
				obj = this.objects[i];
				i = this.objects.length;
			}
	
	victim.die(projectile, murderWeaponId, objX, objY, objAOE, killer, obj, startX, startY, vecX, vecY, vecH);
	
	if(!killer)
		return;
	
	if(victim.isZombie)
	{
		if(killer.isZombie && killer.db_id && victim.db_id)
			return;
		
		if(killer.db_id)
			killer.setSouls(soulsKiller, victim.x, victim.y);
		
		if(killer == this.playingPlayer && victim.masterId !== playerData.db_id)
		{
			this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_zombie"), "#36FF36", "textInGreen");
			killer.playFragSound(1, 0.8);
		}

		this.refreshUIs();

		return;
	}

	var eloDiffKiller = 0;
	var eloDiffVictim = 0;
	if(this.type.ingameElo)
	{
		if(killer && killer.setElo)
			eloDiffKiller = killer.setElo(killerElo, victim.x, victim.y);
		if(victim && victim.setElo)
			eloDiffVictim = victim.setElo(victimElo, victim.x, victim.y);
	}

	var soulsVictimBefore = victim.souls;

	if(killer && !killer.isZombie)
		killer.setKills(newKillCount);

	if(victim)
		victim.setDeaths(newDeathCount);

	if(killer && !killer.isZombie)
		killer.setSouls(soulsKiller, victim.x, victim.y);

	if(victim)
		victim.setSouls(soulsVictim);

	var soulsLost = soulsVictimBefore - victim.souls;

	this.refreshUIs();

	if(victim == killer)
	{
		if(victim == this.playingPlayer)
		{
			this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_self") + (eloDiffKiller ? (" (" + eloDiffKiller + " " + slayOne.widgets.lang.get("config.resource.score.name") + ")") : ""), "#FF3232", "textInRed");

			if(soulsLost > 0)
				this.floatingTexts.push(new FloatingText("-" + soulsLost, this.playingPlayer.x, this.playingPlayer.y - 1.0, 1700, 1, "#FF3232", SCALE_FACTOR * 6, imgCoords.souls));
		}
	}

	else
	{
		if(victim == this.playingPlayer)
		{
			if(soulsLost > 0)
				this.floatingTexts.push(new FloatingText("-" + soulsLost, this.playingPlayer.x, this.playingPlayer.y - 1.0, 1700, 1, "#FF3232", SCALE_FACTOR * 6, imgCoords.souls));

			if(killer.isZombie)
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_by_zombie"), "#FF3232", "textInRed");
			else
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_by_player", { playerName: killer.name}) + (eloDiffVictim ? (" (" + eloDiffVictim + " " + slayOne.widgets.lang.get("config.resource.score.name") + ")") : ""), "#FF3232", "textInRed");
		}

		else if(killer == this.playingPlayer)
		{
			if(killer.team != 0 && killer.team == victim.team)
			{
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_teammate", { playerName: victim.name}), "#FF3232", "textInRed");
				soundManager.playSound(SOUND.TEAMKILL);
			}

			else
			{
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.msg.killed_player", { playerName: victim.name}) + (eloDiffKiller ? (" (+" + eloDiffKiller + " " + slayOne.widgets.lang.get("config.resource.score.name") + ")") : ""), "#36FF36", "textInGreen");
				killer.playFragSound(multiKillCount);
			}
		}

		// play streak sound / msg
		if(killStreaks[killStreak])
		{
			if(killer == this.playingPlayer)
			{
				soundManager.playSound(SOUND[killStreaks[killStreak].sound], undefined, undefined, 0.9);
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get(killStreaks[killStreak].msg_start_self) + (playerData.authLevel >= AUTH_LEVEL.PLAYER ? (" (+ " + killStreaks[killStreak].xp + " " + slayOne.widgets.lang.get("config.resource.exp.name") + ")") : ""), "#95A6F0", "textInBlue", true);
			}

			else
			{
				soundManager.playSound(SOUND.FRAG1, undefined, undefined, 0.5);
				this.interface_.setMainKillMsg(slayOne.widgets.lang.get(killStreaks[killStreak].msg_start_others, { playerName: killer.name }), "#95A6F0", "textInBlue", true);
			}

			// play end streak sound / msg
			var victimStreak = getStreakByKills(victimKillStreak);
			if(victimStreak)
			{
				if(killer == this.playingPlayer)
					this.interface_.setMainKillMsg(slayOne.widgets.lang.get(killStreaks[killStreak].msg_ended_self, { victimName: victim.name }) + (playerData.authLevel >= AUTH_LEVEL.PLAYER ? (" (+ " + victimStreak.xp + " " + slayOne.widgets.lang.get("config.resource.exp.name") + ")") : ""), "#95A6F0", "textInBlue", true);
				else
					this.interface_.setMainKillMsg(slayOne.widgets.lang.get(killStreaks[killStreak].msg_ended_others, { victimName: victim.name, killerName: killer.name }), "#95A6F0", "textInBlue", true);
			}
		}
	}

	if(!killer.isZombie && victim && !victim.isZombie)
		this.interface_.addKillMsg(killer, victim, projectile, murderWeaponId, obj, splash);
};

Game.prototype.ladderResult = function(arr)
{
	var msg = "";
	var color = "";
	
	var livesP1 = this.type.lives - arr[2];
	var livesP2 = this.type.lives - arr[4];
	var p1 = this.getPlayerFromID(arr[1]);
	var p2 = this.getPlayerFromID(arr[3]);
	var points = "";
	
	if(this.playingPlayer)
	{
		if(arr[5] == this.playingPlayer.id)
		{
			msg = "You win!";
			soundManager.playSound(SOUND.LADDER_LOSS);
			points = "+ " + (Math.round(parseFloat(arr[6]) * 10) / 10) + " points";
		}
		
		else if(arr[5] > 0)
		{
			msg = "You lose!";
			soundManager.playSound(SOUND.LADDER_WIN);
			points = "- " + (Math.round(parseFloat(arr[6]) * 10) / 10) + " points";
		}
		
		else
		{
			msg = "Draw!";
			soundManager.playSound(SOUND.LADDER_LOSS);
		}
	}
	
	this.interface_.ladderEndAt = Date.now();
	this.interface_.ladderEndMsg = msg;
	this.interface_.ladderMsgArr = [p1.name, p2.name, livesP1, livesP2, points];
};

Game.prototype.switchWeapon = function(nr)
{
	if(!this.playingPlayer || !this.playingPlayerIsNotStunned() || this.ticksCounter < 0 || this.playingPlayer.isHumanZombie)
		return;

	if(nr == -1)
		nr += 10;

	if(weapons[nr] && weapons[nr] != this.playingPlayer.weapon && !weapons[nr].noWeapon)
	{
		if(this.switchWeaponSound && this.switchWeaponSound.pause)
		{
			this.switchWeaponSound.pause();
			this.switchWeaponSound.currentTime = 0;
			this.switchWeaponSound = null;
		}

		network.send("sW$" + nr);
	}
};

Game.prototype.getPathForPos = function(x, y)
{
	var biggestBlock = 10;

	var xFloor = Math.floor(x);
	var yFloor = Math.floor(y);

	var x_ = x - xFloor;
	var y_ = y - yFloor;

	if(x_ < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor - 1, yFloor));

	if(x_ > (1 - CONST.PLAYER_RADIUS))
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor + 1, yFloor));

	if(y_ < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor, yFloor - 1));

	if(y_ > (1 - CONST.PLAYER_RADIUS))
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor, yFloor + 1));

	if(Math.sqrt(Math.pow(x_, 2) + Math.pow(y_, 2)) < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor - 1, yFloor - 1));

	if(Math.sqrt(Math.pow(1 - x_, 2) + Math.pow(y_, 2)) < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor + 1, yFloor - 1));

	if(Math.sqrt(Math.pow(1 - x_, 2) + Math.pow(1 - y_, 2)) < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor + 1, yFloor + 1));

	if(Math.sqrt(Math.pow(x_, 2) + Math.pow(1 - y_, 2)) < CONST.PLAYER_RADIUS)
		biggestBlock = Math.min(biggestBlock, this.getFieldPath(xFloor - 1, yFloor + 1));

	return biggestBlock;
};

Game.prototype.getPotentialPlaceTarget = function(ability)
{
	var x = Math.floor(getMouseGamePlayX()) + 0.5;
	var y = Math.floor(getMouseGamePlayY()) + 0.5;

	if(Math.sqrt(Math.pow(this.playingPlayer.x - x, 2) + Math.pow(this.playingPlayer.y - y, 2)) <= ability.range && this.getFieldPath(Math.floor(x), Math.floor(y)) == 10)
		return {x: x, y: y};

	return this.getNextFreeField(x, y, ability.range, this.playingPlayer.x, this.playingPlayer.y);
};

Game.prototype.getAbilityFieldValue = function(ability, field)
{
	var val = ability[field] ? ability[field] : 0;
	var pl_ab = this.playingPlayerAbilities[ability.id];
	if(pl_ab && pl_ab.attributes)
		for(var i = 0; i < pl_ab.attributes.length; i++)
			if(pl_ab.attributes[i] && ability.levelUpFields[i] && ability.levelUpFields[i] == field)
				val += ability.levelUpValues[i] * pl_ab.attributes[i];
	return val;
};

Game.prototype.addCorpses = function(a)
{
	if(this.corpses.length > 200)
		this.corpses.splice(0, 20);
	
	this.corpses.push(a);
};

Game.prototype.calcFps = function(now)
{
	var sec = (now / 1000) | 0;
	var fpsTime = now - 1000;
	this.fpsFresh.push(now);
	while(this.fpsFresh[0] < fpsTime)
		this.fpsFresh.shift();
	
	this.fpsCount++;
	if(this.fpsTs != sec)
	{
		this.fpsLog[sec] = this.fpsCount;
		this.fpsCount = 0;
		this.fpsTs = sec;
	}
	
	this.fps = Math.min(this.fpsFresh.length, 99);
};

Game.prototype.drawFilter = function(name, cb)
{
	var list = this[name];
	var ticksCounter = this.ticksCounter;
	this[name] = list.filter((row) => {
		if (row.update(ticksCounter)) {
			return true;
		}
		if (cb) {
			if (cb === true) {
				this.objectsToDraw.erease(row);
			} else {
				cb(row);
			}
		}
		return false;
	});
};

var GameUpdateMode = {
	normal: function(t, d, data, i) {
		var p = t.getPlayerFromID(d);
		if(!p)
			return;
		
		p.x00 = p.x0;
		p.y00 = p.y0;
		p.x0 = data[i + 3] / CONST.TRANSMUL;
		p.y0 = data[i + 4] / CONST.TRANSMUL;
		p.x = data[i + 1] / CONST.TRANSMUL;
		p.y = data[i + 2] / CONST.TRANSMUL;
		p.lastPosUpdate = t.ticksCounter;
	},

	wC: function(t, d, data, i) { // weapon Change
		var p = t.getPlayerFromID(d);
		if(!p)
			return;
		
		if(p == t.playingPlayer)
			p.resetCooldowns();
		
		p.isReloading = false;
		p.lastWeapon = p.weapon;
		p.weapon = weapons[data[i + 1]];
		p.switchWeaponUntil = t.ticksCounter + CONST.WPN_SWITCH_TICKS;
		p.resetCooldowns();

		if (p == t.playingPlayer) {
			t.switchWeaponSound = soundManager.playSound(SOUND.SWITCH_WEAPON, undefined, undefined, 0.7);
			t.playingPlayer.resetCooldowns();
		}
	},

	trn: function(t, d, data, i)
	{
		var p = t.getPlayerFromID(d);
		
		if(p && p != t.playingPlayer)
			p.direction2 = data[i + 1];
	},

	js: function(t, d, data, i)
	{
		var p = t.getPlayerFromID(d);
		
		if(p)
		{
			p.z = parseFloat(data[i + 1]);
			p.vz = parseFloat(data[i + 2]);
		}
	},

	pa: function(t, d, data, i) { // pickup ammo
		for (var o of t.objectsToDraw) {
			if (!o.isAmmo) {
				continue;
			}
			if (o.id != d) {
				continue;
			}
			o.pickUp(data[i + 1], data[i + 2]);
			return;
		}
	},

	rp: function(t, d, data, i) {
		for(var k = 0, j = t.projectiles.length; k < j; k++) {
			var p = t.projectiles[k];
			if(p.id != d)
				continue;
			p.reflectionUpdate(data[i + 1], data[i + 2], data[i + 3], data[i + 4]);
			break;
		}
	},

	rsh: function(t, d, data, i) {
		
		var p = t.getPlayerFromID(d);
		
		if(p)
		{
			var proj = null;
			for(var i2 = 0; i2 < t.projectiles.length; i2++)
				if(t.projectiles[i2].id == data[i + 1])
					proj = t.projectiles[i2];
			
			p.refShieldHit(proj, data[i + 2]);
		}
	},

	p2u: function(t, d, data, i) {
		for (var k = 0, j = t.projectiles.length; k < j; k++) {
			var p = t.projectiles[k];
			if(p.id != d)
				continue;
			p.x0 = p.x;
			p.y0 = p.y;
			p.x = parseFloat(data[i + 1]);
			p.y = parseFloat(data[i + 2]);
			p.vecX = p.x - p.x0;
			p.vecY = p.y - p.y0;
			p.skipNextUpdate = true;
			p.createDrawLens();
			break;
		}
	},

	ts: function(t, d, data, i)
	{
		for(var k = 0; k < t.players.length; k++)
			if(t.players[k].id == data[i])
			{
				var p = t.players[k];
				p.team = data[i + 1];
				var str = "";
				if(p == t.playingPlayer)
					str = "You have been switched to the other team because of auto team balance";
				else
					str = "Player " + p.name + " has been switched to team " + data[i + 1] + " because of auto team balance";
				t.interface_.setMainKillMsg(str, "#36FF36", "textInGreen");
				soundManager.playSound(SOUND.SWITCH, undefined, undefined, 0.8);
			}
	},

	o2u: function(t, d, data, i)
	{
		for(var k = 0; k < t.objects.length; k++)
			if(t.objects[k].id == data[i])
			{
				t.objects[k].direction = data[i + 1];
				k = t.objects.length;
			}
	},

	zph: function(t, d, data, i) {
		var attacker = t.getPlayerFromID(d);
		var id = data[i + 1];
		var victim = data[i + 2] == '1' ? t.getObjectFromID(id) : t.getPlayerFromID(id);
		if (attacker && victim) {
			attacker.performPreHit(victim);
		}
	},

	stu: function(t, d, data, i) {
		for (var k = 0, j = t.players.length; k < j; k++) {
			var p = t.players[k];
			if (p.id != d) {
				continue;
			}
			var time = data[i + 1]|0;
			p.standTime = time;
			if (time == 1 && t.playingPlayer == p) {
				soundManager.playSound(SOUND.ZOOM, p.x, p.y, 1);
			}
			break;
		}
	},

	aiu: function(t, d, data, i) {
		var p = t.getPlayerFromID(data[i]);
		if(!p || t.playingPlayer == p)
			return;
		
		p.aimX = data[i + 1];
		p.aimY = data[i + 2];
	},

	hpU: function(t, d, data, i) {
		var p = t.getPlayerFromID(d);
		if(!p) {
			return;
		}

		var oldHP = p.hp;
		var diff = parseFloat(data[i + 1]);
		p.hp = Math.min(p.hp + diff, p.maxHP);

		if (p.hp <= oldHP) {
			return;
		}

		p.hpGlideAmount = p.hp - oldHP;
		p.hpGlideStart = t.ticksCounter;
		p.hpGlideEnd = t.ticksCounter + 4 * (p.hpGlideAmount / diff);
		
		if(p.x + 3 >= t.cameraX && p.y + 3 >= t.cameraY && p.x - 3 <= t.cameraX2 && p.y - 3 <= t.cameraY2 && !t.fastForward)
		{
			new Sprite({
				x: p.x + Math.random() * 0.5 - 0.25,
				y: p.y + 0.5 + Math.random() * 0.5,
				img: imgCoords.heal,
				scaleFunction: function(age){ return -1 * (1/ (((age * 0.9) - 125) / 500 + 0.31) + age / 4) + 16.9; },
				age: Math.random() * 10 + 35,
				xR: Math.random() * 0.1 - 0.05,
				xFunction: function(age){ return Math.pow(age, 0.7) * this.xR; },
				zFunction: function(age){ return 1.4 + age * 0.02; }
			});
		}
	},

	tB: function(t, d, data, i) { // turn boss

		var p = t.getPlayerFromID(d);
		if (!p) {
			return;
		}
		p.turnBoss();
		if (!p.isHumanZombie) {
			if (t.turnBoss) {
				return;
			}
			t.turnBoss = true;
		}

		var text = '';
		if (p.isHumanZombie) {
			if (t.playingPlayer == p) {
				text = slayOne.widgets.lang.get("game.msg.turn_boss.zombie_boss");
			} else {
				text = slayOne.widgets.lang.get("game.msg.turn_boss.zombie", {
					boss: p.unsafeName,
				});
			}
		} else {
			var human = 0;
			for (var cp of t.players) {
				if (cp.isHumanZombie) {
					continue;
				}
				if (cp.hp <= 0) {
					continue;
				}
				human++;
			}
			text = slayOne.widgets.lang.get("game.msg.turn_boss.human", {
				human: human
			});
		}
		game.interface_.setMainKillMsg(text, "#FF3232", "textInRed");
	},

	nF: function(t, d, data, i) {
		if (t.fastForward) {
			return;
		}
		for(var j = 0; j < Math.PI * 2; j += 0.3 + Math.random() * 0.3) {
			new Sprite({
				x: parseInt(data[i]) + Math.cos(j) * (data[i + 3] - 0.9 + Math.random() * 0.4),
				y: parseInt(data[i + 1]) - 0.0 + Math.sin(j) * (data[i + 3] - 0.9 + Math.random() * 0.4),
				img: imgCoords.poisonFog1,
				rScale: (Math.random() - 0.5) * 0.01,
				rScale2: parseFloat(data[i + 3]) / 2.9,
				scaleFunction: function(age) { return (1.6 + this.rScale * age) * this.rScale2; },
				alphaFunction: function(age) { return Math.min((this.ticksLeft > 30) ? 0.3 : (Math.max(this.ticksLeft * 0.3 / 30, 0)), age * 0.02); },
				age: parseInt(data[i + 2]) + 20,
				r1: (Math.random() - 0.5) * 0.01,
				r2: (Math.random() - 0.5) * 0.01,
				r3: (Math.random() - 0.5) * 0.01,
				zFunction: function(age) { return 1 + this.r1 * age; },
				xFunction: function(age) { return 1 + this.r2 * age; },
				yFunction: function(age) { return 1 + this.r3 * age; }
			});
		}

		for(var j = 0; j < Math.PI * 2; j += 0.3 + Math.random() * 0.3) {
			new Sprite({
				x: parseInt(data[i]) + Math.cos(j) * (data[i + 3] - 0.8) * Math.random(),
				y: parseInt(data[i + 1]) - 0.0 + Math.sin(j) * (data[i + 3] - 0.8) * Math.random(),
				img: imgCoords.poisonFog2,
				rScale: (Math.random() - 0.5) * 0.01,
				rScale2: parseFloat(data[i + 3]) / 3,
				scaleFunction: function(age) { return (1.6 + this.rScale * age) * this.rScale2; },
				alphaFunction: function(age) { return Math.min((this.ticksLeft > 30) ? 0.3 : (Math.max(this.ticksLeft * 0.3 / 30, 0)), age * 0.02); },
				age: parseInt(data[i + 2]) + 20,
				r1: (Math.random() - 0.5) * 0.01,
				r2: (Math.random() - 0.5) * 0.01,
				r3: (Math.random() - 0.5) * 0.01,
				zFunction: function(age) { return 1 + this.r1 * age; },
				xFunction: function(age) { return 1 + this.r2 * age; },
				yFunction: function(age) { return 1 + this.r3 * age; }
			});
		}
	},

	ab: function(t, d, data, i) { // enable ability
		var p = t.getPlayerFromID(d);
		var ab = abilities[data[i + 1]];
		if (!p || !ab) {
			return;
		}

		if(ab.type == "invis")
		{
			p.isInvisible = true;
			if(p.x + 3 >= t.cameraX && p.y + 3 >= t.cameraY && p.x - 3 <= t.cameraX2 && p.y - 3 <= t.cameraY2)
			{
				createPoundSmoke(p.x, p.y + 0.5, 0.5, 9, 0.4);
				soundManager.playSound(SOUND.INVIS1, p.x, p.y);
			}
		}

		else if(ab.type == "playdead")
		{
			p.turnCorpseTill = t.ticksCounter + ab.duration;
			p.isFakeCorpse = true;
		}

		else if(ab.type == "scan")
		{
			if(p == t.playingPlayer)
			{
				t.lastAbilityUses[pl_active_abilities[0] == ab ? 0 : 1] = t.ticksCounter;
				t.showEnemiesOnMinimapUntil = t.ticksCounter + t.getAbilityFieldValue(ab, "duration");
				t.interface_.setMainKillMsg(slayOne.widgets.lang.get("game.skills.scan.tip"), "rgba(0, 255, 6, 0.7)", "textInGreen", true);
			}

			if(p.x + 5 >= t.cameraX && p.y + 5 >= t.cameraY && p.x - 5 <= t.cameraX2 && p.y - 5 <= t.cameraY2)
			{
				t.addCircle(p.x, p.y, imgCoords.greenCircle);
				soundManager.playSound(SOUND.SCAN, p.x, p.y, p == t.playingPlayer ? 1 : 0.66);
			}
		}
		
		else if(ab.type == "shield")
		{
			if(ab.reflects)
			{
				p.lastShieldActivated2 = t.ticksCounter;
			}
			
			else
			{
				p.lastShieldActivated = t.ticksCounter;
			}

			if(p.x + 5 >= t.cameraX && p.y + 5 >= t.cameraY && p.x - 5 <= t.cameraX2 && p.y - 5 <= t.cameraY2)
				soundManager.playSound(SOUND.SHIELD, p.x, p.y, p == t.playingPlayer ? 1 : 0.66);
		}

		if (p == t.playingPlayer && ab.energy) {
			t.playingPlayerEnergy -= ab.energy;
		}
	},
	
	ab2: function(t, d, data, i) { // disable ability
		var p = t.getPlayerFromID(d);
		if (p) {
			p.disableAbility(abilities[data[i + 1]]);
		}
	},
	
	blk: function(t, d, data, i) { // blink
		var p = t.getPlayerFromID(d);

		if(!p) {
			return;
		}
		p.blink(data[i + 1], data[i + 2]);

		if (p == t.playingPlayer && data[i + 3] == "1") {
			t.playingPlayerEnergy -= abilities[3].energy;
			t.lastAbilityUses[pl_active_abilities[0] == abilities[3] ? 0 : 1] = t.ticksCounter;
			t.noShootUntil = t.ticksCounter + CONST.NO_SHOOT_AFTER_BLINK_TICKS;
		}
	},

	blP: function(t, d, data, i) {
		for(var k = 0, j = t.projectiles.length; k < j; k++) {
			var p = t.projectiles[k];
			if (p.id == d) {
				p.blink(data[i + 1], data[i + 2], data[i + 3], data[i + 4]);
				break;
			}
		}

		for(var k = 0, j = t.grenades.length; k < j; k++) {
			var g = t.grenades[k];
			if (g.id == d) {
				g.blink(data[i + 1], data[i + 2], data[i + 3], data[i + 4]);
				break;
			}
		}
	},

	ptz: function(t, d, data, i) { // player to zombie
		var p = t.getPlayerFromID(d);

		if (p) {
			p.turnZombie();
		}
	},

	cZ: function(t, d, data, i) { // cure zombie
		var p = t.getPlayerFromID(d);

		if (!p) {
			return;
		}
		p.getCured();
		p.lastZombieToHumanTransformation = t.ticksCounter;

		if (p == t.playingPlayer) {
			t.playingPlayerIsZombie = false;
		}
	},

	pptz: function(t, d, data, i) {
		var p = t.getPlayerFromID(d);
		if (p) {
			p.startBlinkingGreen = t.ticksCounter;
		}
	},

	luP: function(t, d, data, i) { // level up
		var p = t.getPlayerFromID(d);
		if(p) {
			p.createLvlUpEffect();
		}
	},

	blO: function(t, d, data, i) {
		for(var k = 0, j = t.objects.length; k < j; k++) {
			var o = t.objects[k];
			if (o.id == d) {
				o.blink(data[i + 1], data[i + 2], data[i + 3], data[i + 4]);
				break;
			}
		}
	},

	rl: function(t, d, data, i) { // start reloading
		var p = t.getPlayerFromID(d);
		if(!p || !p.weapon) {
			return;
		}

		p.isReloading = true;
		p.weaponCooldowns2[p.weapon.id] = p.weapon.cooldown2;
		if (p.weapon.reload2Sound && p == t.playingPlayer) {
			p.reloadSound2 = soundManager.playSound(SOUND[p.weapon.reload2Sound], p.x, p.y, 0.55);
		}
	},

	att: function(t, d, data, i) { // attribute update
		var p = t.getPlayerFromID(d);
		if (p) {
			p.updateField(data[i + 1], data[i + 2]);
		}
	},

	abc: function(t, d, data, i) { // ability lvl update

		var p = t.getPlayerFromID(d);
		if (p != t.playingPlayer) {
			return;
		}

		t.playingPlayerAbilities[data[i + 1]].lvl = parseInt(data[i + 2]);
		t.setActiveAbilities();
	}
};