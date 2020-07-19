function Projectile(startX, startY, vecX, vecY, lifetime, id, weapon, isHomingMissile, remainingBullets, isMulti, playerID, aoe)
{
	this.x = parseFloat(startX);
	this.y = parseFloat(startY);
	this.x0 = parseFloat(startX);
	this.y0 = parseFloat(startY);
	
	if(!isMulti)
	{
		if(weapon.soundName)
			soundManager.playSound(SOUND[weapon.soundName], this.x, this.y, weapon.volume ? weapon.volume : 1);
		
		if(weapon.poundSmokeSize)
		{
			createPoundSmoke(this.x, this.y, weapon.poundSmokeSize, 10);
			
			var now = Date.now();
			game.rumbleUntil = now + 500;
			game.rumblePower = 0.05 * weapon.poundSmokeSize;
			game.rumbleStart = now;
		}
	}
	
	if(remainingBullets == 0 && weapon.lastShotSound && !isMulti)
		soundManager.playSound(SOUND[weapon.lastShotSound], this.x, this.y);
	
	this.vecX = parseFloat(vecX);
	this.vecY = parseFloat(vecY);
	this.stepVecX = this.vecX;
	this.stepVecY = this.vecY;
	
	var factor = Math.sqrt(this.vecX * this.vecX + this.vecY * this.vecY) / weapon.projectileSpeed;
	
	this.vecX /= factor;
	this.vecY /= factor;
	
	this.dmg = weapon ? weapon.dmg : 0;
	this.weapon = weapon;
	this.aoe = aoe ? parseFloat(aoe) : weapon.aoe;
	this.isMulti = isMulti;
	this.createDrawLens();
	this.speed = (this.weapon && this.weapon.projectileSpeed) ? this.weapon.projectileSpeed : 0.1;
	
	this.tickOfDeath = parseFloat(lifetime) + game.ticksCounter;
	this.tickOfCreation = game.ticksCounter;
	this.id = id;
	this.playerID = playerID;
	
	this.rocketSound = null;
	this.lastTimeRocketSoundStarted = -9999;
	this.isHomingMissile = isHomingMissile == 1;
	this.prediction = [];
	this.stepVecX = 0;
	this.stepVecY = 0;
	this.steps = 0;
	this.timesShieldReflected = 0;
	
	this.skipNextUpdate = false;
	this.dieAt = 0;
	
	game.addToObjectsToDraw(this);
	
	if(!isMulti && !game.fastForward && this.x + 4 >= game.cameraX && this.y + 4 >= game.cameraY && this.x - 4 <= game.cameraX2 && this.y - 4 <= game.cameraY2)
	{
		if(this.weapon.isLaser) // if laser cannon
		{
			new Sprite({
				x: this.x + this.drawLenX * 0.2,
				y: this.y + this.drawLenY * 0.2 - SHOT_HEIGHT,
				img: imgCoords[weapon.light],
				scaleFunction: function(age){ return 1; },
				alphaFunction: function(){ return 0.2; },
				age: 1
			});
		}
		
		if(this.weapon.spawnBullets && graphics[graphicSettings].spawnBullets)
			new Bullet(this.x, this.y);
		
		if(this.weapon.isRocket && this.weapon.noRocketEffects) // Rocket Launcher
		{
			new Sprite({
				x: this.x + this.drawLenX * 2 + Math.random() * 0.5 - 0.25,
				y: this.y + this.drawLenY * 2 + Math.random() * 0.5 - 0.25 - SHOT_HEIGHT,
				img: imgCoords[this.weapon.spawnLight ? this.weapon.spawnLight : "light_yellow"],
				scaleFunction: function(age){ return 5; },
				age: 8
			});
			
			new Sprite({
				x: this.x + this.drawLenX * 2 + Math.random() * 0.15 - 0.075,
				y: this.y + this.drawLenY * 2 + Math.random() * 0.15 - 0.075 - SHOT_HEIGHT,
				img: imgCoords[this.weapon.spawnLight ? this.weapon.spawnLight : "light_yellow"],
				scaleFunction: function(age){ return 1; },
				age: 8
			});
			
			new Sprite({
				x: this.x + this.drawLenX * 1 + Math.random() * 0.15 - 0.075,
				y: this.y + this.drawLenY * 1 + Math.random() * 0.15 - 0.075 - SHOT_HEIGHT,
				img: imgCoords[this.weapon.spawnLight ? this.weapon.spawnLight : "light_yellow"],
				scaleFunction: function(age){ return 1; },
				age: 8
			});
			
			new Sprite({
				x: this.x + this.drawLenX * 1 + Math.random() * 0.1 - 0.05,
				y: this.y + this.drawLenY * 1 + Math.random() * 0.1 - 0.05 - SHOT_HEIGHT,
				img: imgCoords.light_white,
				scaleFunction: function(age){ return 0.5; },
				age: 8
			});
			
			new Sprite({
				x: this.x - this.drawLenX * 3 + Math.random() * 0.1 - 0.05,
				y: this.y - this.drawLenY * 3 + Math.random() * 0.1 - 0.05 - SHOT_HEIGHT,
				img: imgCoords[this.weapon.spawnLight ? this.weapon.spawnLight : "light_yellow"],
				scaleFunction: function(age){ return 1; },
				age: 8
			});
		}
		
		if(this.weapon == weapons[8]) // sniper
		{
			var x = this.x + this.drawLenX * 5.5;
			var y = this.y + this.drawLenY * 5.5;
			
			for(var i = 0; i < 5; i++)
				new Sprite({
					x: x + Math.random() * 0.3 - 0.15,
					y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
					img: imgCoords.dust1,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1.1,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
					age: (2.7 + Math.random()) * 20,
					x_: this.drawLenX * 2.25,
					y_: this.drawLenY * 2.25,
					i_: i / 5,
					xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 5 * this.i_ * this.x_; },
					yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 5 * this.i_ * this.y_; }
				});
			
			for(var i = 1; i < 3; i++)
				new Sprite({
					x: x + Math.random() * 0.3 - 0.15,
					y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
					img: imgCoords.dust1,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1.1,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.3; },
					age: (2.7 + Math.random()) * 20,
					x_: -this.drawLenY * 2.25,
					y_: this.drawLenX * 2.25,
					i_: i / 5,
					xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 3 * this.i_ * this.x_; },
					yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 3 * this.i_ * this.y_; }
				});
			
			for(var i = 1; i < 3; i++)
				new Sprite({
					x: x + Math.random() * 0.3 - 0.15,
					y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
					img: imgCoords.dust2,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1.1,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.3; },
					age: (2.7 + Math.random()) * 20,
					x_: this.drawLenY * 2.25,
					y_: -this.drawLenX * 2.25,
					i_: i / 5,
					xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 3 * this.i_ * this.x_; },
					yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 3 * this.i_ * this.y_; }
				});
			
			new Sprite({
				x: x,
				y: y - SHOT_HEIGHT,
				img: imgCoords.light_yellow,
				scaleFunction: function(age){ return 5; },
				age: 7
			});
		}
		
		if(this.weapon.isRocket) // Rocket Launcher
		{
			var x = this.x;
			var y = this.y;
			
			for(var i = 0; i < 5; i++)
				new Sprite({
					x: x + Math.random() * 0.3 - 0.15,
					y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
					img: imgCoords.dust1,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1.1,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
					age: (2.7 + Math.random()) * 20,
					x_: this.drawLenX * 4.25,
					y_: this.drawLenY * 4.25,
					i_: i / 5,
					xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
					yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
				});
			
			if(!this.weapon.noRocketEffects)
				for(var i = 1; i < 3; i++)
					new Sprite({
						x: x + Math.random() * 0.3 - 0.15,
						y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
						img: imgCoords.dust1,
						scaleFunction: function(age){ return this.scale_ - age * 0.01; },
						scale_: Math.random() + 1.1,
						alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
						age: (2.7 + Math.random()) * 20,
						x_: -this.drawLenY * 8.25,
						y_: this.drawLenX * 8.25,
						i_: i / 5,
						xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
						yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
					});
			
			if(!this.weapon.noRocketEffects)
				for(var i = 1; i < 3; i++)
					new Sprite({
						x: x + Math.random() * 0.3 - 0.15,
						y: y - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
						img: imgCoords.dust1,
						scaleFunction: function(age){ return this.scale_ - age * 0.01; },
						scale_: Math.random() + 1.1,
						alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
						age: (2.7 + Math.random()) * 20,
						x_: this.drawLenY * 8.25,
						y_: -this.drawLenX * 8.25,
						i_: i / 5,
						xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
						yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
					});
			
			if(!this.weapon.noRocketEffects)
				for(var i = 1; i < 6; i++)
					new Sprite({
						x: this.x - this.drawLenX * 2 + Math.random() * 0.3 - 0.15,
						y: this.y - this.drawLenY * 2 - SHOT_HEIGHT + Math.random() * 0.3 - 0.15,
						img: imgCoords.dust1,
						scaleFunction: function(age){ return this.scale_ - age * 0.01; },
						scale_: Math.random() + 1.25,
						alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
						age: (2.7 + Math.random()) * 20,
						x_: -this.drawLenX * 8.25,
						y_: -this.drawLenY * 8.25,
						i_: i / 8,
						xFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.x_; },
						yFunction: function(age){ return (-1 / (Math.pow((age / 5) + 1, 3)) + 1) * 2 * this.i_ * this.y_; }
					});
			
			new Sprite({
				x: x,
				y: y - SHOT_HEIGHT,
				img: imgCoords[this.weapon.spawnLight ? this.weapon.spawnLight : "light_yellow"],
				scaleFunction: function(age){ return 5; },
				age: 7
			});
		}
	}
};

