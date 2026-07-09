import * as Three from "three/webgpu";
import * as bufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

class preview{
    constructor(dir, dot, view, part = undefined){
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", {willReadFrequently:true});
        this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.data = this.ImageData.data;
        this.dir = (dir% 4 + 4) % 4;
        this.dot = dot;
        this.view = (view % 4 + 4 ) % 4;
        this.part = part;
        this.shadow = 1;
        this.overlap = 0;
        this.sunPos = {x:1/Math.sqrt(4), y:1.5/Math.sqrt(4), z:1.5/Math.sqrt(4)};
		this.range = {min:{x:0,y:0},max:{x:0,y:0}};
		this.pivot = {x:0,y:0};
    }
    get2dPos(pos){
        let xz = this.getPos(pos.x, pos.z);
        return {x:(xz.x - xz.z), y:((xz.x + xz.z)/2-pos.y)};
    }
    setColor(i, r, g, b, a){
        this.data[4 * i] = r;
        this.data[4 * i + 1] = g;
        this.data[4 * i + 2] = b;
        this.data[4 * i + 3] = a;
    }
    createImage(faces){
        this.ImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.data = this.ImageData.data;
        for(const face in faces){
            let x = this.get2dPos(faces[face].pos).x;
            let y = this.get2dPos(faces[face].pos).y;
            let c = faces[face].color;
			let a = [this.get2dPos(faces[face].apex[0]), this.get2dPos(faces[face].apex[1]), this.get2dPos(faces[face].apex[2]), this.get2dPos(faces[face].apex[3])];
			let range = {mx:0, my:0, Mx:0, My:0};
			for(const point of a){
				range.mx = Math.min(range.mx, point.x);
				range.my = Math.min(range.my, point.y);
				range.Mx = Math.max(range.Mx, point.x);
				range.My = Math.max(range.My, point.y);
			}
			range.x = range.Mx - range.mx;
			range.y = range.My - range.my;
            for(let i = - this.dot * range.x / 2; i < this.dot * range.x / 2; i++){
                for(let j = - this.dot * range.y / 2; j < this.dot * range.y / 2; j++){
                    let ix = Math.floor(x * this.dot) + i - this.range.min.x + this.dot/2;
                    let iy = Math.floor(y * this.dot) + j - this.range.min.y + this.dot;
                    this.setColor(iy * this.canvas.width + ix, c.r, c.g, c.b, c.a);
                }
            }
        }
		let x = this.get2dPos({x:0,y:0,z:0}).x;
		let y = this.get2dPos({x:0,y:0,z:0}).y;
		this.pivot.x = Math.floor(x * this.dot) - this.range.min.x + this.dot;
		this.pivot.y = Math.floor(y * this.dot) - this.range.min.y + this.dot;
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
    getShadow(nv){
        let dot = (nv.x * this.sunPos.x + nv.y * this.sunPos.y + nv.z * this.sunPos.z);
        let size = Math.sqrt(nv.x ** 2 + nv.y ** 2 + nv.z **2);
        dot /= size;
        let shadowCoe = (dot+3)/4;
        return shadowCoe;
    }
    update(map){
        let faces = [];
        let face_group = {"default":[]};
        let face_nv = {};//{x:x,y:y,z:z,n:n}
        let faceV = {
            "(0,1,0)":{x:0.5, y:1, z:0.5},
            "(1,0,0)":{x:1, y:0.5, z:0.5},
            "(0,0,1)":{x:0.5, y:0.5, z:1},
            "(-1,0,0)":{x:0, y:0.5, z:0.5},
            "(0,0,-1)":{x:0.5, y:0.5, z:0}
        };
        let faceDir = {
            "(0,1,0)":{x:0, y:1, z:0},
            "(1,0,0)":{x:1, y:0, z:0},
            "(0,0,1)":{x:0, y:0, z:1},
            "(-1,0,0)":{x:-1, y:0, z:0},
            "(0,0,-1)":{x:0, y:0, z:-1}
        };
		let faceApex = {
			"(0,1,0)":[
				{x:-0.5, y:0, z:-0.5},
				{x:0.5, y:0, z:-0.5},
				{x:0.5, y:0, z:0.5},
				{x:-0.5, y:0, z:0.5}
			],
            "(1,0,0)":[
				{x:0, y:-0.5, z:-0.5},
				{x:0, y:0.5, z:-0.5},
				{x:0, y:0.5, z:0.5},
				{x:0, y:-0.5, z:0.5},
			],
            "(0,0,1)":[
				{x:-0.5, y:-0.5, z:0},
				{x:0.5, y:-0.5, z:0},
				{x:0.5, y:0.5, z:0},
				{x:-0.5, y:0.5, z:0}
			],
            "(-1,0,0)":[
				{x:0, y:-0.5, z:-0.5},
				{x:0, y:0.5, z:-0.5},
				{x:0, y:0.5, z:0.5},
				{x:0, y:-0.5, z:0.5},
			],
            "(0,0,-1)":[
				{x:-0.5, y:-0.5, z:0},
				{x:0.5, y:-0.5, z:0},
				{x:0.5, y:0.5, z:0},
				{x:-0.5, y:0.5, z:0}
			]
		};
		let faceShow = [
			{
				"(0,1,0)":1,
				"(1,0,0)":1,
				"(0,0,1)":1,
				"(-1,0,0)":0,
				"(0,0,-1)":0
        	},
			{
				"(0,1,0)":1,
				"(1,0,0)":0,
				"(0,0,1)":1,
				"(-1,0,0)":1,
				"(0,0,-1)":0
        	},
			{
				"(0,1,0)":1,
				"(1,0,0)":0,
				"(0,0,1)":0,
				"(-1,0,0)":1,
				"(0,0,-1)":1
        	},
			{
				"(0,1,0)":1,
				"(1,0,0)":1,
				"(0,0,1)":0,
				"(-1,0,0)":0,
				"(0,0,-1)":1
        	},
		];
        this.range = {min:{x:0,y:0},max:{x:0,y:0}};
        //面のグループ作成+平均法線を計算
        for(const part in map){
            if(part != "version"){
                for(const pos in map[part]){
                    let box = map[part][pos];
                    let plane_id = box.plane;
                    for(const face in faceV){
						let nextX = box.pos.x + faceDir[face].x;
						let nextY = box.pos.y + faceDir[face].y;
						let nextZ = box.pos.z + faceDir[face].z;
						let nextIndex = "(" + nextX + "," + nextY + "," + nextZ + ")"
						if(!Object.keys(map[part]).includes(nextIndex)){
							if(box.plane != undefined){
								plane_id = box.plane[face];
							}else{
								plane_id = undefined;
							}
							let face_color = box[face];
							if(face_color == undefined) face_color = box.color;
							let face_pos = {
								x:box.pos.x + faceV[face].x,
								y:box.pos.y + faceV[face].y,
								z:box.pos.z + faceV[face].z,
							}
							let face_data = {pos:face_pos, color:face_color, face:faceDir[face], part:part, apex:faceApex[face]};
							if(faceShow[((this.dir-this.view) % 4 + 4) % 4][face] == 1){
								if(plane_id != undefined){
									if(face_group[plane_id] == undefined) face_group[plane_id] = [];
									if(face_nv[plane_id] == undefined) face_nv[plane_id] = {x:0,y:0,z:0,n:0};
									face_group[plane_id].push(face_data);
									face_nv[plane_id].x = (face_nv[plane_id].x * face_nv[plane_id].n + face_data.face.x) / (face_nv[plane_id].n + 1);
									face_nv[plane_id].y = (face_nv[plane_id].y * face_nv[plane_id].n + face_data.face.y) / (face_nv[plane_id].n + 1);
									face_nv[plane_id].z = (face_nv[plane_id].z * face_nv[plane_id].n + face_data.face.z) / (face_nv[plane_id].n + 1);
									face_nv[plane_id].n++;
								}else{
									face_group.default.push(face_data);
								}
							}
						}
                    }
                }
            }
        }
        //面の方向を所属面に合わせる
        for(const group in face_group){
            if(group != "default"){
                for(const face in face_group[group]){
                    face_group[group][face].face = face_nv[group];
                }
            }
        }
        //面の3次元上の位置と影付きの色を計算
        for(const group in face_group){
            for(const face in face_group[group]){
                let color = new Three.Color(face_group[group][face].color);
                color.convertLinearToSRGB();
                let faceInfo = {
                    pos:face_group[group][face].pos, 
                    color:{
                        r:255 * color.r * this.getShadow(face_group[group][face].face),
                        g:255 * color.g * this.getShadow(face_group[group][face].face),
                        b:255 * color.b * this.getShadow(face_group[group][face].face),
                        a:255
                    },
					face:face_group[group][face].face,
					apex:face_group[group][face].apex
                }
                if(this.part[face_group[group][face].part] == 0){
                    faces.push(faceInfo);
                    if(this.range.min.x > this.dot * this.get2dPos(face_group[group][face].pos).x){
                        this.range.min.x = this.dot * this.get2dPos(face_group[group][face].pos).x;
                    }else if(this.range.min.y > this.dot * this.get2dPos(face_group[group][face].pos).y){
                        this.range.min.y = this.dot * this.get2dPos(face_group[group][face].pos).y;
                    }else if(this.range.max.x < this.dot * this.get2dPos(face_group[group][face].pos).x){
                        this.range.max.x = this.dot * this.get2dPos(face_group[group][face].pos).x;
                    }else if(this.range.max.y < this.dot * this.get2dPos(face_group[group][face].pos).y){
                        this.range.max.y = this.dot * this.get2dPos(face_group[group][face].pos).y;
                    }
                }else if(this.overlap == 1){
                    faceInfo.color.a = 0;
                    faces.push(faceInfo);
                }
            }
        }
        //情報を奥から順番にする
        faces.sort((a,b)=>(this.compare(a, b)));
        //canvas設定
        this.canvas.width = this.range.max.x - this.range.min.x + this.dot;
        this.canvas.height = this.range.max.y - this.range.min.y + this.dot * 2;

        this.createImage(faces);
    }
    getPos(x, z){
		let rx = x*Math.round(Math.cos((this.dir-this.view)*Math.PI/2))+z*Math.round(Math.sin((this.dir-this.view)*Math.PI/2));
		let rz = -x*Math.round(Math.sin((this.dir-this.view)*Math.PI/2))+z*Math.round(Math.cos((this.dir-this.view)*Math.PI/2));
        return {x:rx, z:rz};
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
				this.preview[DirDict[i]][ViewDict[j]] = new preview(i, this.dot, j);
				this.canvas[DirDict[i]][ViewDict[j]] = this.preview[DirDict[i]][ViewDict[j]].canvas;
				this.canvas[DirDict[i]][ViewDict[j]].style.position = "absolute";
				this.canvas[DirDict[i]][ViewDict[j]].id = "Preview_" + DirDict[i] + "_" + ViewDict[j];
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
		let exporting = {frames:{},meta:{version:"0628"}};
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
                        x:Math.floor(this.preview[dir][view].pivot.x),
                        y:Math.floor(this.preview[dir][view].pivot.y)
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