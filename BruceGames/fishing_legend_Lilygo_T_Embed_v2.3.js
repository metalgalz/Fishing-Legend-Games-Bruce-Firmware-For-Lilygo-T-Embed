var d = require('display');
var k = require('keyboard');
var a = require('audio');
var storage = require('storage');
var serialApi = require('serial'); 

// --- ALIAS (RAM SAVER) ---
var M = Math.floor;
var R = Math.random;
var C = d.color;
var spr = d.createSprite();
var serialCmd = serialApi.cmd; 

function main() {
  // --- GENERAL CONFIGURATION ---
  var dw = d.width();
  var dh = d.height();

  // FIX: Game Width aligned (Responsive split)
  var gW = M(dw * 0.55) & ~7; 
  if (dw < 160) gW = dw - 40; 
  if (gW < 16) gW = 16; 
   
  var sX = gW;        

  // --- CONFIG FILE & STORAGE ---
  var folderPath = "/FishingLegendDB";
  
  // var fsType = "littlefs"; // Use this for Internal Storage (Uncomment to use)
  var fsType = "sd";       // Use this for SD Card (Default)

  try { serialCmd("storage mkdir " + folderPath); } catch(e) {} 

  var fishDbFile = {fs:fsType, path: folderPath + "/fish.json"}; 
  var rodDbFile  = {fs:fsType, path: folderPath + "/rod.json"}; 
  var charmDbFile= {fs:fsType, path: folderPath + "/charm.json"}; 
  var levelDbFile= {fs:fsType, path: folderPath + "/level.json"}; 
   
  var invFile    = {fs:fsType, path: folderPath + "/myfish.json"}; 
  var rodInvFile = {fs:fsType, path: folderPath + "/myrod.json"}; 
  var charmInvFile={fs:fsType, path: folderPath + "/mycharm.json"}; 
  var monFile    = {fs:fsType, path: folderPath + "/mymoney.json"};
  var levelInvFile={fs:fsType, path: folderPath + "/mylevel.json"}; 
   
  // Game State Data
  var gameData = { money: 0, items: {}, rods: [], charms: [], level: 1, exp: 0.00 }; 

  var sellPrice = [
    700,             // Common
    2500,            // Uncommon
    65000,           // Rare
    250000,          // Epic
    2500000,         // Legend
    95000000,        // Mythic
    850000000        // Secret
  ];

  // --- COLOR PALETTE ---
  var cK=C(0,0,0), cW=C(255,255,255), cSea=C(0,0,100), cBar=C(255,200,0);
  var cSun=C(255,255,0), cMoon=C(240,240,255), cStar=C(150,150,150);
  var sDay=C(135,206,235), sDusk=C(255,160,120), sNight=C(10,10,50);
  var cWave=C(60,60,180), cBird=C(50,50,50), cIsl=C(34,139,34), cShip=C(139,69,19);
  var cRodDefault=C(139,69,19); 
  var cRed=C(255,0,0); 
  var cBg=C(40,40,40), cBdr=C(180,180,180), cSep=C(100,100,100);
  var cGrn=C(0,255,0), cYel=C(255,255,0), cBoat=C(100,50,0);
  var cMenuSel=C(0, 255, 255);
  var cGold=C(255, 215, 0); 
  var cCloud=C(240,240,240);
  var cCloudNight=C(100,100,100); 
  var cRain=C(150, 150, 200); 
  var cRainSky=C(70, 70, 80); 
  var cDanger=C(255, 50, 50);
  var cExp=C(0, 200, 255); 
  var cSand=C(238, 214, 175);

  // Soft Colors for HUD
  var cSoftBg = C(50, 55, 65);
  var cSoftBdr = C(100, 110, 120);
  var cSoftExp = C(50, 100, 255); // Blue
  var cSoftTxt = C(220, 220, 230);

  var rCols = [
      C(200,200,200), // 0: Common
      C(50,255,50),   // 1: Uncommon
      C(50,100,255),  // 2: Rare
      C(200,0,255),   // 3: Epic
      C(255,165,0),   // 4: Legend
      C(255,50,50),   // 5: Mythic
      C(0,255,255)    // 6: Secret
  ];

  var baseDefaultFish = [{n:"Goldfish", r:0}, {n:"Nemo", r:1}, {n:"Piranha", r:2}, {n:"GreatWhite", r:3}, {n:"Megalodon", r:4}, {n:"Kraken", r:5}, {n:"Cthulhu", r:6}];
  var baseDefaultRods = [{n:"Starter Rod", r:0, p:100, d:40, l:10}];
  var baseDefaultCharms = [{n:"Rusty Coin", r:1, p:50000, d:25, l:1000}];
  var baseDefaultLevels = [{l:1, x:50}, {l:2, x:120}];

  var fishDB = []; 
  var rodDB = [];
  var charmDB = [];
  var levelDB = []; 
  var shopList = [];

  function loadDBs() {
      try {
          var c1 = storage.read(fishDbFile);
          if (c1) fishDB = JSON.parse(c1); else throw "e";
      } catch (e) {
          fishDB = baseDefaultFish;
          try { serialCmd("storage remove " + fishDbFile.path); storage.write(fishDbFile, JSON.stringify(baseDefaultFish)); } catch(err){}
      }
      try {
          var c2 = storage.read(rodDbFile);
          if (c2) rodDB = JSON.parse(c2); else throw "e";
      } catch (e) { rodDB = baseDefaultRods; }
      try {
          var c3 = storage.read(charmDbFile);
          if (c3) charmDB = JSON.parse(c3); else throw "e";
      } catch (e) { charmDB = baseDefaultCharms; }
      try {
          var c4 = storage.read(levelDbFile);
          if (c4) levelDB = JSON.parse(c4); else throw "e";
      } catch (e) { levelDB = baseDefaultLevels; }
  }
  loadDBs();

  // --- GLOBAL VARIABLES ---
  var appState = 0; 
  var menuIdx = 0;
  var invScroll = 0; 
  var invSel = 0;    
   
  var rec = [];
  var luck = [];
  var stars = []; for(var i=0;i<20;i++) stars.push({x:M(R()*gW), y:M(R()*(dh/2)), b:R()});
  var shootStar = { a: false, x: 0, y: 0, vx: 0, vy: 0, t: 0 };
   
  var st=0, mode=0; // mode: 0=Auto, 1=Man, 2=Menu
  var tmCast=0, tmBite=0, tmAct=0;
  var curF=null, fStam=0, maxStam=0;
  var tmDay=0, tmSpd=0.25; 
  var wOff=0;
  var notifMsg = ""; 
  var notifTm = 0;
   
  var bird={x:-20,y:10,a:false};
  
  var isl = { 
      x:-100, 
      a:false, 
      type:0, 
      trees:[], 
      fire:{ a:false }, 
      people: [] 
  }; 

  var ship={x:-40,a:false,type:0,vx:0,color:0}; 
  var shark={x:-40,a:false,vx:0,y:0};
  var jmp={x:0,y:0,vy:0,vx:0,a:false, type:0, cBody:0, cFin:0}; 
  var clouds=[];
  var mountains=[]; 
  var rain = { a: false, t: 0, tm: 0, drops: [] };
  var dayCount = 0;
  var nextRainDay = 5 + M(R()*3); 
  var moonType = 0; 

  // --- GRAPHICS HELPERS ---
  function fR(x, y, w, h, c) {
      if (c === undefined) return;
      spr.drawFillRect(M(x), M(y), M(w), M(h), c);
  }

  // Safe Draw Line to prevent undefined errors
  function sLine(x1, y1, x2, y2, c) {
      if (c === undefined) return;
      spr.drawLine(M(x1), M(y1), M(x2), M(y2), c);
  }

  function drCloud(x, y, isN) {
      var c = isN ? cCloudNight : cCloud;
      fR(x + 4, y + 2, 18, 10, c); 
      fR(x + 8, y, 10, 4, c); 
      fR(x, y + 5, 6, 6, c); 
      fR(x + 20, y + 4, 6, 6, c); 
  }

  function drMountain(mObj, y, isN) {
      var x = M(mObj.x);
      var h = mObj.h;
      var w = mObj.w;
      var r, g, b;
      
      // Volcano Colors (Type 2)
      if (mObj.t === 2) {
          if (isN) { r=30; g=20; b=20; } 
          else { r=60; g=50; b=50; }
      } else {
          // Standard Mountain Colors
          if(isN) {
              var v = M(mObj.cv * 20);
              r = 10 + v; g = 10 + v; b = 15 + v + 5;
          } else {
              var v = M(mObj.cv * 40);
              r = 60 + v; g = 60 + v; b = 65 + v;
          }
      }
      var cBase = C(r, g, b);
      var cSnow = cW;

      if(mObj.t === 0) { // Single Peak
          for(var i=0; i<h; i++) {
              var width = M((1 - (i/h)) * w);
              fR(x - width, y - i, width*2, 1, cBase);
          }
          for(var i=h-8; i<h; i++) {
              var width = M((1 - (i/h)) * w);
              fR(x - width, y - i, width*2, 1, cSnow);
          }
      } else if (mObj.t === 1) { // Double Peak
          for(var i=0; i<h; i++) {
              var width = M((1 - (i/h)) * w);
              fR(x - width, y - i, width*2, 1, cBase);
          }
          for(var i=h-8; i<h; i++) {
              var width = M((1 - (i/h)) * w);
              fR(x - width, y - i, width*2, 1, cSnow);
          }
          var h2 = M(h * 0.6); 
          var w2 = M(w * 0.7);
          var x2 = x - M(w * 0.8);
          for(var i=0; i<h2; i++) {
              var width = M((1 - (i/h2)) * w2);
              fR(x2 - width, y - i, width*2, 1, cBase);
          }
      } else if (mObj.t === 2) { // VOLCANO
          // Trapezoid shape (cut off top)
          var topCut = 0.2; // Cut top 20%
          var effectiveH = M(h * (1.0 - topCut));
          
          for(var i=0; i<effectiveH; i++) {
              var progress = i / h; // Progress relative to FULL hypothetical height
              var width = M((1 - progress) * w);
              fR(x - width, y - i, width*2, 1, cBase);
          }
          // Lava/Crater at top
          var topW = M((1 - (effectiveH/h)) * w);
          var lavaC = C(255, 60, 20); // Red Orange
          fR(x - topW + 1, y - effectiveH, (topW*2)-2, 2, lavaC); 

          // MELUBER / FLOWING LAVA
          sLine(x, y - effectiveH, x, y - effectiveH + 6, lavaC); 
          sLine(x - 2, y - effectiveH, x - 3, y - effectiveH + 4, lavaC);
          sLine(x + 2, y - effectiveH, x + 3, y - effectiveH + 4, lavaC);
      }
  }

  function drCity(x, y, isN) {
      var cConc = isN ? C(30,30,40) : C(100,100,110);
      // Soft Windows: Warm soft yellow at night, Soft blue-grey at day
      var cWin = isN ? C(200, 200, 160) : C(160, 170, 180); 
      
      // Building 1 (Left)
      fR(x+2, y-25, 10, 25, cConc);
      // Building 2 (Center)
      fR(x+14, y-38, 14, 38, cConc);
      // Building 3 (Right)
      fR(x+30, y-18, 10, 18, cConc);
      
      // Base
      fR(x, y-4, 45, 6, C(50,50,50));
      // Antenna
      fR(x+3, y-28, 8, 3, cConc); 
      sLine(x+7, y-28, x+7, y-34, isN?cRed:C(200,200,200)); 

      // MORE WINDOWS
      if(isN) {
        // Bldg 1 Windows
        for(var wy=y-22; wy<y-6; wy+=4) {
            spr.drawPixel(x+4, wy, cWin); spr.drawPixel(x+8, wy, cWin);
        }
        // Bldg 2 Windows
        for(var wy=y-35; wy<y-6; wy+=4) {
             spr.drawPixel(x+16, wy, cWin); spr.drawPixel(x+20, wy, cWin); spr.drawPixel(x+24, wy, cWin);
        }
        // Bldg 3 Windows
        for(var wy=y-15; wy<y-6; wy+=4) {
             spr.drawPixel(x+32, wy, cWin); spr.drawPixel(x+36, wy, cWin);
        }
      } else {
        spr.drawPixel(x+4, y-20, cWin); spr.drawPixel(x+16, y-32, cWin);
      }
  }

  function drPalmTree(x, y, isN) {
      var trunkC = C(101, 67, 33);
      fR(x, y, 3, 2, trunkC); 
      fR(x+1, y-4, 2, 4, trunkC); 
      fR(x+2, y-8, 2, 4, trunkC); 
      fR(x+4, y-12, 2, 4, trunkC); 
      
      var leafC = isN ? C(20, 60, 20) : cIsl;
      var topX = x + 5; 
      var topY = y - 13;
      sLine(topX, topY, topX-6, topY+4, leafC);
      sLine(topX, topY, topX+6, topY+4, leafC);
      sLine(topX, topY, topX-4, topY-4, leafC);
      sLine(topX, topY, topX+4, topY-4, leafC);
  }

  // --- DRAW ISLAND & ACTIVITIES ---
  function drIsland(x, y, isN, now) {
      if(isl.type === 1) {
          drCity(x, y, isN);
          return;
      }
      
      // === SMOOTH ISLAND SHAPE (Layered Sand Dunes) ===
      // Base (Water level) - widest
      fR(x, y - 1, 60, 3, cSand); 
      
      // Stacking layers to create a smooth hill curve
      fR(x + 2, y - 2, 56, 1, cSand);
      fR(x + 4, y - 3, 52, 1, cSand);
      fR(x + 7, y - 4, 46, 1, cSand);
      fR(x + 10, y - 5, 40, 1, cSand);
      fR(x + 14, y - 6, 32, 1, cSand);
      fR(x + 18, y - 7, 24, 1, cSand);
      fR(x + 22, y - 8, 16, 1, cSand); // Peak
      
      for(var i=0; i<isl.trees.length; i++) {
          drPalmTree(x + isl.trees[i].off, y - 4, isN);
      }

      if(isl.fire.a) {
          var fx = x + 30; 
          var fy = y - 6;
          sLine(fx-2, fy, fx+2, fy, C(100,50,0));
          var fCol = (M(now/100)%2==0) ? C(255,100,0) : C(255,200,0);
          fR(fx-1, fy-2, 3, 2, fCol);
          spr.drawPixel(fx, fy-3, fCol);
          if(!isN && M(now/200)%2==0) {
             spr.drawPixel(fx+1, fy-5, C(200,200,200));
             spr.drawPixel(fx+2, fy-7, C(220,220,220));
          }
      }

      var cMan = isN ? C(150,150,200) : C(50,50,50); 
      for (var i = 0; i < isl.people.length; i++) {
          var p = isl.people[i];
          var mx = x + p.x;
          var my = y - 6;

          if (p.type === 0) {
              fR(mx, my-5, 2, 2, cMan); 
              sLine(mx+1, my-3, mx+1, my, cMan); 
              if(M(now/150)%2===0) {
                  spr.drawPixel(mx, my+1, cMan); spr.drawPixel(mx+2, my+1, cMan); 
              } else {
                  spr.drawPixel(mx+1, my+1, cMan); 
              }
              sLine(mx+1, my-3, mx, my-1, cMan); 
              sLine(mx+1, my-3, mx+2, my-1, cMan);
          }
          else if (p.type === 1) {
              fR(mx, my-2, 2, 2, cMan); 
              spr.drawPixel(mx+1, my, cMan); 
              spr.drawPixel(mx+2, my+1, cMan); 
          }
          else if (p.type === 2) {
              fR(mx, my-5, 2, 2, cMan); 
              sLine(mx+1, my-3, mx+1, my, cMan); 
              spr.drawPixel(mx, my+1, cMan); spr.drawPixel(mx+2, my+1, cMan); 
              sLine(mx+1, my-3, mx+3, my-5, cMan);
              
              var kx = M(mx + 15 + Math.sin(now/400)*5); 
              var ky = M(my - 25 + Math.cos(now/300)*3); 
              var cKite = C(255, 50, 50);
              sLine(mx+3, my-5, kx, ky+3, C(200,200,200)); 
              sLine(kx, ky, kx-2, ky+2, cKite);
              sLine(kx, ky, kx+2, ky+2, cKite);
              sLine(kx, ky+5, kx-2, ky+2, cKite);
              sLine(kx, ky+5, kx+2, ky+2, cKite);
          }
      }
  }

  function drShip(sObj, y, isN) {
      var x = M(sObj.x);
      var type = sObj.type;
      var vx = sObj.vx;
      var color = sObj.color; // Custom Color
      var dir = (vx > 0) ? 1 : -1; 

      if (type === 0) { 
          // Default brown or custom color
          var hullC = (color !== 0 && color !== undefined) ? color : (isN ? C(60, 40, 20) : C(139, 69, 19)); 
          var cabinC = isN ? C(40, 30, 20) : C(160, 82, 45);
          
          if (dir === 1) { 
              fR(x, y-2, 24, 6, hullC); 
              fR(x-2, y-4, 4, 6, C(50,50,50)); 
              fR(x+10, y-8, 8, 6, cabinC); 
              fR(x+10, y-9, 8, 1, C(80,40,20)); 
              sLine(x+14, y-8, x+14, y-14, C(200,200,200)); 
              fR(x+10, y-14, 4, 3, cRed); 
          } else { 
              fR(x, y-2, 24, 6, hullC); 
              fR(x+22, y-4, 4, 6, C(50,50,50)); 
              fR(x+6, y-8, 8, 6, cabinC); 
              fR(x+6, y-9, 8, 1, C(80,40,20)); 
              sLine(x+10, y-8, x+10, y-14, C(200,200,200)); 
              fR(x+10, y-14, 4, 3, cRed); 
          }
      } 
      else if (type === 1) { 
          var hullC = (color !== 0 && color !== undefined) ? color : (isN ? C(150, 150, 150) : cW); 
          var winC = C(50, 200, 255); 
          
          if (dir === 1) { 
              fR(x, y-2, 32, 7, hullC); 
              sLine(x+32, y-2, x+38, y-2, hullC); 
              sLine(x+32, y+4, x+36, y, hullC);
              fR(x+8, y-8, 18, 6, hullC); 
              fR(x+10, y-6, 14, 2, winC); 
              fR(x+12, y-11, 10, 3, hullC); 
          } else { 
              fR(x+6, y-2, 32, 7, hullC); 
              sLine(x+6, y-2, x, y-2, hullC); 
              sLine(x+6, y+4, x+2, y, hullC);
              fR(x+12, y-8, 18, 6, hullC); 
              fR(x+14, y-6, 14, 2, winC); 
              fR(x+16, y-11, 10, 3, hullC); 
          }
      }
      else if (type === 2) { 
          var hullC = (color !== 0 && color !== undefined) ? color : (isN ? C(80, 20, 20) : C(200, 50, 50)); 
          var sailC = cW;
          
          if (dir === 1) { 
              fR(x, y-1, 20, 5, hullC);
              sLine(x+10, y-1, x+10, y-20, C(100,50,0)); 
              fR(x+11, y-18, 6, 14, sailC); 
              sLine(x+10, y-18, x+18, y-6, sailC); 
          } else { 
              fR(x, y-1, 20, 5, hullC);
              sLine(x+10, y-1, x+10, y-20, C(100,50,0)); 
              fR(x+3, y-18, 6, 14, sailC); 
              sLine(x+10, y-18, x+2, y-6, sailC); 
          }
      }
  }

  function drSharkFin(x, y, flip, isN) {
      // Solid dark grey/blue for Megalodon look
      var cFin = isN ? C(20, 20, 30) : C(60, 60, 70); 
      
      if (!flip) { // Moving Left (Tip points back/right)
          // Draw stacked rectangles for solid shape
          fR(x, y, 16, 2, cFin); // Base
          fR(x+2, y-2, 12, 2, cFin);
          fR(x+4, y-4, 8, 2, cFin);
          fR(x+6, y-6, 6, 2, cFin);
          fR(x+8, y-8, 4, 2, cFin);
          fR(x+10, y-10, 2, 2, cFin); // Tip
          
          // Splash
          spr.drawPixel(x-2, y+1, C(200,200,255)); 
      } else { // Moving Right (Tip points back/left)
          fR(x, y, 16, 2, cFin);
          fR(x+2, y-2, 12, 2, cFin);
          fR(x+4, y-4, 8, 2, cFin);
          fR(x+4, y-6, 6, 2, cFin);
          fR(x+4, y-8, 4, 2, cFin);
          fR(x+4, y-10, 2, 2, cFin);

          // Splash
          spr.drawPixel(x+17, y+1, C(200,200,255)); 
      }
  }

  function drFish(x, y, flip, type, cBody, cFin, vy) {
      var rot = 0;
      if (vy !== undefined) {
         rot = M(vy * 1.5); 
         if(rot > 4) rot = 4; if(rot < -4) rot = -4;
      }
      
      function oY(baseY, isHead) {
          if (!flip) { 
             return baseY + (rot * isHead); 
          } else { 
             return baseY - (rot * isHead); 
          }
      }

      if (type === 3) { // DOLPHIN - NEW IMPROVED SHAPE
          var cDolph = C(80, 130, 200); // Lebih natural blue
          var cBelly = C(210, 230, 255);
          var cEye = C(20, 20, 40);
          
          if (!flip) { // Facing Left (Head Left)
              var ny = oY(y, 1);  // Nose Y adjustment
              var ty = oY(y, -1); // Tail Y adjustment

              // Body Main Mass (Smoother shape)
              fR(x+5, y, 14, 6, cDolph); 
              
              // Top Curve (Punggung)
              sLine(x+7, y-1, x+16, y-1, cDolph);
              
              // Belly (Perut)
              fR(x+6, y+4, 10, 2, cBelly);
              sLine(x+8, y+6, x+14, y+6, cBelly);

              // Head & Snout
              fR(x+2, ny, 4, 5, cDolph); // Head Base
              fR(x, ny+3, 2, 2, cDolph); // Snout/Beak tip
              spr.drawPixel(x+3, ny+2, cEye); // Eye

              // Dorsal Fin (Sirip Punggung - Curved back)
              sLine(x+11, y-1, x+9, y-4, cDolph);
              sLine(x+9, y-4, x+13, y-1, cDolph);
              
              // Tail Peduncle (Batang Ekor)
              sLine(x+19, y+2, x+22, ty+2, cDolph);
              sLine(x+19, y+4, x+22, ty+3, cDolph);

              // Tail Flukes (Ekor Bercabang)
              sLine(x+22, ty+2, x+25, ty, cDolph);   // Top fluke
              sLine(x+22, ty+3, x+24, ty+5, cDolph); // Bottom fluke
              sLine(x+25, ty, x+24, ty+5, cDolph);   // Edge

              // Pectoral Fin (Sirip Samping)
              sLine(x+7, y+4, x+5, y+7, cDolph);

          } else { // Facing Right (Head Right)
              var ny = oY(y, 1);
              var ty = oY(y, -1);

              // Body Main Mass
              fR(x+1, y, 14, 6, cDolph);
              
              // Top Curve
              sLine(x+4, y-1, x+13, y-1, cDolph);
              
              // Belly
              fR(x+4, y+4, 10, 2, cBelly);
              sLine(x+6, y+6, x+12, y+6, cBelly);

              // Head & Snout
              fR(x+14, ny, 4, 5, cDolph); // Head Base
              fR(x+18, ny+3, 2, 2, cDolph); // Snout
              spr.drawPixel(x+16, ny+2, cEye); // Eye

              // Dorsal Fin
              sLine(x+9, y-1, x+11, y-4, cDolph);
              sLine(x+11, y-4, x+7, y-1, cDolph);

              // Tail Peduncle
              sLine(x+1, y+2, x-2, ty+2, cDolph);
              sLine(x+1, y+4, x-2, ty+3, cDolph);

              // Tail Flukes
              sLine(x-2, ty+2, x-5, ty, cDolph);
              sLine(x-2, ty+3, x-4, ty+5, cDolph);
              sLine(x-5, ty, x-4, ty+5, cDolph);

              // Pectoral Fin
              sLine(x+13, y+4, x+15, y+7, cDolph);
          }
          return;
      }

      if (!cBody) cBody = C(50, 200, 255);
      if (!cFin) cFin = C(20, 100, 200);
      var cEye = C(255,255,255);
      
      var hY = oY(y, 1); 
      var tY = oY(y, -1); 

      if (type === 0) { 
          if (!flip) { 
              fR(x+2, y-2, 6, 6, cBody); 
              fR(x+1, y-1, 8, 4, cBody);
              fR(x, y, 10, 2, cBody);
              fR(x-2, tY-2, 2, 2, cFin); 
              fR(x-2, tY+2, 2, 2, cFin);
              fR(x-1, tY, 2, 2, cFin);
              fR(x+4, y-3, 2, 1, cFin); 
              fR(x+4, y+3, 2, 1, cFin); 
              fR(x+6, hY-1, 1, 1, cEye); 
          } else { 
              fR(x, y-2, 6, 6, cBody); 
              fR(x-1, y-1, 8, 4, cBody);
              fR(x-2, y, 10, 2, cBody);
              fR(x+8, tY-2, 2, 2, cFin); 
              fR(x+8, tY+2, 2, 2, cFin);
              fR(x+7, tY, 2, 2, cFin);
              fR(x+2, y-3, 2, 1, cFin); 
              fR(x+2, y+3, 2, 1, cFin); 
              fR(x+1, hY-1, 1, 1, cEye); 
          }
      } else if (type === 1) { 
          if (!flip) {
              fR(x, y-4, 8, 8, cBody); 
              fR(x-1, y-3, 10, 6, cBody);
              fR(x-3, tY-1, 2, 2, cFin); 
              fR(x+2, y-5, 2, 2, cFin); 
              fR(x+6, hY-2, 1, 1, cEye); 
          } else {
              fR(x, y-4, 8, 8, cBody);
              fR(x-1, y-3, 10, 6, cBody);
              fR(x+9, tY-1, 2, 2, cFin); 
              fR(x+4, y-5, 2, 2, cFin);
              fR(x+1, hY-2, 1, 1, cEye); 
          }
      } else { 
          if (!flip) { 
              fR(x-2, tY+2, 4, 3, cBody);
              fR(x-4, tY+3, 2, 2, cFin);
              fR(x+1, y-1, 6, 3, cBody);
              fR(x+6, hY+1, 4, 3, cBody);
              fR(x+8, hY+2, 1, 1, cEye);
          } else { 
              fR(x+6, tY+2, 4, 3, cBody);
              fR(x+10, tY+3, 2, 2, cFin);
              fR(x+1, y-1, 6, 3, cBody);
              fR(x-2, hY+1, 4, 3, cBody);
              fR(x-1, hY+2, 1, 1, cEye);
          }
      }
  }

  function drSun(x, y) {
      fR(x + 2, y, 6, 10, cSun);
      fR(x, y + 2, 10, 6, cSun);
      fR(x + 1, y + 1, 8, 8, cSun);
  }

  function drMoon(x, y) {
      fR(x + 2, y, 6, 10, cMoon);
      fR(x, y + 2, 10, 6, cMoon);
      fR(x + 1, y + 1, 8, 8, cMoon);
      if(moonType === 1) {
          var cCut = C(10,10,50); 
          fR(x - 2, y, 6, 10, cCut);
          fR(x - 4, y + 2, 10, 6, cCut);
      } else {
           fR(x + 3, y + 3, 2, 2, C(200,200,220)); 
      }
  }

  // --- STORAGE LOGIC ---
  function readJSON(f) {
      try {
          var d = storage.read(f);
          if(d) {
              var lines = d.split("\n");
              for(var i=lines.length-1; i>=0; i--) {
                  if(lines[i] && lines[i].trim().length>0) return JSON.parse(lines[i]);
              }
          }
      } catch(e) {}
      return null;
  }

  function loadData() {
    var mData = readJSON(monFile);
    if(mData && mData.money !== undefined) gameData.money = mData.money;
    var iData = readJSON(invFile);
    if(iData) gameData.items = iData;
    var rData = readJSON(rodInvFile);

    // --- BALANCING MASTER LIST ---
    var rodSpecs = {
        "Bamboo Rod": {r:0, p:0, d:0, l:5}, // Free rod
        "Starter Rod": {r:0, p:100, d:40, l:15},
        "10+ Rod": {r:2, p:0, d:0, l:50, reqL:10},
        "20+ Rod": {r:3, p:0, d:0, l:100, reqL:20},
        "40+ Rod": {r:4, p:0, d:0, l:1000, reqL:40},
        "60+ Rod": {r:5, p:0, d:0, l:5000, reqL:60}
    };

    var charmSpecs = {
        "Rusty Coin": {r:1, p:50000, d:25, l:1000}
    };

    if (rData && rData.length > 0) {
        gameData.rods = rData.map(function(r) { 
            if (r.q === undefined) r.q = 1; 
            // FORCE UPDATE STATS FROM CODE (BALANCING)
            if (rodSpecs[r.n]) {
                var s = rodSpecs[r.n];
                r.r = s.r; 
                r.p = s.p; 
                r.d = s.d; 
                r.l = s.l; // Sync Luck
                if(s.reqL) r.reqL = s.reqL;
                
                // Fix durability logic: if switching from finite to infinite
                if(r.d === 0) r.curD = 0; 
                // Note: We don't reset curD if finite, to preserve usage state
            }
            return r; 
        });
        saveRods(); 
    } else {
        // Init default with synced stats
        var def = rodSpecs["Bamboo Rod"];
        gameData.rods = [{n:"Bamboo Rod", r:def.r, p:def.p, d:def.d, curD:0, l:def.l, q:1, use:true}];
        saveRods();
    }

    var cData = readJSON(charmInvFile);
    if (cData && cData.length > 0) {
        gameData.charms = cData.map(function(c) {
             if(charmSpecs[c.n]) {
                 var s = charmSpecs[c.n];
                 c.r = s.r;
                 c.p = s.p;
                 c.d = s.d;
                 c.l = s.l; // Sync Luck
             }
             return c;
        });
    } else {
        gameData.charms = []; 
    }
    
    var lData = readJSON(levelInvFile);
    if (lData) {
        gameData.level = lData.lvl || 1;
        gameData.exp = lData.exp || 0.00;
    } else {
        gameData.level = 1;
        gameData.exp = 0.00;
        saveLevel();
    }
  }

  function saveItems() { try { serialCmd("storage remove " + invFile.path); storage.write(invFile, JSON.stringify(gameData.items) + "\n"); } catch(e){} }
  function saveMoney() { try { serialCmd("storage remove " + monFile.path); storage.write(monFile, JSON.stringify({money: gameData.money}) + "\n"); } catch(e){} }
  function saveRods()  { try { serialCmd("storage remove " + rodInvFile.path); storage.write(rodInvFile, JSON.stringify(gameData.rods) + "\n"); } catch(e){} }
  function saveCharms(){ try { serialCmd("storage remove " + charmInvFile.path); storage.write(charmInvFile, JSON.stringify(gameData.charms) + "\n"); } catch(e){} }
  function saveLevel() { try { serialCmd("storage remove " + levelInvFile.path); storage.write(levelInvFile, JSON.stringify({lvl: gameData.level, exp: gameData.exp}) + "\n"); } catch(e){} }
  function saveAll() { saveItems(); saveMoney(); saveRods(); saveCharms(); saveLevel(); }
  loadData();

  function getW(r) {
    var min=1, max=5;
    if(r==1){min=2; max=10;} if(r==2){min=10; max=50;} if(r==3){min=50; max=200;}
    if(r==4){min=200; max=1000;} if(r==5){min=1000; max=5000;} if(r==6){min=5000; max=9999;}
    return min + (R()*(max-min));
  }
   
  function fmtP(n) {
      var i = M(n);
      var f = M((n - i) * 100);
      var s = f.toString();
      if(s.length < 2) s = "0" + s;
      return i + "." + s + "%";
  }

  function fmtM(n) {
      if (n >= 1000000000000) return (n / 1000000000000).toFixed(2) + "T";
      if (n >= 1000000000) return (n / 1000000000).toFixed(2) + "B";
      if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
      if (n >= 1000) return (n / 1000).toFixed(1) + "k";
       
      var s = M(n).toString();
      var res = "";
      var cnt = 0;
      for (var i = s.length - 1; i >= 0; i--) {
          res = s.charAt(i) + res;
          cnt++;
          if (cnt % 3 === 0 && i !== 0) res = "," + res;
      }
      return res;
  }

  function fmtExp(n) {
      if (n >= 1000000) {
          var v = (n / 1000000).toFixed(2);
          if(v.length > 4) v = (n / 1000000).toFixed(1);
          return v + "m";
      }
      if (n >= 1000) {
          return M(n / 1000) + "k";
      }
      return fmtM(M(n));
  }

  function drShopStats() {
      spr.setTextAlign(0); // Left
      spr.setTextColor(cW);
      spr.drawText("Lv : " + gameData.level, 10, 10);
      spr.setTextAlign(1); // Center
      spr.setTextColor(cGold); 
      spr.drawText("$ " + fmtM(gameData.money), dw/2, 45);
  }

  // --- ROD SYSTEM ---
  function getCurRod() {
      for(var i=0; i<gameData.rods.length; i++) { if(gameData.rods[i].use) return gameData.rods[i]; }
      if(gameData.rods.length === 0) { gameData.rods.push({n:"Bamboo Rod", r:0, p:0, d:0, curD:0, l:5, q:1, use:true}); }
      gameData.rods[0].use = true; return gameData.rods[0];
  }

  function autoEquip(brokenRarity) {
      for(var i=0; i<gameData.rods.length; i++) gameData.rods[i].use = false;
      var bestIdx = -1; var bestR = -1;
      for(var i=0; i<gameData.rods.length; i++) {
          var r = gameData.rods[i].r;
          if (r <= brokenRarity) { if (r > bestR) { bestR = r; bestIdx = i; } }
      }
      if (bestIdx === -1 && gameData.rods.length > 0) {
           var minR = 999;
           for(var i=0; i<gameData.rods.length; i++) { if(gameData.rods[i].r < minR) { minR = gameData.rods[i].r; bestIdx = i; } }
      }
      if (bestIdx !== -1) { 
          gameData.rods[bestIdx].use = true; 
          notifMsg = "Equipped: " + gameData.rods[bestIdx].n; 
      } else { 
          gameData.rods.push({n:"Bamboo Rod", r:0, p:0, d:0, curD:0, l:5, q:1, use:true}); 
          notifMsg = "Equipped: Bamboo Rod"; 
      }
      notifTm = new Date().getTime();
  }

  function useRod() {
      var rod = getCurRod();
      if(rod.d > 0) { 
          rod.curD--;
          if(rod.curD <= 0) {
              if(a&&a.tone) a.tone(100, 500); 
              rod.q--;
              if(rod.q > 0) { 
                  rod.curD = rod.d; 
                  notifMsg = rod.n + " Broke! (Used Spare)"; 
                  notifTm = new Date().getTime(); 
              } else {
                  var brokenRarity = rod.r; var brokenIdx = -1;
                  for(var i=0; i<gameData.rods.length; i++) { if(gameData.rods[i]===rod) brokenIdx=i; }
                  if(brokenIdx !== -1) gameData.rods.splice(brokenIdx, 1);
                  autoEquip(brokenRarity);
              }
          }
          saveRods();
      }
  }

  function buyRod(rodToBuy) {
      var req = rodToBuy.reqL || 0; 
      if (gameData.level < req) {
          notifMsg = "NEED LVL " + req + "!"; notifTm = new Date().getTime(); if(a&&a.tone) a.tone(200, 200);
          return;
      }
      if (gameData.money >= rodToBuy.p) {
          gameData.money -= rodToBuy.p;
          var existingIdx = -1;
          for(var i=0; i<gameData.rods.length; i++) { if(gameData.rods[i].n === rodToBuy.n) { existingIdx = i; break; } }
           
          if (existingIdx !== -1) { 
             gameData.rods[existingIdx].q++; 
          } else { 
             var newRod = { n: rodToBuy.n, r: rodToBuy.r, p: rodToBuy.p, d: rodToBuy.d, curD: rodToBuy.d, l: rodToBuy.l, q: 1, use: false }; 
             gameData.rods.push(newRod); 
          }
          saveAll(); notifMsg = "BOUGHT " + rodToBuy.n; notifTm = new Date().getTime(); if(a&&a.tone) { a.tone(1000, 100); delay(50); a.tone(2000, 200); }
      } else { notifMsg = "NOT ENOUGH MONEY!"; notifTm = new Date().getTime(); if(a&&a.tone) a.tone(200, 200); }
  }

  function equipRod(idx) {
      for(var i=0; i<gameData.rods.length; i++) gameData.rods[i].use = false;
      gameData.rods[idx].use = true; saveRods(); if(a&&a.tone) a.tone(1500, 100);
  }

  // --- CHARM SYSTEM ---
  function buyCharm(ch) {
      var req = ch.reqL || 0;
      if (gameData.level < req) {
          notifMsg = "NEED LVL " + req + "!"; notifTm = new Date().getTime(); if(a&&a.tone) a.tone(200, 200);
          return;
      }

      if(gameData.money >= ch.p) {
          gameData.money -= ch.p;
          var exIdx = -1;
          for(var i=0; i<gameData.charms.length; i++) { if(gameData.charms[i].n === ch.n) { exIdx = i; break; } }
          if (exIdx !== -1) { 
            gameData.charms[exIdx].q++; 
          } else { 
            gameData.charms.push({ n:ch.n, r:ch.r, d:ch.d, curD:ch.d, l:ch.l, q:1, use:false }); 
          }
          saveAll(); notifMsg = "BOUGHT " + ch.n; notifTm = new Date().getTime(); if(a&&a.tone) { a.tone(1000, 100); delay(50); a.tone(2000, 200); }
      } else { notifMsg = "NOT ENOUGH MONEY!"; notifTm = new Date().getTime(); if(a&&a.tone) a.tone(200, 200); }
  }

  function toggleCharm(idx) {
      gameData.charms[idx].use = !gameData.charms[idx].use;
      saveCharms();
      if(a&&a.tone) a.tone(1500, 50);
  }

  function useCharms() {
      var brokenNames = [];
      for(var i = gameData.charms.length-1; i>=0; i--) {
          var ch = gameData.charms[i];
          if(ch.use) {
              if(ch.d > 0) {
                  ch.curD--;
                  if(ch.curD <= 0) {
                      ch.q--;
                      if(ch.q > 0) { ch.curD = ch.d; } 
                      else { 
                          gameData.charms.splice(i, 1); 
                          brokenNames.push(ch.n);
                      }
                  }
              }
          }
      }
      if(brokenNames.length > 0) {
          notifMsg = "Charm Depleted: " + brokenNames[0]; 
          notifTm = new Date().getTime(); 
          if(a&&a.tone) a.tone(100, 500); 
      }
      saveCharms();
  }

  // --- PITY MECHANIC ---
  function getTotalLuck() {
      var rod = getCurRod();
      var l = rod.l || 0;
      if (rod.d > 0) {
          if (rod.curD <= (rod.d * 0.25)) {
              l += (rod.l * 0.45); 
          } else if (rod.curD <= (rod.d * 0.5)) {
              l += (rod.l * 0.20); 
          }
      }
      for(var i=0; i<gameData.charms.length; i++) {
          if(gameData.charms[i].use) l += gameData.charms[i].l;
      }
      return M(l);
  }
   
  // --- EXP LOGIC ---
  function getLevelMax(lvl) {
      for(var i=0; i<levelDB.length; i++) {
          if(levelDB[i].l === lvl) return levelDB[i].x;
      }
      if(levelDB.length > 0) {
          var last = levelDB[0];
          for(var i=0; i<levelDB.length; i++) {
              if(levelDB[i].l <= lvl) last = levelDB[i];
          }
          var diff = lvl - last.l;
          return last.x * Math.pow(1.15, diff);
      }
      return 999999.00;
  }
   
  function checkRewards() {
      var rList = [
          {l:10, r:{n:"10+ Rod",r:2,p:0,d:0,curD:0,l:50,reqL:10,q:1,use:false}},
          {l:20, r:{n:"20+ Rod",r:3,p:0,d:0,curD:0,l:100,reqL:20,q:1,use:false}},
          {l:40, r:{n:"40+ Rod",r:4,p:0,d:0,curD:0,l:1000,reqL:40,q:1,use:false}},
          {l:60, r:{n:"60+ Rod",r:5,p:0,d:0,curD:0,l:5000,reqL:60,q:1,use:false}}
      ];
       
      var got = false;
      var lastN = "";
       
      for(var i=0; i<rList.length; i++) {
          if(gameData.level >= rList[i].l) {
              var rw = rList[i].r;
              var owned = false;
              for(var j=0; j<gameData.rods.length; j++) { if(gameData.rods[j].n === rw.n) owned = true; }
              if(!owned) {
                  gameData.rods.push(JSON.parse(JSON.stringify(rw)));
                  got = true;
                  lastN = rw.n;
              }
          }
      }
       
      if(got) {
          saveRods();
          if(a&&a.tone) { delay(50); a.tone(2000, 200); }
          return "GET " + lastN + "!";
      }
      return null;
  }

  var initMsg = checkRewards();
  if(initMsg) { notifMsg = initMsg; notifTm = new Date().getTime(); }

  function gainExp(amount) {
      if (gameData.level >= 100) return;

      gameData.exp += amount;
      var max = getLevelMax(gameData.level);
       
      while (gameData.exp >= max && gameData.level < 100) {
          gameData.exp -= max; 
          gameData.level++;
          max = getLevelMax(gameData.level); 
           
          if (gameData.level >= 100) {
              gameData.level = 100;
              gameData.exp = 0; 
              break;
          }

          var lvlMsg = "LEVEL UP! -> " + gameData.level;
          var rwMsg = checkRewards();
           
          if(rwMsg) notifMsg = rwMsg; 
          else if(notifMsg.indexOf("GET") === -1) notifMsg = lvlMsg; 
           
          notifTm = new Date().getTime();
          if(a&&a.tone) { a.tone(500,100); a.tone(1000,100); a.tone(1500,200); }
      }
      saveLevel();
  }

  function randF() {
    var activeRod = getCurRod();
    var rodRarity = activeRod.r;
    var minR = Math.max(0, rodRarity - 2); 
    var maxR = Math.min(6, rodRarity + 1);

    var luckBonus = getTotalLuck(); 
    var mult = 1.0 + (luckBonus / 100.0);                 
    var roll = R() * 100; 
    var r = 0; 
      
    var t6 = Math.min(50, 0.01 * mult);  
    var t5 = Math.min(65, 0.15 * mult);  
    var t4 = Math.min(95, 0.60 * mult);  
    var t3 = Math.min(99, 2.50 * mult);  
    var t2 = Math.min(100, 12.0 * mult); 
    var t1 = Math.min(100, 45.0 * mult); 
        
    if (roll < t6) r = 6;                 
    else if (roll < t5) r = 5;  
    else if (roll < t4) r = 4;  
    else if (roll < t3) r = 3;  
    else if (roll < t2) r = 2; 
    else if (roll < t1) r = 1; 
    else r = 0;                               

    if (r > maxR) { r = maxR; }
    if (r < minR) { r = minR; }
        
    var c = []; for(var i=0; i<fishDB.length; i++) { if(fishDB[i].r === r) c.push(fishDB[i]); }
    if (c.length === 0 && fishDB.length > 0) c.push(fishDB[0]);
    var picked = c[M(R()*c.length)];

    var baseHp = 10;
    var rarityBonus = [0, 12, 50, 200, 750, 2500, 9000]; 
    var sizeBonus = getW(r) * 0.5; 
      
    var totalHp = baseHp + rarityBonus[r] + sizeBonus;
    return { n: picked.n, r: r, w: getW(r), hp: totalHp };
  }

  function addS(f) {
    rec.unshift({name: f.n, w: f.w, r: f.r}); 
    if(rec.length > 3) rec.pop(); 
    if(f.r >= 3) { luck.push({ name: f.n, r: f.r, w: f.w }); luck.sort(function(a,b){if(b.r!=a.r)return b.r-a.r; return b.w-a.w;}); if(luck.length > 3) luck.pop(); } 
        
    if(!gameData.items[f.n]) { gameData.items[f.n] = { q: 0, r: f.r, p: sellPrice[f.r] }; }
      
    gameData.items[f.n].p = sellPrice[f.r];
    gameData.items[f.n].q++; 
    if(gameData.items[f.n].r < f.r) gameData.items[f.n].r = f.r;
      
    var val = sellPrice[f.r];
    var gainedExp = 25 + (f.r * 40) + M(val / 135);
    gainExp(gainedExp);
        
    useRod(); 
    useCharms(); 
    saveItems(); 
  }

  function sellF(name) {
      if(gameData.items[name] && gameData.items[name].q > 0) {
          var item = gameData.items[name];
          var p = (item.p !== undefined) ? item.p : sellPrice[item.r];
          var totalPrice = p * item.q; 
           
          gameData.money += totalPrice; delete gameData.items[name]; 
          if(invSel >= Object.keys(gameData.items).length && invSel > 0) invSel--;
          saveAll(); if(a&&a.tone) { a.tone(1200, 50); delay(50); a.tone(1800, 100); } 
      }
  }

  function sellAll() {
      var keys = Object.keys(gameData.items);
      if (keys.length === 0) {
          notifMsg = "NOTHING TO SELL!"; notifTm = new Date().getTime(); if(a&&a.tone) a.tone(200, 200);
          return;
      }
      var total = 0;
      for (var i=0; i<keys.length; i++) {
          var item = gameData.items[keys[i]];
          var p = (item.p !== undefined) ? item.p : sellPrice[item.r];
          total += p * item.q;
      }
      gameData.money += total;
      gameData.items = {}; 
      saveAll();
      notifMsg = "+$" + fmtM(total); notifTm = new Date().getTime();
      if(a&&a.tone) { a.tone(1000, 50); delay(50); a.tone(2000, 50); delay(50); a.tone(3000, 100); }
  }

  function drBox(x,y,h,t,c) {
    if(bW < 1 || h < 1) return;
    fR(x, y, bW, h, C(25, 30, 40)); 
    fR(x, y, bW, 14, c);
    sLine(x, y, x+bW-1, y, C(255,255,255));
    sLine(x, y+13, x+bW-1, y+13, C(0,0,0));
    spr.drawRect(x, y, bW, h, c);
    spr.setTextColor(C(0,0,0)); 
    spr.setTextAlign(1); 
    spr.drawText(t, x+M(bW/2), y+3);
  }
   
  // --- HUD DRAWER (IN-GAME) ---
  function drHud(y) {
      var bW = 24, bH = 12;
      var bX = 2; 
       
      // Soft Background
      fR(bX, y, bW, bH, cSoftBg); 
      spr.drawRect(bX, y, bW, bH, cSoftBdr);
       
      spr.setTextColor(cSoftTxt); spr.setTextAlign(1); spr.setTextSize(1);
      spr.drawText(gameData.level, bX + 12, y + 2);

      var barX = bX + bW + 4;
      var barW = gW - barX - 4; 
      var barH = 8;
      var barY = y + 2; 

      spr.drawRect(barX, barY, barW, barH, cSoftBdr);
      fR(barX+1, barY+1, barW-2, barH-2, C(30,30,35)); // Darker background for bar
       
      var max = getLevelMax(gameData.level);
      var pct = gameData.exp / max;
       
      if (gameData.level >= 100) {
          pct = 1;
      } else {
          if(pct > 1) pct = 1;
          if(pct < 0) pct = 0;
      }
       
      var fillW = M((barW - 2) * pct);
      if(fillW > 0) {
          fR(barX+1, barY+1, fillW, barH-2, cSoftExp); // Soft Cyan Exp
      }
       
      spr.setTextSize(0.5);
      spr.setTextColor(C(180,190,200)); // Softer text
      spr.setTextAlign(1); 
       
      var textX = barX + (barW/2);
      var textY = y + 12; 
       
      if (gameData.level >= 100) {
          spr.drawText("MAX", textX, textY);
      } else {
          spr.drawText(fmtExp(gameData.exp) + " / " + fmtExp(max), textX, textY);
      }
       
      spr.setTextSize(1);
  }
   
  function fmt(w) { var i=M(w), d=M((w-i)*100), s=d.toString(); if(s.length<2)s="0"+s; return i+"."+s+"kg"; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  
  function getSkyColor(t) {
    var c1, c2, p;
    var rN=[10,10,50], rD=[60,60,100], rM=[135,206,235], rS=[255,160,120];
    if(t<300) { c1=rN; c2=rD; p=t/300; } 
    else if(t<500) { c1=rD; c2=rM; p=(t-300)/200; } 
    else if(t<1500) { c1=rM; c2=rM; p=0; } 
    else if(t<1700) { c1=rM; c2=rS; p=(t-1500)/200; } 
    else if(t<1900) { c1=rS; c2=rN; p=(t-1700)/200; } 
    else { c1=rN; c2=rN; p=0; }
    return C(M(lerp(c1[0],c2[0],p)), M(lerp(c1[1],c2[1],p)), M(lerp(c1[2],c2[2],p)));
  }

  function getSeaColor(t) {
    var c1, c2, p;
    var rN=[5,5,30], rD=[20,40,100], rM=[0,60,150], rS=[60,40,90];
    if(t<300) { c1=rN; c2=rD; p=t/300; } 
    else if(t<500) { c1=rD; c2=rM; p=(t-300)/200; } 
    else if(t<1500) { c1=rM; c2=rM; p=0; } 
    else if(t<1700) { c1=rM; c2=rS; p=(t-1500)/200; } 
    else if(t<1900) { c1=rS; c2=rN; p=(t-1700)/200; } 
    else { c1=rN; c2=rN; p=0; }
    return C(M(lerp(c1[0],c2[0],p)), M(lerp(c1[1],c2[1],p)), M(lerp(c1[2],c2[2],p)));
  }

  function getShopRods() {
      var res = [];
      for(var i=0; i<rodDB.length; i++) {
          var r = rodDB[i];
          if(r.d === 0) { 
              var owned = false;
              for(var j=0; j<gameData.rods.length; j++) {
                  if(gameData.rods[j].n === r.n) { owned = true; break; }
              }
              if(!owned) res.push(r);
          } else {
              res.push(r);
          }
      }
      return res;
  }

  function getShopCharms() {
      var res = [];
      for(var i=0; i<charmDB.length; i++) {
          var c = charmDB[i];
          if(c.d === 0) { 
              var owned = false;
              for(var j=0; j<gameData.charms.length; j++) {
                  if(gameData.charms[j].n === c.n) { owned = true; break; }
              }
              if(!owned) res.push(c);
          } else {
              res.push(c);
          }
      }
      return res;
  }
  
  // Bar Logic
  var barW = (gW-20) & ~7; 
  if(barW < 8) barW = 8; 

  // Sidebar Size
  var bW = ((dw-gW)-6) & ~7; 
  if(bW < 8) bW = 8; 
  
  // --- RESPONSIVE SIDEBAR HEIGHT CALCULATION ---
  var bH1 = M(dh/3);
  var bH2 = M(dh/3);
  var bH3 = dh - bH1 - bH2; 

  var maxRecItems = Math.max(0, M((bH1 - 16) / 10));
  var maxLuckItems = Math.max(0, M((bH2 - 16) / 10));

  // Sky Logic
  var skyH = M(dh/2);
  var seaH = dh - skyH;
  // --- LAYOUT ADJUSTMENT ---
  var dkH=25; // Raised deck height 

  k.setLongPress(true);
  while(true) {
    var now = new Date().getTime();
    var ok = k.getSelPress(true);
    var nxt = k.getNextPress(true);
    var prv = k.getPrevPress(true);
        
    if(k.getEscPress(true)) {
        if(a&&a.tone) a.tone(400, 50);
        if(appState === 0) break; 
        else if(appState === 1) appState = 0; 
        else if(appState === 2) appState = 0; 
        else if(appState === 3) appState = 2; 
        else if(appState === 4) appState = 2; 
        else if(appState === 5) appState = 0; 
        else if(appState === 6) appState = 5; 
        else if(appState === 7) appState = 5; 
        else if(appState === 8) appState = 2; 
        delay(200);
        continue;
    }

    spr.fill(cK);
    spr.setTextColor(cW);
    spr.setTextAlign(1);

    if (notifMsg !== "" && now - notifTm > 2500) { notifMsg = ""; }

    if (appState === 0) {
        spr.setTextSize(2); spr.drawText("FISHING LEGEND", dw/2, 20); spr.setTextSize(1);
          
        spr.setTextAlign(0); // Left
        spr.setTextColor(cW);
        spr.drawText("Lv : " + gameData.level, 10, 10);
        spr.setTextAlign(1); // Center Restore
          
        spr.setTextColor(cGold); 
        spr.drawText("$ " + fmtM(gameData.money), dw/2, 45);
          
        var opts = ["START GAME", "SHOP", "INVENTORY", "EXIT"];
        if (nxt) { menuIdx++; if (menuIdx >= opts.length) menuIdx=0; if(a&&a.tone)a.tone(600,20); }
        if (prv) { menuIdx--; if (menuIdx < 0) menuIdx=opts.length-1; if(a&&a.tone)a.tone(600,20); }
        var menuY = 65;
        var menuX = dw/2; 
        for (var i = 0; i < opts.length; i++) {
            if (i === menuIdx) { spr.setTextColor(cMenuSel); spr.drawText("> " + opts[i] + " <", menuX, menuY + (i*15)); } 
            else { spr.setTextColor(C(100, 100, 100)); spr.drawText(opts[i], menuX, menuY + (i*15)); }
        }

        spr.setTextSize(0.5); 
        
        spr.setTextColor(C(100, 100, 100)); // Greyish
        spr.drawText("Github by metalgalz", dw/2, dh - 17);

        spr.setTextColor(C(150, 50, 50)); 
        spr.drawText("NOT FOR SALE! THIS IS FREE", dw/2, dh - 8);
        spr.setTextSize(1); 

        if (ok) {
            if(a&&a.tone) a.tone(800, 100);
            if (menuIdx === 0) { appState = 1; st = 0; rec = []; luck = []; } 
            else if (menuIdx === 1) { appState = 5; menuIdx = 0; } 
            else if (menuIdx === 2) { appState = 2; menuIdx = 0; } 
            else if (menuIdx === 3) { break; } 
            delay(200);
        }

    } else if (appState === 1) {
        var activeRod = getCurRod();
        var vld = ok; 
        tmDay += tmSpd; if(tmDay>2000) { 
            tmDay=0; 
            dayCount++;
            if(dayCount >= nextRainDay) {
                rain.a = true;
                rain.t = (R() > 0.7) ? 1 : 0; 
                rain.tm = 800 + M(R()*400);        
                nextRainDay = dayCount + 5 + M(R()*3); 
            }
        }
        var curSky = getSkyColor(tmDay);
        var curSea = getSeaColor(tmDay); 
        var isN = (tmDay < 400 || tmDay > 1800); 
        
        if (tmDay > 1800 && tmDay < 1805) { moonType = (R() > 0.5) ? 1 : 0; }

        if (rain.a) {
             rain.tm--;
             if(rain.tm <= 0) rain.a = false;
             if (now % 2 === 0) {
                 var spawnRate = (rain.t===1) ? 2 : 1; 
                 for(var i=0; i<spawnRate; i++) {
                     if(rain.drops.length < 40) { 
                        rain.drops.push({x: M(R()*gW), y: -10, l: (rain.t===1)?6:3, s: (rain.t===1)?5:3});
                     }
                 }
             }
        }
        for (var i = rain.drops.length - 1; i >= 0; i--) {
            var p = rain.drops[i];
            p.y += p.s;
            if (rain.t === 1) sLine(p.x, p.y, p.x-2, p.y+p.l, cRain); 
            else sLine(p.x, p.y, p.x, p.y+p.l, cRain); 
        }
            
        if(R() > 0.985 && clouds.length < 3) { clouds.push({x: gW + 10, y: 5 + R()*20, s: 0.1 + R()*0.2}); }
        for(var i=clouds.length-1; i>=0; i--) { clouds[i].x -= clouds[i].s; if(clouds[i].x < -40) clouds.splice(i, 1); }

        // --- SPAWN MOUNTAINS WITH VARIETY ---
        if(R() > 0.995 && mountains.length < 2) { 
            var h = 25 + M(R()*20); 
            var w = 20 + M(R()*20); 
            var colVar = R(); 
            var type = M(R()*3); // 0=Single, 1=Double, 2=Volcano (New)
            mountains.push({x: gW + 20, h: h, w: w, cv: colVar, t: type}); 
        }
        for(var i=mountains.length-1; i>=0; i--) { mountains[i].x -= 0.05; if(mountains[i].x < -40) mountains.splice(i, 1); }

        if(!isN && R()>0.98 && !bird.a) { bird.a=true; bird.x=-10; bird.y=5+R()*20; }
        if(bird.a) { bird.x++; if(bird.x>gW) bird.a=false; }
            
        if(!isl.a && R()>0.995) { 
            isl.a=true; 
            isl.x=gW; 
            isl.type = (R() > 0.7) ? 1 : 0; 
            isl.trees = [];
            isl.people = []; 
            
            isl.fire.a = false;

            if(isl.type === 0) { // Nature Island
               var count = 1 + M(R()*3); 
               for(var i=0; i<count; i++) {
                   isl.trees.push({ off: 15 + M(R()*30), h: 14 }); // More centered trees
               }
               
               if (R() > 0.5) isl.fire.a = true;

               var pCount = 1 + M(R()*3);
               for(var i=0; i<pCount; i++) {
                   var pType = 0; 
                   if (isl.fire.a && i===0) pType = 1; 
                   else if (R() > 0.7) pType = 2; 
                   
                   isl.people.push({
                       x: 20 + M(R()*20), // Spawn more centered
                       type: pType,
                       dir: (R()>0.5)?1:-1
                   });
               }
            }
        }
        if(isl.a) { 
            isl.x-=0.2; 
            
            if(isl.type === 0) {
                for(var i=0; i<isl.people.length; i++) {
                    var p = isl.people[i];
                    if (p.type === 0) { 
                        p.x += (0.2 * p.dir);
                        if(p.x > 42) p.dir = -1; // Tighter bounds
                        if(p.x < 18) p.dir = 1;
                    }
                }
            }
            
            if(isl.x<-70) isl.a=false; 
        }

        // --- SHIP SPAWNING LOGIC ---
        if(!ship.a && R()>0.993) { 
            ship.a=true; 
            ship.type = M(R()*3);
            
            // Random Realistic Ship Colors
            var shipColors = [
                0, // Default Brown
                C(200, 200, 200), // White
                C(50, 50, 150),   // Navy
                C(50, 50, 50),    // Black
                C(100, 30, 30),   // Dark Red
                C(100, 100, 110)  // Grey
            ];
            ship.color = shipColors[M(R() * shipColors.length)];

            if (R() > 0.5) {
                ship.x = -40;
                ship.vx = (ship.type === 1) ? 0.5 : 0.3; 
            } else {
                ship.x = gW + 10;
                ship.vx = (ship.type === 1) ? -0.5 : -0.3; 
            }
        }
        if(ship.a) { 
            ship.x += ship.vx; 
            if (ship.vx > 0 && ship.x > gW + 10) ship.a = false;
            else if (ship.vx < 0 && ship.x < -40) ship.a = false;
        }

        // --- SHARK FIN SPAWNER ---
        if(!shark.a && R() > 0.997) { 
            shark.a = true;
            var minY = skyH + 10;
            var maxY = dh - dkH - 5;
            shark.y = M(minY + R() * (maxY - minY));
            if(R()>0.5) { shark.x = -20; shark.vx = 0.5; } 
            else { shark.x = gW + 20; shark.vx = -0.5; } 
        }
        if(shark.a) {
            shark.x += shark.vx;
            if(shark.x < -30 || shark.x > gW + 30) shark.a = false;
        }

        // --- FISH JUMP SPAWNER ---
        if(!jmp.a && R()>0.99) { 
            jmp.a=true; 
            jmp.x=20+R()*(gW-40); 
            jmp.y=skyH+5; 
            jmp.vy=-2.5; 
            jmp.vx=(R() - 0.5) * 3.0; 
            
            if (R() > 0.90) {
               jmp.type = 3;
            } else {
               jmp.type = M(R()*3); 
            }
            
            jmp.cBody = C(M(100+R()*155), M(100+R()*155), M(100+R()*155));
            jmp.cFin = C(M(50+R()*205), M(50+R()*205), M(50+R()*205));
        }
        if(jmp.a) { 
            jmp.x += jmp.vx;
            jmp.y += jmp.vy; 
            jmp.vy += 0.15; 
            if(jmp.y>skyH+10) jmp.a=false; 
        }
        if(now%200<20) wOff=M(R()*(isN?2:4));

        if(st===0) { st=1; tmCast=now; tmBite=tmCast+1000+(R()*2000); } 
        else if(st===1) { 
          if(nxt) { mode++; if(mode>2)mode=0; if(a&&a.tone)a.tone(600,50); }
          if(prv) { mode--; if(mode<0)mode=2; if(a&&a.tone)a.tone(600,50); }
           
          if(now>tmBite) { curF=randF(); fStam=curF.hp; maxStam=fStam; st=2; tmAct=now; if(a&&a.tone){a.tone(800,100);delay(50);a.tone(800,100);} }
        } else if(st===2) { 
          if(nxt) { mode++; if(mode>2)mode=0; if(mode===1)tmAct=now; if(a&&a.tone)a.tone(600,50); }
          if(prv) { mode--; if(mode<0)mode=2; if(mode===1)tmAct=now; if(a&&a.tone)a.tone(600,50); }

          var regen = 0.05 + (curF.r * 0.15); 
          fStam += regen; if(fStam>maxStam)fStam=maxStam;
           
          var totalL = getTotalLuck();
          var rodPwr = Math.sqrt(totalL) * 0.2; 
          var dmgMan = 15 + (activeRod.r * 7) + rodPwr; 
          var dmgAuto = 4.0 + (activeRod.r * 3.0) + (rodPwr * 0.6); 

          var barY = dh - 40; 
           
          if(mode===1) { 
              if(vld) { fStam-=dmgMan; tmAct=now; if(a&&a.tone)a.tone(200,20); } 
              if(now-tmAct>3000) { st=5; if(a&&a.tone)a.tone(100,500); } 
          } 
          else if(mode===0) { 
              fStam-=dmgAuto; if(now%500<50 && a&&a.tone)a.tone(200,10); 
          }
           
          if(fStam<=0) { addS(curF); if(a&&a.tone){a.tone(1000,100);a.tone(1500,300);} st=0; }
        } else if(st===5) { if(vld || (now-tmAct>1500)) st=0; }

        if(mode===2 && ok) {
           appState = 0;
           if(a&&a.tone) a.tone(400, 100);
           delay(200);
        }

        var drawSky = curSky;
        if (rain.a && !isN) drawSky = cRainSky; 
        
        // 1. FILL SKY
        fR(0, 0, gW, skyH, drawSky);

        // 2. DRAW STARS & MOON (BEHIND MOUNTAINS)
        if(isN) { 
            spr.setTextColor(cStar); 
            for(var j=0;j<stars.length;j++) {
                if((tmDay+j)%3!=0) {
                    if (R() > stars[j].b) spr.drawPixel(stars[j].x,stars[j].y,cStar); 
                }
            }
            var mX = (tmDay>1700) ? M((tmDay-1700)/800*gW) : M((300+tmDay)/800*gW)+gW/2; 
            drMoon(mX, 10);

            if(!shootStar.a && R() > 0.996) { 
               shootStar.a = true;
               shootStar.x = R() * (gW/2); 
               shootStar.y = R() * (skyH/2);
               shootStar.vx = 2 + R()*2;
               shootStar.vy = 1 + R();
               shootStar.t = 20; 
            }
            if(shootStar.a) {
                shootStar.x += shootStar.vx;
                shootStar.y += shootStar.vy;
                shootStar.t--;
                sLine(shootStar.x, shootStar.y, shootStar.x - shootStar.vx*2, shootStar.y - shootStar.vy*2, C(100,100,150)); 
                spr.drawPixel(shootStar.x, shootStar.y, cW); 
                if(shootStar.t <= 0 || shootStar.x > gW || shootStar.y > skyH) shootStar.a = false;
            }
        } else { 
            var sXPos = M((tmDay-500)/1200*gW), sYPos = 30-M(Math.sin((tmDay-500)/1200*3.14)*20); 
            if(!rain.a) drSun(sXPos, sYPos);
            if(bird.a) { 
               var bx = M(bird.x), by=M(bird.y);
               sLine(bx, by, bx+3, by+2, cBird);
               sLine(bx+3, by+2, bx+6, by, cBird);
            } 
        }

        // 3. FILL SEA
        fR(0, skyH, gW, seaH, curSea);
        
        // 4. DRAW MOUNTAINS (FOREGROUND)
        for(var i=0; i<mountains.length; i++) { drMountain(mountains[i], skyH, isN); }
        
        // 5. DRAW CLOUDS
        for(var i=0; i<clouds.length; i++) { drCloud(M(clouds[i].x), M(clouds[i].y), isN); }
            
        if(isl.a) { drIsland(M(isl.x), skyH, isN, now); }
        
        if(ship.a) { drShip(ship, skyH, isN); }
            
        if(jmp.a) {
             var jx = M(jmp.x), jy = M(jmp.y);
             var flip = (jmp.vx < 0);
             drFish(jx, jy, flip, jmp.type, jmp.cBody, jmp.cFin, jmp.vy); 
        }
        
        // --- WAVE EFFECT (SPARSE ~~~) ---
        var waveTime = (now / 400); // Slower
        var waveCol = isN ? C(40,40,90) : C(100,100,255); // Slightly brighter for visibility
        
        for(var y=skyH+10; y<dh-dkH; y+=16) { // More vertical space
             var rowSeed = (y * 0.2); 
             var rowOff = Math.sin(waveTime + rowSeed) * 10; // Wider movement
             
             for(var x=0; x<gW; x+=24) { // More horizontal space
                 var wx = M(x + rowOff);
                 if (wx > 0 && wx < gW - 6) {
                     // Draw ~ shape (Arch)
                     spr.drawPixel(wx, y+1, waveCol);
                     spr.drawPixel(wx+1, y, waveCol);
                     spr.drawPixel(wx+2, y, waveCol);
                     spr.drawPixel(wx+3, y+1, waveCol);
                 }
             }
        }
        
        if(shark.a) {
            drSharkFin(M(shark.x), shark.y, shark.vx > 0, isN);
        }

        fR(gW, 0, 2, dh, cSep);
        fR(0, dh-dkH, gW, dkH, cBoat);
        fR(0, dh-dkH, gW, 2, C(80,40,0)); 

        for(var i=0; i<rain.drops.length; i++) {
            var p = rain.drops[i];
            if (rain.t === 1) sLine(p.x, p.y, p.x-2, p.y+p.l, cRain); 
            else sLine(p.x, p.y, p.x, p.y+p.l, cRain); 
        }

        drHud(dh - 24); 

        var rodCol = (activeRod.r >= 0 && activeRod.r < rCols.length) ? rCols[activeRod.r] : cRodDefault;
        if(activeRod.r === 0 && activeRod.p === 0) rodCol = cRodDefault;

        var rodBaseX = gW + 10; var rodBaseY = dh + 10; var rodTipX = (gW / 2); var rodTipY = (dh / 2) - 20;
        if (st === 2 && M(now/200)%2===0) { rodTipY -= 8; rodTipX += 3; }
        
        for(var t=0; t<4; t++) { 
            sLine(rodBaseX+t, rodBaseY, rodTipX+t, rodTipY, (t>=1 && t<=2)?rodCol:C(40,20,0)); 
        }
            
        if(st==1||st==2) {
          var bobX = (gW / 2); var bobY = (dh / 2) + 10; bobY += wOff; 
          if (st === 2) { bobX += (Math.random() * 6) - 3; bobY += (Math.random() * 4) - 2; }
          sLine(rodTipX, rodTipY, bobX, bobY, cK);
           
          if (st === 1) { 
              bobY += (Math.sin(now/300) * 2); 
              var bobColor = cRed; 
              if (activeRod.d > 0) {
                  if (activeRod.curD <= (activeRod.d * 0.25)) {
                      var spd = 2; 
                      var r = M(128 + 127 * Math.sin(now / spd));
                      var g = M(128 + 127 * Math.sin((now / spd) + 2.09)); 
                      var b = M(128 + 127 * Math.sin((now / spd) + 4.18)); 
                      bobColor = C(r, g, b);
                  }
                  else if (activeRod.curD <= (activeRod.d * 0.5)) {
                      var spd = 7; 
                      var r = M(128 + 127 * Math.sin(now / spd));
                      var g = M(128 + 127 * Math.sin((now / spd) + 2.09)); 
                      var b = M(128 + 127 * Math.sin((now / spd) + 4.18)); 
                      bobColor = C(r, g, b);
                  }
              }
              fR(M(bobX)-2, M(bobY)-2, 4, 4, bobColor); 
          } 
          else if (st === 2) { spr.setTextColor(cW); spr.setTextAlign(1); spr.drawText("!",M(bobX),M(bobY)-15); }
        }

        spr.setTextSize(1);
        spr.setTextColor(cW); spr.setTextAlign(1); var cX=gW/2;
        var barY = dh - 40; 
        
        if(st==1 || st==2) {
              if(mode===1) { spr.setTextColor(cYel); spr.drawText("< MAN >", cX, barY - 10); }
              else if(mode===0) { spr.setTextColor(cGrn); spr.drawText("< AUTO >", cX, barY - 10); }
              else if(mode===2) { spr.setTextColor(cRed); spr.drawText("< MENU >", cX, barY - 10); }
        }
        
        if(st==2) {
          var bX=(gW-barW)/2, pct=fStam/maxStam; if(pct<0)pct=0;
          fR(M(bX), barY, barW, 6, cBg);
          spr.drawRect(M(bX), barY, barW, 6, cW);
          var fW=M((barW-2)*pct);
          if(fW>0) { fR(M(bX)+1, barY+1, fW, 4, cBar); }
        } else if(st==5) { spr.setTextColor(cRed); spr.drawText("ESCAPED!",cX,dh/2); spr.setTextColor(cW); spr.drawText("Too Slow!",cX,dh/2+15); }
            
        // --- SIDEBAR BOX 1: RECENT ---
        var pX=sX; 
        drBox(pX,0,bH1,"RECENT",C(125, 210, 230)); 
        spr.setTextSize(1);
        
        for(var i=0;i<Math.min(rec.length, maxRecItems);i++) { 
          var f=rec[i], y=18+(i*10); spr.setTextAlign(0); spr.setTextColor(rCols[f.r]); 
          var n=f.name; if(n.length>10)n=n.substring(0,10); spr.drawText(n,pX+3,y);
          spr.setTextAlign(2); spr.setTextColor(cW); spr.drawText(fmt(f.w),pX+bW-3,y);
        }
            
        // --- SIDEBAR BOX 2: TOP LUCK ---
        var y2 = bH1; 
        drBox(pX,y2,bH2,"TOP LUCK",C(255, 180, 125)); 
        if(luck.length==0) { spr.setTextAlign(0); spr.setTextColor(C(150,150,150)); spr.drawText("- Empty -",pX+3,y2+18); }
        else {
          for(var i=0;i<Math.min(luck.length, maxLuckItems);i++) { 
            var f=luck[i], y=y2+18+(i*10); spr.setTextAlign(0); spr.setTextColor(rCols[f.r]);
            var n=f.name; if(n.length>10)n=n.substring(0,10); spr.drawText(n,pX+3,y);
            spr.setTextAlign(2); spr.setTextColor(cW); spr.drawText(fmt(f.w),pX+bW-3,y);
          }
        }

        // --- SIDEBAR BOX 3: STATS ---
        var y3 = bH1 + bH2;
        drBox(pX, y3, bH3, "STATS", C(144, 238, 144)); 
            
        var totalL = getTotalLuck();
        var mult = 1.0 + (totalL / 100.0);

        spr.setTextAlign(0); 
        spr.setTextColor(rodCol); 
        var dRodName = activeRod.n;
        if(activeRod.q > 1) dRodName += " x" + activeRod.q; 
        if(dRodName.length > 15) dRodName = dRodName.substring(0,15) + "..";
        spr.drawText(dRodName, pX+3, y3+16);
        spr.setTextColor(cW);
            
        var durCol = cW;
        if(activeRod.d > 0 && activeRod.curD < 10 && M(now/500)%2===0) { durCol = cDanger; }
        spr.setTextColor(durCol);
        var durText = (activeRod.d === 0) ? "Inf" : activeRod.curD + "/" + activeRod.d;
        spr.drawText("D:" + durText, pX+3, y3+26);
            
        spr.setTextColor(cW);
        var activeCharms = 0; for(var i=0;i<gameData.charms.length;i++) if(gameData.charms[i].use) activeCharms++;
        spr.drawText("Charm:" + activeCharms, pX+3, y3+36); 
            
        var luckCol = cW;
        var pityActive = (activeRod.d > 0 && activeRod.curD <= (activeRod.d * 0.5));
        if (pityActive) {
            luckCol = cGold; 
        }
        spr.setTextColor(luckCol);
        spr.drawText("Luck:+" + totalL + "%", pX+3, y3+46);
            
        spr.setTextAlign(2);
        
        var t6 = Math.min(50, 0.01 * mult);  
        var t5 = Math.min(65, 0.15 * mult);  
        var t4 = Math.min(95, 0.60 * mult);  
        var t3 = Math.min(99, 2.50 * mult);  
        var t2 = Math.min(100, 12.0 * mult); 
        var t1 = Math.min(100, 45.0 * mult);
        var t0 = 100;
        
        var showR = [t0, t1, t2, t3, t4, t5, t6];
        var activeR = activeRod.r;
        var minR = Math.max(0, activeR - 2); 
        var maxR = Math.min(6, activeR + 1);
        
        var line = 0;
        for(var r = maxR; r >= minR; r--) {
            if(line > 3) break;
            
            spr.setTextColor(rCols[r]);
            var txt = fmtP(showR[r]);
            if(showR[r] >= 100) txt = "100%";
            spr.drawText(txt, pX+bW-3, y3+16+(line*10));
            line++;
        }

    } else if (appState === 2) { 
        spr.drawText("INVENTORY", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        var opts = ["FISH", "ROD", "CHARM", "SELL ALL FISH", "BACK"]; 
        if (nxt) { menuIdx++; if (menuIdx >= opts.length) menuIdx=0; if(a&&a.tone)a.tone(600,20); }
        if (prv) { menuIdx--; if (menuIdx < 0) menuIdx=opts.length-1; if(a&&a.tone)a.tone(600,20); }
        for (var i = 0; i < opts.length; i++) {
            if (i === menuIdx) { spr.setTextColor(cMenuSel); spr.drawText("> " + opts[i] + " <", dw/2, 60 + (i*20)); } 
            else { spr.setTextColor(C(100, 100, 100)); spr.drawText(opts[i], dw/2, 60 + (i*20)); }
        }
        if (ok) {
            if(a&&a.tone) a.tone(800, 100);
            if (menuIdx === 0) { loadData(); appState = 3; invScroll=0; invSel=0; } 
            else if (menuIdx === 1) { 
                loadData(); 
                gameData.rods.sort(function(a,b){ if(a.r!==b.r) return a.r-b.r; return a.l-b.l; });
                appState = 4; invScroll=0; invSel=0; 
            } 
            else if (menuIdx === 2) { 
                loadData(); 
                gameData.charms.sort(function(a,b){ if(a.r!==b.r) return a.r-b.r; return a.l-b.l; });
                appState = 8; invScroll=0; invSel=0; 
            } 
            else if (menuIdx === 3) { sellAll(); }
            else if (menuIdx === 4) { appState = 0; } 
            delay(200);
        }

    } else if (appState === 3) {
        // FISH INVENTORY
        var keys = Object.keys(gameData.items);
        keys.sort(function(a, b) { var rA = gameData.items[a].r; var rB = gameData.items[b].r; if (rB !== rA) return rB - rA; if (a < b) return -1; if (a > b) return 1; return 0; });
        
        spr.drawText("INVENTORY", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats();

        var listStartY = 60;
        var totalItems = keys.length + 1; 

        if (keys.length === 0) { 
             spr.setTextColor(C(150,150,150)); spr.drawText("(Empty - Catch fish!)", dw/2, dh/2);
             spr.setTextColor(cMenuSel); spr.drawText("[ BACK ]", dw/2, dh - 30);
             if(ok) { appState = 2; delay(200); }
        } 
        else {
           var maxLines = 5; 
           if(nxt) { invSel++; if(invSel >= totalItems) invSel = totalItems - 1; if(invSel >= invScroll + maxLines) invScroll = invSel - maxLines + 1; if(a&&a.tone) a.tone(600,20); }
           if(prv) { invSel--; if(invSel < 0) invSel = 0; if(invSel < invScroll) invScroll = invSel; if(a&&a.tone) a.tone(600,20); }
           spr.setTextAlign(0);
           for(var i=0; i<maxLines; i++) {
               var idx = invScroll + i;
               if(idx < totalItems) {
                   var itemY = listStartY + (i*22);
                   
                   if(idx === invSel) { spr.drawRect(5, itemY-2, dw-10, 20, cMenuSel); }

                   if (idx === keys.length) {
                       spr.setTextAlign(1);
                       spr.setTextColor(cYel); spr.drawText("[ BACK ]", dw/2, itemY);
                       spr.setTextAlign(0);
                   } else {
                       var kName = keys[idx];
                       var item = gameData.items[kName];
                       var price = (item.p !== undefined) ? item.p : sellPrice[item.r];
                       
                       spr.setTextAlign(0);
                       spr.setTextColor(rCols[item.r]); spr.drawText(kName, 10, itemY);
                       
                       spr.setTextSize(0.5); spr.setTextColor(C(200,200,200));
                       spr.drawText("Qty: " + item.q + " | Rarity: " + item.r, 10, itemY + 10);

                       spr.setTextSize(1);
                       spr.setTextAlign(2);
                       spr.setTextColor(cGold); spr.drawText("$" + fmtM(price), dw-5, itemY);
                       spr.setTextAlign(0);
                   }
               }
           }
           if (ok) { 
               if(invSel === keys.length) { appState = 2; delay(200); }
               else { sellF(keys[invSel]); delay(150); }
           }
           if(totalItems > maxLines) { spr.setTextAlign(1); spr.setTextColor(C(100,100,100)); spr.drawText((invSel+1) + "/" + totalItems, dw/2, dh-22); }
        }
        
        spr.setTextAlign(2); 
        spr.setTextColor(cMenuSel); 
        spr.drawText("BACK [ESC]", dw-5, 5);
        if(keys.length > 0) spr.drawText("SELL [OK ]", dw-5, 15);
        
        spr.setTextAlign(1); 
        spr.setTextColor(cW);

    } else if (appState === 4) {
        spr.drawText("MY RODS", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats();

        var listStartY = 60;
        var maxLines = 5;
        var myRods = gameData.rods;
        var totalItems = myRods.length + 1; 

        if (myRods.length === 0) { 
             spr.setTextColor(C(150,150,150)); spr.drawText("(No rods?)", dw/2, dh/2); 
             spr.setTextColor(cMenuSel); spr.drawText("[ BACK ]", dw/2, dh - 30);
             if(ok) { appState = 2; delay(200); }
        } 
        else {
             if(nxt) { invSel++; if(invSel >= totalItems) invSel = totalItems-1; if(invSel >= invScroll + maxLines) invScroll = invSel - maxLines + 1; if(a&&a.tone)a.tone(600,20); }
             if(prv) { invSel--; if(invSel < 0) invSel = 0; if(invSel < invScroll) invScroll = invSel; if(a&&a.tone)a.tone(600,20); }
             spr.setTextAlign(0);
             for(var i=0; i<maxLines; i++) {
                 var idx = invScroll + i;
                 if(idx < totalItems) {
                     var itemY = listStartY + (i*22);
                     
                     if(idx === invSel) { spr.drawRect(5, itemY-2, dw-10, 20, cMenuSel); }
                     
                     if(idx === myRods.length) {
                         spr.setTextAlign(1);
                         spr.setTextColor(cYel); spr.drawText("[ BACK ]", dw/2, itemY);
                         spr.setTextAlign(0);
                     } else {
                         var rod = myRods[idx];
                         spr.setTextAlign(0);
                         spr.setTextColor(rCols[rod.r]); 
                         var dispName = rod.n + " x" + rod.q; 
                         spr.drawText(dispName, 10, itemY);

                         spr.setTextSize(0.5); spr.setTextColor(C(200,200,200));
                         var durT = (rod.d === 0) ? "INF" : rod.curD + "/" + rod.d;
                         var warnCol = (rod.d > 0 && rod.curD < 10) ? cDanger : C(200,200,200);
                         spr.setTextColor(warnCol);
                         spr.drawText("Luck:+" + rod.l + "%  Dur:" + durT, 10, itemY+10);
                         spr.setTextSize(1);

                         if(rod.use) { 
                           spr.setTextAlign(2);
                           spr.setTextColor(cGrn); 
                           spr.drawText("[E]", dw-5, itemY); 
                           spr.setTextAlign(0);
                         }
                     }
                 }
             }
             if(ok) { 
                 if(invSel === myRods.length) { appState = 2; delay(200); }
                 else { equipRod(invSel); delay(150); }
             }
             if(totalItems > maxLines) { spr.setTextAlign(1); spr.setTextColor(C(100,100,100)); spr.drawText((invSel+1) + "/" + totalItems, dw/2, dh-22); }
        }
        
        spr.setTextAlign(2); 
        spr.setTextColor(cMenuSel); 
        spr.drawText("BACK [ESC]", dw-5, 5);
        if(myRods.length > 0) spr.drawText("EQUIP [OK ]", dw-5, 15);
        
        spr.setTextAlign(1); 
        spr.setTextColor(cW);

    } else if (appState === 5) {
        spr.drawText("SHOP", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats(); 
        
        var opts = ["ROD", "CHARM", "BACK"];
        if (nxt) { menuIdx++; if (menuIdx >= opts.length) menuIdx=0; if(a&&a.tone)a.tone(600,20); }
        if (prv) { menuIdx--; if (menuIdx < 0) menuIdx=opts.length-1; if(a&&a.tone)a.tone(600,20); }
        for (var i = 0; i < opts.length; i++) {
            if (i === menuIdx) { spr.setTextColor(cMenuSel); spr.drawText("> " + opts[i] + " <", dw/2, 65 + (i*20)); } 
            else { spr.setTextColor(C(100, 100, 100)); spr.drawText(opts[i], dw/2, 65 + (i*20)); }
        }
        if (ok) {
            if(a&&a.tone) a.tone(800, 100);
            if (menuIdx === 0) { 
                loadDBs();
                shopList = getShopRods();
                appState = 6; invScroll=0; invSel=0; 
            } 
            else if (menuIdx === 1) { 
                loadDBs();
                shopList = getShopCharms();
                appState = 7; invScroll=0; invSel=0; 
            } 
            else if (menuIdx === 2) { appState = 0; } 
            delay(200);
        }

    } else if (appState === 6) {
        spr.drawText("ROD SHOP", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats(); 

        var listStartY = 60; 
        var maxLines = 5;
        var totalItems = shopList.length + 1; 

        if(shopList.length === 0) {
             spr.setTextColor(C(150,150,150)); 
             spr.drawText("Sold Out / Empty", dw/2, dh/2);
             spr.setTextColor(cMenuSel); spr.drawText("[ BACK ]", dw/2, dh - 30);
             if(ok) { appState = 5; delay(200); }
        } else {
            if(nxt) { invSel++; if(invSel >= totalItems) invSel = totalItems-1; if(invSel >= invScroll + maxLines) invScroll = invSel - maxLines + 1; if(a&&a.tone)a.tone(600,20); }
            if(prv) { invSel--; if(invSel < 0) invSel = 0; if(invSel < invScroll) invScroll = invSel; if(a&&a.tone)a.tone(600,20); }
            spr.setTextAlign(0);
            for(var i=0; i<maxLines; i++) {
                var idx = invScroll + i;
                if(idx < totalItems) {
                    var itemY = listStartY + (i*22);
                    
                    if(idx === invSel) { spr.drawRect(5, itemY-2, dw-10, 20, cMenuSel); }
                    
                    if(idx === shopList.length) {
                        spr.setTextAlign(1);
                        spr.setTextColor(cYel); spr.drawText("[ BACK ]", dw/2, itemY);
                        spr.setTextAlign(0);
                    } else {
                        var rItem = shopList[idx];
                        spr.setTextAlign(0);
                        spr.setTextColor(rCols[rItem.r]); spr.drawText(rItem.n, 10, itemY);
                        
                        spr.setTextSize(0.5); spr.setTextColor(C(200,200,200));
                        var durT = (rItem.d===0)?"INF":rItem.d;
                        spr.drawText("Lck:+" + rItem.l + "% Dur:" + durT, 10, itemY + 10);
                        
                        var rL = rItem.reqL || 0;
                        var lvlCol = (gameData.level >= rL) ? C(100,255,100) : cDanger;
                        spr.setTextColor(lvlCol);
                        spr.setTextAlign(2); 
                        spr.drawText("Lv." + rL, dw-10, itemY + 10);
                        spr.setTextAlign(0); 
                        
                        spr.setTextSize(1);
                        
                        spr.setTextAlign(2);
                        if(rItem.p > 0) { spr.setTextColor(cGold); spr.drawText("$" + fmtM(rItem.p), dw-5, itemY); } 
                        else { spr.setTextColor(cGrn); spr.drawText("FREE", dw-5, itemY); }
                        spr.setTextAlign(0);
                    }
                }
            }
            if(ok) {
                if(invSel === shopList.length) { appState = 5; delay(200); }
                else { buyRod(shopList[invSel]); delay(200); }
            }
        }
        
        spr.setTextAlign(2); 
        spr.setTextColor(cMenuSel); 
        spr.drawText("BACK [ESC]", dw-5, 5);
        if(shopList.length > 0) spr.drawText("BUY [OK ]", dw-5, 15);
        
        spr.setTextAlign(1); 
        spr.setTextColor(cW);

    } else if (appState === 7) {
        spr.drawText("CHARM SHOP", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats(); 
        
        var listStartY = 60; 
        var maxLines = 5;
        var totalItems = shopList.length + 1; 

        if(shopList.length === 0) {
             spr.setTextColor(C(150,150,150)); 
             spr.drawText("Sold Out / Empty", dw/2, dh/2);
             spr.setTextColor(cMenuSel); spr.drawText("[ BACK ]", dw/2, dh - 30);
             if(ok) { appState = 5; delay(200); }
        } else {
            if(nxt) { invSel++; if(invSel >= totalItems) invSel = totalItems-1; if(invSel >= invScroll + maxLines) invScroll = invSel - maxLines + 1; if(a&&a.tone)a.tone(600,20); }
            if(prv) { invSel--; if(invSel < 0) invSel = 0; if(invSel < invScroll) invScroll = invSel; if(a&&a.tone)a.tone(600,20); }
            spr.setTextAlign(0);
            for(var i=0; i<maxLines; i++) {
                var idx = invScroll + i;
                if(idx < totalItems) {
                    var itemY = listStartY + (i*22);
                    
                    if(idx === invSel) { spr.drawRect(5, itemY-2, dw-10, 20, cMenuSel); }
                    
                    if(idx === shopList.length) {
                        spr.setTextAlign(1);
                        spr.setTextColor(cYel); spr.drawText("[ BACK ]", dw/2, itemY);
                        spr.setTextAlign(0);
                    } else {
                        var cItem = shopList[idx];
                        spr.setTextAlign(0);
                        spr.setTextColor(rCols[cItem.r]); spr.drawText(cItem.n, 10, itemY);
                        
                        spr.setTextSize(0.5); spr.setTextColor(C(200,200,200));
                        var durT = (cItem.d===0)?"INF":cItem.d;
                        spr.drawText("Lck:+" + cItem.l + "% Dur:" + durT, 10, itemY + 10);
                        
                        var rL = cItem.reqL || 0;
                        var lvlCol = (gameData.level >= rL) ? C(100,255,100) : cDanger;
                        spr.setTextColor(lvlCol);
                        spr.setTextAlign(2); 
                        spr.drawText("Lv." + rL, dw-10, itemY + 10);
                        spr.setTextAlign(0); 

                        spr.setTextSize(1);
                        
                        spr.setTextAlign(2);
                        spr.setTextColor(cGold); spr.drawText("$" + fmtM(cItem.p), dw-5, itemY);
                        spr.setTextAlign(0);
                    }
                }
            }
            if(ok) {
                if(invSel === shopList.length) { appState = 5; delay(200); }
                else { buyCharm(shopList[invSel]); delay(200); }
            }
        }
        
        spr.setTextAlign(2); 
        spr.setTextColor(cMenuSel); 
        spr.drawText("BACK [ESC]", dw-5, 5);
        if(shopList.length > 0) spr.drawText("BUY [OK ]", dw-5, 15);
        
        spr.setTextAlign(1); 
        spr.setTextColor(cW);
       
    } else if (appState === 8) {
        spr.drawText("MY CHARMS", dw/2, 20); spr.drawLine(20, 32, dw-20, 32, cSep);
        drShopStats();

        var listStartY = 60;
        var maxLines = 5;
        var myCharms = gameData.charms;
        var totalItems = myCharms.length + 1;

        if (myCharms.length === 0) { 
             spr.setTextColor(C(150,150,150)); spr.drawText("(No charms)", dw/2, dh/2); 
             spr.setTextColor(cMenuSel); spr.drawText("[ BACK ]", dw/2, dh - 30);
             if(ok) { appState = 2; delay(200); }
        } 
        else {
             if(nxt) { invSel++; if(invSel >= totalItems) invSel = totalItems-1; if(invSel >= invScroll + maxLines) invScroll = invSel - maxLines + 1; if(a&&a.tone)a.tone(600,20); }
             if(prv) { invSel--; if(invSel < 0) invSel = 0; if(invSel < invScroll) invScroll = invSel; if(a&&a.tone)a.tone(600,20); }
             spr.setTextAlign(0);
             for(var i=0; i<maxLines; i++) {
                 var idx = invScroll + i;
                 if(idx < totalItems) {
                     var itemY = listStartY + (i*22);
                     
                     if(idx === invSel) { spr.drawRect(5, itemY-2, dw-10, 20, cMenuSel); }

                     if(idx === myCharms.length) {
                         spr.setTextAlign(1);
                         spr.setTextColor(cYel); spr.drawText("[ BACK ]", dw/2, itemY);
                         spr.setTextAlign(0);
                     } else {
                         var ch = myCharms[idx];
                         spr.setTextAlign(0);
                         spr.setTextColor(rCols[ch.r]); 
                         var dispName = ch.n + " x" + ch.q; 
                         spr.drawText(dispName, 10, itemY);

                         spr.setTextSize(0.5); spr.setTextColor(C(200,200,200));
                         var durT = (ch.d === 0) ? "INF" : ch.curD + "/" + ch.d;
                         var warnCol = (ch.d > 0 && ch.curD < 20) ? cDanger : C(200,200,200);
                         spr.setTextColor(warnCol);
                         spr.drawText("Luck:+" + ch.l + "%  Dur:" + durT, 10, itemY+10);
                         spr.setTextSize(1);
                         
                         if(ch.use) { 
                           spr.setTextAlign(2);
                           spr.setTextColor(cGrn); 
                           spr.drawText("[ON]", dw-5, itemY); 
                           spr.setTextAlign(0);
                         } else {
                           spr.setTextAlign(2);
                           spr.setTextColor(C(100,100,100)); 
                           spr.drawText("[  ]", dw-5, itemY); 
                           spr.setTextAlign(0);
                         }
                     }
                 }
             }
             if(ok) { 
                 if(invSel === myCharms.length) { appState = 2; delay(200); }
                 else { toggleCharm(invSel); delay(150); }
             }
             if(totalItems > maxLines) { spr.setTextAlign(1); spr.setTextColor(C(100,100,100)); spr.drawText((invSel+1) + "/" + totalItems, dw/2, dh-22); }
        }
        
        spr.setTextAlign(2); 
        spr.setTextColor(cMenuSel); 
        spr.drawText("BACK [ESC]", dw-5, 5);
        if(myCharms.length > 0) spr.drawText("TOGGLE [OK ]", dw-5, 15);
        
        spr.setTextAlign(1); 
        spr.setTextColor(cW);
    }

    if(notifMsg !== "") {
        var toastY = 30; var toastH = 24; var tW = 144;
        fR(M(dw/2 - (tW/2)), toastY, tW, toastH, cK); 
        spr.drawRect(M(dw/2 - (tW/2)), toastY, tW, toastH, cW);                
        spr.setTextColor(cGold); spr.setTextAlign(1); spr.drawText(notifMsg, dw/2, toastY + 8);
    }

    spr.pushSprite(); 
    delay(20);
  }
  k.setLongPress(false);
}
main();