Projectile.prototype.createDrawLens = function()
{
	var len = Math.sqrt(this.vecX * this.vecX + this.vecY * this.vecY) * (this.isMulti ? (Math.random() * 0.2 + 0.9) : 1);
	
	this.drawLenX = this.vecX * 0.2 / len;
	this.drawLenY = this.vecY * 0.2 / len;
	
	this.vecX /= len / this.weapon.projectileSpeed;
	this.vecY /= len / this.weapon.projectileSpeed;
};

Projectile.prototype.reflectionUpdate = function(x, y, vecX, vecY)
{
	var oldVecX = this.vecX;
	var oldVecY = this.vecY;
	
	this.x0 = this.x;
	this.y0 = this.y;
	this.x = parseFloat(x);
	this.y = parseFloat(y);
	this.vecX = parseFloat(vecX);
	this.vecY = parseFloat(vecY);
	
	var len = Math.sqrt(this.vecX * this.vecX + this.vecY * this.vecY);
	var vecX = this.vecX * 0.1 / len;
	var vecY = this.vecY * 0.1 / len;
	
	this.createDrawLens();
	
	this.skipNextUpdate = true;
	
	var stepX = (this.vecX - oldVecX) / 2;
	var stepY = (this.vecY - oldVecY) / 2;
	
	if(this.x + 3 >= game.cameraX && this.y + 3 >= game.cameraY && this.x - 3 <= game.cameraX2 && this.y - 3 <= game.cameraY2)
	{
		if(!(Math.abs(stepX) < 0.01 && stepY < 0))
		{
			new PlasmaShield(this.x, this.y, this.x + stepX, this.y + stepY);
			
			for(var i = 0; i < 5; i++)
				new Sprite({
					x: this.x,
					y: this.y,
					img: imgCoords[this.weapon.particle],
					scaleFunction: function(age){ return this.r4 - age * 0.2; },
					age: 5 + Math.random() * 5,
					r1: Math.random() * 0.6 + 0.7,
					r2: stepX * 0.3 + stepX * 0.4 * Math.random(),
					r3: stepY * 0.3 + stepY * 0.4 * Math.random(),
					r4: Math.random() * 2 + 1,
					zFunction: function(age){ return 0.6 * Math.max(0.3, Math.abs(Math.cos(age * this.r1 * 0.2)) / Math.max(1, age * 0.2)) - 0.3; },
					xFunction: function(age){ return (-5 / (age * 0.08 + 1) + 5) * this.r2; },
					yFunction: function(age){ return (-5 / (age * 0.08 + 1) + 5) * this.r3; }
				});
			
			for(var k = 0; k < 2; k++)
				new Sprite({
					x: this.x + Math.random() * 0.6 - 0.3,
					y: this.y + Math.random() * 0.6 - 0.3,
					img: imgCoords.dust1,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1,
					alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.2; },
					age: (1.7 + Math.random()) * 20,
					z_: Math.random() * 40 + 12,
					zFunction: function(age){ return SHOT_HEIGHT + age / this.z_; }
				});
		}
		
		soundManager.playSound(SOUND.REFLECT, this.x, this.y, 0.6);
		soundManager.playSound(SOUND.SIZZLE, this.x, this.y, 0.2);
		
		// light
		new Sprite({
			x: this.x,
			y: this.y,
			img: imgCoords[this.weapon.light],
			scaleFunction: function(age){ return Math.max(0, 4 - age / this.ticksToLive * 4); },
			alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.17; },
			age: 15,
		});
	}
};

