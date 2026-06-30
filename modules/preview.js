import * as Three from "three/webgpu";
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class preview{
	constructor(canvas, dir, dot, view, part = undefined){
		this.canvas = canvas;
		this.ctx = this.canvas.getContext("2d", {willReadFrequently:true});
		this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.data = this.ImageData.data;
		this.dir = ((dir - view) % 4 + 4) % 4;
		this.dot = dot;
		this.view = (view % 4 + 4 ) % 4;
		this.part = part;
		this.minY = -32;
		this.maxY = 32;
		this.minX = -32;
		this.maxX = 32;
		this.shadow = 1;
		this.overlap = 0;
	}
	get2dPos(pos){
		let xz = this.getPos(pos.x + 0.5, pos.z + 0.5);
		return {x:(xz.x - xz.z)/2 -1, y:((xz.x + xz.z)/2-pos.y)/2-0.5};
	}
	setColor(i, r, g, b, a){
		this.data[4 * i] = r;
		this.data[4 * i + 1] = g;
		this.data[4 * i + 2] = b;
		this.data[4 * i + 3] = a;
	}
	createImage(map){
		this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.data = this.ImageData.data;
		for(let i = 0; i < this.data.length / 4; i++){
			this.setColor(i, 255, 255, 255, 0);
		}
		for(const box of map){
				let x = Math.floor(this.dot*this.get2dPos(box.pos).x) - this.minX;
				let y = Math.floor(this.dot*this.get2dPos(box.pos).y) - this.minY;
			if(box.color != "transparent"){
				let dotMap = [
					[0,0,0,0],
					[0,0,0,0],
					[1,1,2,2],
					[1,1,2,2]
				];
				let faceMap = [
					["(0,1,0)","(0,0,1)","(1,0,0)"],
					["(0,1,0)","(-1,0,0)","(0,0,1)"],
					["(0,1,0)","(0,0,-1)","(-1,0,0)"],
					["(0,1,0)","(1,0,0)","(0,0,-1)"]
				];
				for(let i = 0; i < this.dot; i++){
					for(let j = 0; j < this.dot; j++){
						let CS = dotMap[Math.floor(j/this.dot*4)][Math.floor(i/this.dot*4)];
						let c = new Three.Color(box.color);
						if(Object.keys(box).includes(faceMap[this.dir][CS])){
							c = new Three.Color(box[faceMap[this.dir][CS]]);
						};
						c = c.convertLinearToSRGB();
						if(CS != undefined){
							if(CS != 0){
								CS += this.view;
								CS = (CS - 1) % 4 + 1;
								CS *= this.shadow;
							}
							this.setColor((x + i) + (y + j) * this.canvas.width, 255 * (16 - CS * 2) / 16 * c.r, 255 * (16 - CS * 2) / 16 * c.g, 255 * (16 - CS * 2) / 16 * c.b, 255);
						}
					}
				}
			}else{
				for(let i = 0; i < this.dot; i++){
					for(let j = 0; j < this.dot; j++){
						this.setColor((x + i) + (y + j) * this.canvas.width, 0, 0, 0, 0);
					}
				}
			}
		}
		this.ctx.putImageData(this.ImageData, 0, 0);
	}
	getDist(pos){
		return this.getPos(pos.x, pos.z).x + pos.y + this.getPos(pos.x, pos.z).z;
	}
	compare(a,b){
		let d = this.getDist(a.pos) - this.getDist(b.pos);
		if(d != 0){
			return d;
		}
		d = a.pos.y - b.pos.y;
		if(d != 0){
			return d;
		}
		d = a.pos.x - b.pos.x;
		if(d != 0){
			return d;
		}
		d = a.pos.z - b.pos.z;
		return d;
	}
	update(map){
		let MAP = [];
		this.canvas.width = 1;
		this.canvas.height = 1;
		if(this.part != "" && this.part != undefined){
			if(Object.keys(map).length > 0){
				let map_temp = [];
				for(const obj in map){
					if(obj != "version"){
						if(this.part[obj] == 0){
							for(const box in map[obj]){
								map_temp.push(JSON.parse(JSON.stringify(map[obj][box])));
								MAP.push(JSON.parse(JSON.stringify(map[obj][box])));
							}
						}else{
							for(const box in map[obj]){
								if(this.overlap == 0) MAP.push(JSON.parse(JSON.stringify({pos:map[obj][box].pos, color : "transparent"})));
							}
						}
					}
				}
				this.minY = -0;
				this.maxY = 0;
				this.minX = -0;
				this.maxX = 0;
				for(const box in map_temp){
					if(this.maxX <= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x)){
						this.maxX = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x);
					}else if(this.minX >= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x)){
						this.minX = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).x);
					}
					if(this.maxY <= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y)){
						this.maxY = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y);
					}else if(this.minY >= Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y)){
						this.minY = Math.floor(this.dot*this.get2dPos(map_temp[box].pos).y);
					}
				}
				this.canvas.width = this.maxX - this.minX + this.dot;
				this.canvas.height = this.maxY - this.minY + this.dot;
				MAP.sort((a,b)=>(this.compare(a, b)));
				this.createImage(MAP);
			}
		}
	}
	getPos(x, z){
		return {x:x*Math.round(Math.cos(-this.dir*Math.PI/2))-z*Math.round(Math.sin(-this.dir*Math.PI/2)), z:x*Math.round(Math.sin(-this.dir*Math.PI/2))+z*Math.round(Math.cos(-this.dir*Math.PI/2))}
	}
	toggleShadow(){
		this.shadow = 1 - this.shadow;
	}
	toggleOverlap(){
		this.overlap = 1 - this.overlap;
	}
}

