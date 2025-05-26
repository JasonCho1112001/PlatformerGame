class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 1000;
        this.DRAG = 1000;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -650;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2;
        this.MAX_SPEED = 600;  // you can adjust this as needed

        //Jump stuff
        this.isJumping = false;
        this.jumpTimer = 0;
        this.MIN_JUMP_TIME = 100; // in milliseconds

        //Camera stuff
        this.LOOKAHEAD = 200; // how far ahead the camera looks based on movement direction
        this.CAMERA_LERP = 0.05; // smoothness factor (0 = no follow, 1 = instant snap)
        this.currentLookahead = 0;
        this.lookaheadTarget = 0;
        this.LOOKAHEAD_THRESHOLD = 500;  // Minimum horizontal speed before lookahead activates

        //Wall Slide + Jump Stuff
        this.WALL_SLIDE_SPEED = 100;  // max slide speed when against wall
        this.WALL_JUMP_X = 500;   // Horizontal velocity away from the wall
        this.WALL_JUMP_Y = -650;  // Vertical jump strength from wall

        //Win
        this.gameWon = false;

        //Audio
        this.jumpSfx = this.sound.add('jump');
        this.jumpSfx.setVolume(1.2);

        this.coinSfx = this.sound.add('coin');
        this.jumpSfx.setVolume(3);

        this.footsteps = [
            this.sound.add('footstep1'),
            this.sound.add('footstep2')
        ];
        this.currentFootstepIndex = 0;
        this.footstepCooldown = 0; // time before next sound
        this.FOOTSTEP_INTERVAL = 150; // ms between steps
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 64, 64, 60, 20);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("tilesheet_complete", "tilemap_tiles");

        // Create layers (Bottom to Top Layer)
        this.bgLayer = this.map.createLayer("Layer 0", this.tileset, 0, 0);
        this.groundLayer = this.map.createLayer("Layer 1", this.tileset, 0, 0);
        //this.finishLayer = this.map.createLayer("Layer 2", this.tileset, 0, 0);
        

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });


        // TODO: Add createFromObjects here
         // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 35, 
        }); 
        this.flags = this.map.createFromObjects("Objects", {
            name: "flag",   
            key: "tilemap_sheet",
            frame: 190, 
        }); 
        // TODO: Add turn into Arcade Physics here
        // Since createFromObjects returns an array of regular Sprites, we need to convert 
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.flags, Phaser.Physics.Arcade.STATIC_BODY);

        this.physics.world.TILE_BIAS = 40; 

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        this.flagGroup = this.add.group(this.flags);

        this.coins.forEach(coin => {
            coin.setScale(1.5);  // visually double the size

            // Optional: reposition body if needed
            coin.body.setSize(coin.width / 2, coin.height / 2);  // hitbox stays default
            coin.body.setOffset(coin.width / 4, coin.height / 4); // center it
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        //my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setScale(this.SCALE);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: Add coin collision handler
         // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            //Play coin sound
            this.coinSfx.play();
        });

        this.physics.add.overlap(my.sprite.player, this.flagGroup, (obj1, obj2) => {
            if (!this.gameWon) { 
                this.gameWon = true;
                // Win code
                this.winText = this.add.text(
                    this.cameras.main.midPoint.x,   // X position (center of camera)
                    this.cameras.main.midPoint.y - 130,   // Y position (center of camera)
                    "YOU WIN! \n Press R to restart!",                     // Text content
                    {
                        fontFamily: "Arial",
                        fontSize: 48,
                        color: "#ffffff",
                        backgroundColor: "#000000",
                        padding: { x: 20, y: 10 },
                        align: "center"
                    }
                ).setOrigin(0.5); // Center the text
            }
            this.physics.world.pause();    
            this.time.paused = true;        
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');
//a
        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-T', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false;
        // TODO: Add movement vfx here

        //Trail
        my.vfx.trail = this.add.particles(0, 0, "kenny-particles", {
            frame: ['symbol_01.png'],
            // TODO: Try: add random: true
            random: false,
            scale: {start: 0.2, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 400,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.25}, 
            frequency: 20,
        });

        //Walking
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            random: true,
            scale: {start: 0.04, end: 0.01},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 200,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        //Wall Sliding
        my.vfx.walls = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true
            random: true,
            scale: {start: 0.15, end: 0.01},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 200,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });
        //Jumping
        my.vfx.jump = this.add.particles(0, 0, "kenny-particles", {
            frame: ['muzzle_01.png','muzzle_02.png', 'muzzle_03.png', 'muzzle_04.png','muzzle_05.png',],
            // TODO: Try: add random: true
            random: false,
            scale: {start: 0.2, end: 0.2},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 200,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });
        my.vfx.jump.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2 - 20, my.sprite.player.displayHeight / 2 - 35, false);
            //my.vfx.jump.setParticleSpeed(0, this.PARTICLE_VELOCITY);  // falling smoke


        my.vfx.walls.stop();
        my.vfx.jump.stop();
        my.vfx.trail.stop();
        my.vfx.walking.stop();

        //Control depth
        my.sprite.player.setDepth(1);   // Make player depth 1
        my.vfx.walking.setDepth(2);     
        my.vfx.walls.setDepth(2);
        my.vfx.jump.setDepth(2);
        my.vfx.trail.setDepth(0);

        // TODO: add camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        //this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(1.125);

        //Input
        this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    }

    update() {

        // Clamp the player's x position within the camera's visible bounds
        let cameraLeft = this.cameras.main.worldView.x;
        let cameraRight = cameraLeft + this.cameras.main.width;


        if ((cursors.left.isDown || this.aKey.isDown) && my.sprite.player.x - 16 > cameraLeft) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();
            }
            else { my.vfx.walking.stop(); }

        } else if ((cursors.right.isDown || this.dKey.isDown) && (my.sprite.player.x + my.sprite.player.displayWidth + 16) < cameraRight) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-35, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground
            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }else { my.vfx.walking.stop(); }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        

        //Wall Slide Stuff
        let touchingLeftWall = my.sprite.player.body.blocked.left;
        let touchingRightWall = my.sprite.player.body.blocked.right;
        let falling = my.sprite.player.body.velocity.y > 0;
        let inAir = !my.sprite.player.body.blocked.down;

        let pressingLeft = cursors.left.isDown || this.aKey.isDown;
        let pressingRight = cursors.right.isDown || this.dKey.isDown;

        let isWallSliding = inAir && falling && (
            (touchingLeftWall && pressingLeft) || 
            (touchingRightWall && pressingRight)
        );
        // Wall slide condition
        if (inAir && falling) {
            if ((touchingLeftWall && pressingLeft) || (touchingRightWall && pressingRight)) {
                // Clamp fall speed
                my.sprite.player.body.setVelocityY(Math.min(my.sprite.player.body.velocity.y, this.WALL_SLIDE_SPEED));
                // Make player sprite funny
                my.sprite.player.setScale(this.SCALE * 0.8, this.SCALE);
                // Start wall sliding vfx
                my.vfx.walls.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2 - 20, my.sprite.player.displayHeight / 2, false);
                my.vfx.walls.setParticleSpeed(0, this.PARTICLE_VELOCITY);  // falling smoke
                my.vfx.walls.start();
            } else { my.vfx.walls.stop();}
        } else {
            //Revert the funny
            my.sprite.player.setScale(this.SCALE, this.SCALE);
            //Stop vfx
            my.vfx.walls.stop();
        }

        // // Wall slide velocity clamp
        // if (isWallSliding) {
        //     my.sprite.player.body.setVelocityY(Math.min(my.sprite.player.body.velocity.y, this.WALL_SLIDE_SPEED));
        //     // Make player sprite funny
        //     my.sprite.player.setScale(this.SCALE * 0.8, this.SCALE);
        // } else { 
        //     //Revert the funny
        //     my.sprite.player.setScale(this.SCALE, this.SCALE);
        // } 

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        // Start jump
        if (my.sprite.player.body.blocked.down && (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.spaceKey))) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.isJumping = true;
            this.jumpTimer = 0;
            // Start jump vfx
            my.vfx.jump.explode();
            //Audio
            this.jumpSfx.play();
        }
        if (isWallSliding && (Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(this.spaceKey))) {
            if (touchingLeftWall) {
                my.sprite.player.setVelocityX(this.WALL_JUMP_X);  // Jump to the right
            } else if (touchingRightWall) {
                my.sprite.player.setVelocityX(-this.WALL_JUMP_X); // Jump to the left
            }

            my.sprite.player.setVelocityY(this.WALL_JUMP_Y); // Jump upward
            this.isJumping = true;
            this.jumpTimer = 0;
            // Start jump vfx
            my.vfx.jump.explode();
            //Audio
            this.jumpSfx.play();
        }
        
        // If holding jump and still ascending, continue counting jump time
        if (this.isJumping) {
            this.jumpTimer += this.game.loop.delta; // delta is time since last frame in ms

            // Cut jump only after minimum time has passed and player released jump
            if (!(cursors.up.isDown || this.spaceKey.isDown) && my.sprite.player.body.velocity.y < 0 && this.jumpTimer >= this.MIN_JUMP_TIME)  {
                my.sprite.player.body.setVelocityY(my.sprite.player.body.velocity.y * 0.5);
                this.isJumping = false;
            }

            // If player stops ascending or hits head, end jump state
            if (my.sprite.player.body.velocity.y >= 0) {
                this.isJumping = false;
            }
        }




        //Restart
        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
            this.physics.world.resume();    
            this.time.paused = false;        
            this.winText.destroy();
        }
        
        

        // Clamp the player's x position so they can't move off screen
        my.sprite.player.x = Phaser.Math.Clamp(my.sprite.player.x, cameraLeft, cameraRight - my.sprite.player.displayWidth);
        //Speed cap
        my.sprite.player.body.velocity.x = Phaser.Math.Clamp(my.sprite.player.body.velocity.x, -this.MAX_SPEED, this.MAX_SPEED);

        //Camera lookahead
        // Determine lookahead only if player is moving fast enough
        let vx = my.sprite.player.body.velocity.x;

        if (Math.abs(vx) >= this.LOOKAHEAD_THRESHOLD) {
            this.lookaheadTarget = Math.sign(vx) * this.LOOKAHEAD;
            //Trail
            // Start wall sliding vfx
            my.vfx.trail.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2 - 20, my.sprite.player.displayHeight / 2 - 20, false);
            my.vfx.trail.start();
        } else {
            this.lookaheadTarget = 0;  // no lookahead when below threshold
            my.vfx.trail.stop();
        }

        // Smoothly interpolate currentLookahead toward lookaheadTarget
        this.currentLookahead = Phaser.Math.Linear(this.currentLookahead, this.lookaheadTarget, 0.1);

        // Target camera center with smoothed lookahead
        let targetX = my.sprite.player.x + this.currentLookahead - this.cameras.main.width / 2;
        let targetY = my.sprite.player.y - this.cameras.main.height / 2;

        // Smooth camera scroll toward the target
        this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, targetX, this.CAMERA_LERP);
        this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetY, this.CAMERA_LERP);


        //Audio
        //Reduce cooldown each frame
        this.footstepCooldown -= this.game.loop.delta;

        const isRunning = (cursors.left.isDown || this.aKey.isDown || cursors.right.isDown || this.dKey.isDown);
        const isOnGround = my.sprite.player.body.blocked.down;

        if (isRunning && isOnGround && this.footstepCooldown <= 0) {
            this.footsteps[this.currentFootstepIndex].play({ volume: 0.5 });
            
            // Alternate to the other sound for next time
            this.currentFootstepIndex = (this.currentFootstepIndex + 1) % this.footsteps.length;

            // Reset cooldown
            this.footstepCooldown = this.FOOTSTEP_INTERVAL;
        }
    }
}