Projectile.prototype.blink = function(x, y, oldX, oldY)
{
	if(this.dmg < 10)
	{
		soundManager.playSound(SOUND.BLINK, this.x, this.y, 0.40);
		createBlinkEffectVerySmall(parseFloat(oldX) - 0.2 + Math.random() * 0.4, parseFloat(oldY) - 0.2 + Math.random() * 0.4);
	}
	else
	{
		createBlinkEffectSmall(parseFloat(oldX) - 0.2 + Math.random() * 0.4, parseFloat(oldY) - 0.2 + Math.random() * 0.4);
		soundManager.playSound(SOUND.BLINK, this.x, this.y, 0.65);
	}
	
	this.x = parseFloat(x);
	this.y = parseFloat(y);
	
	this.x0 = this.x;
	this.y0 = this.y;
	
	if(this.dmg < 10)
	{
		createBlinkEffectVerySmall(this.x - 0.25 + Math.random() * 0.5, this.y - 0.25 + Math.random() * 0.5);
		soundManager.playSound(SOUND.BLINK, this.x, this.y, 0.40);
	}
	else
	{
		createBlinkEffectSmall(this.x - 0.25 + Math.random() * 0.5, this.y - 0.25 + Math.random() * 0.5);
		soundManager.playSound(SOUND.BLINK, this.x, this.y, 0.65);
	}
};

Projectile.prototype.normalizeVector = function()
{
    var factor = Math.sqrt(this.vecX * this.vecX + this.vecY * this.vecY) / this.speed;

    this.stepVecX = this.vecX / factor;
    this.stepVecY = this.vecY / factor;

    this.steps = 1;
    var len = Math.sqrt(this.stepVecX * this.stepVecX + this.stepVecY * this.stepVecY);
    if(len > 0.1)
    {
        this.steps = Math.ceil(len / 0.1);
        this.stepVecX /= this.steps;
        this.stepVecY /= this.steps;
    }
};