class Previews{
	constructor(margeID, dot = 4){
		this.marge = document.getElementById(margeID);
		this.ctx = this.marge.getContext("2d", {willReadFrequently:true});
		this.canvas = {};
		this.preview = {};
		this.dot = dot;
	}
	createPreviewCanvas(){
		let ViewDict = ["se", "ne", "nw", "sw"];
		let DirDict = ["0", "1", "2", "3"];
		
		for(let i = 0; i < DirDict.length; i++){
			this.canvas[DirDict[i]] = {};
			this.preview[DirDict[i]] = {};
			for(let j = 0; j < ViewDict.length; j++){
				this.canvas[DirDict[i]][ViewDict[j]] = document.createElement("canvas");
				this.canvas[DirDict[i]][ViewDict[j]].style.position = "absolute";
				this.canvas[DirDict[i]][ViewDict[j]].id = "Preview_" + DirDict[i] + "_" + ViewDict[j];
				this.preview[DirDict[i]][ViewDict[j]] = new preview(this.canvas[DirDict[i]][ViewDict[j]], i, this.dot, j);
			}
		}
	}
	update(map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].update(map);
			}
		}
	}
	setPreviewObj(map, show){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].part = show;
			}
		}
		this.update(map);
	}
	doMarge(boolean = false, name){
		let width = 0;
		let exporting = {frames:{}};
		let height = 0;
		for(const dir in this.canvas){
			for(const view in this.canvas[dir]){
				if(this.canvas[dir][view].width > width) width = this.canvas[dir][view].width;
				height += this.canvas[dir][view].height + 1;
				exporting[name + "_" + dir + "_" + view] = {}
			}
		}
		this.marge.width = width;
		this.marge.height = height;
		let OriginX = 0;
		let OriginY = 0;
		for(const dir in this.canvas){
			for(const view in this.canvas[dir]){
				this.ctx.drawImage(this.canvas[dir][view], OriginX, OriginY);
				exporting.frames[name + "_" + dir + "_" + view] = {
                    frame:{
                        x:OriginX,
                        y:OriginY,
                        w:this.canvas[dir][view].width,
                        h:this.canvas[dir][view].height
                    },
                    rotated:false,
                    trimmed:false,
                    sourceSize:{
                        w:this.canvas[dir][view].width + 1,
                        h:this.canvas[dir][view].height + 1
                    },
                    pivot:{
                        x:Math.floor(this.preview[dir][view].dot*this.preview[dir][view].get2dPos({x:0, y:0, z:0}).x - this.preview[dir][view].minX)/this.canvas[dir][view].width,
                        y:Math.floor(this.preview[dir][view].dot*this.preview[dir][view].get2dPos({x:0, y:0, z:0}).y - this.preview[dir][view].minY)/this.canvas[dir][view].height
                    }
				}
				OriginY += this.canvas[dir][view].height + 1;
			}
		}
		if(boolean){
			return exporting;
		}
	}
	toggleShadow(map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].toggleShadow();
			}
		}
		this.update(map);
		this.doMarge();
	}
	toggleOverlap(map){
		for(const dir in this.preview){
			for(const view in this.preview[dir]){
				this.preview[dir][view].toggleOverlap();
			}
		}
		this.update(map);
		this.doMarge();
	}
}

export { preview, Previews };