Projectile.prototype.makePrediction = function()
{
	this.normalizeVector();
	
	var x = this.x;
	var y = this.y;
	if(this.prediction.length > 0)
	{
		x = this.prediction[this.prediction.length - 1].x;
		y = this.prediction[this.prediction.length - 1].y;
	}
	var vecX = this.stepVecX;
	var vecY = this.stepVecY;
	
	while(this.prediction.length < 30)
		for(var k = 0; k < this.steps; k++)
		{
			x += vecX;
			y += vecY;
			
			var newXFloor = Math.floor(x);
			var newYFloor = Math.floor(y);
			
			var reflection = false;
			
	        // check for collision with walls
	        if(game.getFieldPath(newXFloor, newYFloor) <= 5)
	        {
	            // check if we hit an object
	            for(var i = 0; i < game.objects.length; i++)
	            {
	                if(game.objects[i].blocks && game.objects[i].intX == newXFloor && game.objects[i].intY == newYFloor)
	                {
	                    return;
	                }
	            }
				
	        	reflection = true;
	            
	            x -= vecX * 2;
	            vecX *= -1;
	            block = game.getFieldPath(Math.floor(x), Math.floor(y));
				
	            if(block <= 5)
	            {
	                x += vecX * 2;
	                y -= vecY * 2;
	                vecX *= -1;
	                vecY *= -1;
	                block = game.getFieldPath(Math.floor(x), Math.floor(y));
					
	                if(block <= 5)
	                {
	                    x -= vecX * 2;
	                    vecX *= -1;
	                }
	            }
	        }
			
			if(k == this.steps - 1 || reflection)
				this.prediction.push({
					x: x,
					y: y,
					reflection: reflection,
					step: k == this.steps - 1
				});
		}
};

Projectile.prototype.update = function()
{
	if(this.dieAt && this.dieAt + 10 <= game.ticksCounter)
		return false;
	
	if(this.dieAt)
		return true;
	
	if(this.skipNextUpdate)
		this.skipNextUpdate = false;
	
	else
	{
		this.x0 = this.x;
		this.y0 = this.y;
		
		this.x += this.vecX;
		this.y += this.vecY;
	}
	
	if(this.prediction.length > 0)
	{
		var node = this.prediction.splice(0, 1);
		while(node && node[0] && !node[0].step)
			var node = this.prediction.splice(0, 1);
	}
	
	if(this.weapon.isRocket && !game.fastForward && this.x + 3 >= game.cameraX && this.y + 3 >= game.cameraY && this.x - 3 <= game.cameraX2 && this.y - 3 <= game.cameraY2 && Math.random() < 0.8 && !this.weapon.noRocketEffects)
		new Sprite({
			x: this.x0 + Math.random() * 0.4 - 0.2,
			y: this.y0 - SHOT_HEIGHT + Math.random() * 0.4 - 0.2,
			img: imgCoords.dust1,
			scaleFunction: function(age){ return this.scale_ - age * 0.01; },
			scale_: Math.random() + 0.75,
			alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.35; },
			age: (1.7 + Math.random()) * 20,
			z_: Math.random() * 40 + 32,
			zFunction: function(age){ return age / this.z_; }
		});
	
	// rocket sound update
	if(this.weapon.isRocket)
	{
		if(this.rocketSound)
		{
            var volume = soundManager.getVolumeModifier(this.x, this.y);
            if(isNaN(volume) || volume <= 0)
                volume = 0;
            
            this.rocketSound.volume = 0.35 * volume * sound_volume;

            if(this.lastTimeRocketSoundStarted + 700 < Date.now())
            {
                this.rocketSound = soundManager.playSound(this.weapon.flySound ? SOUND[this.weapon.flySound] : SOUND.ROCKET_FLY, this.x, this.y, 0.35);
                this.lastTimeRocketSoundStarted = Date.now();
            }
		}
		
		else
		{
			this.rocketSound = soundManager.playSound(this.weapon.flySound ? SOUND[this.weapon.flySound] : SOUND.ROCKET_FLY, this.x, this.y, 0.35);
			this.lastTimeRocketSoundStarted = Date.now();
		}
	}
	
	if(this.timesShieldReflected)
	{
		if(game.ticksCounter % 2 == 1)
		{
			new Sprite({
				x: this.x + Math.random() * 0.4 - 0.2,
				y: this.y - SHOT_HEIGHT + Math.random() * 0.4 - 0.2,
				img: imgCoords.particleWhite,
				scaleFunction: function(age){ return this.scale_ - age * 0.01; },
				scale_: Math.random() + 0.75,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.85; },
				age: 10 + Math.random() * 10
			});
			
			new Sprite({
				x: this.x + Math.random() * 0.4 - 0.2,
				y: this.y - SHOT_HEIGHT + Math.random() * 0.4 - 0.2,
				img: Math.random() > 0.5 ? imgCoords.light_yellow : imgCoords.light_purple,
				scaleFunction: function(age){ return this.scale_ - age * 0.01; },
				scale_: Math.random() + 0.75 + (Math.min(this.timesShieldReflected, 3) - 1),
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.45; },
				age: 10 + Math.random() * 10
			});
		}
	}
	
	// homing missile beep sound
	if(this.isHomingMissile && this.tickOfCreation == game.ticksCounter - 1)
		soundManager.playSound(SOUND.ROCKET_BEEP, this.x, this.y, 0.65);
	
	return this.tickOfDeath >= game.ticksCounter;
};

Projectile.prototype.createHitEffect = function(player)
{
	if(!game.fastForward && this.x + 5 >= game.cameraX && this.y + 5 >= game.cameraY && this.x - 5 <= game.cameraX2 && this.y - 5 <= game.cameraY2)
	{
		if(this.weapon.isLaser) // laser cannon hit effect
		{
			var x = this.x;
			var y = this.y;
			
			if(player)
			{
				var vecX = this.x - player.x;
				var vecY = this.y - player.y;
				
				var len = Math.sqrt(vecX * vecX + vecY * vecY);
				
				vecX *= CONST.PLAYER_RADIUS / len;
				vecY *= CONST.PLAYER_RADIUS / len;
				
				x = player.x + vecX;
				y = player.y + vecY;
				
				if(player.invincibleUntil < game.ticksCounter)
				{
					player.laserHitUntil = game.ticksCounter + 3;
					player.lastHit = game.ticksCounter;
					player.lockDirection = player.direction;
					player.lockDirection2 = player.direction2;
					soundManager.playSound(SOUND.SIZZLE2, this.x, this.y, 0.47);
				}
				else
					soundManager.playSound(SOUND.SIZZLE, this.x, this.y, 0.2);
			}
			
			for(var k = 0; k < 3; k++)
				new Sprite({
					x: x + Math.random() * 0.6 - 0.3,
					y: y + Math.random() * 0.6 - 0.3,
					img: imgCoords.dust1,
					scaleFunction: function(age){ return this.scale_ - age * 0.01; },
					scale_: Math.random() + 1,
					alphaFunction: function(age){ return Math.max(0, 1 - age / this.ticksToLive) * 0.4; },
					age: (1.7 + Math.random()) * 20,
					z_: Math.random() * 40 + 12,
					zFunction: function(age){ return SHOT_HEIGHT + age / this.z_; }
				});
			
			for(var k = 0; k < 9; k++)
			{
				var randomAngle = Math.random() * Math.PI * 2;
				var rand = Math.random() * 0.7;
				
				new Sprite({
					x: x + Math.cos(randomAngle) * rand,
					y: y - SHOT_HEIGHT + Math.sin(randomAngle) * rand,
					img: imgCoords[this.weapon.particle],
					scaleFunction: function(age){ return this.scale_; },
					scale_: Math.random() * 3 + 2,
					alphaFunction: function(age){ return Math.floor(Math.random() * 3) * 0.44; },
					age: 4
				});
			}
			
			// light
			new Sprite({
				x: x,
				y: y,
				img: imgCoords.light_white,
				scaleFunction: function(age){ return Math.max(0, 1 - (age / this.ticksToLive) * 0.3) * 7; },
				alphaFunction: function(age){ return Math.floor(Math.random() * 3) * 0.066; },
				age: 4,
			});
			
			// light
			new Sprite({
				x: x,
				y: y,
				img: imgCoords.light_purple,
				scaleFunction: function(age){ return Math.max(0, 1 - (age / this.ticksToLive) * 0.3) * 5; },
				alphaFunction: function(age){ return Math.floor(Math.random() * 3) * 0.066; },
				age: 4,
			});
		}
		
		else if(this.weapon.normalProjectile) // mg hit effect
		{
			if(player && player.bleeds && player.invincibleUntil < game.ticksCounter)
			{
				var vecX = this.x - player.x;
				var vecY = this.y - player.y;
				
				var len = Math.sqrt(vecX * vecX + vecY * vecY);
				
				vecX *= CONST.PLAYER_RADIUS / len;
				vecY *= CONST.PLAYER_RADIUS / len;
				
				var x = player.x + vecX;
				var y = player.y + vecY;
				
				for(var k = 0; k < 2; k++)
					new Blood(x, y, -vecX, -vecY);
			}
			
			soundManager.playSound(SOUND.GUN_IMPACT, this.x, this.y, 1.0);
			if(player && player.invincibleUntil < game.ticksCounter)
				soundManager.playSound(SOUND.GUN_IMPACT_2, this.x, this.y, 1.0);
		}
		
		if(this.weapon.isZombieRangedWeapon)
			new Splash(this.x + this.vecX, this.y + this.vecY - 0.4, imgCoords.rangedZombieImpact, 1.15, 40, false);
	}
	
	if(!this.dieAt && this.playerID == game.playingPlayerID && this.weapon.isHeatSeeking2)
		game.playingPlayerCountActiveHeatseeking2Missiles--;
	
	this.dieAt = game.ticksCounter + 10;
};

Projectile.prototype.createDeathEffect = function(x, y, comboDeath)
{
	x = parseFloat(x);
	y = parseFloat(y);
	
	if(this.weapon.isZombieRangedWeapon && !game.fastForward && this.x + 5 >= game.cameraX && this.y + 5 >= game.cameraY && this.x - 5 <= game.cameraX2 && this.y - 5 <= game.cameraY2)
	{
		new Splash(x, y, imgCoords.rangedZombieImpact, 1.15, 40, false);
		soundManager.playSound(SOUND.ZOMBIE_BITE, x, y, 1.0);
	}
	
	if(this.weapon.isRocket) // Rocket Launcher
	{
		if(x + 10 >= game.cameraX && y + 10 >= game.cameraY && x - 10 <= game.cameraX2 && y - 10 <= game.cameraY2)
		{
			var aoe = (comboDeath == "1" && this.weapon.comboAoe) ? this.weapon.comboAoe : this.aoe;
			var sound = this.weapon.impactSound ? SOUND[this.weapon.impactSound] : SOUND.EXPLODE;
			if(comboDeath == "1" && this.weapon.impactSoundCombo)
				sound = SOUND[this.weapon.impactSoundCombo];
			
			aoe *= Math.pow(1.17, Math.min(this.timesShieldReflected, 3));
			
			createExplosion(x, y, aoe, null, this.weapon.redExplosion);
			soundManager.playSound(sound, x, y);
			game.corpseBounce(x, y, this.aoe);
		}
		
		if(this.rocketSound)
		{
			this.rocketSound.pause();
			this.rocketSound.currentTime = 0;
		}
		
		return;
	}
	
	if(!(this.x + 4 >= game.cameraX && this.y + 4 >= game.cameraY && this.x - 4 <= game.cameraX2 && this.y - 4 <= game.cameraY2) || game.fastForward)
		return;
	
	var x_ = this.x;
	var y_ = this.y;
	
	var stepX = this.vecX / 100;
	var stepY = this.vecY / 100;
	
	var i = 0;
	while(game.getFieldPath(Math.floor(x_), Math.floor(y_)) <= 5)
	{
		x_ -= stepX;
		y_ -= stepY;
		
		i++;
		if(i > 200)
			return;
	}
	
	i = 0;
	while(game.getFieldPath(Math.floor(x_), Math.floor(y_)) > 5 && i < 200)
	{
		x_ += stepX;
		y_ += stepY;
		
		i++;
		if(i > 200)
			return;
	}
	
	var p1x = x_ - stepX;
	var p1y = y_ + stepY;
	
	var p2x = x_ + stepX;
	var p2y = y_ - stepY;
	
	var p3x = x_ - stepX;
	var p3y = y_ - stepY;
	
	var px = 0;
	var py = 0;
	
	if(game.getFieldPath(Math.floor(p1x), Math.floor(p1y)) > 5)
	{
		var px = p1x;
		var py = p1y;
	}
	
	else if(game.getFieldPath(Math.floor(p2x), Math.floor(p2y)) > 5)
	{
		var px = p2x;
		var py = p2y;
	}
	
	else if(game.getFieldPath(Math.floor(p3x), Math.floor(p3y)) > 5)
	{
		var px = p3x;
		var py = p3y;
	}
	
	else
		return;
	
	var stepX1 = ((px + x_ - stepX) / 2 - x_) * 50;
	var stepY1 = ((py + y_ - stepY) / 2 - y_) * 50;
	
	stepX = (px - x_) * 50;
	stepY = (py - y_) * 50;
	
	if(this.weapon.normalProjectile) // if mg
	{
		var x_circular = stepY1 > stepX1 ? 1 : 0;
		var y_circular = stepX1 > stepY1 ? 1 : 0;
		var z_circular = 1;
		
		for(var i = 0; i < 9; i++)
			new Sprite({
				x: x_,
				y: y_,
				img: imgCoords.particle2,
				scaleFunction: function(age){ return this.r4; },
				age: 10 + Math.random() * 30,
				r1: Math.random() * 0.6 + 0.7,
				r2: stepX1 * 0.6 + 0.8 * Math.random() - 0.4,
				r3: stepY1 * 0.6 + 0.8 * Math.random() - 0.4,
				r4: Math.random() * 1.0 + 0.5,
				zFunction: function(age){ return 0.6 * Math.max(0.3, Math.abs(Math.cos(age * this.r1 * 0.2)) / Math.max(1, age * 0.2)); },
				xFunction: function(age){ return (-5 / (Math.min(age, 7) * 0.28 + 1.6) + 3) * this.r2; },
				yFunction: function(age){ return (-5 / (Math.min(age, 7) * 0.28 + 1.6) + 3) * this.r3; }
			});
		
		for(var i = 0; i < 4; i++)
			new Sprite({
				x: x_,
				y: y_ - SHOT_HEIGHT,
				img: imgCoords.dust2,
				scaleFunction: function(age){ return this.r4 + age * 0.04; },
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.2; },
				age: 20 + Math.random() * 10,
				r1: Math.random() * 0.6 + 0.7,
				r2: (stepX1 * 0.6 + 0.4 * Math.random() - 0.2) * ((i + 1) / 3),
				r3: (stepY1 * 0.6 + 0.4 * Math.random() - 0.2) * ((i + 1) / 3),
				r4: Math.random() * 0.2 + 0.7,
				xFunction: function(age){ return (-5 / (age * 0.9 + 2.5) + 2) * this.r2 * 0.5; },
				yFunction: function(age){ return (-5 / (age * 0.9 + 2.5) + 2) * this.r3 * 0.5; }
			});
			
		for(var i = 0; i < Math.PI * 2; i += 0.7 + 0.4 * Math.random())
			new Sprite({
				x: x_,
				y: y_ - SHOT_HEIGHT,
				img: imgCoords.dust2,
				scaleFunction: function(age){ return this.r4 + age * 0.04; },
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.2; },
				age: 20 + Math.random() * 10,
				rX: x_circular * Math.sin(i) * (Math.random() * 0.8 + 0.6),
				rY: y_circular * Math.sin(i) * (Math.random() * 0.8 + 0.6),
				rZ: z_circular * Math.cos(i) * (Math.random() * 0.8 + 0.6),
				r4: Math.random() * 0.2 + 0.5,
				xFunction: function(age){ return (-5 / (age * 0.9 + 2.5) + 2) * this.rX * 0.2; },
				yFunction: function(age){ return (-5 / (age * 0.9 + 2.5) + 2) * this.rY * 0.2; },
				zFunction: function(age){ return (-5 / (age * 0.9 + 2.5) + 2) * this.rZ * 0.2; }
			});
		
		if(!this.isMulti)
			soundManager.playSound(SOUND.GUN_IMPACT, x_, y_, 1.0);
	}
	
	if(this.weapon.isLaser) // if laser cannon
	{
		// impact smoke
		for(var k = 0; k < 3; k++)
			new Sprite({
				x: x_ + Math.random() * 0.6 - 0.3,
				y: y_ + Math.random() * 0.6 - 0.3,
				img: imgCoords.dust1,
				scaleFunction: function(age){ return this.scale_ - age * 0.01; },
				scale_: Math.random() + 1,
				alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.4; },
				age: (1.7 + Math.random()) * 20,
				z_: Math.random() * 40 + 12,
				zFunction: function(age){ return SHOT_HEIGHT + age / this.z_; }
			});
		
		for(var i = 0; i < 7; i++)
			new Sprite({
				x: x_,
				y: y_,
				img: imgCoords[this.weapon.particle],
				scaleFunction: function(age){ return this.r4 - age * 0.2; },
				age: 5 + Math.random() * 5,
				r1: Math.random() * 0.6 + 0.7,
				r2: stepX * 0.6 + stepX * 0.8 * Math.random(),
				r3: stepY * 0.6 + stepY * 0.8 * Math.random(),
				r4: Math.random() * 2 + 1,
				zFunction: function(age){ return 0.6 * Math.max(0.3, Math.abs(Math.cos(age * this.r1 * 0.2)) / Math.max(1, age * 0.2)); },
				xFunction: function(age){ return (-5 / (age * 0.08 + 1) + 5) * this.r2; },
				yFunction: function(age){ return (-5 / (age * 0.08 + 1) + 5) * this.r3; }
			});
		
		soundManager.playSound(SOUND.SIZZLE, x_, y_, 0.35);
		
		// light
		new Sprite({
			x: x_,
			y: y_,
			img: imgCoords[this.weapon.light],
			scaleFunction: function(age){ return Math.max(0, 4 - age / this.ticksToLive * 4); },
			alphaFunction: function(age) { return Math.max(0, 1 - age / this.ticksToLive) * 0.17; },
			age: 15,
		});
	}
};

Projectile.prototype.getYDrawingOffset = function()
{
	return this.y;
};

Projectile.prototype.draw = function(exactTicks, x1, y1, x2, y2, percentageOfCurrentTickPassed)
{
	if(!(this.x + 3 >= x1 && this.y + 3 >= y1 && this.x - 3 <= x2 && this.y - 3 <= y2) || this.dieAt)
		return;
	
	var x = this.x0 + percentageOfCurrentTickPassed * (this.x - this.x0);
	var y = (this.y0 + percentageOfCurrentTickPassed * (this.y - this.y0)) - SHOT_HEIGHT;
	
	var x2 = x + this.drawLenX;
	var y2 = y + this.drawLenY;
	
	if(this.weapon.isZombieRangedWeapon)
	{
		// projectile img
		var scale = SCALE_FACTOR * (this.weapon.projectileScale ? this.weapon.projectileScale : 1);
		scale += scale * 0.18 * Math.sin(exactTicks * 0.6);
		c.drawImage(imgs.rangedZombie, 24, 24 * 9, 24, 24, (x - game.cameraX) * FIELD_SIZE - 24 / 2 * scale, (y - game.cameraY) * FIELD_SIZE - 24 / 2 * scale, 24 * scale, 24 * scale);
	}
	
	else if(this.weapon.projectileImg) // custom projectile
	{
		this.direction = this.weapon.directions == 16 ? getDirectionFromAgle16(this.x0, this.y0, this.x, this.y) : getDirectionFromAgle(this.x0, this.y0, this.x, this.y);
		if(this.weapon.directions == 1)
			this.direction = 0;
		
		if(this.weapon.isRocket && !this.weapon.noRocketEffects)
		{
			var vecY = this.x0 - this.x;
			var vecX = -(this.y0 - this.y);
			
			var len = Math.sqrt(vecX * vecX + vecY * vecY);
			var targetLen = 0.12 * Math.sin(exactTicks / 1.5);
			
			x += vecX * targetLen / len;
			y += vecY * targetLen / len;
			
			// fire
			var img = imgCoords.fire5;
			var xF = x - this.drawLenX * 0.7;
			var yF = y - this.drawLenY * 0.7;
			var scale = SCALE_FACTOR * 0.9 * (Math.random() * 0.6 + 0.6);
			c.globalAlpha = Math.random() * 0.5 + 0.2;
			c.drawImage(imgs.miscSheet, img.x, img.y, img.w, img.h, (xF - game.cameraX) * FIELD_SIZE - (img.w / 2) * scale, (yF - game.cameraY) * FIELD_SIZE - (img.h / 2) * scale, img.w * scale, img.h * scale);
			c.globalAlpha = 1;
			
			// fire2
			var img = imgCoords.fire4;
			var xF = x - this.drawLenX * 1.05;
			var yF = y - this.drawLenY * 1.05;
			var scale = SCALE_FACTOR * 0.9 * (Math.random() * 0.6 + 0.6);
			c.globalAlpha = Math.random() * 0.5 + 0.2;
			c.drawImage(imgs.miscSheet, img.x, img.y, img.w, img.h, (xF - game.cameraX) * FIELD_SIZE - (img.w / 2) * scale, (yF - game.cameraY) * FIELD_SIZE - (img.h / 2) * scale, img.w * scale, img.h * scale);
			c.globalAlpha = 1;
		}
		
		// laser
		if(this.weapon.light)
		{
			var img = imgCoords[this.weapon.light];
			var size = FIELD_SIZE * (7.5 + getGameTickRng2(0, 1));
			
			c.globalAlpha = 0.08 + getGameTickRng(0, 0.04);
			c.drawImage(imgs.miscSheet, img.x, img.y, img.w, img.h, (x - game.cameraX) * FIELD_SIZE - size / 2, (y + 0.5 - game.cameraY) * FIELD_SIZE - size / 2, size, size);
			c.globalAlpha = 1;
			
			img = imgCoords.light_white;
			var size = FIELD_SIZE * (7.5 + getGameTickRng(0, 1));
			
			c.globalAlpha = 0.08 + getGameTickRng2(0, 0.04);
			c.drawImage(imgs.miscSheet, img.x, img.y, img.w, img.h, (x - game.cameraX) * FIELD_SIZE - size / 2, (y + 0.5 - game.cameraY) * FIELD_SIZE - size / 2, size, size);
			c.globalAlpha = 1;
		}
		
		if(this.weapon.glowLightImg)
		{
			var img = imgCoords[this.weapon.glowLightImg];
			var scale = SCALE_FACTOR * 4;
			c.globalAlpha = 0.25;
			c.drawImage(imgs.miscSheet, img.x, img.y, img.w, img.h, (x - game.cameraX) * FIELD_SIZE - img.w / 2 * scale, (y + SHOT_HEIGHT - game.cameraY) * FIELD_SIZE - img.h / 2 * scale, img.w * scale, img.h * scale);
			c.globalAlpha = 1;
		}
		
		// projectile img
		var img = imgCoords[this.weapon.projectileImg];
		var frameH = img.h / (this.weapon.directions ? this.weapon.directions : 8);
		var scale = SCALE_FACTOR * (this.weapon.projectileScale ? this.weapon.projectileScale : 1);
		var xMod = 0;
		var yMod = 0;
		
		if(this.weapon.projectileWiggle)
		{
			scale *= 0.9 + (Math.floor(game.ticksCounter * 0.5) * 0.91235) % 0.2;
			xMod = (-0.1 + (Math.floor(game.ticksCounter * 0.8) * 0.131235) % 0.2) * 0.7;
			yMod = (-0.1 + (Math.floor(game.ticksCounter * 1.1) * 0.1213555635) % 0.2) * .7;
		}
		
		c.drawImage(imgs.miscSheet, img.x, img.y + frameH * this.direction, img.w, frameH, (x + xMod - game.cameraX) * FIELD_SIZE - img.w / 2 * scale, (y + yMod - game.cameraY) * FIELD_SIZE - frameH / 2 * scale, img.w * scale, frameH * scale);
		
		/*
		if(this.weapon.reflection)
		{
			if(this.prediction.length < 30)
				this.makePrediction();
			
			c.fillStyle = "green";
			var size = SCALE_FACTOR * 2;
			for(var i = 0; i < this.prediction.length; i++)
				c.fillRect((this.prediction[i].x - game.cameraX) * FIELD_SIZE - size / 2, (this.prediction[i].y - SHOT_HEIGHT - game.cameraY) * FIELD_SIZE - size / 2, size, size);
		}
		*/
	}
};

var starttime = null;
var endtime = null;
let playingPlayer = game.playingPlayerID.toString()
for(var j = 0; j < game.projectiles.length; j++){
    if(game.projectiles[j].playerID == playingPlayer){
        if(starttime == null){
            starttime = time()
            console.log(game.projectiles[j].x, game.projectiles[j].y)
        } else {
            endtime = time()
            console.log(game.projectiles[j].x, game.projectiles[j].y)
            console.log("time between: ", endtime - starttime)
            starttime = null
            endtime = null
        }
    }
}